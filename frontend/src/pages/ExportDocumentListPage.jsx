import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

const DOCS = [
  {
    key: "commercial_invoice_status",
    label: "Commercial Invoice",
    purpose: "Price and terms of sale",
    issuedBy: "Fresh World Exporters",
    required: "Always",
  },
  {
    key: "packing_list_status",
    label: "Packing List",
    purpose: "Itemized shipment contents",
    issuedBy: "Fresh World Exporters",
    required: "Always",
  },
  {
    key: "phytosanitary_certificate_status",
    label: "Phytosanitary Certificate",
    purpose: "Confirms produce is pest/disease free",
    issuedBy: "Plant Quarantine Dept.",
    required: "Always",
  },
  {
    key: "airway_bill_status",
    label: "Airway Bill (AWB)",
    purpose: "Air freight contract",
    issuedBy: "Airline (SriLankan / Q2)",
    required: "Always",
  },
  {
    key: "certificate_of_origin_status",
    label: "Certificate of Origin",
    purpose: "Confirms goods are from Sri Lanka",
    issuedBy: "Chamber of Commerce",
    required: "Always",
  },
  {
    key: "health_certificate_status",
    label: "Health Certificate",
    purpose: "Confirms goods are safe to consume",
    issuedBy: "Ministry of Health",
    required: "Always",
  },
  {
    key: "insurance_certificate_status",
    label: "Insurance Certificate",
    purpose: "Cargo insurance certificate",
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

  const toggleDoc = (field) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field] === "done" ? "pending" : "done",
    }));
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
          stock deducted. Use <strong>+ Create Document Set</strong> above to upload and confirm
          documents per shipment.
        </div>
      </div>

      <div className="content-card" style={{ marginTop: 16 }}>
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
                      <td><span className={statusBadge(row.commercial_invoice_status)}>{row.commercial_invoice_status === "done" ? "Done" : "Pending"}</span></td>
                      <td><span className={statusBadge(row.packing_list_status)}>{row.packing_list_status === "done" ? "Done" : "Pending"}</span></td>
                      <td><span className={statusBadge(row.phytosanitary_certificate_status)}>{row.phytosanitary_certificate_status === "done" ? "Done" : "Pending"}</span></td>
                      <td><span className={statusBadge(row.airway_bill_status)}>{row.airway_bill_status === "done" ? "Done" : "Pending"}</span></td>
                      <td><span className={statusBadge(row.certificate_of_origin_status)}>{row.certificate_of_origin_status === "done" ? "Done" : "Pending"}</span></td>
                      <td><span className={statusBadge(row.health_certificate_status)}>{row.health_certificate_status === "done" ? "Done" : "Pending"}</span></td>
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

      <div className="content-card" style={{ marginTop: 16 }}>
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
                  <td>{doc.purpose}</td>
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
            style={{ width: "100%", maxWidth: 900 }}
          >
            <div className="md-h">
              <h3>📄 Export Document Set</h3>
              <button type="button" className="md-x" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="md-b">
                <div className="ib ib-i">
                  <span>📎</span>
                  <div>
                    Complete all required documents for the selected shipment. Insurance is required
                    only for <strong>CIF</strong> shipments.
                  </div>
                </div>

                <div className="ff" style={{ marginTop: 16 }}>
                  <label className="fl">Shipment</label>
                  <select
                    className="fc"
                    value={form.global_dispatch_id}
                    onChange={(e) => handleShipmentChange(e.target.value)}
                  >
                    <option value="">Select shipment</option>
                    {shipments.map((shipment) => (
                      <option key={shipment.id} value={shipment.id}>
                        {shipment.dispatch_number} — {shipment.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedShipment && (
                  <div className="fr3">
                    <div className="ff">
                      <label className="fl">Customer</label>
                      <input className="fc" value={selectedShipment.customer_name || ""} readOnly />
                    </div>
                    <div className="ff">
                      <label className="fl">Shipment Date</label>
                      <input className="fc" value={formatDate(selectedShipment.dispatch_date)} readOnly />
                    </div>
                    <div className="ff">
                      <label className="fl">Incoterm</label>
                      <input className="fc" value={selectedShipment.incoterm || ""} readOnly />
                    </div>
                  </div>
                )}

                <div className="fs2" style={{ marginTop: 8 }}>
                  <div className="fst">Documents to verify</div>

                  <ul className="ck-l">
                    {DOCS.map((doc) => {
                      const insuranceOptional =
                        doc.key === "insurance_certificate_status" &&
                        String(selectedShipment?.incoterm || "").toUpperCase() !== "CIF";

                      return (
                        <li key={doc.key}>
                          <input
                            type="checkbox"
                            checked={form[doc.key] === "done"}
                            onChange={() => toggleDoc(doc.key)}
                            disabled={insuranceOptional}
                          />
                          <span style={{ flex: 1 }}>{doc.label}</span>
                          {insuranceOptional ? (
                            <span className="badge bg-a">CIF only</span>
                          ) : (
                            <span className={form[doc.key] === "done" ? "badge bg-g" : "badge bg-a"}>
                              {form[doc.key] === "done" ? "Done" : "Pending"}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="ff">
                  <label className="fl">Notes</label>
                  <textarea
                    className="fc"
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Document notes..."
                  />
                </div>
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-p" disabled={saving}>
                  {saving ? "Saving..." : "Save Document Set"}
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