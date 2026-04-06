import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";


const normalizeText = (value) =>
  String(value || "")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const buildCustomerLabel = (customer) => {
  const name = customer.customer_name || customer.customerName || "";
  const city = customer.city || "";
  return city ? `${name} — ${city}` : name;
};

const mapApiCustomerOption = (customer) => ({
  id: customer.id,
  label: buildCustomerLabel(customer),
  customerName: customer.customer_name || customer.customerName || "",
  city: customer.city || "",
  preferredDriver: customer.driver_preference || customer.preferredDriver || "",
  deliveryWindow: customer.delivery_window || customer.deliveryWindow || "",
});

const findCustomerOption = (customerOptions, rawValue) => {
  const target = normalizeText(rawValue);
  if (!target) return null;

  return (
    customerOptions.find((customer) => normalizeText(customer.label) === target) ||
    customerOptions.find((customer) => normalizeText(customer.customerName) === target) ||
    customerOptions.find((customer) =>
      normalizeText(`${customer.customerName} - ${customer.city}`) === target
    ) ||
    null
  );
};

const buildInitialForm = (customerLabel = "", customerOptions = []) => {
  const found = findCustomerOption(customerOptions, customerLabel);

  return {
    customer_id: found?.id ? String(found.id) : "",
    client_name: found?.label || customerLabel || "",
    dispatch_date: new Date().toISOString().slice(0, 10),
    driver_name: found?.preferredDriver || "",
    vehicle_number: "",
    delivery_window: found?.deliveryWindow || "05:00 – 07:00 AM",
    remarks: "",
    docs: { ...emptyDocs },
  };
};

const emptyItemRow = {
  item_id: "",
  batch_id: "",
  quantity: "",
  packaging: "Cardboard Box",
};

const emptyDocs = {
  delivery_note: true,
  local_invoice: false,
  goods_dispatch_note: false,
};

