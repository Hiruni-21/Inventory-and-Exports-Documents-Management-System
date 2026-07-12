import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import { Search } from "lucide-react";
import dayjs from "dayjs";

const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands",
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden"
];

const isEUCountry = (countryStr) => {
  if (!countryStr) return false;
  return EU_COUNTRIES.includes(countryStr.trim());
};

const DOCS = [
  { type: "commercial_invoice", label: "Commercial Invoice", issuedBy: "Exporter", required: "Yes" },
  { type: "packing_list", label: "Packing List", issuedBy: "Exporter", required: "Yes" },
  { type: "phytosanitary_certificate", label: "Phytosanitary Certificate", issuedBy: "NPQ", required: "Yes" },
  { type: "airway_bill", label: "Airway Bill", issuedBy: "Airline / Freight Forwarder", required: "Yes" },
  { type: "certificate_of_origin", label: "Certificate of Origin", issuedBy: "Chamber of Commerce", required: "Yes" },
  { type: "health_certificate", label: "Health Certificate", issuedBy: "Dept of Health", required: "Yes" },
  { type: "insurance_certificate", label: "Insurance Certificate", issuedBy: "Insurance Provider", required: "CIF only" },
  { type: "gsp_form_a", label: "GSP Form A", issuedBy: "Department of Commerce, Sri Lanka", required: "EU only" },
];

const isInsuranceRequired = (shipment) => {
  if (!shipment) return false;
  return String(shipment.incoterm || "").toUpperCase() === "CIF";
};

const getRequiredCount = (shipment) => {
  if (!shipment) return 6;
  let count = isInsuranceRequired(shipment) ? 7 : 6;
  if (isEUCountry(shipment.city)) count += 1;
  return count;
};

const getDocSetNo = (shipment) => {
  if (!shipment) return "—";
  return shipment.dispatch_number ? `DOC-${shipment.dispatch_number}` : "—";
};

const requiredBadge = (req) => {
  if (req === "Yes") return "badge bg-a";
  return "badge bg-w";
};

const getShipmentOptionLabel = (shipment) => {
  let parts = [];
  if (shipment.dispatch_number) parts.push(shipment.dispatch_number);
  if (shipment.customer_name) parts.push(shipment.customer_name);
  if (shipment.dispatch_date) parts.push(dayjs(shipment.dispatch_date).format("MMM D"));
  return parts.join(" — ") || `Shipment #${shipment.id}`;
};

