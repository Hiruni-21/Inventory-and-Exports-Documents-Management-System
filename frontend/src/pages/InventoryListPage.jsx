import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const formatQty = (value, unit = "") => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return `0 ${unit}`.trim();
  const clean = Number.isInteger(num) ? String(num) : num.toFixed(2);
  return `${clean} ${unit}`.trim();
};

const getStockState = (row) => {
  const qty = Number(row.qty_available || 0);
  const reorder = Number(row.reorder_level || 0);

  if (qty <= 0) return { key: "critical", label: "🔴 Critical", pill: "bg-r", bar: "r" };
  if (reorder > 0 && qty <= reorder) return { key: "low", label: "⚠️ Low", pill: "bg-a", bar: "w" };
  return { key: "ok", label: "✅ OK", pill: "bg-g", bar: "g" };
};

const progressWidth = (qty, reorder) => {
  const q = Number(qty || 0);
  const r = Number(reorder || 0);
  if (r <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((q / r) * 100)));
};

const InventoryListPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [inventory, setInventory] = useState([]);
  const [expiringIds, setExpiringIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchItem, setBatchItem] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const loadPage = async () => {
    try {
      setLoading(true);

      const [inventoryRes, expiryRes] = await Promise.all([
        api.get("/inventory"),
        api.get("/inventory/expiry", { params: { days: 14 } }),
      ]);

      const inventoryRows = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
      const expiryRows = Array.isArray(expiryRes.data) ? expiryRes.data : [];

      setInventory(inventoryRows);
      setExpiringIds(new Set(expiryRows.map((row) => String(row.item_id))));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load inventory");
      setInventory([]);
      setExpiringIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!batchModalOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setBatchModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [batchModalOpen]);

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(inventory.map((row) => row.category_name).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b)));
    return ["All Categories", ...values];
  }, [inventory]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return inventory
      .filter((row) => {
        const matchesSearch =
          q === "" ||
          [
            row.code,
            row.name,
            row.item_code,
            row.item_name,
            row.botanical_name,
            row.category_name,
            row.type,
            row.unit,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);

        const matchesCategory =
          categoryFilter === "All Categories" || row.category_name === categoryFilter;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) =>
        String(a.name || a.item_name || "").localeCompare(
          String(b.name || b.item_name || ""),
          undefined,
          { sensitivity: "base" }
        )
      );
  }, [inventory, search, categoryFilter]);

  const openBatches = async (row) => {
    try {
      setBatchLoading(true);
      setBatchItem(row);
      setBatchModalOpen(true);

      const res = await api.get(`/inventory/batches/${row.item_id || row.id}`);
      setBatches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load FEFO batches");
      setBatches([]);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <>
      <div className="ib ib-i">
        <span>📦</span>
        <div>
          Current stock levels across all active items. Inventory cards match the prototype flow:
          stock level, reorder level, quick adjust, and FEFO batch viewing.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="fs"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <button type="button" className="ft on">
          All
        </button>
        <button type="button" className="ft" onClick={() => navigate("/inventory/low-stock")}>
          ⚠️ Low Stock
        </button>
        <button type="button" className="ft" onClick={() => navigate("/inventory/expiry")}>
          ⏱ Expiring
        </button>
      </div>

      {loading ? (
        <div className="ib ib-i">
          <span>⏳</span>
          <div>Loading inventory...</div>
        </div>
      ) : (
        <div className="cg">
          {filteredRows.map((row) => {
            const state = getStockState(row);
            const isExpiring = expiringIds.has(String(row.item_id || row.id));
            const qty = Number(row.qty_available || 0);
            const reorder = Number(row.reorder_level || 0);

            return (
              <div key={row.item_id || row.id} className="ic">
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 11,
                    gap: 8,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--text3)",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      {row.code || row.item_code} · {row.category_name}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--g900)",
                        marginTop: 3,
                        letterSpacing: "-.2px",
                      }}
                    >
                      {row.name || row.item_name}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      alignItems: "flex-end",
                    }}
                  >
                    <span className={`badge ${state.pill}`}>{state.label}</span>
                    {isExpiring ? <span className="badge bg-r">⏱ Expiring</span> : null}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <div
                    style={{
                      background: "var(--ivory)",
                      borderRadius: 8,
                      padding: 9,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--text3)",
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      In Stock
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "var(--g900)",
                        marginTop: 2,
                      }}
                    >
                      {qty}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text3)",
                          marginLeft: 4,
                        }}
                      >
                        {row.unit}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--ivory)",
                      borderRadius: 8,
                      padding: 9,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--text3)",
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      Reorder Level
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "var(--g900)",
                        marginTop: 2,
                      }}
                    >
                      {reorder}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text3)",
                          marginLeft: 4,
                        }}
                      >
                        {row.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pb">
                  <div
                    className={`pf ${state.bar}`}
                    style={{ width: `${progressWidth(qty, reorder)}%` }}
                  ></div>
                </div>

                <div style={{ marginTop: 9, display: "flex", gap: 5 }}>
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() =>
                      navigate(`/stock-adjustments/add?itemId=${row.item_id || row.id}`)
                    }
                  >
                    Adjust
                  </button>

                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => openBatches(row)}
                  >
                    Batches
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredRows.length === 0 ? (
        <div className="ib ib-w" style={{ marginTop: 16 }}>
          <span>ℹ️</span>
          <div>No inventory items found for the current filters.</div>
        </div>
      ) : null}

      {batchModalOpen ? (
        <div className="modal-backdrop" onClick={() => setBatchModalOpen(false)}>
          <div className="md" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="md-h">
              <h3>📦 FEFO Batches — {batchItem?.name || batchItem?.item_name}</h3>
              <button type="button" className="md-x" onClick={() => setBatchModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="md-b">
              {batchLoading ? (
                <div className="ib ib-i">
                  <span>⏳</span>
                  <div>Loading batches...</div>
                </div>
              ) : (
                <table className="it">
                  <thead>
                    <tr>
                      <th>BATCH</th>
                      <th>RECEIVED</th>
                      <th>EXPIRY</th>
                      <th>AVAILABLE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length ? (
                      batches.map((batch) => (
                        <tr key={batch.id}>
                          <td>{batch.batch_code || batch.batch_number || "—"}</td>
                          <td>{String(batch.received_date || "").slice(0, 10) || "—"}</td>
                          <td>{String(batch.expiry_date || "").slice(0, 10) || "—"}</td>
                          <td>{formatQty(batch.qty_remaining || batch.available_quantity, batch.unit)}</td>
                          <td>{batch.status || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">No active batches found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="md-f">
              <button type="button" className="btn btn-s" onClick={() => setBatchModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default InventoryListPage;