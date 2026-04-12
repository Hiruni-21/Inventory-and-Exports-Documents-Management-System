import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,40,24,.42)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  zIndex: 500,
};

const modalCardStyle = {
  width: "100%",
  maxWidth: "730px",
  background: "var(--white)",
  borderRadius: "16px",
  boxShadow: "0 18px 48px rgba(10,40,24,.24), 0 6px 14px rgba(10,40,24,.12)",
  overflow: "hidden",
  border: "1px solid rgba(216,232,223,.9)",
};

const modalHeaderStyle = {
  padding: "16px 22px",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const modalBodyStyle = {
  padding: "20px 22px 18px",
};

const modalFooterStyle = {
  padding: "16px 22px",
  borderTop: "1px solid var(--border)",
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
};

const labelStyle = {
  display: "block",
  fontSize: "10px",
  fontWeight: 700,
  color: "var(--text2)",
  textTransform: "uppercase",
  letterSpacing: ".07em",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  height: "40px",
  padding: "0 14px",
  border: "1.5px solid var(--border)",
  borderRadius: "10px",
  background: "var(--white)",
  color: "var(--text)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
  outline: "none",
};

const textareaStyle = {
  ...inputStyle,
  height: "80px",
  padding: "12px 14px",
  resize: "vertical",
};

const footerBtnSecondary = {
  height: "36px",
  padding: "0 18px",
  borderRadius: "10px",
  border: "1.5px solid var(--border)",
  background: "var(--white)",
  color: "var(--g700)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};

const footerBtnPrimary = {
  height: "36px",
  padding: "0 18px",
  borderRadius: "10px",
  border: "none",
  background: "var(--g800)",
  color: "var(--white)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};

const adjustmentBtnStyle = (active, variant) => {
  let borderColor = "var(--border)";
  let bg = "var(--white)";
  let color = "var(--text2)";

  if (variant === "add") {
    borderColor = active ? "var(--g500)" : "rgba(39,143,85,.25)";
    bg = active ? "var(--s100)" : "var(--white)";
    color = "var(--s)";
  } else if (variant === "remove") {
    borderColor = active ? "var(--d)" : "rgba(200,75,47,.25)";
    bg = active ? "var(--d100)" : "var(--white)";
    color = "var(--d)";
  } else if (variant === "exact") {
    borderColor = active ? "var(--a500)" : "rgba(232,168,56,.35)";
    bg = active ? "var(--a100)" : "var(--white)";
    color = "var(--a600)";
  }

  return {
    flex: 1,
    height: "38px",
    borderRadius: "10px",
    border: `1.5px solid ${borderColor}`,
    background: bg,
    color,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  };
};

const historyPillStyle = (variant) => {
  const isAdd = variant === "add";

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 12px",
    borderRadius: 999,
    background: isAdd ? "var(--s100)" : "var(--d100)",
    color: isAdd ? "var(--s)" : "var(--d)",
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
};

const getItemId = (item) => item?.item_id || item?.id || "";
const getItemName = (item) => item?.item_name || item?.name || "Unnamed Item";
const getItemUnit = (item) => item?.unit || "";

const formatQty = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}  ${hh}:${mi}`;
};

const buildItemOptionLabel = (item) =>
  `${getItemName(item)} — System: ${formatQty(
    item?.qty_available ?? item?.qty_on_hand ?? 0
  )}${getItemUnit(item) ? ` ${getItemUnit(item)}` : ""}`;

const buildBatchOptionLabel = (batch) => {
  const code = batch?.batch_code || batch?.batch_number || "Batch";
  const qty = formatQty(batch?.qty_remaining ?? batch?.available_quantity ?? 0);
  const unit = batch?.unit || "";

  let expiryText = "";
  if (batch?.expiry_date) {
    const today = new Date();
    const expiry = new Date(batch.expiry_date);
    if (!Number.isNaN(expiry.getTime())) {
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) expiryText = ` (exp ${diffDays}d)`;
    }
  }

  return `${code} — ${qty}${unit ? ` ${unit}` : ""}${expiryText}`;
};

const extractAuthorizedBy = (row) => {
  const notes = String(row?.notes || "");
  const match = notes.match(/Authorized By:\s*(.+)$/m);
  if (match?.[1]) return match[1].trim();
  return row?.created_by_name || "—";
};

const normalizeHistoryRow = (row) => {
  const adjustmentType = String(row?.adjustment_type || "").toLowerCase();
  const varianceQty = Number(row?.variance_qty || 0);
  const qty = Number(row?.adjustment_qty ?? row?.quantity ?? 0);
  const unit = row?.unit ? ` ${row.unit}` : "";

  let variant = "remove";
  let typeLabel = "− Remove";
  let signedQty = `-${formatQty(qty)}${unit}`;

  if (adjustmentType === "increase") {
    variant = "add";
    typeLabel = "+ Add";
    signedQty = `+${formatQty(qty)}${unit}`;
  } else if (adjustmentType === "decrease") {
    variant = "remove";
    typeLabel = "− Remove";
    signedQty = `-${formatQty(qty)}${unit}`;
  } else if (adjustmentType === "stock_count") {
    if (varianceQty >= 0) {
      variant = "add";
      typeLabel = "+ Add";
      signedQty = `+${formatQty(Math.abs(varianceQty))}${unit}`;
    } else {
      variant = "remove";
      typeLabel = "− Remove";
      signedQty = `-${formatQty(Math.abs(varianceQty))}${unit}`;
    }
  }

  const newBalance =
    row?.actual_qty !== undefined && row?.actual_qty !== null
      ? `${formatQty(row.actual_qty)}${unit}`
      : "—";

  return {
    ...row,
    _variant: variant,
    _typeLabel: typeLabel,
    _signedQty: signedQty,
    _authorizedBy: extractAuthorizedBy(row),
    _newBalance: newBalance,
  };
};

const StockAdjustmentListPage = () => {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const [form, setForm] = useState({
    item_id: "",
    batch_id: "",
    adjustment_mode: "add",
    quantity: "",
    reason: "Physical count correction",
    authorized_by: "Manager (Priya Mendis)",
    notes: "",
  });

  const selectedItem = useMemo(
    () => inventory.find((item) => String(getItemId(item)) === String(form.item_id)),
    [inventory, form.item_id]
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch?.id) === String(form.batch_id)),
    [batches, form.batch_id]
  );

  const historyRows = useMemo(() => rows.map(normalizeHistoryRow), [rows]);

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/stock-adjustments");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load stock adjustments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    const loadInventory = async () => {
      if (!showModal) return;

      try {
        setInventoryLoading(true);
        const res = await api.get("/inventory");
        setInventory(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || "Failed to load inventory");
        setInventory([]);
      } finally {
        setInventoryLoading(false);
      }
    };

    loadInventory();
  }, [showModal]);

  useEffect(() => {
    const loadBatches = async () => {
      if (!showModal || !form.item_id) {
        setBatches([]);
        return;
      }

      try {
        setBatchLoading(true);
        const res = await api.get(`/inventory/batches/${form.item_id}`);
        const data = Array.isArray(res.data) ? res.data : [];
        setBatches(data);
        setForm((prev) => ({
          ...prev,
          batch_id: data[0] ? String(data[0].id) : "",
        }));
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || "Failed to load item batches");
        setBatches([]);
      } finally {
        setBatchLoading(false);
      }
    };

    loadBatches();
  }, [showModal, form.item_id]);

  const openModal = () => {
    setForm({
      item_id: "",
      batch_id: "",
      adjustment_mode: "add",
      quantity: "",
      reason: "Physical count correction",
      authorized_by: "Manager (Priya Mendis)",
      notes: "",
    });
    setBatches([]);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "item_id") {
      setForm((prev) => ({
        ...prev,
        item_id: value,
        batch_id: "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const qty = Number(form.quantity || 0);

    if (!form.item_id || !form.batch_id || !form.reason.trim()) {
      toast.error("Item, batch and reason are required");
      return;
    }

    if (Number.isNaN(qty) || qty < 0) {
      toast.error("Quantity must be a valid non-negative number");
      return;
    }

    if (form.adjustment_mode !== "exact" && qty <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    try {
      setSaving(true);

      await api.post("/stock-adjustments", {
        item_id: Number(form.item_id),
        batch_id: Number(form.batch_id),
        adjustment_mode: form.adjustment_mode,
        quantity: qty,
        reason: form.reason.trim(),
        authorized_by: form.authorized_by,
        notes: form.notes.trim(),
      });

      toast.success("Stock adjustment saved successfully");
      setShowModal(false);
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save stock adjustment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <button
          type="button"
          onClick={openModal}
          style={{
            height: "36px",
            padding: "0 18px",
            border: "none",
            borderRadius: "12px",
            background: "var(--g800)",
            color: "var(--white)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "12px",
            fontWeight: 700,
            lineHeight: 1,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 800, lineHeight: 1 }}>+</span>
          <span>New Adjustment</span>
        </button>
      </div>

      <div className="ib ib-i">
        <span>📋</span>
        <div>
          Used when physical stock and system stock do not match. Every adjustment is permanently
          logged with the authorizing person&apos;s name for a full audit trail.
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Stock Adjustment History</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>DATE &amp; TIME</th>
              <th style={{ width: "240px" }}>ITEM</th>
              <th>TYPE</th>
              <th>QTY CHANGED</th>
              <th>REASON</th>
              <th>AUTHORIZED BY</th>
              <th>NEW BALANCE</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">Loading...</td>
              </tr>
            ) : historyRows.length ? (
              historyRows.map((row) => (
                <tr key={row.id}>
                  <td
                    style={{
                      fontSize: "11px",
                      color: "var(--text3)",
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDateTime(row.created_at)}
                  </td>

                  <td
                    style={{
                      width: "240px",
                      minWidth: "240px",
                      fontWeight: 700,
                      color: "var(--g900)",
                    }}
                  >
                    {row.item_name}
                  </td>

                  <td>
                    <span style={historyPillStyle(row._variant)}>{row._typeLabel}</span>
                  </td>

                  <td
                    style={{
                      fontWeight: 700,
                      color: row._variant === "add" ? "var(--s)" : "var(--d)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row._signedQty}
                  </td>

                  <td>{row.reason || "—"}</td>
                  <td>{row._authorizedBy}</td>
                  <td style={{ fontWeight: 700, color: "var(--g900)", whiteSpace: "nowrap" }}>
                    {row._newBalance}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No stock adjustments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "var(--g900)",
                }}
              >
                ⚖️ Record Stock Adjustment
              </h3>

              <button
                type="button"
                onClick={closeModal}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  background: "var(--white)",
                  color: "var(--text2)",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={modalBodyStyle}>
                <div className="ib ib-i" style={{ marginBottom: 16 }}>
                  <span>📋</span>
                  <div>
                    Used when physical stock and system stock do not match. Permanently logged with
                    authorizing person&apos;s name.
                  </div>
                </div>

                {inventoryLoading ? (
                  <div className="ib ib-i" style={{ marginBottom: 12 }}>
                    <span>⏳</span>
                    <div>Loading inventory...</div>
                  </div>
                ) : null}

                {batchLoading ? (
                  <div className="ib ib-i" style={{ marginBottom: 12 }}>
                    <span>⏳</span>
                    <div>Loading item batches...</div>
                  </div>
                ) : null}

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>
                    Item <span className="rq">*</span>
                  </label>
                  <select style={inputStyle} name="item_id" value={form.item_id} onChange={handleChange}>
                    <option value="">Select item</option>
                    {inventory.map((item) => (
                      <option key={getItemId(item)} value={getItemId(item)}>
                        {buildItemOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Batch (if applicable)</label>
                  <select style={inputStyle} name="batch_id" value={form.batch_id} onChange={handleChange}>
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {buildBatchOptionLabel(batch)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>
                    Adjustment Type <span className="rq">*</span>
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      style={adjustmentBtnStyle(form.adjustment_mode === "add", "add")}
                      onClick={() => setForm((prev) => ({ ...prev, adjustment_mode: "add" }))}
                    >
                      + Add
                    </button>

                    <button
                      type="button"
                      style={adjustmentBtnStyle(form.adjustment_mode === "remove", "remove")}
                      onClick={() => setForm((prev) => ({ ...prev, adjustment_mode: "remove" }))}
                    >
                      − Remove
                    </button>

                    <button
                      type="button"
                      style={adjustmentBtnStyle(form.adjustment_mode === "exact", "exact")}
                      onClick={() => setForm((prev) => ({ ...prev, adjustment_mode: "exact" }))}
                    >
                      ✏ Set Exact
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      Quantity <span className="rq">*</span>
                    </label>
                    <input
                      style={inputStyle}
                      type="number"
                      step="0.01"
                      min="0"
                      name="quantity"
                      value={form.quantity}
                      onChange={handleChange}
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Reason <span className="rq">*</span>
                    </label>
                    <select style={inputStyle} name="reason" value={form.reason} onChange={handleChange}>
                      <option>Physical count correction</option>
                      <option>Damage write-off</option>
                      <option>Opening balance correction</option>
                      <option>Data entry error</option>
                      <option>Warehouse correction</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>
                    Authorized By <span className="rq">*</span>
                  </label>
                  <select
                    style={inputStyle}
                    name="authorized_by"
                    value={form.authorized_by}
                    onChange={handleChange}
                  >
                    <option>Manager (Priya Mendis)</option>
                    <option>Ops Exec (Kamal)</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    style={textareaStyle}
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Explain reason for adjustment..."
                  />
                </div>
              </div>

              <div style={modalFooterStyle}>
                <button type="button" style={footerBtnSecondary} onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" style={footerBtnPrimary} disabled={saving || inventoryLoading}>
                  {saving ? "Applying..." : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default StockAdjustmentListPage;