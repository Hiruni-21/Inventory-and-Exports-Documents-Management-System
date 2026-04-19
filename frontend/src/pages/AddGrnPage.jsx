import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const today = () => new Date().toISOString().slice(0, 10);

const varianceInfo = (orderedQty, receivedQty) => {
  const ordered = Number(orderedQty || 0);
  const received = Number(receivedQty || 0);
  const varianceQty = received - ordered;
  const variancePercent = ordered > 0 ? (Math.abs(varianceQty) / ordered) * 100 : received > 0 ? 100 : 0;
  const needsVerification = Math.abs(varianceQty) > 1 || variancePercent > 5;

  return {
    varianceQty,
    variancePercent,
    needsVerification,
  };
};

const emptyForm = {
  purchase_order_id: "",
  received_date: today(),
  remarks: "",
};

export default function AddGrnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);

  const activePoOptions = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const status = String(po.status || "").toLowerCase();
      return ["approved", "sent", "grn_created"].includes(status);
    });
  }, [purchaseOrders]);

  useEffect(() => {
    const loadPurchaseOrders = async () => {
      try {
        setLoadingOrders(true);
        const res = await api.get("/purchase-orders");
        const rows = Array.isArray(res.data) ? res.data : [];
        setPurchaseOrders(rows);

        const preselectedPo = searchParams.get("po");
        if (preselectedPo) {
          setForm((prev) => ({ ...prev, purchase_order_id: String(preselectedPo) }));
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load purchase orders");
      } finally {
        setLoadingOrders(false);
      }
    };

    loadPurchaseOrders();
  }, [searchParams, toast]);

  useEffect(() => {
    if (!form.purchase_order_id) {
      setItems([]);
      setSupplierId("");
      setSupplierName("");
      return;
    }

    const loadPoItems = async () => {
      try {
        setLoadingItems(true);
        const res = await api.get(`/grn/po-items/${form.purchase_order_id}`);
        const rows = Array.isArray(res.data) ? res.data : [];

        setItems(
          rows.map((row, index) => ({
            purchase_order_item_id: row.purchase_order_item_id || null,
            item_id: Number(row.item_id),
            item_name: row.item_name || "Unnamed item",
            item_code: row.item_code || "—",
            unit: row.unit || "",
            ordered_quantity: Number(row.ordered_quantity || 0),
            received_qty: Number(row.ordered_quantity || 0),
            unit_cost: Number(row.unit_price || 0),
            batch_number: `BT-${Date.now()}-${index + 1}`,
            expiry_date: "",
            notes: "",
          }))
        );

        setSupplierId(rows?.[0]?.supplier_id || "");
        setSupplierName(rows?.[0]?.supplier_name || "");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load PO items");
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    };

    loadPoItems();
  }, [form.purchase_order_id, toast]);

  const summary = useMemo(() => {
    const totalOrdered = items.reduce((sum, item) => sum + Number(item.ordered_quantity || 0), 0);
    const totalReceived = items.reduce((sum, item) => sum + Number(item.received_qty || 0), 0);
    const flaggedLines = items.filter((item) =>
      varianceInfo(item.ordered_quantity, item.received_qty).needsVerification
    ).length;

    return {
      totalOrdered,
      totalReceived,
      totalVariance: totalReceived - totalOrdered,
      flaggedLines,
    };
  }, [items]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: field === "received_qty" || field === "unit_cost" ? Number(value || 0) : value,
      };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.purchase_order_id || !supplierId || !form.received_date) {
      toast.error("Purchase order, supplier, and received date are required");
      return;
    }

    const payloadItems = items
      .map((item) => ({
        purchase_order_item_id: item.purchase_order_item_id,
        item_id: Number(item.item_id),
        ordered_quantity: Number(item.ordered_quantity || 0),
        received_qty: Number(item.received_qty || 0),
        unit_cost: Number(item.unit_cost || 0),
        batch_number: item.batch_number,
        expiry_date: item.expiry_date || null,
        notes: item.notes || "",
      }))
      .filter((item) => item.item_id && item.received_qty > 0);

    if (!payloadItems.length) {
      toast.error("At least one received quantity must be greater than 0");
      return;
    }

    try {
      setSaving(true);

      const res = await api.post("/grn", {
        purchase_order_id: Number(form.purchase_order_id),
        supplier_id: Number(supplierId),
        received_date: form.received_date,
        remarks: form.remarks,
        items: payloadItems,
      });

      toast.success(res.data?.message || "GRN created successfully");
      navigate(`/grn/${res.data?.grnId}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create GRN");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fb" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/grn")}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="content-card" style={{ marginBottom: 16 }}>
        <div className="card-header-row">
          <h3>Create Goods Receiving Note</h3>
        </div>

        <div style={{ padding: 20 }}>
          <div className="notice-banner notice-success" style={{ marginBottom: 16 }}>
            <span>
              Select the purchase order, confirm actual received quantities, and capture batch details.
              GRNs above variance threshold will wait for Ops verification before stock updates.
            </span>
          </div>

          {summary.flaggedLines > 0 ? (
            <div className="notice-banner notice-warning" style={{ marginBottom: 16 }}>
              <span>
                {summary.flaggedLines} line(s) exceed the variance threshold. This GRN will require Ops verification.
              </span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div>
                <label className="form-label">Purchase Order</label>
                <select
                  className="filter-select"
                  name="purchase_order_id"
                  value={form.purchase_order_id}
                  onChange={handleHeaderChange}
                  style={{ width: "100%" }}
                >
                  <option value="">Select purchase order</option>
                  {activePoOptions.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} · {po.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Received Date</label>
                <input
                  className="filter-select"
                  style={{ width: "100%" }}
                  type="date"
                  name="received_date"
                  value={form.received_date}
                  onChange={handleHeaderChange}
                />
              </div>

              <div>
                <label className="form-label">Supplier</label>
                <input
                  className="filter-select"
                  style={{ width: "100%" }}
                  value={supplierName || "Will populate from PO"}
                  readOnly
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="form-label">Remarks</label>
              <textarea
                className="filter-select"
                style={{ width: "100%", minHeight: 110 }}
                name="remarks"
                value={form.remarks}
                onChange={handleHeaderChange}
                placeholder="Condition, packaging, temperature, or receiving notes..."
              />
            </div>

            <div className="krow k3" style={{ marginBottom: 18 }}>
              <div className="kc g">
                <div className="kv">{summary.totalOrdered.toFixed(2)}</div>
                <div className="kl">Ordered Qty</div>
              </div>
              <div className="kc a">
                <div className="kv">{summary.totalReceived.toFixed(2)}</div>
                <div className="kl">Received Qty</div>
              </div>
              <div className="kc b">
                <div className="kv">
                  {summary.totalVariance > 0 ? "+" : ""}
                  {summary.totalVariance.toFixed(2)}
                </div>
                <div className="kl">Total Variance</div>
              </div>
            </div>

            <div className="content-card" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
              <div className="card-header-row">
                <h3>Received Items</h3>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ITEM</th>
                      <th>CODE</th>
                      <th>ORDERED</th>
                      <th>RECEIVED</th>
                      <th>VARIANCE</th>
                      <th>BATCH</th>
                      <th>EXPIRY</th>
                      <th>UNIT COST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingOrders || loadingItems ? (
                      <tr>
                        <td colSpan="8" className="empty-row">
                          Loading purchase order items...
                        </td>
                      </tr>
                    ) : items.length ? (
                      items.map((item, index) => {
                        const variance = varianceInfo(item.ordered_quantity, item.received_qty);

                        return (
                          <tr key={`${item.item_id}-${index}`}>
                            <td className="strong-cell">{item.item_name}</td>
                            <td className="code-cell">{item.item_code}</td>
                            <td>
                              {Number(item.ordered_quantity || 0).toFixed(2)} {item.unit}
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.received_qty}
                                onChange={(e) => handleItemChange(index, "received_qty", e.target.value)}
                                style={{ width: 110 }}
                              />
                            </td>
                            <td className={variance.needsVerification ? "no-text" : "yes-text"}>
                              {variance.varianceQty > 0 ? "+" : ""}
                              {variance.varianceQty.toFixed(2)} ({variance.variancePercent.toFixed(2)}%)
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.batch_number}
                                onChange={(e) => handleItemChange(index, "batch_number", e.target.value)}
                                style={{ width: 140 }}
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                value={item.expiry_date}
                                onChange={(e) => handleItemChange(index, "expiry_date", e.target.value)}
                                style={{ width: 150 }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_cost}
                                onChange={(e) => handleItemChange(index, "unit_cost", e.target.value)}
                                style={{ width: 110 }}
                              />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="empty-row">
                          Select a purchase order to load GRN items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="fb" style={{ justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate("/grn")}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Plus size={16} /> {saving ? "Saving..." : "Save GRN"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}