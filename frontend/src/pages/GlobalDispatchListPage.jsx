import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const seedRows = [
  {
    id: 1,
    dispatch_number: "SHP-2024-042",
    customer_name: "Four Seasons Kuda Huraa",
    dispatch_date: "2024-03-16",
    airline: "UL225",
    awb: "603-12345678",
    total_qty: "124 kg",
    docs_done_count: 4,
    status: "Docs Pending",
  },
  {
    id: 2,
    dispatch_number: "SHP-2024-041",
    customer_name: "Hilton Maldives Amingiri",
    dispatch_date: "2024-03-14",
    airline: "UL225",
    awb: "603-12340099",
    total_qty: "96 kg",
    docs_done_count: 7,
    status: "Cleared",
  },
  {
    id: 3,
    dispatch_number: "SHP-2024-040",
    customer_name: "Waldorf Astoria",
    dispatch_date: "2024-03-12",
    airline: "Q2 MLE",
    awb: "Q2-00045612",
    total_qty: "80 kg",
    docs_done_count: 7,
    status: "Delivered",
  },
];

const GlobalDispatchListPage = () => {
  
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const toast = useToast();
const [showShipmentModal, setShowShipmentModal] = useState(false);

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
const [showDocsModal, setShowDocsModal] = useState(false);
const [selectedShipment, setSelectedShipment] = useState(null);
const [docsForm, setDocsForm] = useState({
  commercialInvoice: false,
  packingList: false,
  phytosanitaryCertificate: false,
  airwayBill: false,
  certificateOfOrigin: false,
  healthCertificate: false,
  insuranceCertificate: false,
});
  useEffect(() => {
    const loadRows = async () => {
      try {
        setLoading(true);
        const res = await api.get("/dispatch/global");
        const apiRows = Array.isArray(res.data) ? res.data : [];
        setRows(apiRows.length ? apiRows : seedRows);
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
      result = result.filter((row) => String(row.status).toLowerCase().includes("pending"));
    } else if (tab === "Cleared") {
      result = result.filter((row) => String(row.status).toLowerCase() === "cleared");
    } else if (tab === "Delivered") {
      result = result.filter((row) => String(row.status).toLowerCase() === "delivered");
    }

    const q = search.toLowerCase();
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

  const docsPendingCount = rows.filter((row) =>
    String(row.status).toLowerCase().includes("pending")
  ).length;

  const badgeClass = (status) => {
    const s = String(status).toLowerCase();
    if (s === "cleared" || s === "delivered") return "badge bg-g";
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
  const docsDone = Object.values(shipmentForm.documents).filter(Boolean).length;

const shipmentId = `SHP-${Date.now().toString().slice(-6)}`;

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
  docs_label: `${docsDone}/7`,
  status: docsDone === 7 ? "Cleared" : "Docs Pending",
  documents: { ...shipmentForm.documents },
};
  setRows((prev) => [newRow, ...prev]);
  setShowShipmentModal(false);
  toast.success(`Shipment ${newRow.dispatch_number} created. Generate missing documents.`);
};
const openDocsModal = (row) => {
  setSelectedShipment(row);
  setDocsForm({
    commercialInvoice: row.documents?.commercialInvoice ?? false,
    packingList: row.documents?.packingList ?? false,
    phytosanitaryCertificate: row.documents?.phytosanitaryCertificate ?? false,
    airwayBill: row.documents?.airwayBill ?? false,
    certificateOfOrigin: row.documents?.certificateOfOrigin ?? false,
    healthCertificate: row.documents?.healthCertificate ?? false,
    insuranceCertificate: row.documents?.insuranceCertificate ?? false,
  });
  setShowDocsModal(true);
};

const closeDocsModal = () => {
  setShowDocsModal(false);
  setSelectedShipment(null);
};

const handleDocsToggle = (name) => {
  setDocsForm((prev) => ({
    ...prev,
    [name]: !prev[name],
  }));
};

const handleSaveDocs = () => {
  if (!selectedShipment) return;

  const doneCount = Object.values(docsForm).filter(Boolean).length;

  setRows((prev) =>
    prev.map((row) =>
      row.id === selectedShipment.id
        ? {
            ...row,
            documents: docsForm,
            docs_done_count: doneCount,
            docs_label: `${doneCount}/7`,
            status: doneCount === 7 ? "Cleared" : "Docs Pending",
          }
        : row
    )
  );


  setShowDocsModal(false);

  if (doneCount === 7) {
    toast.success(`Shipment ${selectedShipment.dispatch_number} cleared successfully.`);
  } else {
    toast.info(`Documents updated for ${selectedShipment.dispatch_number}.`);
  }
};
const handleRowOpen = (row) => {
  openDocsModal(row);
};
  return (
    <div className="pg">

      <div className="ib ib-w">
        <span>✈️</span>
        <div>
          Stock deducted only when <strong>Cleared</strong> (all 7 docs verified). <strong>Click any row</strong> to view shipment details and document status.
        </div>
      </div>

      <div className="fb">
        <button type="button" className={`ft ${tab === "All" ? "on" : ""}`} onClick={() => setTab("All")}>
          All
        </button>
        <button type="button" className={`ft ${tab === "Docs Pending" ? "on" : ""}`} onClick={() => setTab("Docs Pending")}>
          Docs Pending ({docsPendingCount})
        </button>
        <button type="button" className={`ft ${tab === "Cleared" ? "on" : ""}`} onClick={() => setTab("Cleared")}>
          Cleared
        </button>
        <button type="button" className={`ft ${tab === "Delivered" ? "on" : ""}`} onClick={() => setTab("Delivered")}>
          Delivered
        </button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="tbl-tools">
          <input
            className="fc"
            placeholder="Search by dispatch no, customer, airline or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Shipment No.</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Flight</th>
              <th>AWB</th>
              <th>Weight</th>
              <th>Docs</th>
              <th>Status</th>
              <th>Actions</th>
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
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--g800)" }}>
                    {row.dispatch_number}
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.customer_name}</td>
                  <td>{row.dispatch_date?.slice(0, 10)}</td>
                  <td><span className="badge bg-a">{row.airline}</span></td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{row.awb || "—"}</td>
                  <td>{row.total_qty}</td>
                  <td>
                    <span className={row.docs_done_count === 7 ? "badge bg-g" : "badge bg-a"}>
                      {row.docs_done_count}/7
                    </span>
                  </td>
                  <td>
                    <span className={badgeClass(row.status)}>{row.status}</span>
                  </td>
                  <td>
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
            Stock deducted when all 7 export documents verified & shipment Cleared. No returns after departure.
          </div>
        </div>

        <div className="fr">
          <div className="ff">
            <label className="fl">
              Customer <span className="rq">*</span>
            </label>
            <select className="fc" name="customer" value={shipmentForm.customer} onChange={handleShipmentFormChange}>
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
            <select className="fc" name="airline" value={shipmentForm.airline} onChange={handleShipmentFormChange}>
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
            <select className="fc" name="incoterms" value={shipmentForm.incoterms} onChange={handleShipmentFormChange}>
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

        <div className="fst" style={{ marginBottom: "10px" }}>Items — FEFO Applied</div>

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
                  <select value={row.item} onChange={(e) => handleShipmentItemChange(index, "item", e.target.value)}>
                    <option>Dragon Fruit (Red)</option>
                    <option>Rambutan</option>
                  </select>
                </td>
                <td>
                  <select value={row.batch} onChange={(e) => handleShipmentItemChange(index, "batch", e.target.value)}>
                    <option>BT-089</option>
                    <option>BT-088</option>
                  </select>
                </td>
                <td>
                  <input type="number" value={row.qty} onChange={(e) => handleShipmentItemChange(index, "qty", e.target.value)} />
                </td>
                <td>
                  <input type="number" value={row.boxes} onChange={(e) => handleShipmentItemChange(index, "boxes", e.target.value)} />
                </td>
                <td>
                  <button type="button" className="ab d" onClick={() => handleRemoveShipmentItem(index)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" className="add-r" onClick={handleAddShipmentItem}>
          ＋ Add Item
        </button>

        <div className="fst" style={{ margin: "13px 0 9px" }}>Export Document Checklist</div>

        <ul className="ck-l">
          <li><input type="checkbox" checked={shipmentForm.documents.commercialInvoice} onChange={() => handleShipmentDocumentToggle("commercialInvoice")} /> Commercial Invoice</li>
          <li><input type="checkbox" checked={shipmentForm.documents.packingList} onChange={() => handleShipmentDocumentToggle("packingList")} /> Packing List</li>
          <li><input type="checkbox" checked={shipmentForm.documents.phytosanitaryCertificate} onChange={() => handleShipmentDocumentToggle("phytosanitaryCertificate")} /> Phytosanitary Certificate</li>
          <li><input type="checkbox" checked={shipmentForm.documents.airwayBill} onChange={() => handleShipmentDocumentToggle("airwayBill")} /> Airway Bill (AWB)</li>
          <li><input type="checkbox" checked={shipmentForm.documents.certificateOfOrigin} onChange={() => handleShipmentDocumentToggle("certificateOfOrigin")} /> Certificate of Origin</li>
          <li><input type="checkbox" checked={shipmentForm.documents.healthCertificate} onChange={() => handleShipmentDocumentToggle("healthCertificate")} /> Health Certificate</li>
          <li><input type="checkbox" checked={shipmentForm.documents.insuranceCertificate} onChange={() => handleShipmentDocumentToggle("insuranceCertificate")} /> Insurance Certificate</li>
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
        <div className="ib ib-w" style={{ marginTop: "-4px", marginBottom: "14px" }}>
          <span>📄</span>
          <div>
            Shipment is marked <strong>Cleared</strong> only when all 7 export documents are completed.
          </div>
        </div>

        <div className="fr">
          <div className="ff">
            <label className="fl">Linked Shipment</label>
            <input className="fc" value={selectedShipment.dispatch_number || ""} readOnly />
          </div>

          <div className="ff">
            <label className="fl">Doc Set No.</label>
            <input
              className="fc"
              value={`DOC-${selectedShipment.dispatch_number || ""}`}
              readOnly
            />
          </div>
        </div>

        <div className="fst" style={{ margin: "10px 0 12px" }}>
          Required Export Documents
        </div>

        <ul className="ck-l">
          <li>
            <input
              type="checkbox"
              checked={docsForm.commercialInvoice}
              onChange={() => handleDocsToggle("commercialInvoice")}
            />{" "}
            Commercial Invoice
          </li>
          <li>
            <input
              type="checkbox"
              checked={docsForm.packingList}
              onChange={() => handleDocsToggle("packingList")}
            />{" "}
            Packing List
          </li>
          <li>
            <input
              type="checkbox"
              checked={docsForm.phytosanitaryCertificate}
              onChange={() => handleDocsToggle("phytosanitaryCertificate")}
            />{" "}
            Phytosanitary Certificate
          </li>
          <li>
            <input
              type="checkbox"
              checked={docsForm.airwayBill}
              onChange={() => handleDocsToggle("airwayBill")}
            />{" "}
            Airway Bill (AWB)
          </li>
          <li>
            <input
              type="checkbox"
              checked={docsForm.certificateOfOrigin}
              onChange={() => handleDocsToggle("certificateOfOrigin")}
            />{" "}
            Certificate of Origin
          </li>
          <li>
            <input
              type="checkbox"
              checked={docsForm.healthCertificate}
              onChange={() => handleDocsToggle("healthCertificate")}
            />{" "}
            Health Certificate
          </li>
          <li>
            <input
              type="checkbox"
              checked={docsForm.insuranceCertificate}
              onChange={() => handleDocsToggle("insuranceCertificate")}
            />{" "}
            Insurance Certificate
          </li>
        </ul>

        <div style={{ marginTop: "14px" }}>
          <span className={Object.values(docsForm).filter(Boolean).length === 7 ? "badge bg-g" : "badge bg-a"}>
            {Object.values(docsForm).filter(Boolean).length}/7 completed
          </span>
        </div>
      </div>

      <div className="md-f">
        <button type="button" className="btn btn-s" onClick={closeDocsModal}>
          Cancel
        </button>
        <button type="button" className="btn btn-a" onClick={handleSaveDocs}>
          Save Document Set
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default GlobalDispatchListPage;