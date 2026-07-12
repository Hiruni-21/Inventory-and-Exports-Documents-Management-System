import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

const DOC_FIELDS = [
  "commercial_invoice_status",
  "packing_list_status",
  "phytosanitary_certificate_status",
  "airway_bill_status",
  "certificate_of_origin_status",
  "health_certificate_status",
  "insurance_certificate_status",
];

const emptyItemRow = {
  item_id: "",
  batch_id: "",
  qty: "",
  boxes: "",
};

const formatDate = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

const airlineLabel = (value) => {
  return String(value || "").toUpperCase() === "Q2" ? "Maldivian (Q2)" : "SriLankan Airlines (UL)";
};

const airlineBadge = (flightNo, airline) => {
  if (flightNo) return flightNo;
  return String(airline || "").toUpperCase() === "Q2" ? "Q2" : "UL";
};

const batchLabel = (batch) => {
  const code = batch.batch_code || batch.batch_number || "—";
  const qty = batch.qty_remaining ?? batch.available_quantity ?? batch.received_quantity ?? 0;
  return `${code} (${qty}kg)`;
};

const statusLabel = (row) => {
  const v = String(row?.status || "").toLowerCase();
  if (v === "delivered") return "Delivered";
  if (v === "cleared") return "Cleared";
  return "Docs Pending";
};

const statusBadgeClass = (label) => {
  if (label === "Delivered" || label === "Cleared") return "badge bg-g";
  return "badge bg-a";
};

const isInsuranceRequired = (incoterm) =>
  String(incoterm || "").toUpperCase() === "CIF";

const requiredDocsCount = (rowOrIncoterm) =>
  isInsuranceRequired(
    typeof rowOrIncoterm === "string" ? rowOrIncoterm : rowOrIncoterm?.incoterm
  )
    ? 7
    : 6;

const docsDoneCount = (exportDocuments, incoterm) => {
  if (!exportDocuments) return 0;

  const fields = isInsuranceRequired(incoterm)
    ? DOC_FIELDS
    : DOC_FIELDS.filter((field) => field !== "insurance_certificate_status");

  return fields.filter((field) => exportDocuments[field] === "done").length;
};

const emptyDocuments = (incoterm = "CIF") => ({
  commercial_invoice: true,
  packing_list: true,
  phytosanitary_certificate: false,
  airway_bill: false,
  certificate_of_origin: false,
  health_certificate: false,
  insurance_certificate: isInsuranceRequired(incoterm) ? false : false,
});

