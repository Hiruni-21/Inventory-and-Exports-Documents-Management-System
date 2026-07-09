import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const numberValue = (...values) => {
  for (const value of values) {
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  return 0;
};

const textValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
};

const formatShortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
};

const formatLongDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const daysLeftFromDate = (value) => {
  if (!value) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return null;

  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const statusStyleMap = {
  in_stock: {
    label: "In Stock",
    bg: "#E9F7EE",
    color: "#246A45",
    dot: "#2E8B57",
  },
  low_stock: {
    label: "Low Stock",
    bg: "#FFF1EE",
    color: "#B13D2B",
    dot: "#C94D38",
  },
  out_of_stock: {
    label: "Out of Stock",
    bg: "#FFE8E4",
    color: "#B1281C",
    dot: "#D64232",
  },
  expiring: {
    label: "Expiring",
    bg: "#FFF4DE",
    color: "#A56A00",
    dot: "#D99800",
  },
};

const statusTooltipMap = {
  in_stock: "Stock is available and above the reorder point.",
  low_stock: "Stock is at or below the reorder point. Replenishment is needed soon.",
  out_of_stock: "No available stock remains. Immediate replenishment is required.",
  expiring: "This item has active batches nearing expiry and should follow FEFO priority.",
};

const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 22,
  boxShadow: "0 2px 8px rgba(10,40,24,.03)",
  position: "relative",
  overflow: "hidden",
};

const cardAccentStyle = (accent) => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: 4,
  background: accent,
});

const FILTER_CONTROL_HEIGHT = 36;
const PRIMARY_GREEN = "#166534";
const PRIMARY_GREEN_HOVER = "#14532D";

const filterButtonStyle = (active) => ({
  height: FILTER_CONTROL_HEIGHT,
  minHeight: FILTER_CONTROL_HEIGHT,
  padding: "0 18px",
  borderRadius: 10,
  border: `1px solid ${active ? PRIMARY_GREEN : "var(--border)"}`,
  background: active ? PRIMARY_GREEN : "var(--white)",
  color: active ? "#FFFFFF" : "var(--g700)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  boxSizing: "border-box",
  transition: "all 0.18s ease",
});

const topActionButtonStyle = {
  height: 44,
  padding: "0 18px",
  minWidth: 124,
  borderRadius: 12,
  border: `1px solid ${PRIMARY_GREEN}`,
  background: PRIMARY_GREEN,
  color: "#FFFFFF",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 0.18s ease",
  boxShadow: "0 2px 8px rgba(22,101,52,.12)",
  boxSizing: "border-box",
};

const statusBadgeStyle = (key) => {
  const config = statusStyleMap[key] || statusStyleMap.in_stock;

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    borderRadius: 999,
    background: config.bg,
    color: config.color,
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: "nowrap",
  };
};

const statusDotStyle = (key) => {
  const config = statusStyleMap[key] || statusStyleMap.in_stock;

  return {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: config.dot,
    flexShrink: 0,
  };
};

const detailLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9AA2B0",
  marginBottom: 6,
};

const detailValueStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--g900)",
};

const modalFooterButtonBaseStyle = {
  height: 40,
  padding: "0 14px",
  minWidth: 82,
  borderRadius: 10,
  border: "1px solid #CBD5D1",
  background: "var(--white)",
  color: "var(--g800)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 0.18s ease",
  boxSizing: "border-box",
};

const getModalFooterButtonStyle = (type, hovered) => {
  if (type === "close") {
    return {
      ...modalFooterButtonBaseStyle,
      background: hovered ? "#F4F7F5" : "var(--white)",
      color: "var(--g800)",
      border: "1px solid #CBD5D1",
    };
  }

  if (type === "create") {
    return {
      ...modalFooterButtonBaseStyle,
      background: hovered ? "#E9F7EE" : "var(--white)",
      color: hovered ? "#1F6B43" : "var(--g800)",
      border: `1px solid ${hovered ? "#2E8B57" : "#CBD5D1"}`,
    };
  }

  return {
    ...modalFooterButtonBaseStyle,
    background: hovered ? "#0E5A34" : "var(--g900)",
    color: "#FFFFFF",
    border: "1px solid var(--g900)",
  };
};