const styles = {
  modalShell: {
    width: "100%",
    maxWidth: "970px",
    maxHeight: "86vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: "16px",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
  },
  modalBody: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    paddingBottom: "14px",
  },
  modalFooter: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "10px",
    padding: "14px 24px 18px",
    borderTop: "1px solid var(--border)",
    background: "var(--white)",
  },
  modalCancel: {
    height: "38px",
    minWidth: "84px",
    padding: "0 18px",
    borderRadius: "10px",
    border: "1.5px solid var(--border)",
    background: "#fff",
    color: "var(--g700)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  modalSubmit: {
    height: "38px",
    minWidth: "200px",
    padding: "0 20px",
    borderRadius: "10px",
    border: "none",
    background: "var(--g800)",
    color: "#fff",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  panelFooter: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px 18px 16px",
    borderTop: "1px solid var(--border)",
    background: "var(--white)",
  },
  panelMainGreen: {
    flex: "1 1 auto",
    height: "38px",
    padding: "0 18px",
    borderRadius: "11px",
    border: "none",
    background: "var(--g600)",
    color: "#fff",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  panelMainOutline: {
    flex: "1 1 auto",
    height: "38px",
    padding: "0 18px",
    borderRadius: "11px",
    border: "1.5px solid var(--border)",
    background: "#fff",
    color: "var(--g700)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  panelSide: {
    flex: "0 0 auto",
    minWidth: "108px",
    height: "38px",
    padding: "0 16px",
    borderRadius: "11px",
    border: "1.5px solid var(--border)",
    background: "#fff",
    color: "var(--g700)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
};

const formatDate = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

const getWindowStart = (value) => {
  if (!value) return "—";
  if (value.includes("–")) return value.split("–")[0].trim();
  if (value.includes("-")) return value.split("-")[0].trim();
  return value;
};

const normalizeStatus = (value) => {
  const v = String(value || "").toLowerCase();
  if (v === "delivered") return "Delivered";
  if (v === "out_for_delivery") return "Out for Delivery";
  return "Scheduled";
};

const badgeClass = (value) => {
  const v = String(value || "").toLowerCase();
  if (v === "delivered") return "badge bg-g";
  if (v === "out_for_delivery") return "badge bg-a";
  return "badge bg-b";
};

const getDaysLeft = (expiryDate) => {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const renderFefoBadge = (expiryDate) => {
  const daysLeft = getDaysLeft(expiryDate);
  if (daysLeft === null) return <span className="badge bg-g">OK</span>;
  if (daysLeft <= 2) return <span className="badge bg-r">Exp {daysLeft}d</span>;
  if (daysLeft <= 7) return <span className="badge bg-a">Exp {daysLeft}d</span>;
  return <span className="badge bg-g">OK</span>;
};

const batchOptionLabel = (batch) => {
  const batchCode = batch.batch_code || batch.batch_number || "—";
  const qty =
    batch.qty_remaining ??
    batch.available_quantity ??
    batch.available_qty ??
    batch.received_quantity ??
    0;

  const daysLeft = getDaysLeft(batch.expiry_date);

  if (daysLeft !== null && daysLeft <= 2) {
    return `${batchCode} (${qty}kg, exp ${daysLeft}d ⚠️)`;
  }

  if (daysLeft !== null) {
    return `${batchCode} (${qty}kg, exp ${daysLeft}d)`;
  }

  return `${batchCode} (${qty}kg)`;
};

export default function DispatchListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [batchOptions, setBatchOptions] = useState({});
  const [localCustomers, setLocalCustomers] = useState([]);
  const [form, setForm] = useState(buildInitialForm(""));
  const [itemRows, setItemRows] = useState([{ ...emptyItemRow }]);

  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  const loadDispatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/dispatch");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load local dispatch records");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadInventory = useCallback(async () => {
    try {
      const res = await api.get("/inventory");
      const availableItems = (Array.isArray(res.data) ? res.data : []).filter(
        (item) => Number(item.qty_available || item.total_available_quantity || 0) > 0
      );
      setInventory(availableItems);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load inventory");
    }
  }, [toast]);
const loadLocalCustomers = useCallback(async () => {
  try {
    const res = await api.get("/customers?type=local");
    const customerRows = Array.isArray(res.data) ? res.data.map(mapApiCustomerOption) : [];
    setLocalCustomers(customerRows);
  } catch (err) {
    console.error(err);
    toast.error("Failed to load local customers");
    setLocalCustomers([]);
  }
}, [toast]);


  useEffect(() => {
    loadDispatches();
    loadInventory();
    loadLocalCustomers();
  }, [loadDispatches, loadInventory, loadLocalCustomers]);

  useEffect(() => {
    const openModalFromTopbar = () => {
      const customerFromQuery = searchParams.get("customer") || "";
      setForm(buildInitialForm(customerFromQuery, localCustomers));
      setItemRows([{ ...emptyItemRow }]);
      setBatchOptions({});
      setShowModal(true);
    };

    window.addEventListener("fw-open-local-dispatch-modal", openModalFromTopbar);
    return () =>
      window.removeEventListener("fw-open-local-dispatch-modal", openModalFromTopbar);
  }, [localCustomers, searchParams]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowModal(false);
        setShowDetailsPanel(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
useEffect(() => {
  const customerFromQuery = searchParams.get("customer") || "";
  if (!customerFromQuery || !localCustomers.length) return;

  const found = findCustomerOption(localCustomers, customerFromQuery);
  if (!found) return;

  setForm((prev) => ({
    ...prev,
    customer_id: String(found.id),
    client_name: found.label,
    driver_name: prev.driver_name || found.preferredDriver || "",
    delivery_window: prev.delivery_window || found.deliveryWindow || "05:00 – 07:00 AM",
  }));
}, [localCustomers, searchParams]);


  const todayString = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayCount = useMemo(
    () => rows.filter((row) => formatDate(row.dispatch_date) === todayString).length,
    [rows, todayString]
  );

  const scheduledCount = useMemo(
    () => rows.filter((row) => String(row.status || "").toLowerCase() === "scheduled").length,
    [rows]
  );

  const deliveredCount = useMemo(
    () => rows.filter((row) => String(row.status || "").toLowerCase() === "delivered").length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (tab === "Today") {
      return rows.filter((row) => formatDate(row.dispatch_date) === todayString);
    }
    if (tab === "Scheduled") {
      return rows.filter((row) => String(row.status || "").toLowerCase() === "scheduled");
    }
    if (tab === "Delivered") {
      return rows.filter((row) => String(row.status || "").toLowerCase() === "delivered");
    }
    return rows;
  }, [rows, tab, todayString]);

  const totalDraftWeight = useMemo(
    () => itemRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    [itemRows]
  );

  const openDetails = async (dispatchId) => {
    try {
      setSelectedRowId(dispatchId);
      setShowDetailsPanel(true);
      setPanelLoading(true);
      const res = await api.get(`/dispatch/${dispatchId}`);
      setSelectedDispatch(res.data || null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dispatch details");
      setSelectedDispatch(null);
      setShowDetailsPanel(false);
      setSelectedRowId(null);
    } finally {
      setPanelLoading(false);
    }
  };

  const closeDetails = () => {
    setShowDetailsPanel(false);
    setSelectedRowId(null);
    setSelectedDispatch(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(buildInitialForm(searchParams.get("customer") || "", localCustomers));
    setItemRows([{ ...emptyItemRow }]);
    setBatchOptions({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "customer_id") {
      const found = localCustomers.find((customer) => String(customer.id) === String(value));

      setForm((prev) => ({
        ...prev,
        customer_id: value,
        client_name: found?.label || "",
        driver_name: found?.preferredDriver || prev.driver_name,
        delivery_window: found?.deliveryWindow || prev.delivery_window,
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDocument = (name) => {
    setForm((prev) => ({
      ...prev,
      docs: { ...prev.docs, [name]: !prev.docs[name] },
    }));
  };

  const loadBatchesForItem = async (itemId) => {
    try {
      const res = await api.get(`/inventory/batches/${itemId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error(err);
      toast.error("Failed to load FEFO batches");
      return [];
    }
  };

  const handleItemChange = async (index, field, value) => {
    const updatedRows = [...itemRows];
    updatedRows[index][field] = value;

    if (field === "item_id") {
      updatedRows[index].batch_id = "";
      setItemRows(updatedRows);

      if (!value) {
        setBatchOptions((prev) => ({ ...prev, [index]: [] }));
        return;
      }

      const batches = await loadBatchesForItem(value);
      setBatchOptions((prev) => ({ ...prev, [index]: batches }));

      if (batches.length > 0) {
        updatedRows[index].batch_id = String(batches[0].id);
      }

      setItemRows([...updatedRows]);
      return;
    }

    setItemRows(updatedRows);
  };

  const addItemRow = () => setItemRows((prev) => [...prev, { ...emptyItemRow }]);

  const removeItemRow = (index) => {
    setItemRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleCreateDispatch = async (e) => {
    e.preventDefault();

    const cleanItems = itemRows
      .map((row) => ({
        item_id: Number(row.item_id),
        batch_id: Number(row.batch_id),
        quantity: Number(row.quantity || 0),
      }))
      .filter((row) => row.item_id && row.batch_id && row.quantity > 0);

    if (!form.client_name || !form.dispatch_date || cleanItems.length === 0) {
      toast.error("Customer, dispatch date, and at least one item are required");
      return;
    }

    try {
      setSaving(true);

      const res = await api.post("/dispatch", {
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        client_name: form.client_name,
        dispatch_date: form.dispatch_date,
        driver_name: form.driver_name,
        vehicle_number: form.vehicle_number,
        delivery_window: form.delivery_window,
        remarks: form.remarks,
        items: cleanItems,
      });

      const dispatchId = res?.data?.dispatchId;
      const dispatchNumber = res?.data?.dispatchNumber || "Dispatch";

      toast.success(`${dispatchNumber} created successfully`);
      closeModal();
      await loadDispatches();

      if (dispatchId) {
        await openDetails(dispatchId);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create dispatch");
    } finally {
      setSaving(false);
    }
  };

  const markDelivered = async (dispatchId, e) => {
    if (e) e.stopPropagation();

    try {
      await api.put(`/dispatch/${dispatchId}/delivered`);
      toast.success("Dispatch marked Delivered. Stock deducted.");
      await loadDispatches();

      if (selectedDispatch?.id === dispatchId) {
        await openDetails(dispatchId);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to mark delivered");
    }
  };

  const printDispatch = (dispatchId, e) => {
    if (e) e.stopPropagation();
    window.open(`/dispatch/print/${dispatchId}`, "_blank");
  };

  return (
    <>
      <div className="ib ib-s">
        <span>📦</span>
        <div>
          Stock deducted automatically when marked Delivered. <strong>Click any row</strong> to
          view items dispatched, driver details and actions.
        </div>
      </div>

      <div className="fb" style={{ marginTop: 16 }}>
        <button className={`ft ${tab === "All" ? "on" : ""}`} onClick={() => setTab("All")}>
          All
        </button>
        <button className={`ft ${tab === "Today" ? "on" : ""}`} onClick={() => setTab("Today")}>
          Today ({todayCount})
        </button>
        <button className={`ft ${tab === "Scheduled" ? "on" : ""}`} onClick={() => setTab("Scheduled")}>
          Scheduled ({scheduledCount})
        </button>
        <button className={`ft ${tab === "Delivered" ? "on" : ""}`} onClick={() => setTab("Delivered")}>
          Delivered ({deliveredCount})
        </button>
      </div>

      <div className="tw dispatch-local-tw">
        <div className="tw-h">
          <h3>Local Dispatch Records</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>DISPATCH NO.</th>
              <th>CUSTOMER</th>
              <th>DATE</th>
              <th>TIME</th>
              <th>DRIVER</th>
              <th>ITEMS</th>
              <th>WEIGHT</th>
              <th>STATUS</th>
              <th>ACTION</th>
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
                  onClick={() => openDetails(row.id)}
                  className={selectedRowId === row.id ? "details-row-active" : ""}
                  style={{ cursor: "pointer" }}
                >
                  <td className="ld-dispatch-no">{row.dispatch_number}</td>
                  <td className="ld-customer">{row.client_name}</td>
                  <td className="ld-date">{formatDate(row.dispatch_date)}</td>
                  <td className="ld-time">{getWindowStart(row.delivery_window)}</td>
                  <td className="ld-driver">{row.driver_name || "—"}</td>
                  <td>
                    <span className="badge bg-x">{row.item_count || 0}</span>
                  </td>
                  <td className="ld-weight">{Number(row.total_weight || 0)} kg</td>
                  <td>
                    <span className={badgeClass(row.status)}>{normalizeStatus(row.status)}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {String(row.status || "").toLowerCase() === "scheduled" ? (
                      <button
                        type="button"
                        className="btn btn-p btn-xs"
                        style={{ background: "var(--s)", border: "none" }}
                        onClick={(e) => markDelivered(row.id, e)}
                      >
                        ✅ Delivered
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ab"
                        title="Print DN"
                        onClick={(e) => printDispatch(row.id, e)}
                      >
                        🖨️
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">No local dispatch records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showDetailsPanel && (
        <>
          <div className="details-panel-overlay" onClick={closeDetails}></div>

          <aside className="details-panel open">
            <div className="details-panel-header">
              <div className="details-panel-icon">🚚</div>

              <div className="details-panel-head-text">
                <h3>{selectedDispatch?.dispatch_number || "Local Dispatch"}</h3>
                <p>
                  {selectedDispatch
                    ? `${selectedDispatch.client_name} · ${formatDate(
                        selectedDispatch.dispatch_date
                      )} · ${getWindowStart(selectedDispatch.delivery_window)}`
                    : "Loading..."}
                </p>
              </div>

              <button type="button" className="details-panel-close" onClick={closeDetails}>
                ✕
              </button>
            </div>

            <div className="details-panel-body">
              {panelLoading || !selectedDispatch ? (
                <div className="ib ib-i">
                  <span>⏳</span>
                  <div>Loading dispatch details...</div>
                </div>
              ) : (
                <>
                  <div className="details-panel-grid">
                    <div className="details-stat-card">
                      <label>DISPATCH NO.</label>
                      <span className="ld-panel-dispatch-no">{selectedDispatch.dispatch_number}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>STATUS</label>
                      <span className="ld-panel-status-text">• {normalizeStatus(selectedDispatch.status)}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>CUSTOMER</label>
                      <span className="ld-panel-customer">{selectedDispatch.client_name}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>DATE</label>
                      <span>{formatDate(selectedDispatch.dispatch_date)}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>DEPARTURE TIME</label>
                      <span>{getWindowStart(selectedDispatch.delivery_window)}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>DRIVER</label>
                      <span>{selectedDispatch.driver_name || "—"}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>ITEM COUNT</label>
                      <span className="ld-panel-strong">{selectedDispatch.item_count || 0}</span>
                    </div>

                    <div className="details-stat-card">
                      <label>TOTAL WEIGHT</label>
                      <span className="ld-panel-strong">{Number(selectedDispatch.total_weight || 0)} kg</span>
                    </div>
                  </div>

                  <div className="fst ld-panel-section-title" style={{ marginTop: 18 }}>
                    Items Dispatched
                  </div>

                  <table className="it ld-panel-mini-table">
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th>BATCH</th>
                        <th>QTY</th>
                        <th>FEFO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDispatch.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="ld-panel-item-name">{item.item_name}</td>
                          <td className="ld-panel-batch">{item.batch_code || "—"}</td>
                          <td>
                            {item.quantity} {item.unit || ""}
                          </td>
                          <td>{renderFefoBadge(item.expiry_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div style={styles.panelFooter}>
              {selectedDispatch &&
              String(selectedDispatch.status || "").toLowerCase() === "scheduled" ? (
                <>
                  <button
                    type="button"
                    style={styles.panelMainGreen}
                    onClick={() => markDelivered(selectedDispatch.id)}
                  >
                    ✅ Mark Delivered
                  </button>

                  <button
                    type="button"
                    style={styles.panelSide}
                    onClick={() => printDispatch(selectedDispatch.id)}
                  >
                    🖨️ Print DN
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    style={styles.panelMainGreen}
                    onClick={() => {
                      if (selectedDispatch?.id) {
                        markDelivered(selectedDispatch.id);
                      }
                    }}
                  >
                    ✅ Mark Delivered
                  </button>

                  <button
                    type="button"
                    style={styles.panelSide}
                    onClick={() => {
                      if (selectedDispatch?.id) {
                        printDispatch(selectedDispatch.id);
                      }
                    }}
                  >
                    🖨️ Print DN
                  </button>
                </>
              )}
            </div>
          </aside>
        </>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="md md-lg local-dispatch-modal-shell"
            style={styles.modalShell}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md-h">
              <h3>🚚 New Local Dispatch</h3>
              <button type="button" className="md-x" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} style={styles.modalForm}>
              <div className="md-b local-dispatch-modal-body" style={styles.modalBody}>
                <div className="ib ib-s">
                  <span>📍</span>
                  <div>
                    Stock deducted when marked Delivered. FEFO batch applied. Delivery Note
                    auto-generated. Returns possible.
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
                      {localCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ff">
                    <label className="fl">
                      Dispatch Date <span className="rq">*</span>
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
                    <label className="fl">Driver</label>
                    <input
                      className="fc"
                      name="driver_name"
                      value={form.driver_name}
                      onChange={handleFormChange}
                      placeholder="e.g. Nuwan"
                    />
                  </div>

                  <div className="ff">
                    <label className="fl">Vehicle No.</label>
                    <input
                      className="fc"
                      name="vehicle_number"
                      value={form.vehicle_number}
                      onChange={handleFormChange}
                      placeholder="WP CAS-XXXX"
                    />
                  </div>

                  <div className="ff">
                    <label className="fl">Delivery Window</label>
                    <input
                      className="fc"
                      name="delivery_window"
                      value={form.delivery_window}
                      onChange={handleFormChange}
                      placeholder="05:00 – 07:00 AM"
                    />
                  </div>
                </div>

                <div className="fs2">
                  <div className="fst">Items — FEFO Auto-Selected</div>

                  <table className="it">
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th>BATCH (FEFO)</th>
                        <th>QTY</th>
                        <th>PACKAGING</th>
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
                              {inventory.map((item) => (
                                <option key={item.item_id || item.id} value={item.item_id || item.id}>
                                  {item.item_name || item.name}
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
                              value={row.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            />
                          </td>

                          <td>
                            <select
                              value={row.packaging}
                              onChange={(e) => handleItemChange(index, "packaging", e.target.value)}
                            >
                              <option value="Cardboard Box">Cardboard Box</option>
                              <option value="Crate">Crate</option>
                              <option value="Thermocol Box">Thermocol Box</option>
                            </select>
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

                <div className="ff local-dispatch-docs-block">
                  <label className="fl">Documents to Generate</label>

                  <ul className="ck-l">
                    <li>
                      <input
                        type="checkbox"
                        checked={form.docs.delivery_note}
                        onChange={() => toggleDocument("delivery_note")}
                      />
                      <span>Delivery Note (DN)</span>
                    </li>

                    <li>
                      <input
                        type="checkbox"
                        checked={form.docs.local_invoice}
                        onChange={() => toggleDocument("local_invoice")}
                      />
                      <span>Local Invoice</span>
                    </li>

                    <li>
                      <input
                        type="checkbox"
                        checked={form.docs.goods_dispatch_note}
                        onChange={() => toggleDocument("goods_dispatch_note")}
                      />
                      <span>Goods Dispatch Note</span>
                    </li>
                  </ul>
                </div>

                <div className="ff">
                  <label className="fl">Remarks</label>
                  <textarea
                    className="fc"
                    name="remarks"
                    value={form.remarks}
                    onChange={handleFormChange}
                    placeholder="Delivery notes..."
                  />
                </div>

                <div className="ib ib-i local-dispatch-draft-weight">
                  <span>🚚</span>
                  <div>
                    Draft total weight: <strong>{totalDraftWeight.toFixed(2)} kg</strong>
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" style={styles.modalCancel} onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" style={styles.modalSubmit} disabled={saving}>
                  {saving ? "Saving..." : "Create Dispatch + Print DN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}