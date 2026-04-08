import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const PhysicalStockCountPage = () => {
  const toast = useToast();

  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    batch_id: "",
    actual_qty: "",
    notes: "",
  });

  const loadPage = async () => {
    try {
      setLoading(true);

      const [inventoryRes, adjustmentsRes] = await Promise.all([
        api.get("/inventory"),
        api.get("/stock-adjustments"),
      ]);

      setInventory(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);

      const adjustmentRows = Array.isArray(adjustmentsRes.data) ? adjustmentsRes.data : [];
      setHistory(
        adjustmentRows.filter((row) => {
          const reason = String(row.reason || "").toLowerCase();
          const notes = String(row.notes || "").toLowerCase();
          return reason.includes("physical stock count") || notes.includes("physical stock count");
        })
      );
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load physical stock count page");
      setInventory([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!showModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return inventory.filter((row) =>
      q === ""
        ? true
        : [
            row.code,
            row.name,
            row.item_code,
            row.item_name,
            row.category_name,
            row.type,
            row.unit,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
    );
  }, [inventory, search]);

  const selectedBatch = useMemo(
    () => batches.find((row) => String(row.id) === String(form.batch_id)),
    [batches, form.batch_id]
  );

  const systemQty = Number(
    selectedBatch?.qty_remaining ?? selectedBatch?.available_quantity ?? 0
  );

  const actualQty = Number(form.actual_qty || 0);
  const variance = actualQty - systemQty;

  const openCountModal = async (item) => {
    try {
      setSelectedItem(item);
      setShowModal(true);
      setBatchLoading(true);
      setBatches([]);
      setForm({
        batch_id: "",
        actual_qty: "",
        notes: "",
      });

      const res = await api.get(`/inventory/batches/${item.item_id || item.id}`);
      const batchRows = Array.isArray(res.data) ? res.data : [];
      setBatches(batchRows);

      if (batchRows.length) {
        const first = batchRows[0];
        const qty = Number(first.qty_remaining ?? first.available_quantity ?? 0);

        setForm({
          batch_id: String(first.id),
          actual_qty: String(qty),
          notes: "",
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load batches for physical count");
      setBatches([]);
    } finally {
      setBatchLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setBatches([]);
    setForm({
      batch_id: "",
      actual_qty: "",
      notes: "",
    });
  };

  const handleBatchChange = (value) => {
    const picked = batches.find((row) => String(row.id) === String(value));
    const qty = Number(picked?.qty_remaining ?? picked?.available_quantity ?? 0);

    setForm((prev) => ({
      ...prev,
      batch_id: value,
      actual_qty: String(qty),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem || !form.batch_id) {
      toast.error("Select an item batch first");
      return;
    }

    if (Number(form.actual_qty) < 0) {
      toast.error("Actual quantity cannot be negative");
      return;
    }

    if (variance === 0) {
      toast.info("No variance detected. Nothing to adjust.");
      closeModal();
      return;
    }

    try {
      setSaving(true);

      await api.post("/stock-adjustments", {
        item_id: Number(selectedItem.item_id || selectedItem.id),
        batch_id: Number(form.batch_id),
        adjustment_type: variance > 0 ? "IN" : "OUT",
        quantity: Math.abs(variance),
        reason: "Physical stock count variance",
        notes:
          `Physical stock count. System qty: ${systemQty}. Actual qty: ${actualQty}. Variance: ${variance}.` +
          (form.notes ? ` ${form.notes}` : ""),
      });

      toast.success("Physical stock count variance recorded");
      closeModal();
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save physical stock count");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="ib ib-i">
        <span>📋</span>
        <div>
          Count actual stock by batch and record only the variance. The system updates stock through
          the normal stock adjustment flow.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search items for counting..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Items Ready for Count</h3>
          <span className="badge bg-b">{filteredRows.length} items</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>ITEM CODE</th>
              <th>ITEM NAME</th>
              <th>CATEGORY</th>
              <th>SYSTEM QTY</th>
              <th>UNIT</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.item_id || row.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {row.code || row.item_code}
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.name || row.item_name}</td>
                  <td>{row.category_name || "—"}</td>
                  <td>{Number(row.qty_available || 0)}</td>
                  <td>{row.unit}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-s btn-xs"
                      onClick={() => openCountModal(row)}
                    >
                      Count
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="tw" style={{ marginTop: 16 }}>
        <div className="tw-h">
          <h3>Recent Physical Count Variances</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>ITEM</th>
              <th>BATCH</th>
              <th>TYPE</th>
              <th>QTY</th>
              <th>NOTES</th>
            </tr>
          </thead>
          <tbody>
            {history.length ? (
              history.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td>{fmtDateTime(row.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                  <td>{row.batch_code}</td>
                  <td>
                    <span className={`badge ${String(row.adjustment_type || "").toUpperCase() === "IN" ? "bg-g" : "bg-r"}`}>
                      {String(row.adjustment_type || "").toUpperCase() === "IN" ? "Increase" : "Decrease"}
                    </span>
                  </td>
                  <td>{Number(row.quantity || 0)}</td>
                  <td>{row.notes || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No physical count variances recorded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="md md-lg" onClick={(e) => e.stopPropagation()}>
            <div className="md-h">
              <h3>📋 Physical Stock Count — {selectedItem?.item_name || selectedItem?.name}</h3>
              <button type="button" className="md-x" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="md-b">
                {batchLoading ? (
                  <div className="ib ib-i">
                    <span>⏳</span>
                    <div>Loading item batches...</div>
                  </div>
                ) : (
                  <>
                    <div className="ff">
                      <label className="fl">Batch</label>
                      <select
                        className="fc"
                        value={form.batch_id}
                        onChange={(e) => handleBatchChange(e.target.value)}
                      >
                        <option value="">Select batch</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {(batch.batch_code || batch.batch_number)} - Available:{" "}
                            {batch.qty_remaining || batch.available_quantity} {batch.unit || ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="fr">
                      <div className="ff">
                        <label className="fl">System Qty</label>
                        <input className="fc" value={systemQty} readOnly />
                      </div>

                      <div className="ff">
                        <label className="fl">Actual Qty</label>
                        <input
                          className="fc"
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.actual_qty}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, actual_qty: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="ff">
                      <label className="fl">Variance</label>
                      <input
                        className="fc"
                        value={variance > 0 ? `+${variance}` : variance}
                        readOnly
                      />
                    </div>

                    <div className="ff">
                      <label className="fl">Notes</label>
                      <textarea
                        className="fc"
                        rows="4"
                        value={form.notes}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        placeholder="Extra notes for this count..."
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-p" disabled={saving || batchLoading}>
                  {saving ? "Saving..." : "Save Count Variance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PhysicalStockCountPage;