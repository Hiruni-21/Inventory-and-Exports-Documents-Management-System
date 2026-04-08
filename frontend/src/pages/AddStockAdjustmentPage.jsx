import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const AddStockAdjustmentPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const itemIdFromQuery = searchParams.get("itemId") || "";

  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    item_id: itemIdFromQuery,
    batch_id: "",
    adjustment_type: "IN",
    quantity: "",
    reason: "",
    notes: "",
  });

  const selectedBatch = useMemo(
    () => batches.find((row) => String(row.id) === String(form.batch_id)),
    [batches, form.batch_id]
  );

  const availableQty =
    selectedBatch?.qty_remaining ?? selectedBatch?.available_quantity ?? 0;

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory");
      const rows = Array.isArray(res.data) ? res.data : [];
      setInventory(rows);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load inventory");
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async (itemId) => {
    if (!itemId) {
      setBatches([]);
      return;
    }

    try {
      setBatchLoading(true);
      const res = await api.get(`/inventory/batches/${itemId}`);
      const rows = Array.isArray(res.data) ? res.data : [];
      setBatches(rows);

      if (rows.length) {
        setForm((prev) => ({
          ...prev,
          batch_id: prev.batch_id || String(rows[0].id),
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load item batches");
      setBatches([]);
    } finally {
      setBatchLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (form.item_id) {
      loadBatches(form.item_id);
    }
  }, [form.item_id]);

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

    if (!form.item_id || !form.batch_id || !form.quantity || !form.reason.trim()) {
      toast.error("Item, batch, quantity and reason are required");
      return;
    }

    try {
      setSaving(true);

      await api.post("/stock-adjustments", {
        item_id: Number(form.item_id),
        batch_id: Number(form.batch_id),
        adjustment_type: form.adjustment_type,
        quantity: Number(form.quantity),
        reason: form.reason.trim(),
        notes: form.notes.trim(),
      });

      toast.success("Stock adjustment saved successfully");
      navigate("/stock-adjustments");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save stock adjustment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="ib ib-i">
        <span>⚖️</span>
        <div>
          Select the exact batch and adjust stock manually. Available in selected batch:{" "}
          <strong>{Number(availableQty || 0)}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="content-card" style={{ marginTop: 16 }}>
          <div className="card-header-row">
            <h3>⚖️ Add Stock Adjustment</h3>
          </div>

          <div style={{ padding: 20 }}>
            {loading ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading inventory...</div>
              </div>
            ) : null}

            {batchLoading ? (
              <div className="ib ib-i" style={{ marginTop: 12 }}>
                <span>⏳</span>
                <div>Loading item batches...</div>
              </div>
            ) : null}

            <div className="fs2">
              <div className="fst">Adjustment Details</div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">
                    Item <span className="rq">*</span>
                  </label>
                  <select className="fc" name="item_id" value={form.item_id} onChange={handleChange}>
                    <option value="">Select item</option>
                    {inventory.map((item) => (
                      <option key={item.item_id} value={item.item_id}>
                        {(item.item_name || item.name)} ({item.item_code || item.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">
                    Batch <span className="rq">*</span>
                  </label>
                  <select className="fc" name="batch_id" value={form.batch_id} onChange={handleChange}>
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {(batch.batch_code || batch.batch_number)} - Available:{" "}
                        {batch.qty_remaining || batch.available_quantity} {batch.unit || ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="fr3">
                <div className="ff">
                  <label className="fl">
                    Adjustment Type <span className="rq">*</span>
                  </label>
                  <select className="fc" name="adjustment_type" value={form.adjustment_type} onChange={handleChange}>
                    <option value="IN">IN (Add Stock)</option>
                    <option value="OUT">OUT (Remove Stock)</option>
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">
                    Quantity <span className="rq">*</span>
                  </label>
                  <input
                    className="fc"
                    type="number"
                    step="0.01"
                    min="0"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="ff">
                  <label className="fl">Current Batch Qty</label>
                  <input className="fc" value={Number(availableQty || 0)} readOnly />
                </div>
              </div>

              <div className="ff">
                <label className="fl">
                  Reason <span className="rq">*</span>
                </label>
                <input
                  className="fc"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  placeholder="Damage, manual correction, recount..."
                />
              </div>

              <div className="ff">
                <label className="fl">Notes</label>
                <textarea
                  className="fc"
                  name="notes"
                  rows="4"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Extra notes..."
                />
              </div>
            </div>
          </div>

          <div className="md-f" style={{ padding: "16px 20px 20px" }}>
            <button type="button" className="btn btn-s" onClick={() => navigate("/stock-adjustments")}>
              Cancel
            </button>

            <button type="submit" className="btn btn-p" disabled={saving || loading}>
              {saving ? "Saving..." : "Save Adjustment"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default AddStockAdjustmentPage;