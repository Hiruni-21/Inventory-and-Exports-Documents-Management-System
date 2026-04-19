import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

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

const batchOptionLabel = (batch) => {
  const batchCode = batch.batch_code || batch.batch_number || "—";
  const qty =
    batch.qty_remaining ??
    batch.available_quantity ??
    batch.available_qty ??
    batch.received_quantity ??
    0;

  const expiry = batch.expiry_date ? String(batch.expiry_date).slice(0, 10) : "";
  return expiry ? `${batchCode} (${qty}kg, exp ${expiry})` : `${batchCode} (${qty}kg)`;
};

const normalizeStatusLabel = (status, docsDoneCount = 0) => {
  const v = String(status || "").toLowerCase();

  if (v === "delivered") return "Delivered";
  if (v === "cleared") return "Cleared";
  if (docsDoneCount > 0 || v === "docs_pending" || v === "created") return "Docs Pending";
  return "Docs Pending";
};

const statusBadgeClass = (label) => {
  const v = String(label || "").toLowerCase();
  if (v === "delivered" || v === "cleared") return "badge bg-g";
  return "badge bg-a";
};

export default function GlobalDispatchListPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [batchOptions, setBatchOptions] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");

  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  const [form, setForm] = useState({
    customer_id: "",
    dispatch_date: new Date().toISOString().slice(0, 10),
    departure_date: "",
    airline: "SriLankan Airlines (UL)",
    flight_no: "",
    awb_number: "",
    incoterm: "CIF",
    remarks: "",
    cold_chain_required: false,
  });

  const [itemRows, setItemRows] = useState([{ ...emptyItemRow }]);

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

  const loadCustomers = useCallback(async () => {
    try {
      const res = await api.get("/customers?type=global");
      const data = Array.isArray(res.data) ? res.data : [];
      setCustomers(data);

      if (data.length > 0) {
        const first = data[0];
        setForm((prev) => ({
          ...prev,
          customer_id: String(first.id),
          airline: first.airline_preference || prev.airline,
          incoterm: first.incoterm || prev.incoterm,
          cold_chain_required:
            first.cold_chain_required === 1 || first.cold_chain_required === true,
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load global customers");
      setCustomers([]);
    }
  }, [toast]);

  const loadItems = useCallback(async () => {
    try {
      const res = await api.get("/inventory");
      const data = Array.isArray(res.data) ? res.data : [];

      const normalized = data
        .map((item) => ({
          id: item.item_id || item.id,
          name: item.item_name || item.name,
          code: item.item_code || item.code,
          available:
            Number(item.qty_available || item.total_available_quantity || item.available_quantity || 0),
        }))
        .filter((item) => item.id && item.name);

      setItems(normalized);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load inventory items");
      setItems([]);
    }
  }, [toast]);

  useEffect(() => {
    loadShipments();
    loadCustomers();
    loadItems();
  }, [loadShipments, loadCustomers, loadItems]);

  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener("fw-open-global-shipment-modal", handler);
    return () => window.removeEventListener("fw-open-global-shipment-modal", handler);
  }, []);

  const docsPendingCount = useMemo(
    () =>
      rows.filter(
        (row) => normalizeStatusLabel(row.status, Number(row.docs_done_count || 0)) === "Docs Pending"
      ).length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    let list = rows;

    if (tab === "Docs Pending") {
      list = list.filter(
        (row) => normalizeStatusLabel(row.status, Number(row.docs_done_count || 0)) === "Docs Pending"
      );
    } else if (tab === "Cleared") {
      list = list.filter(
        (row) => normalizeStatusLabel(row.status, Number(row.docs_done_count || 0)) === "Cleared"
      );
    } else if (tab === "Delivered") {
      list = list.filter(
        (row) => normalizeStatusLabel(row.status, Number(row.docs_done_count || 0)) === "Delivered"
      );
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((row) =>
      [
        row.dispatch_number,
        row.customer_name,
        row.flight_no,
        row.airline,
        row.awb_number,
        normalizeStatusLabel(row.status, Number(row.docs_done_count || 0)),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search, tab]);

  const totalWeight = useMemo(
    () => itemRows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
    [itemRows]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === String(form.customer_id)),
    [customers, form.customer_id]
  );

  const openDetails = async (shipmentId) => {
    try {
      setPanelLoading(true);
      const res = await api.get(`/dispatch/global/${shipmentId}`);
      setSelectedShipment(res.data || null);
      setSelectedRowId(shipmentId);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load shipment details");
    } finally {
      setPanelLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedShipment(null);
    setSelectedRowId(null);
  };

  const loadBatches = async (index, itemId) => {
    if (!itemId) {
      setBatchOptions((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    try {
      const res = await api.get(`/inventory/batches/${itemId}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setBatchOptions((prev) => ({ ...prev, [index]: data }));

      setItemRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                batch_id: data[0]?.id ? String(data[0].id) : "",
              }
            : row
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load FEFO batches");
      setBatchOptions((prev) => ({ ...prev, [index]: [] }));
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === "customer_id") {
      const found = customers.find((c) => String(c.id) === String(value));

      setForm((prev) => ({
        ...prev,
        customer_id: value,
        airline: found?.airline_preference || prev.airline,
        incoterm: found?.incoterm || prev.incoterm,
        cold_chain_required:
          found?.cold_chain_required === 1 || found?.cold_chain_required === true,
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = async (index, field, value) => {
    setItemRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
              ...(field === "item_id" ? { batch_id: "" } : {}),
            }
          : row
      )
    );

    if (field === "item_id") {
      await loadBatches(index, value);
    }
  };

  const addItemRow = () => {
    setItemRows((prev) => [...prev, { ...emptyItemRow }]);
  };

  const removeItemRow = (index) => {
    setItemRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
    setBatchOptions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const resetForm = () => {
    setItemRows([{ ...emptyItemRow }]);
    setBatchOptions({});
    setForm((prev) => ({
      ...prev,
      dispatch_date: new Date().toISOString().slice(0, 10),
      departure_date: "",
      flight_no: "",
      awb_number: "",
      remarks: "",
    }));
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();

    if (!form.customer_id) {
      toast.error("Please select a customer");
      return;
    }

    const validItems = itemRows
      .map((row) => ({
        item_id: Number(row.item_id),
        batch_id: row.batch_id ? Number(row.batch_id) : null,
        qty: Number(row.qty || 0),
        boxes: Number(row.boxes || 0),
      }))
      .filter((row) => row.item_id && row.batch_id && row.qty > 0);

    if (!validItems.length) {
      toast.error("Please add at least one valid item row");
      return;
    }

    try {
      setSaving(true);

      const res = await api.post("/dispatch/global", {
        customer_id: Number(form.customer_id),
        dispatch_date: form.dispatch_date,
        departure_date: form.departure_date || null,
        airline: form.airline,
        flight_no: form.flight_no || null,
        awb_number: form.awb_number || null,
        incoterm: form.incoterm || "CIF",
        remarks: form.remarks || "",
        cold_chain_required: form.cold_chain_required ? 1 : 0,
        items: validItems,
      });

      toast.success(res.data?.message || "Shipment created successfully");
      closeModal();
      resetForm();
      await loadShipments();

      if (res.data?.globalDispatchId) {
        await openDetails(res.data.globalDispatchId);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create shipment");
    } finally {
      setSaving(false);
    }
  };

  const openDocs = (shipmentId, e) => {
    if (e) e.stopPropagation();
    navigate(`/export-documents?dispatchId=${shipmentId}`);
  };

  const markDelivered = async (shipmentId) => {
    try {
      await api.put(`/dispatch/global/${shipmentId}/deliver`);
      toast.success("Shipment marked delivered");
      await loadShipments();
      await openDetails(shipmentId);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to mark shipment delivered");
    }
  };

  const detailDocsDone = selectedShipment?.export_documents
    ? DOC_FIELDS.filter((field) => selectedShipment.export_documents[field] === "done").length
    : Number(selectedShipment?.docs_done_count || 0);

  const detailStatus = normalizeStatusLabel(selectedShipment?.status, detailDocsDone);

  return (
    <>
      <div className="ib ib-w">
        <span>✈️</span>
        <div>
          Stock deducted only when <strong>Cleared</strong> (all 7 docs verified).{" "}
          <strong>Click any row</strong> to view shipment details and document status.
        </div>
      </div>

      <div
        className="fb"
        style={{ marginTop: 16, justifyContent: "space-between", alignItems: "center", gap: 12 }}
      >
        <div className="fb" style={{ marginBottom: 0 }}>
          <button className={`ft ${tab === "All" ? "on" : ""}`} onClick={() => setTab("All")}>
            All
          </button>
          <button
            className={`ft ${tab === "Docs Pending" ? "on" : ""}`}
            onClick={() => setTab("Docs Pending")}
          >
            Docs Pending ({docsPendingCount})
          </button>
          <button className={`ft ${tab === "Cleared" ? "on" : ""}`} onClick={() => setTab("Cleared")}>
            Cleared
          </button>
          <button
            className={`ft ${tab === "Delivered" ? "on" : ""}`}
            onClick={() => setTab("Delivered")}
          >
            Delivered
          </button>
        </div>

        <div className="sw" style={{ marginBottom: 0 }}>
          <input
            className="si"
            placeholder="Search by dispatch no, customer, airline or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300 }}
          />
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>✈️ Global Dispatch — Export Shipments</h3>
          <span className="badge bg-a">{rows.length} shipments</span>
        </div>

        <table>
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
                const label = normalizeStatusLabel(row.status, Number(row.docs_done_count || 0));
                const docsDone = Number(row.docs_done_count || 0);

                return (
                  <tr
                    key={row.id}
                    onClick={() => openDetails(row.id)}
                    className={selectedRowId === row.id ? "dp-selected" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--g800)" }}>
                      {row.dispatch_number}
                    </td>
                    <td style={{ fontWeight: 700 }}>{row.customer_name}</td>
                    <td>{formatDate(row.dispatch_date)}</td>
                    <td>
                      <span className="badge bg-a">{row.flight_no || row.airline || "—"}</span>
                    </td>
                    <td style={{ fontSize: 11, fontFamily: "monospace" }}>{row.awb_number || "—"}</td>
                    <td>{Number(row.total_weight || 0)} kg</td>
                    <td>
                      <span className={docsDone === 7 ? "badge bg-g" : "badge bg-a"}>
                        {docsDone}/7
                      </span>
                    </td>
                    <td>
                      <span className={statusBadgeClass(label)}>{label}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={docsDone === 7 ? "ab" : "btn btn-p btn-xs"}
                        onClick={(e) => openDocs(row.id, e)}
                      >
                        {docsDone === 7 ? "📄" : "📄 Docs"}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9">No global shipments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedShipment && (
        <>
          <div
            onClick={closeDetails}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10,40,24,.22)",
              zIndex: 399,
              backdropFilter: "blur(1px)",
            }}
          />

          <aside
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: 420,
              background: "white",
              boxShadow: "-6px 0 32px rgba(10,40,24,.14)",
              zIndex: 400,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "18px 20px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  background: "var(--a100)",
                  flexShrink: 0,
                }}
              >
                ✈️
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--g900)",
                    letterSpacing: "-.2px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {selectedShipment.dispatch_number}
                </h3>
                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                  {selectedShipment.customer_name} · {formatDate(selectedShipment.dispatch_date)} ·{" "}
                  {selectedShipment.flight_no || selectedShipment.airline || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  border: "1.5px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {panelLoading ? (
                <div className="ib ib-i">
                  <span>⏳</span>
                  <div>Loading shipment details...</div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    {[
                      ["Shipment No.", selectedShipment.dispatch_number],
                      ["Status", detailStatus],
                      ["Customer", selectedShipment.customer_name],
                      ["Date", formatDate(selectedShipment.dispatch_date)],
                      ["Flight", selectedShipment.flight_no || selectedShipment.airline || "—"],
                      ["AWB Number", selectedShipment.awb_number || "—"],
                      ["Total Weight", `${Number(selectedShipment.total_weight || 0)} kg`],
                      ["Documents", `${detailDocsDone}/7 complete`],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          background: "var(--ivory)",
                          borderRadius: 9,
                          padding: "11px 13px",
                        }}
                      >
                        <label
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "var(--text3)",
                            textTransform: "uppercase",
                            letterSpacing: ".07em",
                            display: "block",
                            marginBottom: 3,
                          }}
                        >
                          {label}
                        </label>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--g900)" }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="fst" style={{ marginTop: 14, marginBottom: 8 }}>
                    Items — FEFO Applied
                  </div>

                  <table className="dp-mini-table">
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th>BATCH</th>
                        <th>QTY</th>
                        <th>BOXES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedShipment.items || []).length ? (
                        selectedShipment.items.map((item) => (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                            <td style={{ fontFamily: "monospace", fontSize: 10 }}>
                              {item.batch_code || "—"}
                            </td>
                            <td>{Number(item.qty || 0)} kg</td>
                            <td>{Number(item.boxes || 0)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4">No items found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="fst" style={{ marginTop: 14, marginBottom: 8 }}>
                    Export Document Checklist
                  </div>

                  <ul className="ck-l">
                    <li>
                      <input type="checkbox" checked={selectedShipment.export_documents?.commercial_invoice_status === "done"} readOnly />
                      <span>Commercial Invoice</span>
                    </li>
                    <li>
                      <input type="checkbox" checked={selectedShipment.export_documents?.packing_list_status === "done"} readOnly />
                      <span>Packing List</span>
                    </li>
                    <li>
                      <input type="checkbox" checked={selectedShipment.export_documents?.phytosanitary_certificate_status === "done"} readOnly />
                      <span>Phytosanitary Certificate</span>
                    </li>
                    <li>
                      <input type="checkbox" checked={selectedShipment.export_documents?.airway_bill_status === "done"} readOnly />
                      <span>Airway Bill (AWB)</span>
                    </li>
                    <li>
                      <input type="checkbox" checked={selectedShipment.export_documents?.certificate_of_origin_status === "done"} readOnly />
                      <span>Certificate of Origin</span>
                    </li>
                    <li>
                      <input type="checkbox" checked={selectedShipment.export_documents?.health_certificate_status === "done"} readOnly />
                      <span>Health Certificate</span>
                    </li>
                    <li>
                      <input type="checkbox" checked={selectedShipment.export_documents?.insurance_certificate_status === "done"} readOnly />
                      <span>Insurance Certificate</span>
                    </li>
                  </ul>
                </>
              )}
            </div>

            <div
              style={{
                flexShrink: 0,
                padding: "13px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: 8,
                background: "white",
              }}
            >
              {detailStatus === "Cleared" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-p"
                    style={{ flex: 1, justifyContent: "center", background: "var(--s)" }}
                    onClick={() => markDelivered(selectedShipment.id)}
                  >
                    ✅ Mark Delivered
                  </button>

                  <button type="button" className="btn btn-s" onClick={() => openDocs(selectedShipment.id)}>
                    📄 Docs
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={detailDocsDone === 7 ? "btn btn-s" : "btn btn-p"}
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => openDocs(selectedShipment.id)}
                  >
                    {detailDocsDone === 7 ? "📄 View Docs" : "📄 Upload Docs"}
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

      {showModal && (
        <div
          className="mo show"
          onClick={closeModal}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
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
              <button type="button" className="md-x" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateShipment}
              style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
            >
              <div
                className="md-b"
                style={{
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                  paddingBottom: 14,
                }}
              >
                <div className="ib ib-w">
                  <span>✈️</span>
                  <div>
                    Stock deducted when all 7 export documents are verified & shipment cleared.
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
                      value={form.customer_id}
                      onChange={handleFormChange}
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.customer_name}
                          {customer.location_island
                            ? ` — ${customer.location_island}`
                            : customer.city
                            ? ` — ${customer.city}`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {!customers.length && (
                      <div className="fh" style={{ color: "var(--d)" }}>
                        No global customers found. Check backend route and customer data.
                      </div>
                    )}
                  </div>

                  <div className="ff">
                    <label className="fl">
                      Shipment Date <span className="rq">*</span>
                    </label>
                    <input
                      className="fc"
                      type="date"
                      name="dispatch_date"
                      value={form.dispatch_date}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="fr3">
                  <div className="ff">
                    <label className="fl">
                      Airline <span className="rq">*</span>
                    </label>
                    <select className="fc" name="airline" value={form.airline} onChange={handleFormChange}>
                      <option value="SriLankan Airlines (UL)">SriLankan Airlines (UL)</option>
                      <option value="Maldivian (Q2)">Maldivian (Q2)</option>
                      <option value="Qatar Airways (QR)">Qatar Airways (QR)</option>
                      <option value="Emirates (EK)">Emirates (EK)</option>
                    </select>
                  </div>

                  <div className="ff">
                    <label className="fl">Flight No.</label>
                    <input
                      className="fc"
                      name="flight_no"
                      value={form.flight_no}
                      onChange={handleFormChange}
                      placeholder="e.g. UL225"
                    />
                  </div>

                  <div className="ff">
                    <label className="fl">AWB No.</label>
                    <input
                      className="fc"
                      name="awb_number"
                      value={form.awb_number}
                      onChange={handleFormChange}
                      placeholder="603-XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="fr">
                  <div className="ff">
                    <label className="fl">Incoterms</label>
                    <select className="fc" name="incoterm" value={form.incoterm} onChange={handleFormChange}>
                      <option value="CIF">CIF</option>
                      <option value="FOB">FOB</option>
                      <option value="DAP">DAP</option>
                    </select>
                  </div>

                  <div className="ff">
                    <label className="fl">Total Weight (kg)</label>
                    <input className="fc" value={totalWeight.toFixed(1)} readOnly />
                  </div>
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
                      {itemRows.map((row, index) => (
                        <tr key={index}>
                          <td>
                            <select
                              value={row.item_id}
                              onChange={(e) => handleItemChange(index, "item_id", e.target.value)}
                            >
                              <option value="">Select item</option>
                              {items.map((item) => (
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
                                  {batchOptionLabel(batch)}
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
                    <li><input type="checkbox" checked readOnly /> <span>Commercial Invoice</span></li>
                    <li><input type="checkbox" checked readOnly /> <span>Packing List</span></li>
                    <li><input type="checkbox" readOnly /> <span>Phytosanitary Certificate</span></li>
                    <li><input type="checkbox" readOnly /> <span>Airway Bill (AWB)</span></li>
                    <li><input type="checkbox" readOnly /> <span>Certificate of Origin</span></li>
                    <li><input type="checkbox" readOnly /> <span>Health Certificate</span></li>
                    <li><input type="checkbox" readOnly /> <span>Insurance Certificate</span></li>
                  </ul>
                </div>

                <div className="ff">
                  <label className="fl">Remarks</label>
                  <textarea
                    className="fc"
                    name="remarks"
                    value={form.remarks}
                    onChange={handleFormChange}
                    placeholder="Shipment notes..."
                    style={{ minHeight: 90 }}
                  />
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
                <button type="button" className="btn btn-s" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="btn btn-a" disabled={saving || !customers.length}>
                  {saving ? "Saving..." : "Create Shipment + Generate Docs"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}