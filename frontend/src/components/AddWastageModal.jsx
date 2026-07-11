import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const AddWastageModal = ({ onClose, onSave }) => {
  const [grns, setGrns] = useState([]);
  const [inventory, setInventory] = useState([]);
  
  const [grnBatches, setGrnBatches] = useState([]);
  const [inventoryBatches, setInventoryBatches] = useState([]);

  const [form, setForm] = useState({
    grn_id: "",
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
    const loadInitialData = async () => {
      setLoading(true);
      setError("");
      try {
        const [grnsRes, invRes] = await Promise.all([
          api.get("/grn"),
          api.get("/inventory"),
        ]);
        setGrns(Array.isArray(grnsRes.data) ? grnsRes.data : []);
        setInventory(
          (Array.isArray(invRes.data) ? invRes.data : []).filter(
            (item) => Number(item.qty_available) > 0
          )
        );
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const displayedItems = useMemo(() => {
    if (form.grn_id) {
      const map = new Map();
      grnBatches.forEach((b) => {
        if (!map.has(b.item_id)) {
          map.set(b.item_id, {
            item_id: b.item_id,
            name: b.item_name || b.name,
            code: b.item_code || b.code,
          });
        }
      });
      return Array.from(map.values());
    }
    return inventory.map(i => ({
      item_id: i.item_id,
      name: i.name || i.item_name,
      code: i.code || i.item_code
    }));
  }, [form.grn_id, grnBatches, inventory]);

  const displayedBatches = useMemo(() => {
    if (form.grn_id) {
      return grnBatches.filter((b) => String(b.item_id) === String(form.item_id));
    }
    return inventoryBatches;
  }, [form.grn_id, grnBatches, inventoryBatches, form.item_id]);

  const selectedBatch = useMemo(
    () => displayedBatches.find((batch) => String(batch.id) === String(form.batch_id)),
    [displayedBatches, form.batch_id]
  );

  const availableQty = selectedBatch?.qty_remaining ?? selectedBatch?.available_quantity ?? "—";

  const handleChange = async (e) => {
    const { name, value } = e.target;
    const nextForm = { ...form, [name]: value };

    if (name === "grn_id") {
      nextForm.item_id = "";
      nextForm.batch_id = "";
      setGrnBatches([]);
      setInventoryBatches([]);
      setForm(nextForm);

      if (value) {
        setBatchLoading(true);
        setError("");
        try {
          const res = await api.get(`/grn/${value}/batches`);
          setGrnBatches(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
          setError(err.response?.data?.message || "Failed to load GRN batches");
        } finally {
          setBatchLoading(false);
        }
      }
    } else if (name === "item_id") {
      nextForm.batch_id = "";
      setForm(nextForm);

      if (!form.grn_id) {
        if (value) {
          setBatchLoading(true);
          setError("");
          try {
            const res = await api.get(`/inventory/batches/${value}`);
            setInventoryBatches(Array.isArray(res.data) ? res.data : []);
          } catch (err) {
            setError(err.response?.data?.message || "Failed to load item batches");
          } finally {
            setBatchLoading(false);
          }
        } else {
          setInventoryBatches([]);
        }
      }
    } else {
      setForm(nextForm);
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="md md-lg" style={{ display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
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
                <div>Loading data...</div>
              </div>
            ) : null}

            {batchLoading ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading batches...</div>
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
                <div className="ff" style={{ gridColumn: "1 / -1" }}>
                  <label className="fl">Goods Received Note (GRN) <span style={{color: "var(--text3)", fontWeight: "normal"}}>(Optional filter)</span></label>
                  <select className="fc" name="grn_id" value={form.grn_id} onChange={handleChange}>
                    <option value="">-- View all available inventory --</option>
                    {grns.map((grn) => (
                      <option key={grn.id} value={grn.id}>
                        {grn.grn_number} - {grn.supplier_name} - {grn.received_date?.substring(0, 10)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Item</label>
                  <select className="fc" name="item_id" value={form.item_id} onChange={handleChange}>
                    <option value="">Select item</option>
                    {displayedItems.map((item) => (
                      <option key={item.item_id} value={item.item_id}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">Batch</label>
                  <select className="fc" name="batch_id" value={form.batch_id} onChange={handleChange} disabled={!form.item_id}>
                    <option value="">Select batch</option>
                    {displayedBatches.map((batch) => (
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
