import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const STORAGE_KEY = "fw_physical_stock_count_progress_v2";
const PRIMARY_GREEN = "#166534";
const PRIMARY_GREEN_HOVER = "#14532D";

const formatQty = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA");
};

const getItemId = (item) => item?.item_id || item?.id || "";
const getItemName = (item) => item?.item_name || item?.name || "Unnamed Item";
const getItemCode = (item) => item?.item_code || item?.code || "";
const getItemUnit = (item) => item?.unit || "";

const getCategoryLabel = (item) => item.category_name || item.type || "Inventory";

const isPackagingItem = (item) => {
  const text = `${item.category_name || ""} ${item.type || ""} ${item.item_name || item.name || ""}`.toLowerCase();
  return text.includes("packaging");
};

const isStockCountAdjustment = (row) => {
  const type = String(row?.adjustment_type || "").toLowerCase();
  const reason = String(row?.reason || "").toLowerCase();
  return type === "stock_count" || reason.includes("physical count");
};

const buildProgressKey = (itemId, batchId) => `${itemId}_${batchId}`;

const summaryCardStyle = (accent) => ({
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: 18,
  padding: "18px 20px",
  minHeight: 116,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "0 2px 6px rgba(10,40,24,.03)",
  borderBottom: `4px solid ${accent}`,
});

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
  border: `1px solid ${PRIMARY_GREEN}`,
  background: PRIMARY_GREEN,
  color: "var(--white)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "none",
};

