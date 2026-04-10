import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const roleKey = (user) => String(user?.role || "").trim().toLowerCase();

const itemName = (row) => row.item_name || row.name || "Unnamed Item";
const itemCategory = (row) => row.category_name || row.type || "Inventory";
const itemCode = (row) => row.item_code || row.code || "";

const getLeadTime = (row) => {
  const name = itemName(row).toLowerCase();
  const category = String(itemCategory(row)).toLowerCase();

  if (name.includes("cardboard box")) return "14 days";
  if (name.includes("thermocol")) return "10 days";
  if (name.includes("regiform")) return "7 days";
  if (name.includes("microgreens")) return "4 days";
  if (name.includes("edible flowers")) return "5 days";
  if (category.includes("packaging")) return "7 days";
  return "3 days";
};

const getNote = (row) => {
  const name = itemName(row).toLowerCase();
  const category = String(itemCategory(row)).toLowerCase();

  if (name.includes("cardboard box")) return "Order NOW — 14-day lead time";
  if (name.includes("microgreens")) return "Critical for export orders this week";
  if (name.includes("edible flowers")) return "Only limited packs remaining";
  if (name.includes("thermocol")) return "Export shipments need these";
  if (name.includes("regiform")) return "Getting close to reorder level";
  if (category.includes("packaging")) return "Packaging item below reorder level";
  return "Slightly below reorder — monitor";
};

const getUrgency = (row) => {
  const qty = Number(row.qty_available || 0);
  const reorder = Number(row.reorder_level || 0);
  const name = itemName(row).toLowerCase();

  if (
    name.includes("cardboard box") ||
    name.includes("microgreens") ||
    name.includes("edible flowers") ||
    name.includes("thermocol")
  ) {
    return "critical";
  }

  if (qty <= 0) return "critical";
  if (reorder > 0 && qty / reorder <= 0.6) return "critical";
  return "low";
};

const StatusPill = ({ type }) => {
  const critical = type === "critical";

  const lowStockActionBtnStyle = {
  height: "30px",
  padding: "0 14px",
  border: "none",
  borderRadius: "10px",
  background: "var(--g800)",
  color: "var(--white)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "none",
};

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        background: critical ? "var(--d100)" : "var(--w100)",
        color: critical ? "var(--d)" : "var(--w)",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: critical ? "var(--d)" : "var(--a500)",
          flexShrink: 0,
        }}
      />
      {critical ? "Critical" : "Low"}
    </span>
  );
};

const LowStockPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSupervisor = roleKey(user).includes("supervisor");

  useEffect(() => {
    const loadRows = async () => {
      try {
        setLoading(true);
        const res = await api.get("/inventory/low-stock");
        setRows(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || "Failed to load low stock items");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, [toast]);

  const preparedRows = useMemo(() => {
    return rows
      .map((row) => {
        const qty = Number(row.qty_available || 0);
        const reorder = Number(row.reorder_level || 0);
        const shortage = Math.max(0, Number(row.shortage || 0));
        const fill = reorder > 0 ? Math.min(Math.round((qty / reorder) * 100), 100) : 0;
        const urgency = getUrgency(row);

        return {
          ...row,
          _name: itemName(row),
          _category: itemCategory(row),
          _code: itemCode(row),
          _qty: qty,
          _reorder: reorder,
          _shortage: shortage,
          _fill: fill,
          _leadTime: getLeadTime(row),
          _note: getNote(row),
          _urgency: urgency,
        };
      })
      .sort((a, b) => {
        if (a._urgency !== b._urgency) {
          return a._urgency === "critical" ? -1 : 1;
        }
        return b._shortage - a._shortage;
      });
  }, [rows]);

  const criticalCount = preparedRows.filter((row) => row._urgency === "critical").length;

  const handleCreatePO = (row) => {
    if (isSupervisor) {
      toast.success(`Kamal notified for ${row._name}`);
      return;
    }

    navigate("/purchase-orders/add");
  };

  return (
    <div>
      {isSupervisor ? (
        <div className="ib ib-w">
          <span>📢</span>
          <div>
            <strong>You cannot create POs.</strong> Use the <em>Notify Kamal</em> button below for
            each item that needs ordering. Kamal (Ops Executive) will receive the notification and
            create the PO.
          </div>
        </div>
      ) : (
        <div className="ib ib-d">
          <span>⚠️</span>
          <div>
            <strong>{criticalCount || preparedRows.length} items below reorder level.</strong>{" "}
            Create Purchase Orders immediately. Cardboard boxes have a 14-day lead time — order
            today.
          </div>
        </div>
      )}

      <div className="tw">
        <div className="tw-h">
          <h3>Items Below Reorder Level</h3>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>Sorted by urgency</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th>CURRENT STOCK</th>
              <th>REORDER LEVEL</th>
              <th>SHORTFALL</th>
              <th>LEAD TIME</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">Loading...</td>
              </tr>
            ) : preparedRows.length > 0 ? (
              preparedRows.map((row) => (
                <tr key={row.item_id || row.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--g900)" }}>{row._name}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                      {row._category} · {row._note}
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: row._urgency === "critical" ? "var(--d)" : "var(--w)",
                          minWidth: 28,
                        }}
                      >
                        {row._qty}
                      </span>

                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: "var(--border)",
                          borderRadius: 3,
                          overflow: "hidden",
                          minWidth: 60,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: row._urgency === "critical" ? "var(--d)" : "var(--a500)",
                            width: `${row._fill}%`,
                          }}
                        />
                      </div>

                      <span style={{ fontSize: 11, color: "var(--text3)", minWidth: 36 }}>
                        {row._fill}%
                      </span>
                    </div>
                  </td>

                  <td style={{ fontWeight: 700, color: "var(--g900)" }}>
                    {row._reorder} {row.unit || ""}
                  </td>

                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--d)" }}>
                      Need {row._shortage} more
                    </span>
                  </td>

                  <td style={{ fontSize: 11 }}>{row._leadTime}</td>

                  <td>
                    <StatusPill type={row._urgency} />
                  </td>

                    <td>
                      {isSupervisor ? (
                        <button
                          type="button"
                          onClick={() => handleCreatePO(row)}
                          style={{
                            height: "30px",
                            padding: "0 14px",
                            border: "none",
                            borderRadius: "10px",
                            background: "var(--g800)",
                            color: "var(--white)",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: "11px",
                            fontWeight: 700,
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            boxShadow: "none",
                          }}
                        >
                          <span style={{ fontSize: "13px", fontWeight: 800, lineHeight: 1 }}>+</span>
                          <span>Notify Kamal</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCreatePO(row)}
                          style={{
                            height: "25px",
                            padding: "0 10px",
                            border: "none",
                            borderRadius: "8px",
                            background: "var(--g800)",
                            color: "var(--white)",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: "11px",
                            fontWeight: 500,
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            boxShadow: "none",
                          }}
                        >
                          <span style={{ fontSize: "13px", fontWeight: 500, lineHeight: 1 }}>+</span>
                          <span>Create PO</span>
                        </button>
                      )}
                    </td>                
                    </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No low stock items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LowStockPage;