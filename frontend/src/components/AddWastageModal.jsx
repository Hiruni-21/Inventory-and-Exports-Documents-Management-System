import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const AddWastageModal = ({ onClose, onSave }) => {
  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({
    item_id: "",
    batch_id: "",
    quantity: "",
    reason: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInventory = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/inventory");
        setInventory(
          (Array.isArray(res.data) ? res.data : []).filter((item) => Number(item.qty_available) > 0)
        );
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load inventory");
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, []);

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.id) === String(form.batch_id)),
    [batches, form.batch_id]
  );

  const availableQty = selectedBatch?.qty_remaining ?? selectedBatch?.available_quantity ?? "—";

  const handleChange = async (e) => {
    const { name, value } = e.target;
    const nextForm = { ...form, [name]: value };

    if (name === "item_id") {
      nextForm.batch_id = "";
      setBatches([]);
    }

    setForm(nextForm);

    if (name === "item_id" && value) {
      setBatchLoading(true);
      setError("");
      try {
        const res = await api.get(`/inventory/batches/${value}`);
        setBatches(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load item batches");
      } finally {
        setBatchLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.item_id || !form.batch_id || !form.quantity || !form.reason) {
      setError("Please fill all required fields");
      return;
    }

    setSaving(true);

    try {
      await api.post("/wastage", {
        item_id: Number(form.item_id),
        batch_id: Number(form.batch_id),
        quantity: Number(form.quantity),
        reason: form.reason,
        notes: form.notes,
      });

      if (onSave) onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record wastage");
      setSaving(false);
    }
  };

  return (
    <div className="md-o">
      <div className="md md-lg" style={{ display: "flex", flexDirection: "column" }}>
        <div className="md-h">
          <h3>🗑 Record Wastage</h3>
          <button type="button" className="md-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="md-b" style={{ overflowY: "auto", padding: "1.5rem" }}>
            <div className="ib ib-w">
              <span>🗑</span>
              <div>
                Record damaged or expired stock against the exact batch. Available in selected batch:{" "}
                <strong>{availableQty}</strong>
              </div>
            </div>

            {loading ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading inventory...</div>
              </div>
            ) : null}

            {batchLoading ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading item batches...</div>
              </div>
            ) : null}

            {error ? (
              <div className="ib ib-d">
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            ) : null}

            <div className="fs2">
              <div className="fst">Wastage Details</div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Item</label>
                  <select className="fc" name="item_id" value={form.item_id} onChange={handleChange}>
                    <option value="">Select item</option>
                    {inventory.map((item) => (
                      <option key={item.item_id} value={item.item_id}>
                        {(item.name || item.item_name)} ({item.code || item.item_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">Batch</label>
                  <select className="fc" name="batch_id" value={form.batch_id} onChange={handleChange}>
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {(batch.batch_number || batch.batch_code)} - Available:{" "}
                        {batch.qty_remaining || batch.available_quantity} {batch.unit || ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Wastage Quantity</label>
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
                  <label className="fl">Reason</label>
                  <input
                    className="fc"
                    type="text"
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    placeholder="Expired, fungal damage, bruising..."
                  />
                </div>
              </div>

              <div className="ff">
                <label className="fl">Notes</label>
                <textarea
                  className="fc"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Extra wastage notes..."
                />
              </div>
            </div>
          </div>

          <div className="md-f">
            <button type="button" className="btn btn-s" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-p" disabled={saving}>
              {saving ? "Saving..." : "Save Wastage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWastageModal;