const PhysicalStockCountPage = () => {
  const toast = useToast();

  const [batchRows, setBatchRows] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [progress, setProgress] = useState({});
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const loadPage = async () => {
    try {
      setLoading(true);

      const [inventoryRes, adjustmentsRes] = await Promise.all([
        api.get("/inventory"),
        api.get("/stock-adjustments"),
      ]);

      const inventoryData = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
      const adjustmentsData = Array.isArray(adjustmentsRes.data) ? adjustmentsRes.data : [];

      const countableItems = inventoryData.filter((item) => !isPackagingItem(item));

      const batchResults = await Promise.all(
        countableItems.map(async (item) => {
          const itemId = getItemId(item);

          try {
            const res = await api.get(`/inventory/batches/${itemId}`);
            const rows = Array.isArray(res.data) ? res.data : [];

            return rows.map((batch) => ({
              item_id: Number(itemId),
              item_name: getItemName(item),
              item_code: getItemCode(item),
              category_name: getCategoryLabel(item),
              unit: batch.unit || getItemUnit(item),
              batch_id: Number(batch.id),
              batch_code: batch.batch_code || batch.batch_number || "Batch",
              expiry_date: batch.expiry_date || null,
              system_qty: Number(batch.qty_remaining ?? batch.available_quantity ?? 0),
            }));
          } catch (err) {
            console.error(err);
            return [];
          }
        })
      );

      const flatRows = batchResults
        .flat()
        .sort((a, b) => {
          const itemCompare = String(a.item_name).localeCompare(String(b.item_name));
          if (itemCompare !== 0) return itemCompare;
          return String(a.batch_code).localeCompare(String(b.batch_code));
        });

      setBatchRows(flatRows);
      setAdjustments(adjustmentsData);

      const savedProgress = window.localStorage.getItem(STORAGE_KEY);
      setProgress(savedProgress ? JSON.parse(savedProgress) : {});
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load physical stock count data");
      setBatchRows([]);
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const categories = useMemo(() => {
    const values = Array.from(new Set(batchRows.map((row) => row.category_name).filter(Boolean)));
    return ["All", ...values];
  }, [batchRows]);

  const rows = useMemo(() => {
    return batchRows.map((row) => {
      const key = buildProgressKey(row.item_id, row.batch_id);
      const saved = progress[key] || {};
      const actualQty =
        saved.actual_qty === "" || saved.actual_qty === undefined ? "" : saved.actual_qty;

      const variance =
        actualQty === "" || Number.isNaN(Number(actualQty))
          ? null
          : Number(actualQty) - Number(row.system_qty || 0);

      return {
        ...row,
        progressKey: key,
        actualQty,
        variance,
        done: Boolean(saved.done),
      };
    });
  }, [batchRows, progress]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchCategory = categoryFilter === "All" || row.category_name === categoryFilter;

      const matchSearch =
        !q ||
        [
          row.item_name,
          row.item_code,
          row.category_name,
          row.batch_code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      return matchCategory && matchSearch;
    });
  }, [rows, search, categoryFilter]);

  const stockCountRows = useMemo(
    () =>
      adjustments
        .filter(isStockCountAdjustment)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [adjustments]
  );

  const lastCountDate = stockCountRows.length ? formatDate(stockCountRows[0].created_at) : "—";

  const lastVarianceTotal = stockCountRows.reduce(
    (sum, row) => sum + Math.abs(Number(row.variance_qty || 0)),
    0
  );

  const countedToday = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayKey = `${yyyy}-${mm}-${dd}`;

    return stockCountRows.filter((row) => {
      if (!row?.created_at) return false;
      const created = new Date(row.created_at);
      if (Number.isNaN(created.getTime())) return false;

      const cY = created.getFullYear();
      const cM = String(created.getMonth() + 1).padStart(2, "0");
      const cD = String(created.getDate()).padStart(2, "0");
      const createdKey = `${cY}-${cM}-${cD}`;

      return createdKey === todayKey;
    }).length;
  }, [stockCountRows]);

  const handleActualChange = (progressKey, value) => {
    setProgress((prev) => ({
      ...prev,
      [progressKey]: {
        ...prev[progressKey],
        actual_qty: value,
        done: prev[progressKey]?.done || false,
      },
    }));
  };

  const handleDoneToggle = (progressKey, checked) => {
    setProgress((prev) => ({
      ...prev,
      [progressKey]: {
        ...prev[progressKey],
        actual_qty: prev[progressKey]?.actual_qty ?? "",
        done: checked,
      },
    }));
  };

  const handleSaveProgress = () => {
    try {
      setSavingProgress(true);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      toast.success("Physical stock count progress saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save progress");
    } finally {
      setSavingProgress(false);
    }
  };

  const handleFinishCount = async () => {
    const doneRows = rows.filter((row) => row.done);

    if (!doneRows.length) {
      toast.error("Mark at least one row as done before finishing");
      return;
    }

    const validRows = doneRows.filter(
      (row) => row.actualQty !== "" && !Number.isNaN(Number(row.actualQty))
    );

    if (!validRows.length) {
      toast.error("Enter actual quantities for completed rows");
      return;
    }

    try {
      setFinishing(true);

      for (const row of validRows) {
        const actualQty = Number(row.actualQty);
        const systemQty = Number(row.system_qty || 0);

        if (actualQty === systemQty) {
          continue;
        }

        await api.post("/stock-adjustments", {
          item_id: Number(row.item_id),
          batch_id: Number(row.batch_id),
          adjustment_mode: "exact",
          quantity: actualQty,
          reason: "Physical count correction",
          authorized_by: "Manager (Priya Mendis)",
          notes: `Physical stock count auto-adjustment for ${row.batch_code}. System showed ${formatQty(
            systemQty
          )}${row.unit ? ` ${row.unit}` : ""}.`,
        });
      }

      window.localStorage.removeItem(STORAGE_KEY);
      setProgress({});
      toast.success("Physical stock count finished and variances adjusted");
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to finish physical stock count");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <>
      <div className="ib ib-i">
        <span>📋</span>
        <div>
          What is Physical Stock Count? Count stock batch by batch in the warehouse. Search and
          filter the rows you want to count today, enter the actual quantity, mark done, and finish
          the count to create exact stock adjustments.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div style={summaryCardStyle("var(--i)")}>
          <div style={{ fontSize: 28 }}></div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g900)" }}>{lastCountDate}</div>
            <div style={{ color: "var(--text2)", fontSize: 12 }}>Last Count Done</div>
          </div>
        </div>

        <div style={summaryCardStyle("var(--g500)")}>
          <div style={{ fontSize: 28 }}></div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g900)" }}>
              ±{formatQty(lastVarianceTotal)}
            </div>
            <div style={{ color: "var(--text2)", fontSize: 12 }}>Variance Found Last Count</div>
          </div>
        </div>

        <div style={summaryCardStyle("var(--i)")}>
          <div style={{ fontSize: 28 }}></div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g900)" }}>
              {filteredRows.length}
            </div>
            <div style={{ color: "var(--text2)", fontSize: 12 }}>Batch Rows to Count</div>
          </div>
        </div>

        <div style={summaryCardStyle("var(--g500)")}>
          <div style={{ fontSize: 28 }}></div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g900)" }}>{countedToday}</div>
            <div style={{ color: "var(--text2)", fontSize: 12 }}>Counted Today</div>
          </div>
        </div>
      </div>

      <div className="fb" style={{ marginBottom: 12 }}>
        <div className="sw" style={{ maxWidth: 300 }}>
          <input
            className="si"
            placeholder="Search item or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="ff" style={{ minWidth: 220, marginLeft: "auto" }}>
          <select
            className="fc"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ height: 40 }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "All" ? "All Categories" : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tw" style={{ minHeight: "410px" }}>
        <div className="tw-h">
          <h3>Start New Physical Count — Today</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th>CATEGORY</th>
              <th>SYSTEM SHOWS</th>
              <th>I ACTUALLY COUNT</th>
              <th>VARIANCE</th>
              <th>DONE?</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.progressKey}>
                  <td style={{ fontWeight: 700, color: "var(--g900)" }}>
                    <div>{row.item_name}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginTop: 2 }}>
                      {row.batch_code}
                      {row.expiry_date ? ` · exp ${formatDate(row.expiry_date)}` : ""}
                    </div>
                  </td>

                  <td>{row.category_name}</td>

                  <td>
                    {formatQty(row.system_qty)}
                    {row.unit ? ` ${row.unit}` : ""}
                  </td>

                  <td>
                    <input
                      className="fc"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter qty"
                      value={row.actualQty}
                      onChange={(e) => handleActualChange(row.progressKey, e.target.value)}
                      style={{ maxWidth: 126, height: 32 }}
                    />
                  </td>

                  <td
                    style={{
                      fontWeight: 700,
                      color:
                        row.variance === null
                          ? "var(--text3)"
                          : row.variance > 0
                          ? "var(--s)"
                          : row.variance < 0
                          ? "var(--d)"
                          : "var(--text2)",
                    }}
                  >
                    {row.variance === null
                      ? "—"
                      : row.variance > 0
                      ? `+${formatQty(row.variance)}`
                      : formatQty(row.variance)}
                    {row.variance !== null && row.unit ? ` ${row.unit}` : ""}
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      checked={row.done}
                      onChange={(e) => handleDoneToggle(row.progressKey, e.target.checked)}
                      style={{
                        width: 18,
                        height: 18,
                        cursor: "pointer",
                        accentColor: row.done ? "var(--s)" : "inherit",
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No countable batch rows found</td>
              </tr>
            )}
          </tbody>
        </table>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            paddingTop: 24,
            paddingRight: 12,
            paddingBottom: 10,
          }}
        >
          <button type="button" style={footerBtnSecondary} onClick={handleSaveProgress}>
            {savingProgress ? "Saving..." : "Save Progress"}
          </button>

          <button
            type="button"
            style={footerBtnPrimary}
            onClick={handleFinishCount}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = PRIMARY_GREEN_HOVER;
              e.currentTarget.style.borderColor = PRIMARY_GREEN_HOVER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = PRIMARY_GREEN;
              e.currentTarget.style.borderColor = PRIMARY_GREEN;
            }}
          >
            {finishing ? "Finishing..." : "Finish Count"}
          </button>
        </div>
      </div>
    </>
  );
};

export default PhysicalStockCountPage;