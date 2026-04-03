import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

const STORAGE_KEY = "fw_export_doc_file_names_v2";

const DOCS = [
  {
    field: "commercial_invoice_status",
    label: "Commercial Invoice",
    short: "INVOICE",
    issuer: "Fresh World Exporters",
    purpose: "Price and terms of sale",
    required: "Always",
    tone: "done",
  },
  {
    field: "packing_list_status",
    label: "Packing List",
    short: "PACKING",
    issuer: "Fresh World Exporters",
    purpose: "Itemized shipment contents",
    required: "Always",
    tone: "done",
  },
  {
    field: "phytosanitary_certificate_status",
    label: "Phytosanitary Certificate",
    short: "PHYTO",
    issuer: "Plant Quarantine Dept.",
    purpose: "Confirms produce is pest/disease free",
    required: "Always",
    tone: "missing",
  },
  {
    field: "airway_bill_status",
    label: "Airway Bill (AWB)",
    short: "AWB",
    issuer: "Airline (SriLankan / Q2)",
    purpose: "Air freight contract",
    required: "Always",
    tone: "done",
  },
  {
    field: "certificate_of_origin_status",
    label: "Certificate of Origin",
    short: "ORIGIN",
    issuer: "Chamber of Commerce",
    purpose: "Confirms goods are from Sri Lanka",
    required: "Always",
    tone: "missing",
  },
  {
    field: "health_certificate_status",
    label: "Health Certificate",
    short: "HEALTH",
    issuer: "Ministry of Health",
    purpose: "Confirms goods are safe to consume",
    required: "Always",
    tone: "done",
  },
  {
    field: "insurance_certificate_status",
    label: "Insurance Certificate",
    short: "INSURANCE",
    issuer: "Insurance Company",
    purpose: "Cargo insurance certificate",
    required: "CIF only",
    tone: "warn",
  },
];

const readStoredFiles = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeStoredFiles = (value) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

const toDone = (value) => String(value || "").toLowerCase() === "done";

const normalizeRecord = (row, storedFiles = {}) => {
  const dispatchKey = String(row.global_dispatch_id);
  const files = storedFiles[dispatchKey] || {};

  return {
    id: row.global_dispatch_id,
    global_dispatch_id: row.global_dispatch_id,
    dispatch_number: row.dispatch_number || "—",
    dispatch_date: row.dispatch_date ? String(row.dispatch_date).slice(0, 10) : "—",
    departure_date: row.departure_date ? String(row.departure_date).slice(0, 10) : "—",
    customer_name: row.customer_name || "—",
    customer_code: row.customer_code || "—",
    incoterm: row.incoterm || "",
    notes: row.notes || "",
    dispatch_status: row.dispatch_status || "docs_pending",
    all_cleared: !!row.all_cleared,
    statuses: DOCS.reduce((acc, doc) => {
      acc[doc.field] = {
        done: toDone(row[doc.field]),
        fileName: files[doc.field] || "",
      };
      return acc;
    }, {}),
  };
};

const countDone = (record) =>
  DOCS.reduce((count, doc) => count + (record?.statuses?.[doc.field]?.done ? 1 : 0), 0);

const badgeClass = (label) => {
  const value = String(label || "").toLowerCase();
  if (value === "delivered" || value === "cleared") return "badge bg-g";
  return "badge bg-a";
};

const getUiStatus = (record) => {
  const status = String(record?.dispatch_status || "").toLowerCase();
  if (status === "delivered") return "Delivered";
  if (record?.all_cleared) return "Cleared";
  return "Docs Pending";
};

const getToneClass = (doc, done) => {
  if (done) return "done";
  if (doc.tone === "warn") return "warn";
  return "missing";
};

