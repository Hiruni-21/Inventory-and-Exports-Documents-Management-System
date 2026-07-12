import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const AddReturnModal = ({ onClose, onSave }) => {
  const [grns, setGrns] = useState([]);
  const [grnBatches, setGrnBatches] = useState([]);
  
  const [grnId, setGrnId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [searchGrn, setSearchGrn] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [items, setItems] = useState([
    { id: Date.now(), item_id: "", batch_id: "", quantity: "", reason: "", notes: "" }
  ]);

  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    () => grns.find((g) => String(g.id) === String(grnId)),
    [grns, grnId]
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

  const handleGrnSelect = async (newGrnId) => {
    setGrnId(newGrnId);
    setSearchGrn("");
    setIsDropdownOpen(false);
    
    setItems([{ id: Date.now(), item_id: "", batch_id: "", quantity: "", reason: "", notes: "" }]);
    setGrnBatches([]);
    
    const grn = grns.find((g) => String(g.id) === String(newGrnId));
    if (grn) {
      setSupplierId(grn.supplier_id);
    } else {
      setSupplierId("");
    }

    if (newGrnId) {
      setBatchLoading(true);
      setError("");
      try {
        const res = await api.get(`/grn/${newGrnId}/batches`);
        setGrnBatches(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load GRN batches");
      } finally {
        setBatchLoading(false);
      }
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), item_id: "", batch_id: "", quantity: "", reason: "", notes: "" }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    if (field === "item_id") {
      newItems[index] = { ...newItems[index], item_id: value, batch_id: "" };
    } else if (field === "quantity") {
      const activeItem = uniqueItems.find(i => String(i.item_id) === String(newItems[index].item_id));
      let val = value;
      if (activeItem && activeItem.stock_type === "packaging") {
        val = val.replace(/\D/g, "");
      }
      newItems[index] = { ...newItems[index], quantity: val };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!grnId || !supplierId) {
      setError("Please select a GRN");
      return;
    }

    if (!items.length) {
      setError("Please add at least one item to return");
      return;
    }

    for (const item of items) {
      if (!item.item_id || !item.batch_id || !item.quantity || !item.reason) {
        setError("Please fill all required fields for all items");
        return;
      }
    }

    setSaving(true);

    try {
      await api.post("/returns", {
        grn_id: Number(grnId),
        supplier_id: Number(supplierId),
        items: items.map(i => ({
          item_id: Number(i.item_id),
          batch_id: Number(i.batch_id),
          quantity: Number(i.quantity),
          reason: i.reason,
          notes: i.notes,
        }))
      });

      if (onSave) onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record return");
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="md md-lg" style={{ display: "flex", flexDirection: "column", maxWidth: "800px" }} onClick={(e) => e.stopPropagation()}>
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
                Select a Goods Received Note (GRN) to populate supplier and available batches, then add items to return.
              </div>
            </div>

            {loading ? (
              <div className="ib ib-i"><span>⏳</span><div>Loading GRNs...</div></div>
            ) : null}
            {batchLoading ? (
              <div className="ib ib-i"><span>⏳</span><div>Loading GRN batches...</div></div>
            ) : null}
            {error ? (
              <div className="ib ib-d"><span>⚠️</span><div>{error}</div></div>
            ) : null}

            <div className="fs2">
              <div className="fst">GRN Details</div>
              <div className="fr">
                <div className="ff" style={{ position: "relative" }}>
                  <label className="fl">Goods Received Note (GRN)</label>
                  <input
                    type="text"
                    className="fc"
                    placeholder="Search GRN # or Supplier..."
                    value={grnId && !isDropdownOpen ? `${selectedGrn?.grn_number} - ${selectedGrn?.supplier_name}` : searchGrn}
                    onChange={(e) => {
                      setSearchGrn(e.target.value);
                      if (grnId) setGrnId("");
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
                              handleGrnSelect(grn.id);
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
            </div>

            <div className="fs2" style={{ marginTop: "1rem" }}>
              <div className="fst">Return Items</div>
              
              {items.map((item, index) => {
                const itemBatches = grnBatches.filter(b => String(b.item_id) === String(item.item_id));
                const itemType = uniqueItems.find(i => String(i.item_id) === String(item.item_id))?.stock_type;

                return (
                  <div key={item.id} style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1rem", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <strong>Item {index + 1}</strong>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                      )}
                    </div>
                    
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Item</label>
                        <select className="fc" value={item.item_id} onChange={(e) => updateItem(index, "item_id", e.target.value)} disabled={!grnId}>
                          <option value="">Select item</option>
                          {uniqueItems.map((u) => (
                            <option key={u.item_id} value={u.item_id}>{u.name} ({u.code})</option>
                          ))}
                        </select>
                      </div>

                      <div className="ff">
                        <label className="fl">Batch</label>
                        <select className="fc" value={item.batch_id} onChange={(e) => updateItem(index, "batch_id", e.target.value)} disabled={!item.item_id}>
                          <option value="">Select batch</option>
                          {itemBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {(b.batch_number || b.batch_code)} - Avail: {b.qty_remaining || b.available_quantity} {b.unit || ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Return Quantity</label>
                        <input className="fc" type="number" step={itemType === "packaging" ? "1" : "0.01"} min="0" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} placeholder="0.00" />
                      </div>

                      <div className="ff">
                        <label className="fl">Reason</label>
                        <input className="fc" type="text" value={item.reason} onChange={(e) => updateItem(index, "reason", e.target.value)} placeholder="Quality issue..." />
                      </div>
                    </div>
                    
                    <div className="ff" style={{ marginTop: "0.5rem" }}>
                      <label className="fl">Notes</label>
                      <input className="fc" type="text" value={item.notes} onChange={(e) => updateItem(index, "notes", e.target.value)} placeholder="Optional details..." />
                    </div>
                  </div>
                );
              })}

              <button type="button" className="btn btn-s" onClick={addItem} style={{ width: "100%", borderStyle: "dashed" }}>
                + Add Another Item
              </button>
            </div>
          </div>

          <div className="md-f">
            <button type="button" className="btn btn-s" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-p" disabled={saving}>{saving ? "Saving..." : "Save Return"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReturnModal;