const DocumentUploadRow = ({ doc, shipment, documents = [], onUploadSuccess }) => {
  const toast = useToast();
  const fileInputRef = useRef();
  
  const insuranceOptional = doc.type === "insurance_certificate" && !isInsuranceRequired(shipment);
  const uploadedDoc = documents.find(d => d.document_type === doc.type);
  const isDone = !!uploadedDoc;
  
  const [file, setFile] = useState(null);
  const [refNo, setRefNo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [uploading, setUploading] = useState(false);

  const needsExpiry = doc.type === "phytosanitary_certificate" || doc.type === "health_certificate";
  
  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file to upload");
    if (!refNo.trim()) return toast.error("Reference Number is required");
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("global_dispatch_id", shipment.id);
      formData.append("document_type", doc.type);
      formData.append("reference_number", refNo);
      if (expiry) formData.append("expiry_date", expiry);
      formData.append("file", file);

      await api.post("/export-docs/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      toast.success(doc.label + " uploaded successfully");
      setFile(null);
      setRefNo("");
      setExpiry("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isExpired = uploadedDoc && uploadedDoc.expiry_date && dayjs(uploadedDoc.expiry_date).isBefore(dayjs(), 'day');

  const rowStyle = isDone 
    ? { background: "var(--s50)", border: "1px solid var(--s100)" }
    : insuranceOptional 
      ? { opacity: 0.5, background: "var(--bg)", border: "1px dashed var(--border)" }
      : { background: "var(--white)", border: "1px solid var(--border)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px", borderRadius: 9, ...rowStyle }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--g900)" }}>
          {doc.label} {insuranceOptional && <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 6 }}>(Not Required)</span>}
        </div>
        {isDone ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="badge bg-g">Done</span>
            <a href={`${api.defaults.baseURL.replace('/api', '')}${uploadedDoc.file_path}`} target="_blank" rel="noreferrer" className="btn btn-s btn-xs">
              View
            </a>
          </div>
        ) : (
          !insuranceOptional && (
            <span className="badge bg-w">Pending Upload</span>
          )
        )}
      </div>

      {isDone ? (
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text2)", background: "rgba(255,255,255,0.6)", padding: "6px 10px", borderRadius: 6 }}>
          <div><strong>Ref:</strong> {uploadedDoc.reference_number}</div>
          {uploadedDoc.expiry_date && (
            <div>
              <strong>Expiry:</strong> {dayjs(uploadedDoc.expiry_date).format("MMM D, YYYY")}
              {isExpired && <span style={{ color: "var(--d)", fontWeight: 700, marginLeft: 6 }}>(Expired!)</span>}
            </div>
          )}
          <div style={{ marginLeft: "auto" }}>
            Uploaded by {uploadedDoc.uploaded_by_name || "Unknown"} on {dayjs(uploadedDoc.uploaded_at).format("MMM D, HH:mm")}
          </div>
        </div>
      ) : (
        !insuranceOptional && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="ff" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
              <label className="fl" style={{ fontSize: 10 }}>File <span className="rq">*</span></label>
              <input type="file" className="fc" style={{ padding: "4px 8px", fontSize: 12 }} onChange={(e) => setFile(e.target.files[0])} ref={fileInputRef} />
            </div>
            <div className="ff" style={{ flex: 1, minWidth: 120, marginBottom: 0 }}>
              <label className="fl" style={{ fontSize: 10 }}>Ref No. <span className="rq">*</span></label>
              <input type="text" className="fc" style={{ padding: "6px 8px", fontSize: 12 }} placeholder="e.g. INV-100" value={refNo} onChange={e => setRefNo(e.target.value)} />
            </div>
            {needsExpiry && (
              <div className="ff" style={{ flex: 1, minWidth: 120, marginBottom: 0 }}>
                <label className="fl" style={{ fontSize: 10 }}>Expiry Date</label>
                <input type="date" className="fc" style={{ padding: "6px 8px", fontSize: 12 }} value={expiry} onChange={e => setExpiry(e.target.value)} />
              </div>
            )}
            <button type="button" className="btn btn-p btn-sm" onClick={handleUpload} disabled={uploading || !file || !refNo}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        )
      )}
    </div>
  );
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
  
  const [selectedGlobalDispatchId, setSelectedGlobalDispatchId] = useState("");
  const [activeShipmentDetails, setActiveShipmentDetails] = useState(null);
  const [notes, setNotes] = useState("");

  const selectedShipmentMeta = useMemo(
    () => shipments.find((s) => String(s.id) === String(selectedGlobalDispatchId)),
    [shipments, selectedGlobalDispatchId]
  );

  const loadPage = async () => {
    try {
      setLoading(true);
      const [documentsRes, shipmentsRes] = await Promise.all([
        api.get("/export-docs"),
        api.get("/export-docs/shipments"),
      ]);
      setRows(Array.isArray(documentsRes.data) ? documentsRes.data : []);
      setShipments(Array.isArray(shipmentsRes.data) ? shipmentsRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load export documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const fetchDocumentDetails = async (dispatchId) => {
    try {
      const row = rows.find(r => String(r.global_dispatch_id) === String(dispatchId));
      if (!row) return;
      const res = await api.get(`/export-docs/${row.id}`);
      setActiveShipmentDetails(res.data);
      setNotes(res.data.notes || "");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch document details");
    }
  };

  useEffect(() => {
    if (selectedGlobalDispatchId) {
      fetchDocumentDetails(selectedGlobalDispatchId);
    } else {
      setActiveShipmentDetails(null);
      setNotes("");
    }
  }, [selectedGlobalDispatchId, rows]);

  useEffect(() => {
    const openHandler = () => {
      setSelectedGlobalDispatchId(dispatchIdFromQuery || "");
      setShowModal(true);
    };

    window.addEventListener("fw-open-export-docs-modal", openHandler);
    return () => window.removeEventListener("fw-open-export-docs-modal", openHandler);
  }, [dispatchIdFromQuery]);

  useEffect(() => {
    if (!dispatchIdFromQuery || !rows.length) return;
    const existing = rows.find(row => String(row.global_dispatch_id) === String(dispatchIdFromQuery));
    if (existing) {
      setSelectedGlobalDispatchId(String(existing.global_dispatch_id));
      setShowModal(true);
    }
  }, [dispatchIdFromQuery, rows]);

  const openForRow = (row) => {
    setSelectedGlobalDispatchId(String(row.global_dispatch_id));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedGlobalDispatchId("");
    setActiveShipmentDetails(null);
    setNotes("");
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (!selectedGlobalDispatchId) return;

    try {
      setSaving(true);
      await api.put(`/export-docs/by-dispatch/${selectedGlobalDispatchId}`, { notes });
      toast.success("Document notes saved");
      loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const noShipments = !loading && shipments.length === 0;
  
  const documentsList = activeShipmentDetails?.documents || [];
  const requiredCount = getRequiredCount(selectedShipmentMeta);
  const doneCount = activeShipmentDetails ? documentsList.length : 0;

  return (
    <>
      <div className="content-card" style={{ marginTop: 16 }}>
        <div className="card-header-row">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Document Status by Shipment
            <span 
              title="All 7 documents must be verified before a shipment can be Cleared and stock deducted. Use + Create Document Set to upload and confirm documents per shipment."
              style={{ cursor: "help", color: "#6B7D71", display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "#F1F5F9", fontSize: 12, border: "1px solid #E2E8F0" }}
            >
              ℹ
            </span>
          </h3>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span className="count-pill">{rows.length} document sets</span>
            <button className="btn btn-p btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("fw-open-export-docs-modal"))}>+ Create Document Set</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SHIPMENT / DATE</th>
                <th>CUSTOMER</th>
                <th>AIRLINE / AWB</th>
                <th>INCOTERM</th>
                <th>DOCS UPLOADED</th>
                <th>INSURANCE</th>
                <th>ALL CLEARED</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading...</td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row) => {
                  const reqCount = row.insurance_required ? 7 : 6;
                  const insuranceRequired = row.insurance_required;
                  const docsDone = row.docs_done_count || 0;

                  return (
                    <tr key={row.id} onClick={() => openForRow(row)} style={{ cursor: "pointer" }}>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--g900)" }}>
                          {row.dispatch_number}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>
                          {dayjs(row.dispatch_date).format("MMM D, YYYY")}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.customer_name}</td>
                      <td>
                        <div style={{ fontSize: 13 }}>{row.airline || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                          {row.awb_number ? `AWB: ${row.awb_number}` : ""}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-g">{String(row.incoterm || "FOB").toUpperCase()}</span>
                      </td>
                      <td>
                        <span className={docsDone >= reqCount ? "badge bg-g" : "badge bg-a"}>
                          {docsDone}/{reqCount}
                        </span>
                      </td>
                      <td>
                        {insuranceRequired ? (
                          <span className="badge bg-w">Required</span>
                        ) : (
                          <span className="badge bg-a">CIF only</span>
                        )}
                      </td>
                      <td>
                        {row.all_cleared ? (
                          <span className="badge bg-g">All Cleared</span>
                        ) : docsDone === 0 ? (
                          <span className="badge bg-w">Not Started</span>
                        ) : (
                          <span className="badge bg-a" title={row.pending_docs?.join(", ")}>
                            {docsDone}/{reqCount} — {reqCount - docsDone} pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7">No export document records found</td>
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
                <tr key={doc.type}>
                  <td style={{ fontWeight: 700 }}>{doc.label}</td>
                  <td>
                    {doc.type === "commercial_invoice" && "Price and terms of sale"}
                    {doc.type === "packing_list" && "Itemized shipment contents"}
                    {doc.type === "phytosanitary_certificate" && "Confirms produce is pest/disease free"}
                    {doc.type === "airway_bill" && "Air freight contract"}
                    {doc.type === "certificate_of_origin" && "Confirms goods are from Sri Lanka"}
                    {doc.type === "health_certificate" && "Confirms goods are safe to consume"}
                    {doc.type === "insurance_certificate" && "Cargo insurance certificate"}
                    {doc.type === "gsp_form_a" && "Reduces/removes EU import duty under Sri Lanka's GSP+ status"}
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
          <span>ℹ</span>
          <div>Create a global shipment first, then manage its export documents.</div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="md md-lg" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 920, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
            <div className="md-h">
              <h3>Create / Update Export Document Set</h3>
              <button type="button" className="md-x" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSaveNotes} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div className="md-b" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
                
                <div className="fr" style={{ marginTop: 16 }}>
                  <div className="ff">
                    <label className="fl">Linked Shipment <span className="rq">*</span></label>
                    <select
                      className="fc"
                      value={selectedGlobalDispatchId}
                      onChange={(e) => setSelectedGlobalDispatchId(e.target.value)}
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
                    <input className="fc" value={getDocSetNo(selectedShipmentMeta)} readOnly style={{ background: "var(--ivory)" }} />
                  </div>
                </div>

                {selectedGlobalDispatchId && (
                  <>
                    <div className="fst" style={{ marginBottom: 11 }}>
                      {requiredCount} Required Documents
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {DOCS.filter(doc => doc.type !== "gsp_form_a" || isEUCountry(selectedShipmentMeta?.city)).map((doc) => (
                        <DocumentUploadRow 
                          key={doc.type} 
                          doc={doc} 
                          shipment={selectedShipmentMeta} 
                          documents={documentsList}
                          onUploadSuccess={() => {
                            fetchDocumentDetails(selectedGlobalDispatchId);
                            loadPage();
                          }} 
                        />
                      ))}
                    </div>

                    <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--g100)", borderRadius: 10, border: "1px solid var(--g200)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--g800)" }}>Document Progress</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: doneCount === requiredCount ? "var(--g700)" : "var(--d)" }}>
                        {doneCount} / {requiredCount} complete
                      </span>
                    </div>

                    <div className="ff" style={{ marginTop: 14 }}>
                      <label className="fl">Notes</label>
                      <textarea className="fc" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Document notes..." style={{ minHeight: 88 }} />
                    </div>
                  </>
                )}
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={closeModal}>Close</button>
                <button type="submit" className="btn btn-p" disabled={saving || !selectedGlobalDispatchId}>
                  {saving ? "Saving..." : "Save Notes"}
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
