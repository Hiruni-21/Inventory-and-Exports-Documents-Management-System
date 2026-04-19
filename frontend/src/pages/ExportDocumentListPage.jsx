import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

const DOCS = [
  {
    key: "commercial_invoice_status",
    label: "Commercial Invoice",
    issuedBy: "Fresh World Exporters",
    required: "Always",
  },
  {
    key: "packing_list_status",
    label: "Packing List",
    issuedBy: "Fresh World Exporters",
    required: "Always",
  },
  {
    key: "phytosanitary_certificate_status",
    label: "Phytosanitary Certificate",
    issuedBy: "Plant Quarantine Dept.",
    required: "Always",
  },
  {
    key: "airway_bill_status",
    label: "Airway Bill (AWB)",
    issuedBy: "Airline (SriLankan / Maldivian)",
    required: "Always",
  },
  {
    key: "certificate_of_origin_status",
    label: "Certificate of Origin",
    issuedBy: "Chamber of Commerce",
    required: "Always",
  },
  {
    key: "health_certificate_status",
    label: "Health Certificate",
    issuedBy: "Ministry of Health",
    required: "Always",
  },
  {
    key: "insurance_certificate_status",
    label: "Insurance Certificate",
    issuedBy: "Insurance Company",
    required: "CIF only",
  },
];

const emptyForm = {
  global_dispatch_id: "",
  commercial_invoice_status: "pending",
  packing_list_status: "pending",
  phytosanitary_certificate_status: "pending",
  airway_bill_status: "pending",
  certificate_of_origin_status: "pending",
  health_certificate_status: "pending",
  insurance_certificate_status: "pending",
  notes: "",
};

const statusBadge = (value) => {
  if (value === "done") return "badge bg-g";
  return "badge bg-a";
};

const requiredBadge = (value) => {
  if (value === "Always") return "badge bg-g";
  return "badge bg-a";
};

const formatDate = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

const isInsuranceRequired = (shipmentOrIncoterm) =>
  String(
    typeof shipmentOrIncoterm === "string"
      ? shipmentOrIncoterm
      : shipmentOrIncoterm?.incoterm || ""
  ).toUpperCase() === "CIF";

const getRequiredCount = (shipmentOrIncoterm) =>
  isInsuranceRequired(shipmentOrIncoterm) ? 7 : 6;

const getDoneCount = (form, shipment) => {
  const fields = isInsuranceRequired(shipment)
    ? DOCS.map((doc) => doc.key)
    : DOCS.filter((doc) => doc.key !== "insurance_certificate_status").map((doc) => doc.key);

  return fields.filter((field) => form[field] === "done").length;
};

const getDocSetNo = (shipment) => {
  if (!shipment?.dispatch_number) return "";
  return String(shipment.dispatch_number).replace(/^SHP-/, "DOC-");
};

const getShipmentOptionLabel = (shipment) => {
  const flight = shipment.flight_no || shipment.airline || "—";
  return `${shipment.dispatch_number} — ${shipment.customer_name} · ${flight} · ${formatDate(
    shipment.dispatch_date
  )}`;
};

const getDocRowStyle = (doc, status, shipment) => {
  const insuranceOptional =
    doc.key === "insurance_certificate_status" && !isInsuranceRequired(shipment);

  if (insuranceOptional) {
    return {
      background: "var(--a100)",
      border: "1px solid rgba(232,168,56,.25)",
    };
  }

  if (status === "done") {
    return {
      background: "var(--ivory)",
      border: "1px solid var(--border)",
    };
  }

  return {
    background: "var(--d100)",
    border: "1px solid rgba(200,75,47,.2)",
  };
};

const getDocNumberStyle = (doc, status, shipment) => {
  const insuranceOptional =
    doc.key === "insurance_certificate_status" && !isInsuranceRequired(shipment);

  if (insuranceOptional) {
    return {
      width: 22,
      height: 22,
      background: "var(--a100)",
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 800,
      color: "var(--a600)",
      flexShrink: 0,
      border: "1px solid rgba(232,168,56,.3)",
    };
  }

  if (status === "done") {
    return {
      width: 22,
      height: 22,
      background: "var(--s100)",
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 800,
      color: "var(--s)",
      flexShrink: 0,
    };
  }

  return {
    width: 22,
    height: 22,
    background: "var(--d100)",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    color: "var(--d)",
    flexShrink: 0,
    border: "1px solid rgba(200,75,47,.3)",
  };
};

