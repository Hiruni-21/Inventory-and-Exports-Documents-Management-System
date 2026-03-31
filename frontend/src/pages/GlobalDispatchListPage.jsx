import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

const DOC_META = [
  {
    key: "commercialInvoice",
    title: "Commercial Invoice",
    issuer: "Fresh World Exporters",
    tone: "missing",
  },
  {
    key: "packingList",
    title: "Packing List",
    issuer: "Fresh World Exporters",
    tone: "missing",
  },
  {
    key: "phytosanitaryCertificate",
    title: "Phytosanitary Certificate",
    issuer: "Plant Quarantine Dept.",
    tone: "missing",
  },
  {
    key: "airwayBill",
    title: "Airway Bill (AWB)",
    issuer: "Airline (SriLankan / Maldivian)",
    tone: "done",
  },
  {
    key: "certificateOfOrigin",
    title: "Certificate of Origin",
    issuer: "Chamber of Commerce",
    tone: "missing",
  },
  {
    key: "healthCertificate",
    title: "Health Certificate",
    issuer: "Ministry of Health",
    tone: "done",
  },
  {
    key: "insuranceCertificate",
    title: "Insurance Certificate",
    issuer: "Insurance Company",
    tone: "warn",
    note: "CIF only",
  },
];

const createDemoFileUrl = (shipmentNo, docTitle) => {
  if (typeof window === "undefined") return "";
  const blob = new Blob(
    [`Demo export document\nShipment: ${shipmentNo}\nDocument: ${docTitle}`],
    { type: "text/plain" }
  );
  return URL.createObjectURL(blob);
};

const normalizeDocumentEntry = (value, shipmentNo, docTitle) => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const done = !!value.done;
    return {
      done,
      fileName: value.fileName || (done ? `${docTitle}.pdf` : ""),
      fileUrl: value.fileUrl || (done ? createDemoFileUrl(shipmentNo, docTitle) : ""),
    };
  }

  if (typeof value === "boolean") {
    return {
      done: value,
      fileName: value ? `${docTitle}.pdf` : "",
      fileUrl: value ? createDemoFileUrl(shipmentNo, docTitle) : "",
    };
  }

  return {
    done: false,
    fileName: "",
    fileUrl: "",
  };
};

const normalizeDocuments = (documents = {}, shipmentNo = "SHP-000000") => {
  const result = {};
  DOC_META.forEach((doc) => {
    result[doc.key] = normalizeDocumentEntry(
      documents?.[doc.key],
      shipmentNo,
      doc.title
    );
  });
  return result;
};

const countDoneDocuments = (documents = {}) =>
  DOC_META.filter((doc) => documents?.[doc.key]?.done).length;

const getDocEntry = (documents, key) =>
  documents?.[key] || { done: false, fileName: "", fileUrl: "" };

const seedRows = [
  {
    id: 1,
    dispatch_number: "SHP-2024-042",
    customer_name: "Four Seasons Kuda Huraa",
    dispatch_date: "2024-03-16",
    airline: "UL225",
    awb: "603-12345678",
    total_qty: "124 kg",
    status: "Docs Pending",
    documents: normalizeDocuments(
      {
        commercialInvoice: {
          done: true,
          fileName: "invoice-042.pdf",
        },
        packingList: {
          done: true,
          fileName: "packing-list-042.pdf",
        },
        phytosanitaryCertificate: { done: false },
        airwayBill: {
          done: true,
          fileName: "airway-bill-042.pdf",
        },
        certificateOfOrigin: { done: false },
        healthCertificate: {
          done: true,
          fileName: "health-certificate-042.pdf",
        },
        insuranceCertificate: { done: false },
      },
      "SHP-2024-042"
    ),
  },
  {
    id: 2,
    dispatch_number: "SHP-2024-041",
    customer_name: "Hilton Maldives Amingiri",
    dispatch_date: "2024-03-14",
    airline: "UL225",
    awb: "603-12340099",
    total_qty: "96 kg",
    status: "Cleared",
    documents: normalizeDocuments(
      {
        commercialInvoice: true,
        packingList: true,
        phytosanitaryCertificate: true,
        airwayBill: true,
        certificateOfOrigin: true,
        healthCertificate: true,
        insuranceCertificate: true,
      },
      "SHP-2024-041"
    ),
  },
  {
    id: 3,
    dispatch_number: "SHP-2024-040",
    customer_name: "Waldorf Astoria",
    dispatch_date: "2024-03-12",
    airline: "Q2 MLE",
    awb: "Q2-00045612",
    total_qty: "80 kg",
    status: "Delivered",
    documents: normalizeDocuments(
      {
        commercialInvoice: true,
        packingList: true,
        phytosanitaryCertificate: true,
        airwayBill: true,
        certificateOfOrigin: true,
        healthCertificate: true,
        insuranceCertificate: true,
      },
      "SHP-2024-040"
    ),
  },
].map((row) => ({
  ...row,
  docs_done_count: countDoneDocuments(row.documents),
}));