export default function ExportDocumentListPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focusField, setFocusField] = useState("");

  const [form, setForm] = useState({
    globalDispatchId: "",
    shipmentLabel: "",
    docSetNo: "",
    notes: "",
    statuses: {},
    fileNames: {},
  });

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const storedFiles = readStoredFiles();
      const res = await api.get("/export-documents");
      const list = Array.isArray(res.data) ? res.data : [];
      setRows(list.map((row) => normalizeRecord(row, storedFiles)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load export document records");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const loadDetailsByDispatch = useCallback(
    async (dispatchId) => {
      try {
        setPanelLoading(true);
        const storedFiles = readStoredFiles();
        const res = await api.get(`/export-documents/by-dispatch/${dispatchId}`);
        const record = normalizeRecord(res.data, storedFiles);
        setSelectedRecord(record);
        setSelectedRowId(record.global_dispatch_id);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load export document details");
      } finally {
        setPanelLoading(false);
      }
    },
    [toast]
  );

  const fillModalFromDispatch = useCallback(
    async (dispatchId, targetField = "") => {
      try {
        setModalLoading(true);
        setFocusField(targetField);

        const storedFiles = readStoredFiles();
        const res = await api.get(`/export-documents/by-dispatch/${dispatchId}`);
        const record = normalizeRecord(res.data, storedFiles);

        setForm({
          globalDispatchId: String(record.global_dispatch_id),
          shipmentLabel: `${record.dispatch_number} — ${record.customer_name}`,
          docSetNo: `DOC-${String(record.dispatch_number).replace("SHP-", "")}`,
          notes: record.notes || "",
          statuses: DOCS.reduce((acc, doc) => {
            acc[doc.field] = record.statuses[doc.field]?.done || false;
            return acc;
          }, {}),
          fileNames: DOCS.reduce((acc, doc) => {
            acc[doc.field] = record.statuses[doc.field]?.fileName || "";
            return acc;
          }, {}),
        });

        setShowModal(true);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load shipment document set");
      } finally {
        setModalLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    const handler = (event) => {
      const dispatchId = event?.detail?.dispatchId;
      if (dispatchId) {
        fillModalFromDispatch(dispatchId);
        return;
      }

      if (!rows.length) {
        toast.info("Create a global shipment first, then manage its export documents.");
        return;
      }

      fillModalFromDispatch(rows[0].global_dispatch_id);
    };

    window.addEventListener("fw-open-export-documents-modal", handler);
    return () => window.removeEventListener("fw-open-export-documents-modal", handler);
  }, [rows, fillModalFromDispatch, toast]);

  useEffect(() => {
    const dispatchId = searchParams.get("dispatchId");
    if (dispatchId && rows.length) {
      fillModalFromDispatch(dispatchId);
    }
  }, [searchParams, rows, fillModalFromDispatch]);

  const modalDoneCount = useMemo(() => {
    return DOCS.reduce((count, doc) => count + (form.statuses?.[doc.field] ? 1 : 0), 0);
  }, [form.statuses]);

  const handleSelectShipment = async (e) => {
    await fillModalFromDispatch(e.target.value);
  };

  const handleToggleStatus = (field, done) => {
    setForm((prev) => ({
      ...prev,
      statuses: {
        ...prev.statuses,
        [field]: done,
      },
      fileNames: done
        ? prev.fileNames
        : {
            ...prev.fileNames,
            [field]: "",
          },
    }));
  };

  const handleUploadName = (field, file) => {
    if (!file) return;

    setForm((prev) => ({
      ...prev,
      statuses: {
        ...prev.statuses,
        [field]: true,
      },
      fileNames: {
        ...prev.fileNames,
        [field]: file.name,
      },
    }));

    const label = DOCS.find((doc) => doc.field === field)?.label || "Document";
    toast.info(`${label} attached`);
  };

  const handleSave = async () => {
    if (!form.globalDispatchId) {
      toast.error("Select a shipment first");
      return;
    }

    try {
      setSaving(true);

      await api.put(`/export-documents/by-dispatch/${form.globalDispatchId}`, {
        commercial_invoice_status: form.statuses.commercial_invoice_status ? "done" : "pending",
        packing_list_status: form.statuses.packing_list_status ? "done" : "pending",
        phytosanitary_certificate_status: form.statuses.phytosanitary_certificate_status ? "done" : "pending",
        airway_bill_status: form.statuses.airway_bill_status ? "done" : "pending",
        certificate_of_origin_status: form.statuses.certificate_of_origin_status ? "done" : "pending",
        health_certificate_status: form.statuses.health_certificate_status ? "done" : "pending",
        insurance_certificate_status: form.statuses.insurance_certificate_status ? "done" : "pending",
        notes: form.notes,
      });

      const stored = readStoredFiles();
      stored[String(form.globalDispatchId)] = { ...form.fileNames };
      writeStoredFiles(stored);

      await loadRows();

      if (selectedRowId && Number(selectedRowId) === Number(form.globalDispatchId)) {
        await loadDetailsByDispatch(form.globalDispatchId);
      }

      setShowModal(false);

      if (modalDoneCount === 7) {
        toast.success("All 7 documents verified. Shipment marked cleared.");
      } else {
        toast.info(`Document status saved. ${modalDoneCount}/7 complete.`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save export document status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="ib ib-i">
        <span>📄</span>
        <div>
          All 7 documents must be verified before a shipment can be <strong>Cleared</strong> and
          stock deducted. Use <strong>+ Create Document Set</strong> above to upload and confirm
          documents per shipment.
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Document Status by Shipment</h3>
        </div>

        <table className="global-dispatch-table" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: "18%" }}>SHIPMENT</th>
              {DOCS.map((doc) => (
                <th key={doc.field} style={{ width: "8%", fontSize: 9 }}>
                  {doc.short}
                </th>
              ))}
              <th style={{ width: "12%" }}>ALL CLEAR?</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={DOCS.length + 2}>Loading...</td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.global_dispatch_id}
                  onClick={() => loadDetailsByDispatch(row.global_dispatch_id)}
                  className={selectedRowId === row.global_dispatch_id ? "details-row-active" : ""}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ fontWeight: 700 }}>{row.dispatch_number}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>{row.customer_name}</div>
                  </td>

                  {DOCS.map((doc) => {
                    const done = row.statuses?.[doc.field]?.done;

                    return (
                      <td
                        key={doc.field}
                        style={{ textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {done ? (
                          <span className="badge bg-g">✅</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-d btn-xs"
                            onClick={() => fillModalFromDispatch(row.global_dispatch_id, doc.field)}
                          >
                            Upload
                          </button>
                        )}
                      </td>
                    );
                  })}

                  <td>
                    <span className={badgeClass(getUiStatus(row))}>
                      {row.all_cleared ? "✅ Cleared" : `Missing ${7 - countDone(row)}`}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={DOCS.length + 2}>No export document records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="cc">
        <h3>Export Document Reference</h3>
        <p>What each document is and where it comes from</p>

        <table>
          <thead>
            <tr>
              <th>DOCUMENT</th>
              <th>PURPOSE</th>
              <th>ISSUED BY</th>
              <th>REQUIRED?</th>
            </tr>
          </thead>
          <tbody>
            {DOCS.map((doc) => (
              <tr key={doc.field}>
                <td style={{ fontWeight: 600 }}>{doc.label}</td>
                <td style={{ fontSize: 11, color: "var(--text2)" }}>{doc.purpose}</td>
                <td style={{ fontSize: 11 }}>{doc.issuer}</td>
                <td>
                  <span className={`badge ${doc.required === "Always" ? "bg-g" : "bg-a"}`}>
                    {doc.required}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRecord ? (
        <>
          <div className="details-panel-overlay" onClick={() => setSelectedRecord(null)}></div>

          <aside className="details-panel open">
            <div className="details-panel-header">
              <div className="details-panel-icon">📄</div>

              <div className="details-panel-head-text">
                <h3>{selectedRecord.dispatch_number}</h3>
                <p>
                  {selectedRecord.customer_name} · {selectedRecord.dispatch_date}
                </p>
              </div>

              <button
                type="button"
                className="details-panel-close"
                onClick={() => setSelectedRecord(null)}
              >
                ✕
              </button>
            </div>

            <div className="details-panel-body">
              {panelLoading ? (
                <div className="ib ib-i">
                  <span>⏳</span>
                  <div>Loading export document details...</div>
                </div>
              ) : (
                <>
                  <div className="details-panel-grid">
                    <div className="details-stat-card">
                      <label>DOC SET</label>
                      <span>{`DOC-${String(selectedRecord.dispatch_number).replace("SHP-", "")}`}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>STATUS</label>
                      <span>• {getUiStatus(selectedRecord)}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>CUSTOMER</label>
                      <span>{selectedRecord.customer_name}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>DISPATCH DATE</label>
                      <span>{selectedRecord.dispatch_date}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>INCOTERM</label>
                      <span>{selectedRecord.incoterm || "—"}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>PROGRESS</label>
                      <span>{countDone(selectedRecord)}/7 complete</span>
                    </div>
                  </div>

                  <div className="details-mini-title">7 REQUIRED DOCUMENTS</div>

                  <table className="details-mini-table">
                    <thead>
                      <tr>
                        <th>DOCUMENT</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DOCS.map((doc) => {
                        const entry = selectedRecord.statuses?.[doc.field];

                        return (
                          <tr key={doc.field}>
                            <td>
                              <div style={{ fontWeight: 700 }}>{doc.label}</div>
                              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                                {entry?.fileName || "No file selected"}
                              </div>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              {entry?.done ? "✅ Done" : "❌ Missing"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="details-mini-title">NOTES</div>
                  <div className="details-stat-card">
                    <span>{selectedRecord.notes || "—"}</span>
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 18px 16px",
                borderTop: "1px solid var(--border)",
                background: "var(--white)",
              }}
            >
              <button
                type="button"
                style={{
                  flex: "1 1 auto",
                  height: 38,
                  padding: "0 18px",
                  borderRadius: 11,
                  border: "none",
                  background: "var(--g600)",
                  color: "#fff",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => fillModalFromDispatch(selectedRecord.global_dispatch_id)}
              >
                ✏️ Update Doc Set
              </button>

              <button
                type="button"
                style={{
                  minWidth: 116,
                  height: 38,
                  padding: "0 16px",
                  borderRadius: 11,
                  border: "1.5px solid var(--border)",
                  background: "#fff",
                  color: "var(--g700)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </aside>
        </>
      ) : null}

      {showModal ? (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="md md-lg"
            style={{ maxWidth: 920, width: "100%", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md-h">
              <h3>📄 Create / Update Export Document Set</h3>
              <button type="button" className="md-x" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <div className="md-b" style={{ overflowY: "auto" }}>
              {modalLoading ? (
                <div className="ib ib-i">
                  <span>⏳</span>
                  <div>Loading document set...</div>
                </div>
              ) : (
                <>
                  <div className="ib ib-i">
                    <span>📄</span>
                    <div>
                      All 7 documents must be marked <strong>Done</strong> before the shipment can
                      be cleared and stock deducted.
                    </div>
                  </div>

                  <div className="fr">
                    <div className="ff">
                      <label className="fl">
                        Linked Shipment <span className="rq">*</span>
                      </label>

                      <select
                        className="fc"
                        value={form.globalDispatchId}
                        onChange={handleSelectShipment}
                      >
                        {rows.map((row) => (
                          <option key={row.global_dispatch_id} value={row.global_dispatch_id}>
                            {row.dispatch_number} — {row.customer_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ff">
                      <label className="fl">Doc Set No.</label>
                      <input
                        className="fc"
                        value={form.docSetNo}
                        readOnly
                        style={{ background: "var(--ivory)" }}
                      />
                    </div>
                  </div>

                  <div className="fst" style={{ marginBottom: 11 }}>
                    7 Required Documents
                  </div>

                  <div className="doc-set-list">
                    {DOCS.map((doc, index) => {
                      const done = !!form.statuses?.[doc.field];
                      const tone = getToneClass(doc, done);
                      const isFocused = focusField === doc.field;

                      return (
                        <div
                          key={doc.field}
                          className={`doc-set-row ${tone}`}
                          style={
                            isFocused
                              ? { outline: "2px solid var(--a500)", outlineOffset: "0px" }
                              : undefined
                          }
                        >
                          <div className={`doc-set-index ${tone}`}>{index + 1}</div>

                          <div className="doc-set-main">
                            <div className="doc-set-title">
                              {doc.label}{" "}
                              {doc.required === "CIF only" ? <span>{doc.required}</span> : null}
                            </div>
                            <div className="doc-set-sub">
                              {doc.issuer}
                              {form.fileNames?.[doc.field]
                                ? ` · ${form.fileNames[doc.field]}`
                                : " · No file selected"}
                            </div>
                          </div>

                          <div className="doc-set-actions">
                            <button
                              type="button"
                              className={`doc-chip done ${done ? "on" : ""}`}
                              onClick={() => handleToggleStatus(doc.field, true)}
                            >
                              ✅ Done
                            </button>

                            <button
                              type="button"
                              className={`doc-chip miss ${!done ? "on" : ""}`}
                              onClick={() => handleToggleStatus(doc.field, false)}
                            >
                              ❌ Missing
                            </button>

                            <label
                              className="doc-chip upload"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              📎 Upload
                              <input
                                type="file"
                                hidden
                                onChange={(e) => handleUploadName(doc.field, e.target.files?.[0])}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="ff" style={{ marginTop: 14 }}>
                    <label className="fl">Notes</label>
                    <textarea
                      className="fc"
                      style={{ minHeight: 86 }}
                      value={form.notes}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Any remarks about missing or confirmed documents..."
                    />
                  </div>

                  <div className="doc-summary-row">
                    <div className="doc-summary-left">Document Progress</div>
                    <div
                      className="doc-summary-right"
                      style={{
                        color:
                          modalDoneCount === 7
                            ? "var(--s)"
                            : modalDoneCount >= 4
                            ? "var(--a600)"
                            : "var(--d)",
                      }}
                    >
                      {modalDoneCount} / 7 complete
                    </div>
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 10,
                padding: "14px 24px 18px",
                borderTop: "1px solid var(--border)",
                background: "#fff",
              }}
            >
              <button
                type="button"
                style={{
                  height: 38,
                  minWidth: 84,
                  padding: "0 18px",
                  borderRadius: 10,
                  border: "1.5px solid var(--border)",
                  background: "#fff",
                  color: "var(--g700)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                style={{
                  height: 38,
                  minWidth: 170,
                  padding: "0 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--g800)",
                  color: "#fff",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "💾 Save Document Status"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}