const ExportDocumentListPage = () => {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const dispatchIdFromQuery = searchParams.get("dispatchId") || "";

  const [rows, setRows] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const selectedShipment = useMemo(
    () => shipments.find((shipment) => String(shipment.id) === String(form.global_dispatch_id)),
    [shipments, form.global_dispatch_id]
  );

  const doneCount = useMemo(
    () => getDoneCount(form, selectedShipment),
    [form, selectedShipment]
  );

  const requiredCount = useMemo(
    () => getRequiredCount(selectedShipment),
    [selectedShipment]
  );

  const loadPage = async () => {
    try {
      setLoading(true);

      const [documentsRes, shipmentsRes] = await Promise.all([
        api.get("/export-docs"),
        api.get("/export-docs/shipments"),
      ]);

      const documentRows = Array.isArray(documentsRes.data) ? documentsRes.data : [];
      const shipmentRows = Array.isArray(shipmentsRes.data) ? shipmentsRes.data : [];

      setRows(documentRows);
      setShipments(shipmentRows);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load export documents");
      setRows([]);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    const openHandler = () => {
      setForm((prev) => ({
        ...emptyForm,
        global_dispatch_id: prev.global_dispatch_id || dispatchIdFromQuery || "",
      }));
      setShowModal(true);
    };

    window.addEventListener("fw-open-export-docs-modal", openHandler);
    return () => window.removeEventListener("fw-open-export-docs-modal", openHandler);
  }, [dispatchIdFromQuery]);

  useEffect(() => {
    if (!dispatchIdFromQuery || !rows.length) return;

    const existing = rows.find(
      (row) => String(row.global_dispatch_id) === String(dispatchIdFromQuery)
    );

    if (existing) {
      setForm({
        global_dispatch_id: String(existing.global_dispatch_id),
        commercial_invoice_status: existing.commercial_invoice_status || "pending",
        packing_list_status: existing.packing_list_status || "pending",
        phytosanitary_certificate_status: existing.phytosanitary_certificate_status || "pending",
        airway_bill_status: existing.airway_bill_status || "pending",
        certificate_of_origin_status: existing.certificate_of_origin_status || "pending",
        health_certificate_status: existing.health_certificate_status || "pending",
        insurance_certificate_status: existing.insurance_certificate_status || "pending",
        notes: existing.notes || "",
      });
      setShowModal(true);
    }
  }, [dispatchIdFromQuery, rows]);

  useEffect(() => {
    if (!showModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  const openForRow = (row) => {
    setForm({
      global_dispatch_id: String(row.global_dispatch_id),
      commercial_invoice_status: row.commercial_invoice_status || "pending",
      packing_list_status: row.packing_list_status || "pending",
      phytosanitary_certificate_status: row.phytosanitary_certificate_status || "pending",
      airway_bill_status: row.airway_bill_status || "pending",
      certificate_of_origin_status: row.certificate_of_origin_status || "pending",
      health_certificate_status: row.health_certificate_status || "pending",
      insurance_certificate_status: row.insurance_certificate_status || "pending",
      notes: row.notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleShipmentChange = (value) => {
    const existing = rows.find((row) => String(row.global_dispatch_id) === String(value));

    if (existing) {
      setForm({
        global_dispatch_id: String(existing.global_dispatch_id),
        commercial_invoice_status: existing.commercial_invoice_status || "pending",
        packing_list_status: existing.packing_list_status || "pending",
        phytosanitary_certificate_status: existing.phytosanitary_certificate_status || "pending",
        airway_bill_status: existing.airway_bill_status || "pending",
        certificate_of_origin_status: existing.certificate_of_origin_status || "pending",
        health_certificate_status: existing.health_certificate_status || "pending",
        insurance_certificate_status: existing.insurance_certificate_status || "pending",
        notes: existing.notes || "",
      });
    } else {
      setForm({
        ...emptyForm,
        global_dispatch_id: value,
      });
    }
  };

  const setDocStatus = (field, nextValue) => {
    if (field === "insurance_certificate_status" && !isInsuranceRequired(selectedShipment)) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  const handleUploadPlaceholder = (docLabel) => {
    toast.info(`${docLabel} upload UI is shown. File storage is not changed in this step.`);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.global_dispatch_id) {
      toast.error("Please select a shipment first");
      return;
    }

    try {
      setSaving(true);

      const res = await api.put(`/export-docs/by-dispatch/${form.global_dispatch_id}`, form);

      toast.success(res.data?.message || "Export document set updated");
      setShowModal(false);
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save export document set");
    } finally {
      setSaving(false);
    }
  };

  const noShipments = !loading && shipments.length === 0;

  return (
    <>
      <div className="ib ib-i">
        <span>📄</span>
        <div>
          All 7 documents must be verified before a shipment can be <strong>Cleared</strong> and
          stock deducted. Use <strong>+ Create Document Set</strong> on this page to upload and confirm
          documents per shipment.
        </div>
      </div>

      <div className="page-toolbar" style={{ marginTop: 16 }}>
        <div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-p btn-sm"
            onClick={() => window.dispatchEvent(new Event("fw-open-export-docs-modal"))}
          >
            + Create Document Set
          </button>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>Document Status by Shipment</h3>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SHIPMENT</th>
                <th>INVOICE</th>
                <th>PACKING</th>
                <th>PHYTO</th>
                <th>AWB</th>
                <th>ORIGIN</th>
                <th>HEALTH</th>
                <th>INSURANCE</th>
                <th>ALL CLEAR?</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9">Loading...</td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row) => {
                  const insuranceRequired = row.insurance_required;

                  return (
                    <tr key={row.id} onClick={() => openForRow(row)} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: 700 }}>{row.dispatch_number}</td>
                      <td>
                        <span className={statusBadge(row.commercial_invoice_status)}>
                          {row.commercial_invoice_status === "done" ? "Done" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadge(row.packing_list_status)}>
                          {row.packing_list_status === "done" ? "Done" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadge(row.phytosanitary_certificate_status)}>
                          {row.phytosanitary_certificate_status === "done" ? "Done" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadge(row.airway_bill_status)}>
                          {row.airway_bill_status === "done" ? "Done" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadge(row.certificate_of_origin_status)}>
                          {row.certificate_of_origin_status === "done" ? "Done" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadge(row.health_certificate_status)}>
                          {row.health_certificate_status === "done" ? "Done" : "Pending"}
                        </span>
                      </td>
                      <td>
                        {insuranceRequired ? (
                          <span className={statusBadge(row.insurance_certificate_status)}>
                            {row.insurance_certificate_status === "done" ? "Done" : "Pending"}
                          </span>
                        ) : (
                          <span className="badge bg-a">CIF only</span>
                        )}
                      </td>
                      <td>
                        <span className={row.all_cleared ? "badge bg-g" : "badge bg-a"}>
                          {row.all_cleared ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9">No export document records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header-row" style={{ display: "block" }}>
          <h3>Export Document Reference</h3>
          <p style={{ color: "var(--text2)", marginTop: 4, fontSize: 13 }}>
            What each document is and where it comes from
          </p>
        </div>

        <div className="table-wrap">
          <table className="data-table">
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
                <tr key={doc.key}>
                  <td style={{ fontWeight: 700 }}>{doc.label}</td>
                  <td>
                    {doc.key === "commercial_invoice_status" && "Price and terms of sale"}
                    {doc.key === "packing_list_status" && "Itemized shipment contents"}
                    {doc.key === "phytosanitary_certificate_status" &&
                      "Confirms produce is pest/disease free"}
                    {doc.key === "airway_bill_status" && "Air freight contract"}
                    {doc.key === "certificate_of_origin_status" &&
                      "Confirms goods are from Sri Lanka"}
                    {doc.key === "health_certificate_status" &&
                      "Confirms goods are safe to consume"}
                    {doc.key === "insurance_certificate_status" &&
                      "Cargo insurance certificate"}
                  </td>
                  <td>{doc.issuedBy}</td>
                  <td>
                    <span className={requiredBadge(doc.required)}>{doc.required}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {noShipments && (
        <div className="ib ib-i" style={{ marginTop: 18 }}>
          <span>ℹ️</span>
          <div>Create a global shipment first, then manage its export documents.</div>
        </div>
      )}

      {showModal && (
        <div
          className="modal-backdrop"
          onClick={closeModal}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            className="md md-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 920, maxHeight: "92vh", display: "flex", flexDirection: "column" }}
          >
            <div className="md-h">
              <h3>📄 Create / Update Export Document Set</h3>
              <button type="button" className="md-x" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSave}
              style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
            >
              <div className="md-b" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
                <div className="ib ib-i">
                  <span>📄</span>
                  <div>
                    All {requiredCount} documents must be marked Done before the shipment can be
                    Cleared and stock deducted.
                  </div>
                </div>

                <div className="fr" style={{ marginTop: 16 }}>
                  <div className="ff">
                    <label className="fl">
                      Linked Shipment <span className="rq">*</span>
                    </label>
                    <select
                      className="fc"
                      value={form.global_dispatch_id}
                      onChange={(e) => handleShipmentChange(e.target.value)}
                    >
                      <option value="">Select shipment</option>
                      {shipments.map((shipment) => (
                        <option key={shipment.id} value={shipment.id}>
                          {getShipmentOptionLabel(shipment)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ff">
                    <label className="fl">Doc Set No.</label>
                    <input
                      className="fc"
                      value={getDocSetNo(selectedShipment)}
                      readOnly
                      style={{ background: "var(--ivory)" }}
                    />
                  </div>
                </div>

                <div className="fst" style={{ marginBottom: 11 }}>
                  {requiredCount} Required Documents
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {DOCS.map((doc, index) => {
                    const insuranceOptional =
                      doc.key === "insurance_certificate_status" &&
                      !isInsuranceRequired(selectedShipment);

                    const status = insuranceOptional ? "pending" : form[doc.key];
                    const rowStyle = getDocRowStyle(doc, status, selectedShipment);
                    const numberStyle = getDocNumberStyle(doc, status, selectedShipment);

                    return (
                      <div
                        key={doc.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          padding: "9px 13px",
                          borderRadius: 9,
                          ...rowStyle,
                        }}
                      >
                        <div style={numberStyle}>{index + 1}</div>

                        <div
                          style={{
                            flex: 1,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--g900)",
                          }}
                        >
                          {doc.label}{" "}
                          {doc.key === "insurance_certificate_status" && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--a600)",
                                fontWeight: 600,
                              }}
                            >
                              CIF only
                            </span>
                          )}{" "}
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text3)",
                              fontWeight: 400,
                            }}
                          >
                            — {doc.issuedBy}
                          </span>
                        </div>

                        <div className="tg" style={{ gap: 5, flexShrink: 0, minWidth: 146 }}>
                          <button
                            type="button"
                            className={`to ${!insuranceOptional && form[doc.key] === "done" ? "on" : ""}`}
                            style={{ padding: "3px 10px", fontSize: 10 }}
                            onClick={() => setDocStatus(doc.key, "done")}
                            disabled={insuranceOptional}
                          >
                            ✅ Done
                          </button>

                          <button
                            type="button"
                            className={`to ${
                              insuranceOptional || form[doc.key] !== "done" ? "on-r" : ""
                            }`}
                            style={{ padding: "3px 10px", fontSize: 10 }}
                            onClick={() => setDocStatus(doc.key, "pending")}
                          >
                            ❌ Missing
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn btn-s btn-xs"
                          onClick={() => handleUploadPlaceholder(doc.label)}
                        >
                          📎 Upload
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: "12px 16px",
                    background: "var(--g100)",
                    borderRadius: 10,
                    border: "1px solid var(--g200)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--g800)",
                    }}
                  >
                    Document Progress
                  </span>

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: doneCount === requiredCount ? "var(--g700)" : "var(--d)",
                    }}
                  >
                    {doneCount} / {requiredCount} complete
                  </span>
                </div>

                <div className="ff" style={{ marginTop: 14 }}>
                  <label className="fl">Notes</label>
                  <textarea
                    className="fc"
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Document notes..."
                    style={{ minHeight: 88 }}
                  />
                </div>
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="btn btn-p" disabled={saving}>
                  {saving ? "Saving..." : "💾 Save Document Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportDocumentListPage;