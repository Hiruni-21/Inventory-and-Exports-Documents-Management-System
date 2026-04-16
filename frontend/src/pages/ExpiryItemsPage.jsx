import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const GREEN = "#166534";
const GREEN_HOVER = "#14532D";
const RED = "#C84E35";
const RED_HOVER = "#B9381F";


const getTabButtonStyle = (active, hovered) => ({
  height: 34,
  padding: "0 14px",
  borderRadius: 12,
  border: `1px solid ${active || hovered ? GREEN : "#CFE2D4"}`,
  background: active ? GREEN : hovered ? "#F4FBF6" : "#FFFFFF",
  color: active ? "#FFFFFF" : hovered ? GREEN : "var(--g800)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  transition: "all 0.18s ease",
  outline: "none",
  boxShadow: "none",
});

const getCompactActionStyle = (hovered, variant = "default") => {
  const isDanger = variant === "danger";

  return {
    height: 30,
    padding: "0 10px",
    borderRadius: 999,
    border: `1px solid ${
      hovered
        ? isDanger
          ? RED_HOVER
          : GREEN_HOVER
        : isDanger
        ? "#F3D4CD"
        : "#CFE2D4"
    }`,
    background: hovered
      ? isDanger
        ? RED_HOVER
        : GREEN_HOVER
      : isDanger
      ? "#FFF5F2"
      : "#FFFFFF",
    color: hovered
      ? "#FFFFFF"
      : isDanger
      ? RED
      : "var(--g800)",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    transition: "all 0.18s ease",
    outline: "none",
    boxShadow: "none",
  };
};
const priorityBadgeStyle = (days, label) => {
  let background = "#EAF7EE";
  let color = "#1F8B4C";

  if (days <= 3) {
    background = "#FBE5DF";
    color = "#D15D47";
  } else if (days <= 7) {
    background = "#FBEED7";
    color = "#D48A1B";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 10px",
        borderRadius: 999,
        background,
        color,
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
};

const ExpiryItemsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");

  const [hoveredTab, setHoveredTab] = useState("");
  const [hoveredAction, setHoveredAction] = useState("");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory/expiry", { params: { days: 14 } });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("EXPIRY LOAD ERROR:", err?.response?.data || err);
      toast.error("Failed to load expiry items");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const allRows = useMemo(() => {
    return [...rows].sort(
      (a, b) => Number(a.days_left || 999) - Number(b.days_left || 999)
    );
  }, [rows]);

  const criticalCount = useMemo(
    () => allRows.filter((row) => Number(row.days_left || 0) <= 3).length,
    [allRows]
  );

  const filteredRows = useMemo(() => {
    if (tab === "Critical") {
      return allRows.filter((row) => Number(row.days_left || 0) <= 3);
    }

    if (tab === "Warning") {
      return allRows.filter((row) => {
        const days = Number(row.days_left || 0);
        return days > 3 && days <= 7;
      });
    }

    if (tab === "Safe") {
      return allRows.filter((row) => Number(row.days_left || 0) > 7);
    }

    return allRows;
  }, [allRows, tab]);

  const bannerText =
    criticalCount > 0
      ? `${criticalCount} batches expiring within 3 days. FEFO — these must be dispatched before any newer stock. Every dispatch and export shipment automatically picks the nearest-expiry batch first.`
      : "No critical batches within 3 days. FEFO still applies — dispatch older batches before newer stock.";

  const getPriorityLabel = (index) => {
    if (index === 0) return "#1 Use Now";
    if (index === 1) return "#2 Use Next";
    return `#${index + 1}`;
  };

  const getItemName = (row) => row.name || row.item_name || "—";
  const getBatchCode = (row) => row.batch_code || row.batch_number || "—";
  const getQty = (row) =>
    row.qty_remaining ?? row.available_quantity ?? row.quantity ?? 0;
  const getUnit = (row) => row.unit || "kg";

  const formatDate = (value) => {
    if (!value) return "—";
    return String(value).slice(0, 10);
  };

  const dayColor = (days) => {
    if (days <= 3) return "#D15D47";
    if (days <= 7) return "#D48A1B";
    return "#1F8B4C";
  };

  return (
    <>
      <div
        className="ib ib-d"
        style={{
          marginBottom: 16,
          alignItems: "center",
          fontSize: 14,
          lineHeight: 1.45,
        }}
      >
        <span>⏱</span>
        <div>{bannerText}</div>
      </div>

      <div
        className="fb"
        style={{
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          style={getTabButtonStyle(tab === "All", hoveredTab === "All")}
          onClick={() => setTab("All")}
          onMouseEnter={() => setHoveredTab("All")}
          onMouseLeave={() => setHoveredTab("")}
          onFocus={() => setHoveredTab("All")}
          onBlur={() => setHoveredTab("")}
        >
          All Batches
        </button>

        <button
          type="button"
          style={getTabButtonStyle(tab === "Critical", hoveredTab === "Critical")}
          onClick={() => setTab("Critical")}
          onMouseEnter={() => setHoveredTab("Critical")}
          onMouseLeave={() => setHoveredTab("")}
          onFocus={() => setHoveredTab("Critical")}
          onBlur={() => setHoveredTab("")}
        >
          🔴 Critical (≤3d)
        </button>

        <button
          type="button"
          style={getTabButtonStyle(tab === "Warning", hoveredTab === "Warning")}
          onClick={() => setTab("Warning")}
          onMouseEnter={() => setHoveredTab("Warning")}
          onMouseLeave={() => setHoveredTab("")}
          onFocus={() => setHoveredTab("Warning")}
          onBlur={() => setHoveredTab("")}
        >
          🟡 Warning (≤7d)
        </button>

        <button
          type="button"
          style={getTabButtonStyle(tab === "Safe", hoveredTab === "Safe")}
          onClick={() => setTab("Safe")}
          onMouseEnter={() => setHoveredTab("Safe")}
          onMouseLeave={() => setHoveredTab("")}
          onFocus={() => setHoveredTab("Safe")}
          onBlur={() => setHoveredTab("")}
        >
          ✅ Safe
        </button>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Expiry Items — All Active Batches</h3>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>
            FEFO applied to all dispatches automatically
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>BATCH NO.</th>
              <th>ITEM</th>
              <th>QTY IN STOCK</th>
              <th>RECEIVED</th>
              <th>EXPIRY DATE</th>
              <th>DAYS LEFT</th>
              <th>FEFO PRIORITY</th>
              <th style={{ minWidth: 180 }}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row, index) => {
                const days = Number(row.days_left || 0);
                const isCritical = days <= 3;
                const dispatchKey = `dispatch-${row.id}`;
                const wasteKey = `waste-${row.id}`;

                return (
                  <tr key={row.id}>
                    <td
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--g800)",
                      }}
                    >
                      {getBatchCode(row)}
                    </td>

                    <td style={{ fontWeight: 700 }}>{getItemName(row)}</td>

                    <td>
                      {getQty(row)} {getUnit(row)}
                    </td>

                    <td style={{ fontSize: 11 }}>{formatDate(row.received_date)}</td>

                    <td style={{ fontSize: 11 }}>{formatDate(row.expiry_date)}</td>

                    <td>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: dayColor(days),
                        }}
                      >
                        {days}d
                      </span>
                    </td>

                    <td>{priorityBadgeStyle(days, getPriorityLabel(index))}</td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          style={getCompactActionStyle(hoveredAction === dispatchKey)}
                          onMouseEnter={() => setHoveredAction(dispatchKey)}
                          onMouseLeave={() => setHoveredAction("")}
                          onFocus={() => setHoveredAction(dispatchKey)}
                          onBlur={() => setHoveredAction("")}
                          onClick={() =>
                            navigate(
                              `/dispatch/local?itemId=${row.item_id}&batchId=${row.id}`
                            )
                          }
                        >
                          Dispatch
                        </button>

                        {isCritical ? (
                          <button
                            type="button"
                            style={getCompactActionStyle(
                              hoveredAction === wasteKey,
                              "danger"
                            )}
                            onMouseEnter={() => setHoveredAction(wasteKey)}
                            onMouseLeave={() => setHoveredAction("")}
                            onFocus={() => setHoveredAction(wasteKey)}
                            onBlur={() => setHoveredAction("")}
                            onClick={() =>
                              navigate(
                                `/wastage/add?itemId=${row.item_id}&batchId=${row.id}`
                              )
                            }
                          >
                            Waste
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8">No expiring batches found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ExpiryItemsPage;