export default function GlobalDispatchListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const preselectCustomerId = searchParams.get("customerId") || "";

  const buildShipmentForm = (customer = null) => ({
    customer_id: customer ? String(customer.id) : "",
    dispatch_date: new Date().toISOString().slice(0, 10),
    departure_date: "",
    airline: customer?.airline_preference || "UL",
    flight_no: "",
    awb_number: "",
    incoterm: customer?.incoterm || "CIF",
    remarks: "",
    cold_chain_required:
      Number(customer?.cold_chain_required || 0) === 1 || customer?.cold_chain_required === true,
    documents: emptyDocuments(customer?.incoterm || "CIF"),
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [batchOptions, setBatchOptions] = useState({});

  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");

  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);
  const [formError, setFormError] = useState("");

  const [selectedRowId, setSelectedRowId] = useState(null);
  const [detailsShipment, setDetailsShipment] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [shipmentForm, setShipmentForm] = useState(buildShipmentForm());

  const [shipmentItems, setShipmentItems] = useState([{ ...emptyItemRow }]);

  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/dispatch/global");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load global shipments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadSetup = useCallback(async () => {
    try {
      const [customersRes, inventoryRes] = await Promise.all([
        api.get("/customers"),
        api.get("/inventory"),
      ]);

      const customerRows = Array.isArray(customersRes.data) ? customersRes.data : [];
      const inventoryRows = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];

      const normalizedItems = inventoryRows
        .map((item) => ({
          id: item.item_id || item.id,
          name: item.item_name || item.name,
        }))
        .filter((item) => item.id && item.name);

      setCustomers(customerRows);
      setItemsMaster(normalizedItems);

      if (customerRows.length) {
        const picked =
          customerRows.find((c) => String(c.id) === String(preselectCustomerId)) || customerRows[0];

        setShipmentForm(buildShipmentForm(picked));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load shipment setup data");
    }
  }, [toast, preselectCustomerId]);

  useEffect(() => {
    loadShipments();
    loadSetup();
  }, [loadShipments, loadSetup]);

  useEffect(() => {
    const openHandler = () => {
      setShowShipmentModal(true);
    };

    window.addEventListener("fw-open-global-shipment-modal", openHandler);
    return () => window.removeEventListener("fw-open-global-shipment-modal", openHandler);
  }, []);

  useEffect(() => {
    if (!showShipmentModal && !detailsShipment) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showShipmentModal) setShowShipmentModal(false);
        if (detailsShipment) closeDetails();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showShipmentModal, detailsShipment]);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (tab === "Docs Pending") {
      result = result.filter((row) => statusLabel(row) === "Docs Pending");
    } else if (tab === "Cleared") {
      result = result.filter((row) => statusLabel(row) === "Cleared");
    } else if (tab === "Delivered") {
      result = result.filter((row) => statusLabel(row) === "Delivered");
    }

    const q = search.trim().toLowerCase();

    if (q) {
      result = result.filter((row) =>
        [
          row.dispatch_number,
          row.customer_name,
          row.flight_no,
          row.airline,
          row.awb_number,
          row.incoterm,
          statusLabel(row),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return [...result].sort((a, b) => {
      const dateA = new Date(a.dispatch_date || 0).getTime();
      const dateB = new Date(b.dispatch_date || 0).getTime();

      if (dateB !== dateA) return dateB - dateA;

      return String(b.dispatch_number || "").localeCompare(
        String(a.dispatch_number || ""),
        undefined,
        { numeric: true, sensitivity: "base" }
      );
    });
  }, [rows, tab, search]);

  const docsPendingCount = useMemo(
    () => rows.filter((row) => statusLabel(row) === "Docs Pending").length,
    [rows]
  );

  const totalWeight = useMemo(
    () => shipmentItems.reduce((sum, row) => sum + Number(row.qty || 0), 0),
    [shipmentItems]
  );

  const totalBoxes = useMemo(
    () => shipmentItems.reduce((sum, row) => sum + Number(row.boxes || 0), 0),
    [shipmentItems]
  );

  const loadBatchesForItem = async (itemId) => {
    if (!itemId) return [];
    try {
      const res = await api.get(`/inventory/batches/${itemId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error(err);
      toast.error("Failed to load FEFO batches");
      return [];
    }
  };

  const openDetails = async (shipmentId) => {
    try {
      setDetailsLoading(true);
      const res = await api.get(`/dispatch/global/${shipmentId}`);
      setDetailsShipment(res.data || null);
      setSelectedRowId(shipmentId);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load shipment details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsShipment(null);
    setSelectedRowId(null);
  };

  const closeShipmentModal = () => {
    const selectedCustomer =
      customers.find((c) => String(c.id) === String(shipmentForm.customer_id)) || customers[0] || null;

    setShipmentForm(buildShipmentForm());
    setShipmentItems([{ ...emptyItemRow }]);
    setFormError("");
    setShowShipmentModal(false);
    setShipmentForm(buildShipmentForm(selectedCustomer));
  };

  const handleShipmentFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setShipmentForm((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    if (name === "customer_id") {
      const selectedCustomer = customers.find((c) => String(c.id) === String(value));

      setShipmentForm((prev) => ({
        ...prev,
        customer_id: value,
        airline: selectedCustomer?.airline_preference || prev.airline,
        incoterm: selectedCustomer?.incoterm || prev.incoterm,
        cold_chain_required:
          Number(selectedCustomer?.cold_chain_required || 0) === 1 ||
          selectedCustomer?.cold_chain_required === true,
        documents: {
          ...prev.documents,
          insurance_certificate: isInsuranceRequired(selectedCustomer?.incoterm || prev.incoterm)
            ? prev.documents.insurance_certificate
            : false,
        },
      }));
      return;
    }

    if (name === "incoterm") {
      setShipmentForm((prev) => ({
        ...prev,
        incoterm: value,
        documents: {
          ...prev.documents,
          insurance_certificate: isInsuranceRequired(value)
            ? prev.documents.insurance_certificate
            : false,
        },
      }));
      return;
    }

    setShipmentForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDocumentToggle = (field) => {
    if (field === "insurance_certificate" && !isInsuranceRequired(shipmentForm.incoterm)) {
      return;
    }

    setShipmentForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: !prev.documents[field],
      },
    }));
  };

  const handleItemChange = async (index, field, value) => {
    const updated = [...shipmentItems];
    updated[index][field] = value;

    if (field === "item_id") {
      updated[index].batch_id = "";
      const batches = await loadBatchesForItem(value);
      setBatchOptions((prev) => ({ ...prev, [index]: batches }));

      if (batches.length > 0) {
        updated[index].batch_id = String(batches[0].id);
      }
    }

    setShipmentItems(updated);
  };

  const addItemRow = () => {
    setShipmentItems((prev) => [...prev, { ...emptyItemRow }]);
  };

  const removeItemRow = (index) => {
    setShipmentItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    setFormError("");

    if (shipmentForm.dispatch_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const shipDate = new Date(shipmentForm.dispatch_date);
      shipDate.setHours(0, 0, 0, 0);
      if (shipDate < today) {
        setFormError("Shipment Date cannot be in the past.");
        return;
      }
    }

    if (shipmentForm.dispatch_date && shipmentForm.departure_date) {
      const shipDate = new Date(shipmentForm.dispatch_date);
      shipDate.setHours(0, 0, 0, 0);
      const depDate = new Date(shipmentForm.departure_date);
      depDate.setHours(0, 0, 0, 0);
      
      if (depDate < shipDate) {
        setFormError("Departure Date must be on or after the Shipment Date.");
        return;
      }
    }

    const validItems = shipmentItems
      .map((row) => ({
        item_id: Number(row.item_id),
        batch_id: row.batch_id ? Number(row.batch_id) : null,
        qty: Number(row.qty || 0),
        boxes: Number(row.boxes || 0),
      }))
      .filter((row) => row.item_id && row.qty > 0);

    if (!shipmentForm.customer_id || !shipmentForm.dispatch_date || !shipmentForm.airline) {
      toast.error("Customer, shipment date and airline are required");
      return;
    }

    if (!validItems.length) {
      toast.error("Add at least one valid item with quantity");
      return;
    }

    try {
      setSavingShipment(true);

      const createRes = await api.post("/dispatch/global", {
        customer_id: Number(shipmentForm.customer_id),
        dispatch_date: shipmentForm.dispatch_date,
        departure_date: shipmentForm.departure_date || null,
        airline: shipmentForm.airline,
        flight_no: shipmentForm.flight_no || null,
        awb_number: shipmentForm.awb_number || null,
        incoterm: shipmentForm.incoterm || "CIF",
        cold_chain_required: shipmentForm.cold_chain_required ? 1 : 0,
        remarks: shipmentForm.remarks || "",
        items: validItems,
      });

      const globalDispatchId = createRes?.data?.globalDispatchId;

      if (globalDispatchId) {
        await api.put(`/export-docs/by-dispatch/${globalDispatchId}`, {
          commercial_invoice_status: shipmentForm.documents.commercial_invoice ? "done" : "pending",
          packing_list_status: shipmentForm.documents.packing_list ? "done" : "pending",
          phytosanitary_certificate_status: shipmentForm.documents.phytosanitary_certificate ? "done" : "pending",
          airway_bill_status: shipmentForm.documents.airway_bill ? "done" : "pending",
          certificate_of_origin_status: shipmentForm.documents.certificate_of_origin ? "done" : "pending",
          health_certificate_status: shipmentForm.documents.health_certificate ? "done" : "pending",
          insurance_certificate_status:
            isInsuranceRequired(shipmentForm.incoterm) && shipmentForm.documents.insurance_certificate
              ? "done"
              : "pending",
          notes: shipmentForm.remarks || "",
        });
      }

      toast.success(createRes?.data?.message || "Shipment created successfully");
      closeShipmentModal();

      await loadShipments();

      if (globalDispatchId) {
        await openDetails(globalDispatchId);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create shipment");
    } finally {
      setSavingShipment(false);
    }
  };

  const handleOpenDocs = (shipmentId, e) => {
    if (e) e.stopPropagation();
    navigate(`/export-documents?dispatchId=${shipmentId}`);
  };

  const handleClearShipment = async (shipmentId) => {
    try {
      const res = await api.put(`/dispatch/global/${shipmentId}/clear`);
      toast.success(res.data?.message || "Shipment cleared successfully");
      await loadShipments();
      await openDetails(shipmentId);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to clear shipment");
    }
  };

  const handleMarkDelivered = async (shipmentId) => {
    try {
      const res = await api.put(`/dispatch/global/${shipmentId}/deliver`);
      toast.success(res.data?.message || "Shipment marked delivered");
      await loadShipments();
      await openDetails(shipmentId);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to mark shipment delivered");
    }
  };

  const detailDocsDone = useMemo(
    () => docsDoneCount(detailsShipment?.export_documents, detailsShipment?.incoterm),
    [detailsShipment]
  );

  const detailRequiredDocs = useMemo(
    () => requiredDocsCount(detailsShipment),
    [detailsShipment]
  );

  const currentDetailStatus = useMemo(() => {
    if (!detailsShipment) return "Docs Pending";
    return statusLabel(detailsShipment);
  }, [detailsShipment]);

  return (
    <>

      <div
        className="fb"
        style={{ marginTop: 16, justifyContent: "space-between", alignItems: "center", gap: 12 }}
      >
        <div className="fb" style={{ marginBottom: 0 }}>
          <button type="button" className={`ft ${tab === "All" ? "on" : ""}`} onClick={() => setTab("All")}>
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
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            ✈️ Dispatch — Export Shipments
            <span 
              title="Stock deducted only when Cleared (all 7 docs verified). Click any row to view shipment details and document status."
              style={{ cursor: "help", color: "#6B7D71", display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "#F1F5F9", fontSize: 12, border: "1px solid #E2E8F0" }}
            >
              ℹ
            </span>
          </h3>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span className="count-pill">{filteredRows.length} shipments</span>
            <button className="btn btn-p btn-sm" onClick={() => setShowShipmentModal(true)}>+ New Shipment</button>
          </div>
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
                <th>WEIGHT</th>
                <th>DOCS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9">Loading...</td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => {
                  const label = statusLabel(row);
                  const docsCount = Number(row.docs_done_count || 0);
                  const requiredDocs = Number(row.required_docs_count || requiredDocsCount(row));
                  const docsComplete =
                    Number(row.all_cleared || 0) === 1 || docsCount >= requiredDocs;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => openDetails(row.id)}
                      className={selectedRowId === row.id ? "details-row-active" : ""}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="dispatch-no-cell">{row.dispatch_number}</td>
                      <td style={{ fontWeight: 600 }}>{row.customer_name}</td>
                      <td>{formatDate(row.dispatch_date)}</td>
                      <td>
                        <span className="badge bg-a">{airlineBadge(row.flight_no, row.airline)}</span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {row.awb_number || "—"}
                      </td>
                      <td>{Number(row.total_weight || 0)} kg</td>
                      <td>
                        <span className={docsComplete ? "badge bg-g" : "badge bg-a"}>
                          {docsCount}/{requiredDocs}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadgeClass(label)}>{label}</span>
                      </td>
                      <td>
                        <div className="gd-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={
                              docsComplete
                                ? "gd-action-btn gd-action-btn-secondary"
                                : "gd-action-btn gd-action-btn-primary"
                            }
                            onClick={(e) => handleOpenDocs(row.id, e)}
                          >
                            {docsComplete ? "📄 View Docs" : "📄 Upload Docs"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9">No shipments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailsShipment && (
        <>
          <div className="details-panel-overlay" onClick={closeDetails}></div>

          <aside className="details-panel open">
            <div className="details-panel-header">
              <div className="details-panel-icon">✈️</div>

              <div className="details-panel-head-text">
                <h3>{detailsShipment.dispatch_number}</h3>
                <p>
                  {detailsShipment.customer_name} · {formatDate(detailsShipment.dispatch_date)} ·{" "}
                  {airlineBadge(detailsShipment.flight_no, detailsShipment.airline)}
                </p>
              </div>

              <button type="button" className="details-panel-close" onClick={closeDetails}>
                ✕
              </button>
            </div>

            <div className="details-panel-body">
              {detailsLoading ? (
                <div className="ib ib-i">
                  <span>⏳</span>
                  <div>Loading shipment details...</div>
                </div>
              ) : (
                <>
                  <div className="details-panel-grid">
                    <div className="details-stat-card">
                      <label>SHIPMENT NO.</label>
                      <span>{detailsShipment.dispatch_number}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>STATUS</label>
                      <span>{currentDetailStatus}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>CUSTOMER</label>
                      <span>{detailsShipment.customer_name}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>DATE</label>
                      <span>{formatDate(detailsShipment.dispatch_date)}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>FLIGHT</label>
                      <span>{detailsShipment.flight_no || airlineLabel(detailsShipment.airline)}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>AWB NO.</label>
                      <span>{detailsShipment.awb_number || "—"}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>TOTAL WEIGHT</label>
                      <span>{Number(detailsShipment.total_weight || 0)} kg</span>
                    </div>

                    <div className="details-stat-card">
                      <label>TOTAL BOXES</label>
                      <span>{Number(detailsShipment.total_boxes || 0)}</span>
                    </div>
                  </div>

                  <div className="details-mini-title">SHIPMENT ITEMS</div>

                  <table className="details-mini-table">
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th>BATCH</th>
                        <th>QTY (KG)</th>
                        <th>BOXES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsShipment.items?.length ? (
                        detailsShipment.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.item_name}</td>
                            <td>{item.batch_code || "—"}</td>
                            <td>{Number(item.qty || 0)}</td>
                            <td>{Number(item.boxes || 0)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4">No shipment items found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="details-mini-title">EXPORT DOCUMENT STATUS</div>

                  <table className="details-mini-table">
                    <tbody>
                      <tr>
                        <td>Commercial Invoice</td>
                        <td style={{ textAlign: "right" }}>
                          {detailsShipment.export_documents?.commercial_invoice_status === "done" ? "✅ Done" : "❌ Missing"}
                        </td>
                      </tr>
                      <tr>
                        <td>Packing List</td>
                        <td style={{ textAlign: "right" }}>
                          {detailsShipment.export_documents?.packing_list_status === "done" ? "✅ Done" : "❌ Missing"}
                        </td>
                      </tr>
                      <tr>
                        <td>Phytosanitary Certificate</td>
                        <td style={{ textAlign: "right" }}>
                          {detailsShipment.export_documents?.phytosanitary_certificate_status === "done" ? "✅ Done" : "❌ Missing"}
                        </td>
                      </tr>
                      <tr>
                        <td>Airway Bill (AWB)</td>
                        <td style={{ textAlign: "right" }}>
                          {detailsShipment.export_documents?.airway_bill_status === "done" ? "✅ Done" : "❌ Missing"}
                        </td>
                      </tr>
                      <tr>
                        <td>Certificate of Origin</td>
                        <td style={{ textAlign: "right" }}>
                          {detailsShipment.export_documents?.certificate_of_origin_status === "done" ? "✅ Done" : "❌ Missing"}
                        </td>
                      </tr>
                      <tr>
                        <td>Health Certificate</td>
                        <td style={{ textAlign: "right" }}>
                          {detailsShipment.export_documents?.health_certificate_status === "done" ? "✅ Done" : "❌ Missing"}
                        </td>
                      </tr>
                      <tr>
                        <td>Insurance Certificate</td>
                        <td style={{ textAlign: "right" }}>
                          {isInsuranceRequired(detailsShipment.incoterm)
                            ? detailsShipment.export_documents?.insurance_certificate_status === "done"
                              ? "✅ Done"
                              : "❌ Missing"
                            : "ℹ️ CIF only"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "14px 20px 16px",
                borderTop: "1px solid var(--border)",
                background: "var(--white)",
                flexShrink: 0,
              }}
            >
              {currentDetailStatus === "Docs Pending" &&
              detailDocsDone === detailRequiredDocs &&
              detailsShipment.export_documents?.all_cleared ? (
                <>
                  <button
                    type="button"
                    className="btn btn-p"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => handleClearShipment(detailsShipment.id)}
                  >
                    ✅ Mark Cleared
                  </button>
                  <button
                    type="button"
                    className="btn btn-s"
                    onClick={() => handleOpenDocs(detailsShipment.id)}
                  >
                    📄 View Docs
                  </button>
                </>
              ) : currentDetailStatus === "Cleared" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-p"
                    style={{ flex: 1, justifyContent: "center", background: "var(--s)" }}
                    onClick={() => handleMarkDelivered(detailsShipment.id)}
                  >
                    ✅ Mark Delivered
                  </button>
                  <button
                    type="button"
                    className="btn btn-s"
                    onClick={() => handleOpenDocs(detailsShipment.id)}
                  >
                    📄 View Docs
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={
                      detailDocsDone === detailRequiredDocs &&
                      detailsShipment.export_documents?.all_cleared
                        ? "btn btn-s"
                        : "btn btn-p"
                    }
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => handleOpenDocs(detailsShipment.id)}
                  >
                    {detailDocsDone === detailRequiredDocs &&
                    detailsShipment.export_documents?.all_cleared
                      ? "📄 View Docs"
                      : "📄 Upload Docs"}
                  </button>
                  <button type="button" className="btn btn-s" onClick={closeDetails}>
                    Close
                  </button>
                </>
              )}
            </div>
          </aside>
        </>
      )}

      {showShipmentModal && (
        <div
          className="modal-backdrop"
          onClick={closeShipmentModal}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            className="md md-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 920,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="md-h">
              <h3>✈️ New Global Dispatch (Export Shipment)</h3>
              <button type="button" className="md-x" onClick={closeShipmentModal}>
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateShipment}
              style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
            >
              {formError && (
                <div style={{ margin: "0 24px 16px", padding: "12px", background: "#FEF2F2", color: "#B91C1C", borderRadius: "8px", border: "1px solid #FCA5A5", fontSize: "14px" }}>
                  {formError}
                </div>
              )}
              <div
                className="md-b"
                style={{
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                  paddingBottom: 10,
                }}
              >
                <div className="ib ib-w">
                  <span>✈️</span>
                  <div>
                    Stock deducted only when all 7 export documents are verified and shipment is cleared.
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
                      name="customer_id"
                      value={shipmentForm.customer_id}
                      onChange={handleShipmentFormChange}
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.customer_name}
                          {customer.location_island ? ` — ${customer.location_island}` : customer.city ? ` — ${customer.city}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ff">
                    <label className="fl">
                      Shipment Date <span className="rq">*</span>
                    </label>
                    <input
                      className="fc"
                      type="date"
                      name="dispatch_date"
                      value={shipmentForm.dispatch_date}
                      onChange={handleShipmentFormChange}
                    />
                  </div>
                </div>

                <div className="fr3">
                  <div className="ff">
                    <label className="fl">
                      Airline <span className="rq">*</span>
                    </label>
                    <select
                      className="fc"
                      name="airline"
                      value={shipmentForm.airline}
                      onChange={handleShipmentFormChange}
                    >
                      <option value="UL">SriLankan Airlines (UL)</option>
                      <option value="Q2">Maldivian (Q2)</option>
                    </select>
                  </div>

                  <div className="ff">
                    <label className="fl">Departure Date</label>
                    <input
                      className="fc"
                      type="date"
                      name="departure_date"
                      value={shipmentForm.departure_date}
                      onChange={handleShipmentFormChange}
                    />
                  </div>

                  <div className="ff">
                    <label className="fl">Incoterms</label>
                    <select
                      className="fc"
                      name="incoterm"
                      value={shipmentForm.incoterm}
                      onChange={handleShipmentFormChange}
                    >
                      <option value="CIF">CIF</option>
                      <option value="FOB">FOB</option>
                      <option value="DAP">DAP</option>
                    </select>
                  </div>
                </div>

                <div className="fr">
                  <div className="ff">
                    <label className="fl">Flight No.</label>
                    <input
                      className="fc"
                      name="flight_no"
                      value={shipmentForm.flight_no}
                      onChange={handleShipmentFormChange}
                      placeholder="e.g. UL225"
                    />
                  </div>

                  <div className="ff">
                    <label className="fl">AWB No.</label>
                    <input
                      className="fc"
                      name="awb_number"
                      value={shipmentForm.awb_number}
                      onChange={handleShipmentFormChange}
                      placeholder="603-XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="ff" style={{ marginTop: 8 }}>
                  <label className="ck">
                    <input
                      type="checkbox"
                      name="cold_chain_required"
                      checked={shipmentForm.cold_chain_required}
                      onChange={handleShipmentFormChange}
                    />
                    <span>Cold chain required</span>
                  </label>
                </div>

                <div className="fs2">
                  <div className="fst">Items — FEFO Applied</div>

                  <table className="it">
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th>BATCH</th>
                        <th>QTY (KG)</th>
                        <th>BOXES</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipmentItems.map((row, index) => (
                        <tr key={index}>
                          <td>
                            <select
                              value={row.item_id}
                              onChange={(e) => handleItemChange(index, "item_id", e.target.value)}
                            >
                              <option value="">Select item</option>
                              {itemsMaster.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <select
                              value={row.batch_id}
                              onChange={(e) => handleItemChange(index, "batch_id", e.target.value)}
                            >
                              <option value="">Select batch</option>
                              {(batchOptions[index] || []).map((batch) => (
                                <option key={batch.id} value={batch.id}>
                                  {batchLabel(batch)}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.qty}
                              onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={row.boxes}
                              onChange={(e) => handleItemChange(index, "boxes", e.target.value)}
                            />
                          </td>

                          <td>
                            <button type="button" className="ab d" onClick={() => removeItemRow(index)}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button type="button" className="add-r" onClick={addItemRow}>
                    ＋ Add Item
                  </button>
                </div>

                <div className="ff">
                  <label className="fl">Export Document Checklist</label>
                  <ul className="ck-l">
                    <li>
                      <input
                        type="checkbox"
                        checked={shipmentForm.documents.commercial_invoice}
                        onChange={() => handleDocumentToggle("commercial_invoice")}
                      />
                      <span>Commercial Invoice</span>
                    </li>
                    <li>
                      <input
                        type="checkbox"
                        checked={shipmentForm.documents.packing_list}
                        onChange={() => handleDocumentToggle("packing_list")}
                      />
                      <span>Packing List</span>
                    </li>
                    <li>
                      <input
                        type="checkbox"
                        checked={shipmentForm.documents.phytosanitary_certificate}
                        onChange={() => handleDocumentToggle("phytosanitary_certificate")}
                      />
                      <span>Phytosanitary Certificate</span>
                    </li>
                    <li>
                      <input
                        type="checkbox"
                        checked={shipmentForm.documents.airway_bill}
                        onChange={() => handleDocumentToggle("airway_bill")}
                      />
                      <span>Airway Bill (AWB)</span>
                    </li>
                    <li>
                      <input
                        type="checkbox"
                        checked={shipmentForm.documents.certificate_of_origin}
                        onChange={() => handleDocumentToggle("certificate_of_origin")}
                      />
                      <span>Certificate of Origin</span>
                    </li>
                    <li>
                      <input
                        type="checkbox"
                        checked={shipmentForm.documents.health_certificate}
                        onChange={() => handleDocumentToggle("health_certificate")}
                      />
                      <span>Health Certificate</span>
                    </li>
                    <li>
                      <input
                        type="checkbox"
                        checked={shipmentForm.documents.insurance_certificate}
                        onChange={() => handleDocumentToggle("insurance_certificate")}
                        disabled={!isInsuranceRequired(shipmentForm.incoterm)}
                      />
                      <span>Insurance Certificate</span>
                      {!isInsuranceRequired(shipmentForm.incoterm) && (
                        <span className="badge bg-a" style={{ marginLeft: "auto" }}>
                          CIF only
                        </span>
                      )}
                    </li>
                  </ul>
                </div>

                <div className="ff">
                  <label className="fl">Remarks</label>
                  <textarea
                    className="fc"
                    name="remarks"
                    value={shipmentForm.remarks}
                    onChange={handleShipmentFormChange}
                    placeholder="Shipment notes..."
                    style={{ minHeight: 90 }}
                  />
                </div>

                <div className="ff">
                  <label className="fl">Total Weight (kg)</label>
                  <input className="fc" value={totalWeight.toFixed(1)} readOnly />
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 24px 18px",
                  borderTop: "1px solid var(--border)",
                  background: "white",
                  position: "sticky",
                  bottom: 0,
                  zIndex: 5,
                }}
              >
                <button type="button" className="btn btn-s" onClick={closeShipmentModal}>
                  Cancel
                </button>

                <button type="submit" className="btn btn-a" disabled={savingShipment || !customers.length}>
                  {savingShipment ? "Saving..." : "Create Shipment + Generate Docs"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}