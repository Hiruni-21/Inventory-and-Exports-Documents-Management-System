import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const formatCompactLkr = (value) => {
  const amount = Number(value || 0);

  if (amount >= 1000000) {
    return `LKR ${(amount / 1000000).toFixed(1)}M`;
  }

  if (amount >= 1000) {
    return `LKR ${Math.round(amount / 1000)}K`;
  }

  return `LKR ${Math.round(amount).toLocaleString("en-LK")}`;
};

const formatNumber = (value) => {
  const num = Number(value || 0);

  if (Number.isNaN(num)) return "0";
  if (Number.isInteger(num)) return String(num);

  return num.toFixed(2);
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  return num.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const isPackagingItem = (row) => {
  const text = `${row.category_name || ""} ${row.type || ""} ${row.item_name || ""}`.toLowerCase();

  return (
    text.includes("packaging") ||
    text.includes("box") ||
    text.includes("carton") ||
    text.includes("thermocol") ||
    text.includes("regiform") ||
    text.includes("label")
  );
};

const isAtRiskItem = (row) => {
  const expiry = row.nearest_expiry_date || row.expiry_date;
  if (!expiry) return false;

  const expiryDate = new Date(expiry);
  if (Number.isNaN(expiryDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
};

const StockValuationPage = () => {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadValuation = async () => {
      try {
        setLoading(true);

        const res = await api.get("/inventory/valuation", {
          params: { details: 1 },
        });

        const data = Array.isArray(res.data) ? res.data : [];

        const normalized = data
          .map((row) => ({
            ...row,
            item_name: row.item_name || row.name || "Unnamed Item",
            qty: Number(row.qty_available ?? row.qty_on_hand ?? row.quantity ?? 0),
            unit: row.unit || "",
            unit_cost: Number(row.unit_cost ?? row.avg_unit_cost ?? 0),
            total_value: Number(row.total_value ?? 0),
          }))
          .filter((row) => row.item_name)
          .sort((a, b) => Number(b.total_value || 0) - Number(a.total_value || 0));

        setRows(normalized);
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || "Failed to load stock valuation");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadValuation();
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
      percentOfTotal: Math.round((Number(row.total_value || 0) / total) * 100),
    }));
  }, [rows, summary.totalStockValue]);

  return (
    <>
      <div className="krow k1">
        <div className="kc g">
          <div className="kv">{formatCompactLkr(summary.totalStockValue)}</div>
          <div className="kl">Total Stock Value</div>
          <div className="kch up">↑ 8% vs last month</div>
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Stock Valuation by Item</h3>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>Based on standard unit cost</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Unit Cost (LKR)</th>
              <th>Total Value (LKR)</th>
              <th>% of Total</th>
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
                  <tr key={row.item_id || row.item_name}>
                    <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                    <td>{formatNumber(row.qty)}</td>
                    <td>{row.unit || "—"}</td>
                    <td>{formatMoney(row.unit_cost)}</td>
                    <td style={{ fontWeight: 700, color: "var(--g800)" }}>{formatMoney(row.total_value)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            background: "var(--border)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              background: "var(--g400)",
                              width: `${Math.max(4, Math.min(100, row.percentOfTotal || 0))}%`,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, width: 28 }}>
                          {row.percentOfTotal}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}

                <tr style={{ background: "var(--g100)" }}>
                  <td colSpan="4" style={{ fontWeight: 700, fontSize: 13, textAlign: "right" }}>
                    Total
                  </td>
                  <td colSpan="2" style={{ fontWeight: 800, fontSize: 16, color: "var(--g800)" }}>
                    {`LKR ${formatMoney(summary.totalStockValue)}`}
                  </td>
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