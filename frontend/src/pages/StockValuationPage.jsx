import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const formatCompactLkr = (value) => {
  const amount = Number(value || 0);

  if (amount >= 1000000) {
    const short = amount / 1000000;
    return `LKR ${short.toFixed(short >= 10 ? 1 : 1)}M`;
  }

  if (amount >= 1000) {
    const short = amount / 1000;
    return `LKR ${short.toFixed(short >= 100 ? 0 : 0)}K`;
  }

  return `LKR ${Math.round(amount).toLocaleString("en-LK")}`;
};

const formatNumber = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const formatMoney = (value) => {
  return Math.round(Number(value || 0)).toLocaleString("en-LK");
};

const getItemName = (row) => row.item_name || row.name || "Unnamed Item";
const getUnit = (row) => row.unit || "";
const getQty = (row) =>
  Number(
    row.total_qty ??
      row.qty_available ??
      row.qty_on_hand ??
      row.available_quantity ??
      row.quantity ??
      0
  );

const getUnitCost = (row) =>
  Number(
    row.unit_cost ??
      row.avg_unit_cost ??
      row.standard_unit_cost ??
      0
  );

const getTotalValue = (row) => {
  const direct = Number(row.total_value ?? row.valuation ?? 0);
  if (!Number.isNaN(direct) && direct > 0) return direct;
  return getQty(row) * getUnitCost(row);
};

const isPackagingItem = (row) => {
  const text = `${row.category_name || ""} ${row.type || ""} ${row.item_name || row.name || ""}`.toLowerCase();
  return (
    text.includes("packaging") ||
    text.includes("box") ||
    text.includes("carton") ||
    text.includes("thermocol") ||
    text.includes("regiform")
  );
};

const isAtRiskItem = (row) => {
  const expiry = row.expiry_date || row.nearest_expiry_date;
  if (!expiry) return false;

  const expiryDate = new Date(expiry);
  if (Number.isNaN(expiryDate.getTime())) return false;

  const today = new Date();
  const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 30;
};

const kpiCardStyle = (accentColor = "transparent") => ({
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: "18px",
  padding: "18px 22px",
  minHeight: "118px",
  boxShadow: "0 2px 6px rgba(10,40,24,.03)",
  borderBottom: `4px solid ${accentColor}`,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
});

const progressTrackStyle = {
  width: 130,
  height: 6,
  background: "rgba(166,196,181,.42)",
  borderRadius: 999,
  overflow: "hidden",
};

const StockValuationPage = () => {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        let sourceRows = [];

        try {
          const valuationRes = await api.get("/inventory/valuation");
          sourceRows = Array.isArray(valuationRes.data) ? valuationRes.data : [];
        } catch (err) {
          const inventoryRes = await api.get("/inventory");
          sourceRows = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];
        }

        const normalizedRows = sourceRows
          .map((row) => {
            const qty = getQty(row);
            const unit = getUnit(row);
            const unitCost = getUnitCost(row);
            const totalValue = getTotalValue(row);

            return {
              ...row,
              item_name: getItemName(row),
              qty,
              unit,
              unit_cost: unitCost,
              total_value: totalValue,
            };
          })
          .filter((row) => row.item_name)
          .sort((a, b) => Number(b.total_value || 0) - Number(a.total_value || 0));

        setRows(normalizedRows);
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || "Failed to load stock valuation");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const summary = useMemo(() => {
    const totalStockValue = rows.reduce((sum, row) => sum + Number(row.total_value || 0), 0);

    const perishableValue = rows
      .filter((row) => !isPackagingItem(row))
      .reduce((sum, row) => sum + Number(row.total_value || 0), 0);

    const packagingValue = rows
      .filter((row) => isPackagingItem(row))
      .reduce((sum, row) => sum + Number(row.total_value || 0), 0);

    const atRiskValue = rows
      .filter((row) => isAtRiskItem(row))
      .reduce((sum, row) => sum + Number(row.total_value || 0), 0);

    return {
      totalStockValue,
      perishableValue,
      packagingValue,
      atRiskValue,
    };
  }, [rows]);

  const displayRows = useMemo(() => {
    const total = summary.totalStockValue || 1;

    return rows.map((row) => ({
      ...row,
      percentOfTotal: (Number(row.total_value || 0) / total) * 100,
    }));
  }, [rows, summary.totalStockValue]);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div style={kpiCardStyle("var(--g500)")}>
          <div style={{ fontSize: 28, lineHeight: 1 }}></div>
          <div>
            
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--g900)",
                marginBottom: 2,
              }}
            >
              {formatCompactLkr(summary.totalStockValue)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>
              Total Stock Value
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--s)" }}>
              ↑ 8% vs last month
            </div>
            
          </div>
        </div>

        <div style={kpiCardStyle("#f1e6a6")}>
          <div style={{ fontSize: 28, lineHeight: 1 }}></div>
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--g900)",
                marginBottom: 2,
              }}
            >
              {formatCompactLkr(summary.perishableValue)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>Perishable Items</div>
          </div>
        </div>

        <div style={kpiCardStyle("var(--i)")}>
          <div style={{ fontSize: 28, lineHeight: 1 }}></div>
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--g900)",
                marginBottom: 2,
              }}
            >
              {formatCompactLkr(summary.packagingValue)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>Packaging Materials</div>
          </div>
        </div>

        <div style={kpiCardStyle("var(--d)")}>
          <div style={{ fontSize: 28, lineHeight: 1 }}></div>
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--g900)",
                marginBottom: 2,
              }}
            >
              {formatCompactLkr(summary.atRiskValue)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>At-Risk (expiring)</div>
          </div>
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Stock Valuation by Item</h3>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            Based on standard unit cost
          </span>
        </div>

        <table>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>ITEM</th>
              <th>QTY</th>
              <th>UNIT</th>
              <th>UNIT COST (LKR)</th>
              <th>TOTAL VALUE (LKR)</th>
              <th>% OF TOTAL</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : displayRows.length ? (
              <>
                {displayRows.map((row) => (
                  <tr key={`${row.item_name}-${row.unit}`}>
                    <td style={{ fontWeight: 700, color: "var(--g900)" }}>{row.item_name}</td>
                    <td>{formatNumber(row.qty)}</td>
                    <td>{row.unit || "—"}</td>
                    <td>{formatMoney(row.unit_cost)}</td>
                    <td style={{ fontWeight: 800, color: "var(--g800)" }}>
                      {formatMoney(row.total_value)}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 10,
                        }}
                      >
                        <div style={progressTrackStyle}>
                          <div
                            style={{
                              width: `${Math.max(4, Math.min(100, row.percentOfTotal || 0))}%`,
                              height: "100%",
                              background: "var(--s)",
                              borderRadius: 999,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            minWidth: 32,
                            textAlign: "right",
                            fontWeight: 700,
                            color: "var(--g900)",
                          }}
                        >
                          {Math.round(row.percentOfTotal || 0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}

                <tr>
                  <td
                    colSpan="4"
                    style={{
                      background: "rgba(224,242,230,.8)",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "var(--g900)",
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      background: "rgba(224,242,230,.8)",
                      fontWeight: 800,
                      fontSize: 16,
                      color: "var(--g900)",
                    }}
                  >{`LKR ${formatMoney(summary.totalStockValue)}`}
                    
                  </td>
                  <td style={{ background: "rgba(224,242,230,.8)" }} />
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan="6">No valuation data found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default StockValuationPage;