const normalizeRow = (row, index) => {
  const dispatchNo =
    row.dispatch_number || row.shipment_no || row.shipmentNumber || `SHP-${index + 1}`;
  const documents = normalizeDocuments(row.documents, dispatchNo);
  const doneCount =
    typeof row.docs_done_count === "number"
      ? row.docs_done_count
      : countDoneDocuments(documents);

  return {
    id: row.id || dispatchNo,
    dispatch_number: dispatchNo,
    customer_name: row.customer_name || row.customer || "—",
    dispatch_date: row.dispatch_date || row.date || new Date().toISOString().slice(0, 10),
    airline: row.airline || "—",
    awb: row.awb || "—",
    total_qty: row.total_qty || row.weight || "0 kg",
    status:
      row.status ||
      (doneCount === 7 ? "Cleared" : "Docs Pending"),
    documents,
    docs_done_count: doneCount,
  };
};

const GlobalDispatchListPage = () => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [loading, setLoading] = useState(true);

  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);

  const [selectedShipment, setSelectedShipment] = useState(null);
  const [detailsShipment, setDetailsShipment] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);

  const [shipmentForm, setShipmentForm] = useState({
    customer: "Four Seasons — Kuda Huraa, Maldives",
    shipmentDate: "",
    airline: "SriLankan Airlines (UL)",
    flightNo: "",
    awbNo: "",
    incoterms: "CIF",
    totalWeight: "",
    documents: {
      commercialInvoice: true,
      packingList: true,
      phytosanitaryCertificate: false,
      airwayBill: false,
      certificateOfOrigin: false,
      healthCertificate: false,
      insuranceCertificate: false,
    },
  });

  const [shipmentItems, setShipmentItems] = useState([
    {
      item: "Dragon Fruit (Red)",
      batch: "BT-089",
      qty: 20,
      boxes: 4,
    },
  ]);

  const [docsForm, setDocsForm] = useState(normalizeDocuments({}, "NEW"));
  const toast = useToast();

  useEffect(() => {
    const loadRows = async () => {
      try {
        setLoading(true);
        const res = await api.get("/dispatch/global");
        const apiRows = Array.isArray(res.data) ? res.data : [];
        setRows(apiRows.length ? apiRows.map(normalizeRow) : seedRows);
      } catch (err) {
        console.error("Failed to load global dispatches", err);
        setRows(seedRows);
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, []);

  useEffect(() => {
    const handleOpenShipmentModal = () => {
      setShowShipmentModal(true);
    };

    window.addEventListener("fw-open-global-shipment-modal", handleOpenShipmentModal);

    return () => {
      window.removeEventListener("fw-open-global-shipment-modal", handleOpenShipmentModal);
    };
  }, []);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (tab === "Docs Pending") {
      result = result.filter((row) => row.status === "Docs Pending");
    } else if (tab === "Cleared") {
      result = result.filter((row) => row.status === "Cleared");
    } else if (tab === "Delivered") {
      result = result.filter((row) => row.status === "Delivered");
    }

    const q = search.trim().toLowerCase();
    if (!q) return result;

    return result.filter((row) =>
      [
        row.dispatch_number,
        row.customer_name,
        row.airline,
        row.status,
        row.awb,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search, tab]);

  const docsPendingCount = rows.filter((row) => row.status === "Docs Pending").length;

  const badgeClass = (status) => {
    const s = String(status).toLowerCase();
    if (s === "delivered" || s === "cleared") return "badge bg-g";
    if (s.includes("pending")) return "badge bg-a";
    return "badge bg-b";
  };

  const closeShipmentModal = () => {
    setShowShipmentModal(false);
  };

  const handleShipmentFormChange = (e) => {
    const { name, value } = e.target;
    setShipmentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleShipmentDocumentToggle = (name) => {
    setShipmentForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [name]: !prev.documents[name],
      },
    }));
  };

  const handleShipmentItemChange = (index, field, value) => {
    setShipmentItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleAddShipmentItem = () => {
    setShipmentItems((prev) => [
      ...prev,
      { item: "", batch: "", qty: "", boxes: "" },
    ]);
  };

  const handleRemoveShipmentItem = (index) => {
    setShipmentItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const handleCreateShipment = () => {
    const shipmentId = `SHP-${Date.now().toString().slice(-6)}`;
    const documents = normalizeDocuments(shipmentForm.documents, shipmentId);
    const docsDone = countDoneDocuments(documents);

    const newRow = {
      id: shipmentId,
      dispatch_number: shipmentId,
      customer_name: shipmentForm.customer.split(",")[0],
      dispatch_date: shipmentForm.shipmentDate || new Date().toISOString().slice(0, 10),
      airline:
        shipmentForm.flightNo ||
        (shipmentForm.airline.includes("SriLankan") ? "UL225" : "Q2 MLE"),
      awb: shipmentForm.awbNo || "—",
      total_qty: `${shipmentForm.totalWeight || 0} kg`,
      docs_done_count: docsDone,
      status: docsDone === 7 ? "Cleared" : "Docs Pending",
      documents,
    };

    setRows((prev) => [newRow, ...prev]);
    setShowShipmentModal(false);
    toast.success(`Shipment ${newRow.dispatch_number} created. Generate missing documents.`);
  };

  const openDocsModal = (row) => {
    setSelectedShipment(row);
    setDocsForm(normalizeDocuments(row.documents, row.dispatch_number));
    setShowDocsModal(true);
  };

  const closeDocsModal = () => {
    setShowDocsModal(false);
    setSelectedShipment(null);
  };

  const setDocStatus = (key, value) => {
    setDocsForm((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        done: value,
        ...(value ? {} : { fileName: "", fileUrl: "" }),
      },
    }));
  };

  const handleUploadDoc = (key, file) => {
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);

    setDocsForm((prev) => ({
      ...prev,
      [key]: {
        done: true,
        fileName: file.name,
        fileUrl,
      },
    }));

    const label = DOC_META.find((doc) => doc.key === key)?.title || "Document";
    toast.info(`${label} attached.`);
  };

  const handleViewDoc = (docEntry, docTitle) => {
    if (!docEntry?.fileUrl) {
      toast.warning(`${docTitle} has no attached file yet.`);
      return;
    }
    window.open(docEntry.fileUrl, "_blank", "noopener,noreferrer");
  };

  const handleSaveDocs = () => {
    if (!selectedShipment) return;

    const doneCount = countDoneDocuments(docsForm);

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== selectedShipment.id) return row;

        const nextStatus =
          row.status === "Delivered"
            ? "Delivered"
            : doneCount === 7
            ? "Cleared"
            : "Docs Pending";

        return {
          ...row,
          documents: docsForm,
          docs_done_count: doneCount,
          status: nextStatus,
        };
      })
    );

    if (detailsShipment && detailsShipment.id === selectedShipment.id) {
      setDetailsShipment((prev) =>
        prev
          ? {
              ...prev,
              documents: docsForm,
              docs_done_count: doneCount,
              status:
                prev.status === "Delivered"
                  ? "Delivered"
                  : doneCount === 7
                  ? "Cleared"
                  : "Docs Pending",
            }
          : prev
      );
    }

    setShowDocsModal(false);

    if (doneCount === 7) {
      toast.success(`Shipment ${selectedShipment.dispatch_number} cleared successfully.`);
    } else {
      toast.info(`Documents updated for ${selectedShipment.dispatch_number}.`);
    }
  };

  const handleRowOpen = (row) => {
    setDetailsShipment(row);
    setSelectedRowId(row.id);
    setShowDetailsPanel(true);
  };

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setDetailsShipment(null);
    setSelectedRowId(null);
  };

  return (
    <div className="pg">
      <div className="ib ib-w">
        <span>✈️</span>
        <div>
          Stock deducted only when <strong>Cleared</strong> (all 7 docs verified).{" "}
          <strong>Click any row</strong> to view shipment details and document status.
        </div>
      </div>

      <div className="dispatch-filter-bar">
        <div className="dispatch-tabs">
          <button
            type="button"
            className={`ft ${tab === "All" ? "on" : ""}`}
            onClick={() => setTab("All")}
          >
            All
          </button>

          <button
            type="button"
            className={`ft ${tab === "Docs Pending" ? "on" : ""}`}
            onClick={() => setTab("Docs Pending")}
          >
            Docs Pending ({docsPendingCount})
          </button>

          <button
            type="button"
            className={`ft ${tab === "Cleared" ? "on" : ""}`}
            onClick={() => setTab("Cleared")}
          >
            Cleared
          </button>

          <button
            type="button"
            className={`ft ${tab === "Delivered" ? "on" : ""}`}
            onClick={() => setTab("Delivered")}
          >
            Delivered
          </button>
        </div>

        <div className="dispatch-search-wrap">
          <div className="dispatch-search-box">
            <Search size={16} className="dispatch-search-icon" />
            <input
              className="dispatch-search-input"
              placeholder="Search by dispatch no, customer, airline or status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="content-card global-dispatch-card">
        <div className="card-header-row">
          <h3>✈️ Global Dispatch — Export Shipments</h3>
          <span className="count-pill">{filteredRows.length} shipments</span>
        </div>

        <div className="table-wrap">
          <table className="data-table global-dispatch-table">
            <thead>
              <tr>
                <th>SHIPMENT NO.</th>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>FLIGHT</th>
                <th>AWB</th>
                <th className="weight-col">WEIGHT</th>
                <th className="docs-col">DOCS</th>
                <th className="status-col">STATUS</th>
                <th className="actions-col">ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9">Loading...</td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleRowOpen(row)}
                    className={selectedRowId === row.id ? "details-row-active" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="dispatch-no-cell">{row.dispatch_number}</td>
                    <td style={{ fontWeight: 600 }}>{row.customer_name}</td>
                    <td>{row.dispatch_date?.slice(0, 10)}</td>
                    <td>
                      <span className="badge bg-a">{row.airline}</span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {row.awb || "—"}
                    </td>
                    <td className="weight-col">{row.total_qty}</td>
                    <td className="docs-col">
                      <span className={row.docs_done_count === 7 ? "badge bg-g" : "badge bg-a"}>
                        {row.docs_done_count}/7
                      </span>
                    </td>
                    <td className="status-col">
                      <span className={badgeClass(row.status)}>{row.status}</span>
                    </td>
                    <td className="actions-col">
                      <div className="gd-actions">
                        {row.status === "Docs Pending" ? (
                          <button
                            type="button"
                            className="gd-action-btn gd-action-btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDocsModal(row);
                            }}
                          >
                            📄 Upload Docs
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="gd-action-btn gd-action-btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDocsModal(row);
                            }}
                          >
                            📄 View Docs
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9">No global dispatch records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetailsPanel && detailsShipment && (
        <>
          <div className="details-panel-overlay" onClick={closeDetailsPanel}></div>

          <aside className="details-panel open">
            <div className="details-panel-header">
              <div className="details-panel-icon">✈️</div>

              <div className="details-panel-head-text">
                <h3>{detailsShipment.dispatch_number}</h3>
                <p>
                  {detailsShipment.customer_name} · {detailsShipment.airline} ·{" "}
                  {detailsShipment.dispatch_date}
                </p>
              </div>

              <button
                type="button"
                className="details-panel-close"
                onClick={closeDetailsPanel}
              >
                ✕
              </button>
            </div>

            <div className="details-panel-body">
              <div className="details-panel-grid">
                <div className="details-stat-card">
                  <label>SHIPMENT NO.</label>
                  <span>{detailsShipment.dispatch_number}</span>
                </div>

                <div className="details-stat-card">
                  <label>STATUS</label>
                  <span>• {detailsShipment.status}</span>
                </div>

                <div className="details-stat-card">
                  <label>CUSTOMER</label>
                  <span>{detailsShipment.customer_name}</span>
                </div>

                <div className="details-stat-card">
                  <label>DATE</label>
                  <span>{detailsShipment.dispatch_date}</span>
                </div>

                <div className="details-stat-card">
                  <label>FLIGHT</label>
                  <span>
                    <span className="badge bg-a">{detailsShipment.airline}</span>
                  </span>
                </div>

                <div className="details-stat-card">
                  <label>AWB NUMBER</label>
                  <span>{detailsShipment.awb || "—"}</span>
                </div>

                <div className="details-stat-card">
                  <label>TOTAL WEIGHT</label>
                  <span>{detailsShipment.total_qty}</span>
                </div>

                <div className="details-stat-card">
                  <label>DOCUMENTS</label>
                  <span
                    style={{
                      color:
                        detailsShipment.docs_done_count === 7
                          ? "var(--s)"
                          : "var(--d)",
                    }}
                  >
                    {detailsShipment.docs_done_count}/7 complete
                  </span>
                </div>
              </div>

              <div className="details-mini-title">EXPORT DOCUMENT STATUS</div>

              <table className="details-mini-table">
                <tbody>
                  {DOC_META.map((doc) => {
                    const entry = getDocEntry(detailsShipment.documents, doc.key);

                    return (
                      <tr key={doc.key}>
                        <td>{doc.title}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {entry.done ? "• ✅ Done" : "• ❌ Missing"}
                          {entry.done && entry.fileUrl ? (
                            <button
                              type="button"
                              onClick={() => handleViewDoc(entry, doc.title)}
                              style={{
                                marginLeft: 8,
                                border: "none",
                                background: "transparent",
                                color: "var(--g700)",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              View
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="details-panel-footer">
              <button
                type="button"
                className="btn btn-p details-panel-btn-main"
                onClick={() => openDocsModal(detailsShipment)}
              >
                📄 {detailsShipment.docs_done_count === 7 ? "View Docs" : "Upload Missing Docs"}
              </button>
            </div>
          </aside>
        </>
      )}

      {showShipmentModal && (
        <div className="modal-backdrop" onClick={closeShipmentModal}>
          <div className="md md-lg" onClick={(e) => e.stopPropagation()}>
            <div className="md-h">
              <h3>✈️ New Global Dispatch (Export Shipment)</h3>
              <button type="button" className="md-x" onClick={closeShipmentModal}>
                ✕
              </button>
            </div>

            <div className="md-b">
              <div className="ib ib-w" style={{ marginTop: "-4px", marginBottom: "14px" }}>
                <span>✈️</span>
                <div>
                  Stock deducted when all 7 export documents verified & shipment Cleared.
                  No returns after departure.
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">
                    Customer <span className="rq">*</span>
                  </label>
                  <select
                    className="fc"
                    name="customer"
                    value={shipmentForm.customer}
                    onChange={handleShipmentFormChange}
                  >
                    <option>Four Seasons — Kuda Huraa, Maldives</option>
                    <option>Hilton Maldives — Amingiri</option>
                    <option>Waldorf Astoria — Ithaafushi</option>
                    <option>Conrad Maldives — Rangali</option>
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">
                    Shipment Date <span className="rq">*</span>
                  </label>
                  <input
                    className="fc"
                    type="date"
                    name="shipmentDate"
                    value={shipmentForm.shipmentDate}
                    onChange={handleShipmentFormChange}
                  />
                </div>
              </div>

              <div className="fr3">
                <div className="ff">
                  <label className="fl">Airline</label>
                  <select
                    className="fc"
                    name="airline"
                    value={shipmentForm.airline}
                    onChange={handleShipmentFormChange}
                  >
                    <option>SriLankan Airlines (UL)</option>
                    <option>Maldivian (Q2)</option>
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">Flight No.</label>
                  <input
                    className="fc"
                    name="flightNo"
                    placeholder="e.g. UL225"
                    value={shipmentForm.flightNo}
                    onChange={handleShipmentFormChange}
                  />
                </div>

                <div className="ff">
                  <label className="fl">AWB No.</label>
                  <input
                    className="fc"
                    name="awbNo"
                    placeholder="603-XXXXXXXX"
                    value={shipmentForm.awbNo}
                    onChange={handleShipmentFormChange}
                  />
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Incoterms</label>
                  <select
                    className="fc"
                    name="incoterms"
                    value={shipmentForm.incoterms}
                    onChange={handleShipmentFormChange}
                  >
                    <option>CIF</option>
                    <option>FOB</option>
                    <option>DAP</option>
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">Total Weight (kg)</label>
                  <input
                    className="fc"
                    type="number"
                    name="totalWeight"
                    placeholder="0.0"
                    value={shipmentForm.totalWeight}
                    onChange={handleShipmentFormChange}
                  />
                </div>
              </div>

              <div className="fst" style={{ marginBottom: "10px" }}>
                Items — FEFO Applied
              </div>

              <table className="it">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Batch</th>
                    <th>Qty (kg)</th>
                    <th>Boxes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {shipmentItems.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          value={row.item}
                          onChange={(e) =>
                            handleShipmentItemChange(index, "item", e.target.value)
                          }
                        >
                          <option>Dragon Fruit (Red)</option>
                          <option>Rambutan</option>
                        </select>
                      </td>

                      <td>
                        <select
                          value={row.batch}
                          onChange={(e) =>
                            handleShipmentItemChange(index, "batch", e.target.value)
                          }
                        >
                          <option>BT-089</option>
                          <option>BT-088</option>
                        </select>
                      </td>

                      <td>
                        <input
                          type="number"
                          value={row.qty}
                          onChange={(e) =>
                            handleShipmentItemChange(index, "qty", e.target.value)
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={row.boxes}
                          onChange={(e) =>
                            handleShipmentItemChange(index, "boxes", e.target.value)
                          }
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="ab d"
                          onClick={() => handleRemoveShipmentItem(index)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button type="button" className="add-r" onClick={handleAddShipmentItem}>
                ＋ Add Item
              </button>

              <div className="fst" style={{ margin: "13px 0 9px" }}>
                Export Document Checklist
              </div>

              <ul className="ck-l">
                <li>
                  <input
                    type="checkbox"
                    checked={shipmentForm.documents.commercialInvoice}
                    onChange={() => handleShipmentDocumentToggle("commercialInvoice")}
                  />{" "}
                  Commercial Invoice
                </li>
                <li>
                  <input
                    type="checkbox"
                    checked={shipmentForm.documents.packingList}
                    onChange={() => handleShipmentDocumentToggle("packingList")}
                  />{" "}
                  Packing List
                </li>
                <li>
                  <input
                    type="checkbox"
                    checked={shipmentForm.documents.phytosanitaryCertificate}
                    onChange={() => handleShipmentDocumentToggle("phytosanitaryCertificate")}
                  />{" "}
                  Phytosanitary Certificate
                </li>
                <li>
                  <input
                    type="checkbox"
                    checked={shipmentForm.documents.airwayBill}
                    onChange={() => handleShipmentDocumentToggle("airwayBill")}
                  />{" "}
                  Airway Bill (AWB)
                </li>
                <li>
                  <input
                    type="checkbox"
                    checked={shipmentForm.documents.certificateOfOrigin}
                    onChange={() => handleShipmentDocumentToggle("certificateOfOrigin")}
                  />{" "}
                  Certificate of Origin
                </li>
                <li>
                  <input
                    type="checkbox"
                    checked={shipmentForm.documents.healthCertificate}
                    onChange={() => handleShipmentDocumentToggle("healthCertificate")}
                  />{" "}
                  Health Certificate
                </li>
                <li>
                  <input
                    type="checkbox"
                    checked={shipmentForm.documents.insuranceCertificate}
                    onChange={() => handleShipmentDocumentToggle("insuranceCertificate")}
                  />{" "}
                  Insurance Certificate
                </li>
              </ul>
            </div>

            <div className="md-f">
              <button type="button" className="btn btn-s" onClick={closeShipmentModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-a" onClick={handleCreateShipment}>
                Create Shipment + Generate Docs
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocsModal && selectedShipment && (
        <div className="modal-backdrop" onClick={closeDocsModal}>
          <div className="md md-lg" onClick={(e) => e.stopPropagation()}>
            <div className="md-h">
              <h3>📄 Create / Update Export Document Set</h3>
              <button type="button" className="md-x" onClick={closeDocsModal}>
                ✕
              </button>
            </div>

            <div className="md-b">
              <div className="ib ib-i" style={{ marginTop: "-4px", marginBottom: "14px" }}>
                <span>📄</span>
                <div>
                  All 7 documents must be marked Done before the shipment can be Cleared
                  and stock deducted.
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">
                    Linked Shipment <span className="rq">*</span>
                  </label>
                  <select className="fc" value={selectedShipment.dispatch_number} disabled>
                    <option>
                      {selectedShipment.dispatch_number} — {selectedShipment.customer_name} ·{" "}
                      {selectedShipment.airline} · {selectedShipment.dispatch_date}
                    </option>
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">Doc Set No.</label>
                  <input
                    className="fc"
                    value={`DOC-${selectedShipment.dispatch_number.replace("SHP-", "")}`}
                    readOnly
                    style={{ background: "var(--ivory)" }}
                  />
                </div>
              </div>

              <div className="fst" style={{ marginBottom: "11px" }}>
                7 Required Documents
              </div>

              <div className="doc-set-list">
                {DOC_META.map((doc, index) => {
                  const entry = getDocEntry(docsForm, doc.key);
                  const toneClass = entry.done
                    ? "done"
                    : doc.tone === "warn"
                    ? "warn"
                    : "missing";

                  return (
                    <div key={doc.key} className={`doc-set-row ${toneClass}`}>
                      <div className={`doc-set-index ${toneClass}`}>{index + 1}</div>

                      <div className="doc-set-main">
                        <div className="doc-set-title">
                          {doc.title} {doc.note ? <span>{doc.note}</span> : null}
                        </div>
                        <div className="doc-set-sub">— {doc.issuer}</div>

                        {entry.fileName ? (
                          <div
                            style={{
                              fontSize: 11,
                              marginTop: 5,
                              color: "var(--text3)",
                              fontWeight: 600,
                            }}
                          >
                            {entry.fileName}
                          </div>
                        ) : null}
                      </div>

                      <div className="doc-set-actions">
                        <button
                          type="button"
                          className={`doc-chip done ${entry.done ? "on" : ""}`}
                          onClick={() => setDocStatus(doc.key, true)}
                        >
                          ✅ Done
                        </button>

                        <button
                          type="button"
                          className={`doc-chip miss ${!entry.done ? "on" : ""}`}
                          onClick={() => setDocStatus(doc.key, false)}
                        >
                          ❌ Missing
                        </button>

                        {entry.fileUrl ? (
                          <>
                            <button
                              type="button"
                              className="doc-chip upload"
                              onClick={() => handleViewDoc(entry, doc.title)}
                            >
                              👁 View
                            </button>

                            <label className="doc-chip upload" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                              🔁 Replace
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                style={{ display: "none" }}
                                onChange={(e) => handleUploadDoc(doc.key, e.target.files?.[0])}
                              />
                            </label>
                          </>
                        ) : (
                          <label className="doc-chip upload" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            📎 Upload
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              style={{ display: "none" }}
                              onChange={(e) => handleUploadDoc(doc.key, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="doc-summary-row">
                <div className="doc-summary-left">
                  <strong>{countDoneDocuments(docsForm)}</strong>/7 completed
                </div>
                <div className="doc-summary-right">
                  {countDoneDocuments(docsForm) === 7
                    ? "Ready to clear shipment"
                    : "Missing documents remain"}
                </div>
              </div>
            </div>

            <div className="md-f">
              <button type="button" className="btn btn-s" onClick={closeDocsModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-p" onClick={handleSaveDocs}>
                💾 Save Document Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalDispatchListPage;