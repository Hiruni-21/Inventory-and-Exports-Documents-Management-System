import { useEffect, useMemo, useState } from "react";
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
  const qty = Number(
    row.current_stock ?? row.qty_on_hand ?? row.qty_available ?? 0
  );
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

const primaryGreenBtnBase = {
  border: "1px solid #166534",
  background: "#166534",
  color: "#FFFFFF",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 800,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "none",
};

const lowStockActionBtnStyle = {
  ...primaryGreenBtnBase,
  height: "34px",
  padding: "0 16px",
  borderRadius: "14px",
  fontSize: "12px",
  gap: "6px",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,40,24,.48)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  zIndex: 500,
};

const modalCardStyle = {
  width: "100%",
  maxWidth: "920px",
  maxHeight: "92vh",
  background: "var(--white)",
  borderRadius: "16px",
  boxShadow: "0 16px 48px rgba(10,40,24,.22),0 4px 12px rgba(10,40,24,.1)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const modalHeaderStyle = {
  padding: "20px 24px 16px",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const modalBodyStyle = {
  padding: "20px 24px",
  overflowY: "auto",
  flex: 1,
};

const modalFooterStyle = {
  padding: "14px 24px",
  borderTop: "1px solid var(--border)",
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
};

const labelStyle = {
  display: "block",
  fontSize: "10px",
  fontWeight: 700,
  color: "var(--text2)",
  textTransform: "uppercase",
  letterSpacing: ".07em",
  marginBottom: "5px",
};

const fieldStyle = {
  width: "100%",
  height: "40px",
  padding: "0 12px",
  border: "1.5px solid var(--border)",
  borderRadius: "9px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "13px",
  color: "var(--text)",
  background: "var(--white)",
  outline: "none",
};

const textareaStyle = {
  ...fieldStyle,
  height: "80px",
  padding: "10px 12px",
  resize: "vertical",
};

const grid2Style = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginBottom: "14px",
};

const grid3Style = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "14px",
  marginBottom: "14px",
};

const stepWrapStyle = {
  display: "flex",
  alignItems: "center",
  marginBottom: "22px",
};

const sectionTitleStyle = {
  fontSize: "10px",
  fontWeight: 700,
  color: "var(--g700)",
  textTransform: "uppercase",
  letterSpacing: ".08em",
  margin: "14px 0 10px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const infoBoxStyle = {
  marginTop: "14px",
  padding: "12px 16px",
  background: "var(--i100)",
  borderRadius: "10px",
  border: "1px solid rgba(47,105,200,.2)",
  color: "var(--i)",
  fontSize: "12px",
  lineHeight: 1.6,
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
};