const recentMovementBoxStyle = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "0 18px",
  background: "var(--white)",
};

const InventoryListPage = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [valuationRows, setValuationRows] = useState([]);
  const [expiringRows, setExpiringRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [tab, setTab] = useState("All");

  const [selectedRow, setSelectedRow] = useState(null);
  const [detailBatches, setDetailBatches] = useState([]);
  const [detailError, setDetailError] = useState("");
  const [hoveredFooterBtn, setHoveredFooterBtn] = useState("");

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);

      try {
        const [inventoryRes, valuationRes, expiryRes] = await Promise.allSettled([
          api.get("/inventory"),
          api.get("/inventory/valuation"),
          api.get("/inventory/expiry"),
        ]);

        const inventoryData =
          inventoryRes.status === "fulfilled" && Array.isArray(inventoryRes.value.data)
            ? inventoryRes.value.data
            : [];

        const valuationData =
          valuationRes.status === "fulfilled" && Array.isArray(valuationRes.value.data)
            ? valuationRes.value.data
            : [];

        const expiryData =
          expiryRes.status === "fulfilled" && Array.isArray(expiryRes.value.data)
            ? expiryRes.value.data
            : [];

        setRows(inventoryData);
        setValuationRows(valuationData);
        setExpiringRows(expiryData);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load inventory");
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [toast]);

  const expiringItemKeySet = useMemo(() => {
    const set = new Set();

    expiringRows.forEach((row) => {
      const itemId = textValue(row.item_id, row.id);
      const itemCode = textValue(row.item_code, row.code);
      const itemName = textValue(row.item_name, row.name);

      if (itemId) set.add(`id:${itemId}`);
      if (itemCode) set.add(`code:${itemCode}`);
      if (itemName) set.add(`name:${itemName.toLowerCase()}`);
    });

    return set;
  }, [expiringRows]);

  const valuationMap = useMemo(() => {
    const map = new Map();

    valuationRows.forEach((row) => {
      const key =
        textValue(row.item_id) ||
        textValue(row.id) ||
        textValue(row.item_code) ||
        textValue(row.code) ||
        textValue(row.item_name) ||
        textValue(row.name);

      if (key) {
        map.set(key, numberValue(row.total_value, row.value, row.stock_value));
      }
    });

    return map;
  }, [valuationRows]);

  const normalizedRows = useMemo(() => {
    return rows.map((row) => {
      const itemId = textValue(row.item_id, row.id);
      const itemCode = textValue(row.item_code, row.code);
      const itemName = textValue(row.item_name, row.name);
      const categoryName = textValue(row.category_name, row.category, row.category_title);
      const unit = textValue(row.unit, row.uom) || "kg";

      const currentStock = numberValue(
        row.total_available_quantity,
        row.qty_available,
        row.available_quantity,
        row.current_stock,
        row.qty_on_hand,
        row.quantity
      );

      const reorderPoint = numberValue(row.reorder_level, row.reorder_point, row.reorder_qty);

      const batches = numberValue(
        row.batch_count,
        row.batches_count,
        row.batches,
        row.active_batches
      );

      const lastUpdated = textValue(row.updated_at, row.last_updated, row.created_at);

      const estimatedValue =
        valuationMap.get(itemId) ??
        valuationMap.get(itemCode) ??
        valuationMap.get(itemName) ??
        numberValue(row.total_value, row.stock_value, row.current_value);

      const expiring =
        expiringItemKeySet.has(`id:${itemId}`) ||
        expiringItemKeySet.has(`code:${itemCode}`) ||
        expiringItemKeySet.has(`name:${itemName.toLowerCase()}`);

      let statusKey = "in_stock";

      if (currentStock === 0) {
        statusKey = "out_of_stock";
      } else if (currentStock <= reorderPoint) {
        statusKey = "low_stock";
      } else if (expiring) {
        statusKey = "expiring";
      }

      return {
        raw: row,
        itemId,
        itemCode,
        itemName,
        categoryName,
        unit,
        currentStock,
        reorderPoint,
        batches,
        lastUpdated,
        estimatedValue,
        expiring,
        statusKey,
      };
    });
  }, [rows, valuationMap, expiringItemKeySet]);

  const categoryOptions = useMemo(() => {
    const values = Array.from(
      new Set(normalizedRows.map((row) => row.categoryName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return ["All Categories", ...values];
  }, [normalizedRows]);

  const filteredRows = useMemo(() => {
    let result = [...normalizedRows];

    if (category !== "All Categories") {
      result = result.filter((row) => row.categoryName === category);
    }

    if (tab === "Low Stock") {
      result = result.filter((row) => row.statusKey === "low_stock");
    } else if (tab === "Out of Stock") {
      result = result.filter((row) => row.statusKey === "out_of_stock");
    } else if (tab === "Expiring") {
      result = result.filter((row) => row.expiring);
    }

    const q = search.trim().toLowerCase();

    if (q) {
      result = result.filter((row) =>
        [row.itemCode, row.itemName, row.categoryName, row.currentStock, row.reorderPoint]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return result;
  }, [normalizedRows, category, tab, search]);

  const summary = useMemo(() => {
    const totalItems = normalizedRows.length;
    const lowStockCount = normalizedRows.filter((row) => row.statusKey === "low_stock").length;
    const outOfStockCount = normalizedRows.filter((row) => row.statusKey === "out_of_stock").length;
    const estimatedValue = normalizedRows.reduce(
      (sum, row) => sum + numberValue(row.estimatedValue),
      0
    );

    return {
      totalItems,
      lowStockCount,
      outOfStockCount,
      estimatedValue,
    };
  }, [normalizedRows]);

  const openDetail = async (row) => {
    setSelectedRow(row);
    setDetailBatches([]);
    setDetailError("");
    setLoadingDetail(true);

    try {
      const res = await api.get(`/inventory/batches/${row.itemId}`);
      const batches = Array.isArray(res.data) ? res.data : [];

      const sortedBatches = [...batches].sort((a, b) => {
        const aDate = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });

      setDetailBatches(sortedBatches);
    } catch (err) {
      console.error(err);
      setDetailError("Failed to load item batches");
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedRow(null);
    setDetailBatches([]);
    setDetailError("");
    setLoadingDetail(false);
  };

  const recentMovements = useMemo(() => {
    if (!selectedRow) return [];

    const firstBatch = detailBatches[0];
    const movements = [];

    if (selectedRow.lastUpdated) {
      movements.push({
        text: `Inventory updated for ${selectedRow.itemName}`,
        date: formatLongDate(selectedRow.lastUpdated),
      });
    }

    if (firstBatch) {
      movements.push({
        text: `${
          textValue(firstBatch.batch_code, firstBatch.batch_number, firstBatch.code) || "First batch"
        } is first in FEFO order`,
        date: formatLongDate(textValue(firstBatch.received_date, firstBatch.created_at)),
      });
    }

    return movements;
  }, [selectedRow, detailBatches]);

  return (
    <div>
      <div className="fb" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          type="button"
          className="btn btn-s"
          onClick={() => navigate("/stock-adjustments")}
        >
          Adjust Stock
        </button>
      </div>

      <div
        className="cg"
        style={{
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div style={cardStyle}>
          <div style={{ color: "#9AA2B0", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
            TOTAL ITEMS
          </div>
          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: "var(--g900)" }}>
            {summary.totalItems}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              color: "var(--text3)",
            }}
          >
            Across {Math.max(categoryOptions.length - 1, 0)} categories
          </div>
          <div style={cardAccentStyle("#2FA34A")} />
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9AA2B0", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
            LOW STOCK
          </div>
          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: "#9B3224" }}>
            {summary.lowStockCount}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              color: "var(--text3)",
            }}
          >
            At or below reorder point
          </div>
          <div style={cardAccentStyle("#D84D32")} />
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9AA2B0", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
            OUT OF STOCK
          </div>
          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: "#A35F00" }}>
            {summary.outOfStockCount}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              color: "var(--text3)",
            }}
          >
            Need immediate replenishment
          </div>
          <div style={cardAccentStyle("#E29B2D")} />
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9AA2B0", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
            ESTIMATED VALUE
          </div>
          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: "var(--g900)" }}>
            {formatCurrency(summary.estimatedValue)}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              color: "var(--text3)",
            }}
          >
            At standard unit cost
          </div>
          <div style={cardAccentStyle("#2F69C8")} />
        </div>
      </div>

      <div className="fb" style={{ gap: 12, marginBottom: 18, alignItems: "stretch" }}>
        <div className="sw" style={{ minWidth: 320 }}>
          <input
            className="si"
            placeholder="Search by item name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="fc"
          style={{ maxWidth: 190, height: FILTER_CONTROL_HEIGHT }}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {["All", "Low Stock", "Out of Stock"].map((tabName) => (
            <button
              key={tabName}
              type="button"
              onClick={() => setTab(tabName)}
              style={filterButtonStyle(tab === tabName)}
            >
              {tabName}
            </button>
          ))}
        </div>
      </div>

      <div
        className="tw inventory-table-wrap"
        style={{
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        <table style={{ minWidth: 1120 }}>
          <thead>
            <tr>
              <th style={{ width: "11%" }}>ITEM CODE</th>
              <th style={{ width: "19%" }}>ITEM NAME</th>
              <th style={{ width: "14%" }}>CATEGORY</th>
              <th style={{ width: "14%" }}>CURRENT STOCK</th>
              <th style={{ width: "14%" }}>REORDER POINT</th>
              <th style={{ width: "8%" }}>BATCHES</th>
              <th style={{ width: "11%" }}>LAST UPDATED</th>
              <th style={{ width: "9%" }}>STATUS</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Loading inventory...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr
                  key={row.itemId || row.itemCode}
                  onClick={() => openDetail(row)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                    {row.itemCode || "—"}
                  </td>
                  <td style={{ fontWeight: 700 }}>{row.itemName || "—"}</td>
                  <td>{row.categoryName || "—"}</td>
                  <td>
                    {row.currentStock} {row.unit}
                  </td>
                  <td>
                    {row.reorderPoint} {row.unit}
                  </td>
                  <td>{row.batches}</td>
                  <td>{formatShortDate(row.lastUpdated)}</td>
                  <td>
                    <span
                      title={statusTooltipMap[row.statusKey] || ""}
                      style={{ display: "inline-flex" }}
                    >
                      <span style={statusBadgeStyle(row.statusKey)}>
                        <span style={statusDotStyle(row.statusKey)} />
                        {statusStyleMap[row.statusKey]?.label}
                      </span>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No inventory items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRow ? (
        <div className="modal-backdrop">
          <div className="md" style={{ maxWidth: 960, width: "82%" }}>
            <div
              className="md-h"
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--g900)" }}>
                {selectedRow.itemName} — Inventory Detail
              </h3>
              <button type="button" className="md-x" onClick={closeDetail}>
                ✕
              </button>
            </div>

            <div className="md-b" style={{ padding: 20 }}>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 18,
                  background: "var(--white)",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div
                    style={{
                      padding: "12px 18px",
                      borderRight: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={detailLabelStyle}>Item Code</div>
                    <div style={detailValueStyle}>{selectedRow.itemCode || "—"}</div>
                  </div>

                  <div
                    style={{
                      padding: "12px 18px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={detailLabelStyle}>Category</div>
                    <div style={detailValueStyle}>{selectedRow.categoryName || "—"}</div>
                  </div>

                  <div
                    style={{
                      padding: "12px 18px",
                      borderRight: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={detailLabelStyle}>Current Stock</div>
                    <div style={detailValueStyle}>
                      {selectedRow.currentStock} {selectedRow.unit}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 18px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={detailLabelStyle}>Reorder Point</div>
                    <div style={detailValueStyle}>
                      {selectedRow.reorderPoint} {selectedRow.unit}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 18px",
                      borderRight: "1px solid var(--border)",
                    }}
                  >
                    <div style={detailLabelStyle}>Status</div>
                    <div style={{ marginTop: 4 }}>
                      <span
                        title={statusTooltipMap[selectedRow.statusKey] || ""}
                        style={{ display: "inline-flex" }}
                      >
                        <span style={statusBadgeStyle(selectedRow.statusKey)}>
                          <span style={statusDotStyle(selectedRow.statusKey)} />
                          {statusStyleMap[selectedRow.statusKey]?.label}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: "12px 18px" }}>
                    <div style={detailLabelStyle}>Last Updated</div>
                    <div style={detailValueStyle}>{formatShortDate(selectedRow.lastUpdated)}</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginBottom: 10,
                  fontWeight: 800,
                  fontSize: 14,
                  color: "var(--g900)",
                }}
              >
                Active Batches (FEFO Order)
              </div>

              {detailError ? (
                <div className="ib ib-d" style={{ marginBottom: 14 }}>
                  <span>⚠️</span>
                  <div>{detailError}</div>
                </div>
              ) : null}

              <div
                  className="tw inventory-table-wrap"
                  style={{
                    overflowX: "auto",
                    overflowY: "hidden",
                  }}
                >
                  <table
                    style={{
                      minWidth: 1120,
                      tableLayout: "fixed",
                    }}
                  >
                  <thead>
                    <tr>
                      <th>BATCH NO.</th>
                      <th>QTY REMAINING</th>
                      <th>RECEIVED</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingDetail ? (
                      <tr>
                        <td colSpan="3">Loading batches...</td>
                      </tr>
                    ) : detailBatches.length ? (
                      detailBatches.map((batch, index) => {
                        const qty = numberValue(
                          batch.available_quantity,
                          batch.qty_remaining,
                          batch.quantity,
                          batch.qty_on_hand
                        );

                        return (
                          <tr key={batch.id || batch.batch_code || index}>
                            <td>
                              {textValue(batch.batch_code, batch.batch_number, batch.code) || "—"}
                            </td>
                            <td>
                              {qty} {textValue(batch.unit, selectedRow.unit)}
                            </td>
                            <td>{formatLongDate(textValue(batch.received_date, batch.created_at))}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3">No active batches found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginBottom: 10,
                  fontWeight: 800,
                  fontSize: 14,
                  color: "var(--g900)",
                }}
              >
                Recent Movement
              </div>

              <div style={recentMovementBoxStyle}>
                {recentMovements.length ? (
                  recentMovements.map((movement, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "16px 0",
                        borderBottom:
                          index !== recentMovements.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          color: "var(--text2)",
                          fontSize: 14,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#C9CFD8",
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <div>{movement.text}</div>
                          <div
                            style={{
                              marginTop: 6,
                              color: "#9AA2B0",
                              fontSize: 12,
                            }}
                          >
                            {movement.date || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "18px 0", color: "#9AA2B0", fontSize: 13 }}>
                    No recent movement available
                  </div>
                )}
              </div>
            </div>

            <div
              className="md-f"
              style={{
                padding: "16px 22px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                style={getModalFooterButtonStyle("close", hoveredFooterBtn === "close")}
                onMouseEnter={() => setHoveredFooterBtn("close")}
                onMouseLeave={() => setHoveredFooterBtn("")}
                onClick={closeDetail}
              >
                Close
              </button>

              <button
                type="button"
                style={getModalFooterButtonStyle("create", hoveredFooterBtn === "create")}
                onMouseEnter={() => setHoveredFooterBtn("create")}
                onMouseLeave={() => setHoveredFooterBtn("")}
                onClick={() => navigate("/purchase-orders/add")}
              >
                + Create PO
              </button>

              <button
                type="button"
                style={topActionButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = PRIMARY_GREEN_HOVER;
                  e.currentTarget.style.borderColor = PRIMARY_GREEN_HOVER;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = PRIMARY_GREEN;
                  e.currentTarget.style.borderColor = PRIMARY_GREEN;
                }}
                onClick={() => navigate("/stock-adjustments")}
              >
                Adjust Stock
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default InventoryListPage;