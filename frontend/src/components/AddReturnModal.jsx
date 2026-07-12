import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const AddReturnModal = ({ onClose, onSave }) => {
  const [grns, setGrns] = useState([]);
  const [grnBatches, setGrnBatches] = useState([]);
  const [form, setForm] = useState({
    grn_id: "",
    supplier_id: "",
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
  const [searchGrn, setSearchGrn] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/grn");
        setGrns(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load GRNs");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const selectedGrn = useMemo(
    () => grns.find((g) => String(g.id) === String(form.grn_id)),
    [grns, form.grn_id]
  );

  const filteredGrns = useMemo(() => {
    if (!searchGrn) return grns;
    const lowerSearch = searchGrn.toLowerCase();
    return grns.filter(
      (g) =>
        g.grn_number.toLowerCase().includes(lowerSearch) ||
        g.supplier_name.toLowerCase().includes(lowerSearch)
    );
  }, [grns, searchGrn]);

  const uniqueItems = useMemo(() => {
    const map = new Map();
    grnBatches.forEach((b) => {
      if (!map.has(b.item_id)) {
        map.set(b.item_id, {
          item_id: b.item_id,
          name: b.item_name || b.name,
          code: b.item_code || b.code,
          stock_type: b.stock_type,
        });
      }
    });
    return Array.from(map.values());
  }, [grnBatches]);

  const filteredBatches = useMemo(() => {
    return grnBatches.filter((b) => String(b.item_id) === String(form.item_id));
  }, [grnBatches, form.item_id]);

  const selectedBatch = useMemo(
    () => filteredBatches.find((batch) => String(batch.id) === String(form.batch_id)),
    [filteredBatches, form.batch_id]
  );

  const availableQty = selectedBatch?.qty_remaining ?? selectedBatch?.available_quantity ?? "—";

  const handleChange = async (e) => {
    const { name, value } = e.target;
    const nextForm = { ...form, [name]: value };

    if (name === "grn_id") {
      nextForm.supplier_id = "";
      nextForm.item_id = "";
      nextForm.batch_id = "";
      setGrnBatches([]);
      
      const grn = grns.find((g) => String(g.id) === String(value));
      if (grn) {
        nextForm.supplier_id = grn.supplier_id;
      }
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
    } else {
      setForm(nextForm);
    }
  };

  const handleQuantityChange = (e) => {
    let val = e.target.value;
    const activeItem = uniqueItems.find(i => String(i.item_id) === String(form.item_id));
    if (activeItem && activeItem.stock_type === "packaging") {
      val = val.replace(/\D/g, "");
    }
    setForm(prev => ({ ...prev, quantity: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.grn_id || !form.supplier_id || !form.item_id || !form.batch_id || !form.quantity || !form.reason) {
      setError("Please fill all required fields");
      return;
    }

    setSaving(true);

    try {
      await api.post("/returns", {
        supplier_id: Number(form.supplier_id),
        item_id: Number(form.item_id),
        batch_id: Number(form.batch_id),
        quantity: Number(form.quantity),
        reason: form.reason,
        notes: form.notes,
      });

      if (onSave) onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record return");
      setSaving(false);
    }
  };

  const activeItemType = uniqueItems.find(i => String(i.item_id) === String(form.item_id))?.stock_type;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="md md-lg" style={{ display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="md-h">
          <h3>↩️ Record Goods Return</h3>
          <button type="button" className="md-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="md-b" style={{ overflowY: "auto", padding: "1.5rem", position: "relative" }}>
            <div className="ib ib-i">
              <span>↩️</span>
              <div>
                Select a Goods Received Note (GRN) to populate supplier and available batches.
                Available in selected batch: <strong>{availableQty}</strong>
              </div>
            </div>

            {loading ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading GRNs...</div>
              </div>
            ) : null}

            {batchLoading ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading GRN batches...</div>
              </div>
            ) : null}

            {error ? (
              <div className="ib ib-d">
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            ) : null}

            <div className="fs2">
              <div className="fst">Return Details</div>

              <div className="fr">
                <div className="ff" style={{ position: "relative" }}>
                  <label className="fl">Goods Received Note (GRN)</label>
                  <input
                    type="text"
                    className="fc"
                    placeholder="Search GRN # or Supplier..."
                    value={form.grn_id && !isDropdownOpen ? `${selectedGrn?.grn_number} - ${selectedGrn?.supplier_name}` : searchGrn}
                    onChange={(e) => {
                      setSearchGrn(e.target.value);
                      if (form.grn_id) handleChange({ target: { name: "grn_id", value: "" } });
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  />
                  {isDropdownOpen && (
                    <ul style={{
                      position: "absolute", top: "100%", left: 0, right: 0,
                      background: "#fff", border: "1px solid #ccc", borderRadius: 6,
                      zIndex: 9999, maxHeight: 240, overflowY: "auto", listStyle: "none",
                      padding: 0, margin: "4px 0 0 0", boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                    }}>
                      {filteredGrns.length ? (
                        filteredGrns.map((grn) => (
                          <li
                            key={grn.id}
                            style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #F1F5F9" }}
                            onMouseDown={(e) => {
                              e.preventDefault(); 
                              handleChange({ target: { name: "grn_id", value: grn.id } });
                              setSearchGrn("");
                              setIsDropdownOpen(false);
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{grn.grn_number}</div>
                            <div style={{ fontSize: 13, color: "#6B7280" }}>{grn.supplier_name} - {grn.received_date?.substring(0, 10)}</div>
                          </li>
                        ))
                      ) : (
                        <li style={{ padding: "10px 14px", color: "#6B7280" }}>No matching GRNs found</li>
                      )}
                    </ul>
                  )}
                </div>

                <div className="ff">
                  <label className="fl">Supplier</label>
                  <input
                    className="fc"
                    type="text"
                    value={selectedGrn?.supplier_name || ""}
                    readOnly
                    disabled
                    placeholder="Auto-populated from GRN"
                  />
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Item</label>
                  <select className="fc" name="item_id" value={form.item_id} onChange={handleChange} disabled={!form.grn_id}>
                    <option value="">Select item</option>
                    {uniqueItems.map((item) => (
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
                    {filteredBatches.map((batch) => (
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
                  <label className="fl">Return Quantity</label>
                  <input
                    className="fc"
                    type="number"
                    step={activeItemType === "packaging" ? "1" : "0.01"}
                    min="0"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleQuantityChange}
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
                    placeholder="Overripe, damage, quality issue..."
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
                  placeholder="Extra return notes..."
                />
              </div>
            </div>
          </div>

          <div className="md-f">
            <button type="button" className="btn btn-s" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-p" disabled={saving}>
              {saving ? "Saving..." : "Save Return"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReturnModal;