const footerBtnSecondary = {
  height: "38px",
  padding: "0 16px",
  borderRadius: "14px",
  border: "1.5px solid var(--border)",
  background: "var(--white)",
  color: "var(--g700)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};

const footerBtnPrimary = {
  ...primaryGreenBtnBase,
  height: "38px",
  padding: "0 18px",
  borderRadius: "14px",
  fontSize: "12px",
};

const priorityBtn = (active) => ({
  flex: 1,
  height: "38px",
  borderRadius: "9px",
  border: active ? "1.5px solid var(--g500)" : "1.5px solid var(--border)",
  background: active ? "var(--g100)" : "var(--white)",
  color: active ? "var(--g700)" : "var(--text2)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
});

const generatePONumber = () => {
  const suffix = String(Date.now()).slice(-3);
  return `PO-${new Date().getFullYear()}-${suffix}`;
};

const getInitialPOForm = (row) => ({
  po_number: generatePONumber(),
  supplier: "Mahinda Organic Farm",
  required_by: "",
  payment_terms: "Immediate cash",
  priority: "normal",
  instructions_to_supplier: "",
  internal_notes: "",
  line_items: [
    {
      item_name: itemName(row),
      quantity: Math.max(1, Number(row._shortage || row.shortage || 1)),
      unit: row.unit || "kg",
      price: Number(row.unit_cost || row.avg_unit_cost || 850),
    },
  ],
});

const StatusPill = ({ type }) => {
  const critical = type === "critical";

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
  const toast = useToast();
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPOModal, setShowPOModal] = useState(false);
  const [poForm, setPoForm] = useState(null);

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
        const qty = Number(
          row.current_stock ?? row.qty_on_hand ?? row.qty_available ?? 0
        );
        const reorder = Number(row.reorder_level || 0);
        const shortage = Math.max(0, Number(row.shortage || 0));
        const fill =
          reorder > 0 ? Math.min(Math.round((qty / reorder) * 100), 100) : 0;
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

  const bannerText = useMemo(() => {
    if (!preparedRows.length) {
      return "No items are currently below reorder level.";
    }

    const hasCardboardBox = preparedRows.some((row) =>
      row._name.toLowerCase().includes("cardboard box")
    );

    if (hasCardboardBox) {
      return `${preparedRows.length} items below reorder level. Create Purchase Orders immediately. Cardboard boxes have a 14-day lead time — order today.`;
    }

    return `${preparedRows.length} items below reorder level. Create Purchase Orders immediately.`;
  }, [preparedRows]);

  const openCreatePOModal = (row) => {
    setPoForm(getInitialPOForm(row));
    setShowPOModal(true);
  };

  const closeCreatePOModal = () => {
    setShowPOModal(false);
    setPoForm(null);
  };

  const handleCreatePO = (row) => {
    if (isSupervisor) {
      toast.success(`Kamal notified for ${row._name}`);
      return;
    }

    openCreatePOModal(row);
  };

  const handlePOChange = (field, value) => {
    setPoForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLineChange = (index, field, value) => {
    setPoForm((prev) => ({
      ...prev,
      line_items: prev.line_items.map((line, i) =>
        i === index
          ? {
              ...line,
              [field]:
                field === "quantity" || field === "price"
                  ? Number(value || 0)
                  : value,
            }
          : line
      ),
    }));
  };

  const addLineItem = () => {
    setPoForm((prev) => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          item_name: "",
          quantity: 0,
          unit: "kg",
          price: 0,
        },
      ],
    }));
  };

  const removeLineItem = (index) => {
    setPoForm((prev) => ({
      ...prev,
      line_items:
        prev.line_items.length === 1
          ? prev.line_items
          : prev.line_items.filter((_, i) => i !== index),
    }));
  };

  const subtotal = useMemo(() => {
    if (!poForm?.line_items) return 0;
    return poForm.line_items.reduce(
      (sum, line) =>
        sum + Number(line.quantity || 0) * Number(line.price || 0),
      0
    );
  }, [poForm]);

  const formatMoney = (value) =>
    `LKR ${Number(value || 0).toLocaleString("en-LK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const handleSaveDraft = () => {
    toast.success("PO draft saved");
    closeCreatePOModal();
  };

  const handleSubmitApproval = () => {
    toast.success("PO submitted for Manager approval");
    closeCreatePOModal();
  };

  return (
    <div>
      {isSupervisor ? (
        <div className="ib ib-w">
          <span>📢</span>
          <div>
            <strong>You cannot create POs.</strong> Use the <em>Notify Kamal</em>{" "}
            button below for each item that needs ordering. Kamal (Ops Executive)
            will receive the notification and create the PO.
          </div>
        </div>
      ) : (
        <div className="ib ib-d">
          <span>⚠️</span>
          <div>
            <strong>{bannerText}</strong>
          </div>
        </div>
      )}

      <div className="tw">
        <div className="tw-h">
          <h3>Items Below Reorder Level</h3>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>
            Sorted by urgency
          </span>
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
                    <div style={{ fontWeight: 700, color: "var(--g900)" }}>
                      {row._name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text3)",
                        marginTop: 2,
                      }}
                    >
                      {row._category} · {row._note}
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color:
                            row._urgency === "critical"
                              ? "var(--d)"
                              : "var(--w)",
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
                            background:
                              row._urgency === "critical"
                                ? "var(--d)"
                                : "var(--a500)",
                            width: `${row._fill}%`,
                          }}
                        />
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          minWidth: 36,
                        }}
                      >
                        {row._fill}%
                      </span>
                    </div>
                  </td>

                  <td style={{ fontWeight: 700, color: "var(--g900)" }}>
                    {row._reorder} {row.unit || ""}
                  </td>

                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--d)",
                      }}
                    >
                      Need {row._shortage} more
                    </span>
                  </td>

                  <td style={{ fontSize: 11 }}>{row._leadTime}</td>

                  <td>
                    <StatusPill type={row._urgency} />
                  </td>

                  <td>
                <button
                  type="button"
                  onClick={() => handleCreatePO(row)}
                  style={lowStockActionBtnStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#14532D";
                    e.currentTarget.style.borderColor = "#14532D";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#166534";
                    e.currentTarget.style.borderColor = "#166534";
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    +
                  </span>
                  <span>{isSupervisor ? "Notify Kamal" : "Create PO"}</span>
                </button>                  
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

      {showPOModal && poForm && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--g900)",
                  letterSpacing: "-.2px",
                  margin: 0,
                }}
              >
                📋 Create Purchase Order
              </h3>

              <button
                type="button"
                onClick={closeCreatePOModal}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  border: "1.5px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text2)",
                }}
              >
                ✕
              </button>
            </div>

            <div style={modalBodyStyle}>
              <div style={stepWrapStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "var(--a500)",
                      color: "var(--g900)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--g900)",
                    }}
                  >
                    Details
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: "var(--border)",
                    margin: "0 8px",
                  }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      border: "2px solid var(--border)",
                      color: "var(--text3)",
                      background: "var(--white)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text3)",
                    }}
                  >
                    Items
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: "var(--border)",
                    margin: "0 8px",
                  }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      border: "2px solid var(--border)",
                      color: "var(--text3)",
                      background: "var(--white)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text3)",
                    }}
                  >
                    Review
                  </div>
                </div>
              </div>

              <div style={grid3Style}>
                <div>
                  <label style={labelStyle}>PO #</label>
                  <input style={fieldStyle} value={poForm.po_number} readOnly />
                </div>

                <div>
                  <label style={labelStyle}>
                    Supplier <span style={{ color: "var(--d)" }}>*</span>
                  </label>
                  <select
                    style={fieldStyle}
                    value={poForm.supplier}
                    onChange={(e) => handlePOChange("supplier", e.target.value)}
                  >
                    <option>Mahinda Organic Farm</option>
                    <option>Organic Greens Ltd</option>
                    <option>Silva Farm</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    Required By <span style={{ color: "var(--d)" }}>*</span>
                  </label>
                  <input
                    type="date"
                    style={fieldStyle}
                    value={poForm.required_by}
                    onChange={(e) => handlePOChange("required_by", e.target.value)}
                  />
                </div>
              </div>

              <div style={grid2Style}>
                <div>
                  <label style={labelStyle}>Payment Terms</label>
                  <select
                    style={fieldStyle}
                    value={poForm.payment_terms}
                    onChange={(e) => handlePOChange("payment_terms", e.target.value)}
                  >
                    <option>Immediate cash</option>
                    <option>Net 7 days</option>
                    <option>Net 14 days</option>
                    <option>Net 30 days</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Priority</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      style={priorityBtn(poForm.priority === "normal")}
                      onClick={() => handlePOChange("priority", "normal")}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      style={priorityBtn(poForm.priority === "urgent")}
                      onClick={() => handlePOChange("priority", "urgent")}
                    >
                      ⚡ Urgent
                    </button>
                  </div>
                </div>
              </div>

              <div style={sectionTitleStyle}>
                <span
                  style={{
                    width: 3,
                    height: 12,
                    background: "var(--g500)",
                    borderRadius: 2,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span>Line Items</span>
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        background: "var(--ivory)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text2)",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        padding: "7px 9px",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        background: "var(--ivory)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text2)",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        padding: "7px 9px",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Item
                    </th>
                    <th
                      style={{
                        background: "var(--ivory)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text2)",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        padding: "7px 9px",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        background: "var(--ivory)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text2)",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        padding: "7px 9px",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Unit
                    </th>
                    <th
                      style={{
                        background: "var(--ivory)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text2)",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        padding: "7px 9px",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Price (LKR)
                    </th>
                    <th
                      style={{
                        background: "var(--ivory)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text2)",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        padding: "7px 9px",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Amount
                    </th>
                    <th
                      style={{
                        background: "var(--ivory)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text2)",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        padding: "7px 9px",
                        textAlign: "left",
                        borderBottom: "1px solid var(--border)",
                      }}
                    />
                  </tr>
                </thead>

                <tbody>
                  {poForm.line_items.map((line, index) => (
                    <tr key={index}>
                      <td
                        style={{
                          padding: "7px 9px",
                          borderBottom: "1px solid rgba(216,232,223,.4)",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          padding: "7px 9px",
                          borderBottom: "1px solid rgba(216,232,223,.4)",
                        }}
                      >
                        <input
                          style={fieldStyle}
                          value={line.item_name}
                          onChange={(e) =>
                            handleLineChange(index, "item_name", e.target.value)
                          }
                        />
                      </td>
                      <td
                        style={{
                          padding: "7px 9px",
                          borderBottom: "1px solid rgba(216,232,223,.4)",
                        }}
                      >
                        <input
                          type="number"
                          style={fieldStyle}
                          value={line.quantity}
                          onChange={(e) =>
                            handleLineChange(index, "quantity", e.target.value)
                          }
                        />
                      </td>
                      <td
                        style={{
                          padding: "7px 9px",
                          borderBottom: "1px solid rgba(216,232,223,.4)",
                        }}
                      >
                        <input
                          style={{ ...fieldStyle, width: "72px" }}
                          value={line.unit}
                          onChange={(e) =>
                            handleLineChange(index, "unit", e.target.value)
                          }
                        />
                      </td>
                      <td
                        style={{
                          padding: "7px 9px",
                          borderBottom: "1px solid rgba(216,232,223,.4)",
                        }}
                      >
                        <input
                          type="number"
                          style={fieldStyle}
                          value={line.price}
                          onChange={(e) =>
                            handleLineChange(index, "price", e.target.value)
                          }
                        />
                      </td>
                      <td
                        style={{
                          padding: "7px 9px",
                          borderBottom: "1px solid rgba(216,232,223,.4)",
                          fontWeight: 700,
                          color: "var(--g700)",
                        }}
                      >
                        {formatMoney(
                          Number(line.quantity || 0) * Number(line.price || 0)
                        )}
                      </td>
                      <td
                        style={{
                          padding: "7px 9px",
                          borderBottom: "1px solid rgba(216,232,223,.4)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: "1.5px solid var(--border)",
                            background: "var(--white)",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={addLineItem}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1.5px dashed var(--g300)",
                  background: "var(--g100)",
                  color: "var(--g600)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ＋ Add Line Item
              </button>

              <div
                style={{
                  marginTop: "12px",
                  padding: "12px 16px",
                  background: "var(--g100)",
                  borderRadius: "10px",
                  border: "1px solid var(--g200)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "5px 0",
                    fontSize: "12px",
                    borderBottom: "1px solid rgba(216,232,223,.4)",
                  }}
                >
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "9px 0 0",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--g800)",
                  }}
                >
                  <span>Total</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
              </div>

              <div style={{ ...grid2Style, marginTop: "14px" }}>
                <div>
                  <label style={labelStyle}>Instructions to Supplier</label>
                  <textarea
                    style={textareaStyle}
                    value={poForm.instructions_to_supplier}
                    onChange={(e) =>
                      handlePOChange("instructions_to_supplier", e.target.value)
                    }
                    placeholder="Quality, delivery notes..."
                  />
                </div>

                <div>
                  <label style={labelStyle}>Internal Notes</label>
                  <textarea
                    style={textareaStyle}
                    value={poForm.internal_notes}
                    onChange={(e) =>
                      handlePOChange("internal_notes", e.target.value)
                    }
                    placeholder="For your team only..."
                  />
                </div>
              </div>

              <div style={infoBoxStyle}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ️</span>
                <span>Requires Manager approval before being sent to supplier.</span>
              </div>
            </div>

            <div style={modalFooterStyle}>
              <button
                type="button"
                onClick={closeCreatePOModal}
                style={footerBtnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                style={footerBtnSecondary}
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={handleSubmitApproval}
                style={footerBtnPrimary}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#14532D";
                  e.currentTarget.style.borderColor = "#14532D";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#166534";
                  e.currentTarget.style.borderColor = "#166534";
                }}
              >
                Submit for Approval →
              </button>            
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LowStockPage;