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
    color: hovered ? "#FFFFFF" : isDanger ? RED : "var(--g800)",
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

  return {
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
  };
};

const summaryCardStyle = {
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 22,
  boxShadow: "0 2px 8px rgba(10,40,24,.03)",
  position: "relative",
  overflow: "hidden",
};

const summaryAccentStyle = (color) => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: 4,
  background: color,
});

const ExpiryItemsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
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
      (a, b) => Number(a.days_left ?? 999) - Number(b.days_left ?? 999)
    );
  }, [rows]);

  const summary = useMemo(() => {
    const total = allRows.length;
    const critical = allRows.filter((row) => Number(row.days_left ?? 0) <= 3).length;
    const warning = allRows.filter((row) => {
      const days = Number(row.days_left ?? 0);
      return days > 3 && days <= 7;
    }).length;
    const safe = allRows.filter((row) => Number(row.days_left ?? 0) > 7).length;

    return { total, critical, warning, safe };
  }, [allRows]);

  const filteredRows = useMemo(() => {
    let result = [...allRows];

    if (tab === "Critical") {
      result = result.filter((row) => Number(row.days_left ?? 0) <= 3);
    } else if (tab === "Warning") {
      result = result.filter((row) => {
        const days = Number(row.days_left ?? 0);
        return days > 3 && days <= 7;
      });
    } else if (tab === "Safe") {
      result = result.filter((row) => Number(row.days_left ?? 0) > 7);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((row) =>
        [
          row.batch_code,
          row.batch_number,
          row.item_name,
          row.name,
          row.item_code,
          row.code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return result;
  }, [allRows, tab, search]);

  const bannerText =
    summary.critical > 0
      ? `${summary.critical} batches are expiring within 3 days. FEFO applies — dispatch older batches before newer stock.`
      : "No critical expiry batches within 3 days. FEFO still applies across all dispatches.";

  const getPriorityLabel = (index) => {
    if (index === 0) return "#1 Use Now";
    if (index === 1) return "#2 Use Next";
    return `#${index + 1}`;
  };

  const getItemName = (row) => row.item_name || row.name || "—";
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
        className={summary.critical > 0 ? "ib ib-d" : "ib ib-s"}
        style={{
          marginBottom: 16,
          alignItems: "center",
          fontSize: 14,
          lineHeight: 1.45,
        }}
      >
        <div>{bannerText}</div>
      </div>

      <div
        className="cg"
        style={{
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div style={summaryCardStyle}>
          <div style={{ color: "#9AA2B0", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
            TOTAL BATCHES
          </div>
          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: "var(--g900)" }}>
            {summary.total}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              color: "var(--text3)",
            }}
          >
            Expiring within 14 days
          </div>
          <div style={summaryAccentStyle("#2FA34A")} />
        </div>

        <div style={summaryCardStyle}>
          <div style={{ color: "#9AA2B0", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
            CRITICAL
          </div>
          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: "#9B3224" }}>
            {summary.critical}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              color: "var(--text3)",
            }}
          >
            3 days or less
          </div>
          <div style={summaryAccentStyle("#D84D32")} />
        </div>

        <div style={summaryCardStyle}>
          <div style={{ color: "#9AA2B0", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
            WARNING
          </div>
          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: "#A35F00" }}>
            {summary.warning}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              color: "var(--text3)",
            }}
          >
            4 to 7 days left
          </div>
          <div style={summaryAccentStyle("#E29B2D")} />
        </div>

        <div style={summaryCardStyle}>
          <div style={{ color: "#9AA2B0", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
            SAFE
          </div>
          <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: "var(--g900)" }}>
            {summary.safe}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              color: "var(--text3)",
            }}
          >
            More than 7 days
          </div>
          <div style={summaryAccentStyle("#2F69C8")} />
        </div>
      </div>

      <div className="fb" style={{ gap: 12, marginBottom: 14, alignItems: "stretch", flexWrap: "wrap" }}>
        <div className="sw" style={{ minWidth: 320 }}>
          <input
            className="si"
            placeholder="Search by item name or batch code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            style={getTabButtonStyle(tab === "All", hoveredTab === "All")}
            onClick={() => setTab("All")}
            onMouseEnter={() => setHoveredTab("All")}
            onMouseLeave={() => setHoveredTab("")}
          >
            All
          </button>

          <button
            type="button"
            style={getTabButtonStyle(tab === "Critical", hoveredTab === "Critical")}
            onClick={() => setTab("Critical")}
            onMouseEnter={() => setHoveredTab("Critical")}
            onMouseLeave={() => setHoveredTab("")}
          >
            Critical
          </button>

          <button
            type="button"
            style={getTabButtonStyle(tab === "Warning", hoveredTab === "Warning")}
            onClick={() => setTab("Warning")}
            onMouseEnter={() => setHoveredTab("Warning")}
            onMouseLeave={() => setHoveredTab("")}
          >
            Warning
          </button>

          <button
            type="button"
            style={getTabButtonStyle(tab === "Safe", hoveredTab === "Safe")}
            onClick={() => setTab("Safe")}
            onMouseEnter={() => setHoveredTab("Safe")}
            onMouseLeave={() => setHoveredTab("")}
          >
            Safe
          </button>
        </div>
      </div>

      <div className="tw">
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
                const days = Number(row.days_left ?? 0);
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

                    <td style={{ fontWeight: 700, fontSize: 13 }}>{getItemName(row)}</td>

                    <td style={{ fontSize: 12 }}>
                      {getQty(row)} {getUnit(row)}
                    </td>

                    <td style={{ fontSize: 11 }}>{formatDate(row.received_date)}</td>

                    <td style={{ fontSize: 11 }}>{formatDate(row.expiry_date)}</td>

                    <td>
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: dayColor(days),
                        }}
                      >
                        {days}d
                      </span>
                    </td>

                    <td>
                      <span style={priorityBadgeStyle(days, getPriorityLabel(index))}>
                        {getPriorityLabel(index)}
                      </span>
                    </td>

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
                          onClick={() =>
                            navigate(`/dispatch/local?itemId=${row.item_id}&batchId=${row.id}`)
                          }
                        >
                          Dispatch
                        </button>

                        {isCritical ? (
                          <button
                            type="button"
                            style={getCompactActionStyle(hoveredAction === wasteKey, "danger")}
                            onMouseEnter={() => setHoveredAction(wasteKey)}
                            onMouseLeave={() => setHoveredAction("")}
                            onClick={() =>
                              navigate(`/wastage/add?itemId=${row.item_id}&batchId=${row.id}`)
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