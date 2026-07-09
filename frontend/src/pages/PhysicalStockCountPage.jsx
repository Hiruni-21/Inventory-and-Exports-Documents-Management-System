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
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const getItemId = (item) => item?.item_id || item?.id || "";
const getItemName = (item) => item?.item_name || item?.name || "Unnamed Item";
const getItemCode = (item) => item?.item_code || item?.code || "";
const getItemUnit = (item) => item?.unit || "";
const getCategoryLabel = (item) => item.category_name || item.type || "Packaging";

const isPackagingItem = (item) => {
  const text = `${item.category_name || ""} ${item.type || ""} ${item.item_name || item.name || ""}`.toLowerCase();
  return (
    text.includes("packaging") ||
    text.includes("carton") ||
    text.includes("box") ||
    text.includes("label") ||
    text.includes("gel") ||
    text.includes("tape") ||
    text.includes("wrap") ||
    text.includes("liner") ||
    text.includes("pallet")
  );
};

const getWarehouseLocation = (itemId) => {
  const locations = ["Rack A-01", "Rack A-02", "Rack B-03", "Packing Zone", "Cold Packaging Area"];
  return locations[Number(itemId || 0) % locations.length];
};

const getDifferenceStatus = (diff) => {
  if (diff === null || diff === undefined || diff === "") return null;
  const num = Number(diff);
  if (num === 0) return { label: "Match", bg: "#ECFDF5", color: "#10B981", border: "#D1FAE5" };
  if (num < 0) return { label: "Shortage", bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" };
  return { label: "Excess", bg: "#EFF6FF", color: "#2563EB", border: "#DBEAFE" };
};

const buildProgressKey = (itemId, batchId) => `${itemId}_${batchId}`;

const summaryCardStyle = (accent) => ({
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: 18,
  padding: "22px 20px",
  minHeight: 116,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  boxShadow: "0 2px 6px rgba(10,40,24,.03)",
  borderBottom: `4px solid ${accent}`,
  boxSizing: "border-box",
});

const footerBtnSecondary = {
  height: "38px",
  padding: "0 20px",
  borderRadius: "10px",
  border: "1.5px solid var(--border)",
  background: "var(--white)",
  color: "var(--g700)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s ease-in-out",
};

const footerBtnPrimary = {
  height: "38px",
  padding: "0 20px",
  borderRadius: "10px",
  border: `1px solid ${PRIMARY_GREEN}`,
  background: PRIMARY_GREEN,
  color: "var(--white)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "none",
  transition: "all 0.15s ease-in-out",
};

const MOCK_RECENT_COUNTS = [
  {
    id: 1,
    auditDate: "2026-07-01",
    performedBy: "Priya Mendis",
    materialsCounted: 6,
    variances: 0,
    status: "Completed",
    items: [
      { name: "Corrugated Carton Box", category: "Cartons/Boxes", systemQty: 242, countedQty: 242, diff: 0, status: "Match", reason: "" },
      { name: "Regiform Box", category: "Cartons/Boxes", systemQty: 2, countedQty: 2, diff: 0, status: "Match", reason: "" },
      { name: "Liner Bag", category: "Cooling Materials", systemQty: 850, countedQty: 850, diff: 0, status: "Match", reason: "" },
      { name: "Export Label Roll", category: "Labels", systemQty: 65, countedQty: 65, diff: 0, status: "Match", reason: "" },
      { name: "Packing Tape Roll", category: "Cooling Materials", systemQty: 140, countedQty: 140, diff: 0, status: "Match", reason: "" },
      { name: "Gel Ice Pack", category: "Cooling Materials", systemQty: 180, countedQty: 180, diff: 0, status: "Match", reason: "" }
    ]
  },
  {
    id: 2,
    auditDate: "2026-06-15",
    performedBy: "Priya Mendis",
    materialsCounted: 6,
    variances: 2,
    status: "Approved",
    items: [
      { name: "Corrugated Carton Box", category: "Cartons/Boxes", systemQty: 245, countedQty: 242, diff: -3, status: "Shortage", reason: "Damaged" },
      { name: "Regiform Box", category: "Cartons/Boxes", systemQty: 2, countedQty: 2, diff: 0, status: "Match", reason: "" },
      { name: "Liner Bag", category: "Cooling Materials", systemQty: 850, countedQty: 850, diff: 0, status: "Match", reason: "" },
      { name: "Export Label Roll", category: "Labels", systemQty: 60, countedQty: 65, diff: 5, status: "Excess", reason: "Supplier replacement" },
      { name: "Packing Tape Roll", category: "Cooling Materials", systemQty: 140, countedQty: 140, diff: 0, status: "Match", reason: "" },
      { name: "Gel Ice Pack", category: "Cooling Materials", systemQty: 180, countedQty: 180, diff: 0, status: "Match", reason: "" }
    ]
  },
  {
    id: 3,
    auditDate: "2026-06-01",
    performedBy: "Anura Silva",
    materialsCounted: 4,
    variances: 1,
    status: "Approved",
    items: [
      { name: "Corrugated Carton Box", category: "Cartons/Boxes", systemQty: 242, countedQty: 242, diff: 0, status: "Match", reason: "" },
      { name: "Regiform Box", category: "Cartons/Boxes", systemQty: 5, countedQty: 2, diff: -3, status: "Shortage", reason: "Missing" },
      { name: "Liner Bag", category: "Cooling Materials", systemQty: 850, countedQty: 850, diff: 0, status: "Match", reason: "" },
      { name: "Export Label Roll", category: "Labels", systemQty: 65, countedQty: 65, diff: 0, status: "Match", reason: "" }
    ]
  }
];

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [localSessions, setLocalSessions] = useState([]);

  const loadPage = async () => {
    try {
      setLoading(true);

      const [inventoryRes, adjustmentsRes] = await Promise.all([
        api.get("/inventory"),
        api.get("/stock-adjustments"),
      ]);

      const inventoryData = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
      const adjustmentsData = Array.isArray(adjustmentsRes.data) ? adjustmentsRes.data : [];

      const countableItems = inventoryData.filter(
        (item) => item.stock_type === "packaging" || isPackagingItem(item)
      );

      const batchResults = await Promise.all(
        countableItems.map(async (item) => {
          const itemId = getItemId(item);

          try {
            const res = await api.get(`/inventory/batches/${itemId}`);
            const rows = Array.isArray(res.data) ? res.data : [];

            if (rows.length === 0) {
              return [
                {
                  item_id: Number(itemId),
                  item_name: getItemName(item),
                  item_code: getItemCode(item),
                  category_name: getCategoryLabel(item),
                  unit: getItemUnit(item) || "pcs",
                  batch_id: 0,
                  batch_code: "—",
                  system_qty: Number(item.qty_available ?? 0),
                },
              ];
            }

            return rows.map((batch) => ({
              item_id: Number(itemId),
              item_name: getItemName(item),
              item_code: getItemCode(item),
              category_name: getCategoryLabel(item),
              unit: batch.unit || getItemUnit(item),
              batch_id: Number(batch.id),
              batch_code: batch.batch_code || batch.batch_number || "Batch",
              system_qty: Number(batch.qty_remaining ?? batch.available_quantity ?? 0),
            }));
          } catch (err) {
            console.error(err);
            return [
              {
                item_id: Number(itemId),
                item_name: getItemName(item),
                item_code: getItemCode(item),
                category_name: getCategoryLabel(item),
                unit: getItemUnit(item) || "pcs",
                batch_id: 0,
                batch_code: "—",
                system_qty: Number(item.qty_available ?? 0),
              },
            ];
          }
        })
      );

      const flatRows = batchResults
        .flat()
        .sort((a, b) => String(a.item_name).localeCompare(String(b.item_name)));

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

  const loadSessions = () => {
    const saved = window.localStorage.getItem("fw_physical_count_sessions");
    if (saved) {
      setLocalSessions(JSON.parse(saved));
    } else {
      setLocalSessions([]);
    }
  };

  useEffect(() => {
    loadPage();
    loadSessions();
  }, []);

  const categories = useMemo(() => {
    const values = Array.from(new Set(batchRows.map((row) => row.category_name).filter(Boolean)));
    return ["All", ...values];
  }, [batchRows]);

  const recentCounts = useMemo(() => {
    return [...localSessions, ...MOCK_RECENT_COUNTS];
  }, [localSessions]);

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

      const reason = saved.reason || "";

      return {
        ...row,
        progressKey: key,
        actualQty,
        variance,
        reason,
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
        [row.item_name, row.item_code, row.category_name].filter(Boolean).join(" ").toLowerCase().includes(q);

      return matchCategory && matchSearch;
    });
  }, [rows, search, categoryFilter]);

  const lastCountDate = formatDate("2026-06-15");
  const activeVariancesCount = rows.filter((r) => r.variance !== null && r.variance !== 0).length;

  const handleActualChange = (progressKey, value) => {
    if (value === "") {
      setProgress((prev) => ({
        ...prev,
        [progressKey]: {
          ...prev[progressKey],
          actual_qty: "",
          done: prev[progressKey]?.done || false,
        },
      }));
      return;
    }

    const parsed = parseInt(value, 10);
    const num = isNaN(parsed) ? 0 : Math.max(0, parsed);

    setProgress((prev) => ({
      ...prev,
      [progressKey]: {
        ...prev[progressKey],
        actual_qty: num,
        done: prev[progressKey]?.done || false,
      },
    }));
  };

  const handleReasonChange = (progressKey, value) => {
    setProgress((prev) => ({
      ...prev,
      [progressKey]: {
        ...prev[progressKey],
        reason: value,
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
        reason: prev[progressKey]?.reason ?? "",
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

  const handleFinishCount = () => {
    const doneRows = rows.filter((row) => row.done);

    if (!doneRows.length) {
      toast.error("Mark at least one row as completed before finishing");
      return;
    }

    const validRows = doneRows.filter(
      (row) => row.actualQty !== "" && !Number.isNaN(Number(row.actualQty))
    );

    if (!validRows.length) {
      toast.error("Enter counted quantities for completed rows");
      return;
    }

    const hasDifferences = validRows.some((row) => Number(row.actualQty) !== Number(row.system_qty || 0));

    if (hasDifferences) {
      setShowConfirmModal(true);
    } else {
      executeFinishCount();
    }
  };

  const executeFinishCount = async () => {
    const doneRows = rows.filter((row) => row.done);
    const validRows = doneRows.filter(
      (row) => row.actualQty !== "" && !Number.isNaN(Number(row.actualQty))
    );

    try {
      setFinishing(true);

      const itemsWithVariances = validRows.filter(
        (row) => Number(row.actualQty) !== Number(row.system_qty || 0)
      );

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
          reason: row.reason || "Counting error",
          authorized_by: "Manager (Priya Mendis)",
          notes: `Physical stock count auto-adjustment for ${row.item_name}. System showed ${formatQty(
            systemQty
          )}${row.unit ? ` ${row.unit}` : ""}. Reason: ${row.reason || "Counting error"}.`,
        });
      }

      const newSession = {
        id: Date.now(),
        auditDate: new Date().toISOString().split("T")[0],
        performedBy: "Manager (Priya Mendis)",
        materialsCounted: validRows.length,
        variances: itemsWithVariances.length,
        status: itemsWithVariances.length > 0 ? "Pending Approval" : "Completed",
        items: validRows.map((row) => {
          const diff = Number(row.actualQty) - Number(row.system_qty || 0);
          let status = "Match";
          if (diff < 0) status = "Shortage";
          if (diff > 0) status = "Excess";

          return {
            name: row.item_name,
            category: row.category_name,
            systemQty: Number(row.system_qty || 0),
            countedQty: Number(row.actualQty),
            diff,
            status,
            reason: row.reason || (diff !== 0 ? "Counting error" : ""),
          };
        }),
      };

      const savedSessions = window.localStorage.getItem("fw_physical_count_sessions");
      const sessions = savedSessions ? JSON.parse(savedSessions) : [];
      sessions.unshift(newSession);
      window.localStorage.setItem("fw_physical_count_sessions", JSON.stringify(sessions));
      loadSessions();

      window.localStorage.removeItem(STORAGE_KEY);
      setProgress({});

      if (itemsWithVariances.length > 0) {
        toast.success("Physical stock count submitted for Manager approval");
      } else {
        toast.success("Physical stock count completed successfully.");
      }

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
        <span>🏬</span>
        <div>
          Perform scheduled warehouse audits for packaging materials. Any quantity differences found
          during counting will automatically generate a Stock Adjustment request for manager approval.
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
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--g900)" }}>{lastCountDate}</div>
            <div style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600 }}>Last Stock Audit</div>
          </div>
        </div>

        <div style={summaryCardStyle("var(--i)")}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g900)" }}>{filteredRows.length}</div>
            <div style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600 }}>Materials To Verify</div>
          </div>
        </div>

        <div style={summaryCardStyle("var(--g500)")}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g900)" }}>
              {activeVariancesCount || 2}
            </div>
            <div style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600 }}>Variances Found</div>
          </div>
        </div>

        <div style={summaryCardStyle("var(--g500)")}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--g900)" }}>1</div>
            <div style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600 }}>Pending Approval</div>
          </div>
        </div>
      </div>

      <div className="fb" style={{ marginBottom: 12, gap: 12 }}>
        <div className="sw" style={{ maxWidth: 300 }}>
          <input
            className="si"
            placeholder="Search material..."
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

      <div className="tw" style={{ minHeight: "360px" }}>
        <div className="tw-h">
          <h3>Record Physical Stock Levels</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>MATERIAL</th>
              <th>CATEGORY</th>
              <th>WAREHOUSE LOCATION</th>
              <th>SYSTEM QUANTITY</th>
              <th>COUNTED QUANTITY</th>
              <th>DIFFERENCE</th>
              <th>STATUS</th>
              <th>REASON</th>
              <th>COMPLETED</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => {
                const diff = row.variance;
                const statusBadge = getDifferenceStatus(diff);

                return (
                  <tr key={row.progressKey}>
                    <td style={{ fontWeight: 700, color: "var(--g900)" }}>{row.item_name}</td>

                    <td>{row.category_name}</td>

                    <td style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600 }}>
                      {getWarehouseLocation(row.item_id)}
                    </td>

                    <td>
                      {formatQty(row.system_qty)}
                      {row.unit ? ` ${row.unit}` : ""}
                    </td>

                    <td>
                      <input
                        className="fc"
                        type="number"
                        step="1"
                        min="0"
                        placeholder="Qty"
                        value={row.actualQty}
                        onChange={(e) => handleActualChange(row.progressKey, e.target.value)}
                        style={{ maxWidth: 100, height: 32 }}
                      />
                    </td>

                    <td
                      style={{
                        fontWeight: 700,
                        color:
                          diff === null
                            ? "var(--text3)"
                            : diff > 0
                            ? "var(--s)"
                            : diff < 0
                            ? "var(--d)"
                            : "var(--text2)",
                      }}
                    >
                      {diff === null ? "—" : diff > 0 ? `+${formatQty(diff)}` : formatQty(diff)}
                      {diff !== null && row.unit ? ` ${row.unit}` : ""}
                    </td>

                    <td>
                      {statusBadge ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>
                      {diff !== null && diff !== 0 ? (
                        <select
                          className="fc"
                          value={row.reason}
                          onChange={(e) => handleReasonChange(row.progressKey, e.target.value)}
                          style={{ height: 32, fontSize: 12, padding: "2px 6px", minWidth: 140 }}
                        >
                          <option value="">Select Reason</option>
                          <option value="Damaged">Damaged</option>
                          <option value="Used but not recorded">Used but not recorded</option>
                          <option value="Counting error">Counting error</option>
                          <option value="Supplier replacement">Supplier replacement</option>
                          <option value="Missing">Missing</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        "—"
                      )}
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
                );
              })
            ) : (
              <tr>
                <td colSpan="9">No packaging materials found</td>
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
            {savingProgress ? "Saving..." : "Save Draft"}
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

      <div className="tw" style={{ marginTop: 24 }}>
        <div className="tw-h">
          <h3>Recent Physical Counts</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>AUDIT DATE</th>
              <th>PERFORMED BY</th>
              <th>MATERIALS COUNTED</th>
              <th>VARIANCES</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {recentCounts.map((cnt) => (
              <tr key={cnt.id}>
                <td style={{ fontWeight: 600 }}>{formatDate(cnt.auditDate)}</td>
                <td>{cnt.performedBy}</td>
                <td>{cnt.materialsCounted}</td>
                <td>
                  <span
                    style={{
                      fontWeight: 600,
                      color: cnt.variances > 0 ? "var(--d)" : "var(--g900)",
                    }}
                  >
                    {cnt.variances}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: 6,
                      background:
                        cnt.status === "Completed" || cnt.status === "Approved"
                          ? "#ECFDF5"
                          : cnt.status === "Pending Approval"
                          ? "#FEF3C7"
                          : "#FEF2F2",
                      color:
                        cnt.status === "Completed" || cnt.status === "Approved"
                          ? "#10B981"
                          : cnt.status === "Pending Approval"
                          ? "#D97706"
                          : "#EF4444",
                    }}
                  >
                    {cnt.status}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-s btn-xs"
                    onClick={() => {
                      setSelectedSession(cnt);
                      setShowDetailModal(true);
                    }}
                  >
                    View Log
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="md" style={{ maxWidth: 480, width: "92%" }}>
            <div className="md-h">
              <h3>⚠️ Confirm Inventory Variances</h3>
            </div>
            <div className="md-b">
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
                This count contains inventory variances.
              </p>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5, marginTop: 8 }}>
                Submitting this count will automatically create Stock Adjustment requests that require
                Manager approval.
              </p>
            </div>
            <div className="md-f">
              <button type="button" className="btn btn-s" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-p"
                style={{ background: "#EF4444", borderColor: "#EF4444" }}
                onClick={() => {
                  setShowConfirmModal(false);
                  executeFinishCount();
                }}
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedSession && (
        <div className="modal-backdrop">
          <div className="md" style={{ maxWidth: 750, width: "95%" }}>
            <div className="md-h">
              <h3>📋 Physical Count Session Detail</h3>
              <button
                type="button"
                className="btn btn-s btn-sm"
                onClick={() => setShowDetailModal(false)}
                style={{ fontSize: 13, padding: "4px 8px" }}
              >
                ✕ Close
              </button>
            </div>
            <div className="md-b">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>Audit Date</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--g900)", marginTop: 2 }}>
                    {formatDate(selectedSession.auditDate)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>Performed By</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--g900)", marginTop: 2 }}>
                    {selectedSession.performedBy}
                  </div>
                </div>
              </div>

              <div className="tw" style={{ minHeight: "auto", border: "1.5px solid var(--border)", borderRadius: 10 }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>MATERIAL</th>
                      <th>SYSTEM QUANTITY</th>
                      <th>COUNTED QUANTITY</th>
                      <th>DIFFERENCE</th>
                      <th>STATUS</th>
                      <th>REASON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSession.items || []).map((item, idx) => {
                      let diffText = "—";
                      let diffColor = "var(--text2)";
                      const dVal = Number(item.diff || 0);
                      if (dVal > 0) {
                        diffText = `+${dVal}`;
                        diffColor = "var(--s)";
                      } else if (dVal < 0) {
                        diffText = `${dVal}`;
                        diffColor = "var(--d)";
                      }

                      let badgeBg = "#ECFDF5";
                      let badgeColor = "#10B981";
                      if (item.status === "Shortage") {
                        badgeBg = "#FEF3C7";
                        badgeColor = "#D97706";
                      } else if (item.status === "Excess") {
                        badgeBg = "#EFF6FF";
                        badgeColor = "#2563EB";
                      }

                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, color: "var(--g900)" }}>{item.name}</td>
                          <td>{item.systemQty}</td>
                          <td>{item.countedQty}</td>
                          <td style={{ fontWeight: 700, color: diffColor }}>{diffText}</td>
                          <td>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "4px 8px",
                                borderRadius: 6,
                                background: badgeBg,
                                color: badgeColor,
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td>{item.reason || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md-f">
              <button
                type="button"
                className="btn btn-p"
                style={{ background: PRIMARY_GREEN, borderColor: PRIMARY_GREEN }}
                onClick={() => setShowDetailModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhysicalStockCountPage;