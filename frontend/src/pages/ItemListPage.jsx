import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const FILTER_CONTROL_HEIGHT = 38;
const PRIMARY_GREEN = "#166534";
const PRIMARY_GREEN_HOVER = "#14532D";

const STORAGE_OPTIONS = [
  "Ambient (15–25°C)",
  "Cool Room (8–12°C)",
  "Cold Room (2–4°C)",
  "Freezer (−18°C)",
];

const codeCellStyle = {
  fontFamily: "monospace",
  fontWeight: 700,
  color: "var(--g800)",
  fontSize: 12,
};

const nameCellStyle = {
  fontWeight: 700,
  fontSize: 13,
  color: "var(--g900)",
};

const botanicalCellStyle = {
  fontStyle: "italic",
  fontWeight: 600,
  fontSize: 12,
  color: "#5B7764",
};

const supplierCellStyle = {
  color: "#5F7567",
  fontWeight: 500,
  fontSize: 12,
  lineHeight: 1.2,
};

const tableHeaderCellStyle = {
  fontSize: 11,
  letterSpacing: "0.08em",
  fontWeight: 800,
  color: "#4F6F5C",
  textTransform: "uppercase",
};

const editActionStyle = {
  height: 34,
  padding: "0 14px",
  borderRadius: 14,
  border: "1.5px solid #CFE2D4",
  background: "#FFFFFF",
  color: "#215D3D",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
};

const deleteActionStyle = {
  width: 34,
  height: 34,
  borderRadius: 14,
  border: "1.5px solid #CFE2D4",
  background: "#FFFFFF",
  color: "#6B7D71",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const filterInputWrapStyle = {
  minWidth: 320,
};

const filterSelectStyle = {
  width: 190,
  height: FILTER_CONTROL_HEIGHT,
  minHeight: FILTER_CONTROL_HEIGHT,
  boxSizing: "border-box",
};

const pageActionButtonStyle = {
  height: FILTER_CONTROL_HEIGHT,
  padding: "0 18px",
  borderRadius: 14,
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
  whiteSpace: "nowrap",
};

const addSupplierButtonStyle = {
  height: 38,
  padding: "0 18px",
  borderRadius: 999,
  border: `1px solid ${PRIMARY_GREEN}`,
  background: "#FFFFFF",
  color: PRIMARY_GREEN,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  boxShadow: "none",
};

const saveButtonStyle = {
  height: 44,
  padding: "0 18px",
  borderRadius: 14,
  border: `1px solid ${PRIMARY_GREEN}`,
  background: PRIMARY_GREEN,
  color: "#FFFFFF",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  boxShadow: "none",
};

const modalSectionTitleStyle = {
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#2E8B57",
  marginBottom: 12,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const toggleButtonStyle = (active) => ({
  flex: 1,
  height: 42,
  borderRadius: 10,
  border: `1px solid ${active ? "#2E8B57" : "var(--border)"}`,
  background: active ? "#E9F7EE" : "#FFFFFF",
  color: active ? "#1E6A43" : "var(--text2)",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 12px",
  boxShadow: "none",
});

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#EAF2FF",
  color: "#2F69C8",
  border: "1px solid rgba(47,105,200,.16)",
  fontSize: 12,
  fontWeight: 700,
};

const emptyChipTextStyle = {
  fontSize: 11,
  color: "var(--text3)",
  alignSelf: "center",
};

const categoryBadgeStyle = (label) => {
  const value = String(label || "").toLowerCase();

  if (value.includes("micro")) {
    return { background: "#EAF2FF", color: "#2F69C8" };
  }

  if (value.includes("exotic")) {
    return { background: "#FFF1DE", color: "#D78918" };
  }

  if (value.includes("dry")) {
    return { background: "#EEE9DF", color: "#5E7765" };
  }

  return { background: "#E9F7EE", color: "#2E8B57" };
};

const categoryBadgeBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 14px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const modalCardStyle = {
  maxWidth: 940,
  width: "88%",
  maxHeight: "calc(100vh - 72px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const modalFormStyle = {
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  flex: 1,
};

const modalBodyStyle = {
  padding: 22,
  overflowY: "auto",
  flex: 1,
};

const modalFooterStyle = {
  padding: "16px 22px",
  borderTop: "1px solid var(--border)",
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexShrink: 0,
  background: "var(--white)",
};

const textValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
};

const numberValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
  }
  return 0;
};

const normalizeTypeKey = (value) => {
  const text = String(value || "").toLowerCase();
  if (text.includes("non")) return "n";
  return "p";
};

const normalizeTypeLabel = (value) => {
  return normalizeTypeKey(value) === "n" ? "Non-Perishable" : "Perishable";
};

const normalizeReturnableMode = (rowOrValue) => {
  const value =
    typeof rowOrValue === "string"
      ? rowOrValue
      : textValue(
          rowOrValue?.returnable_mode,
          rowOrValue?.returnable,
          rowOrValue?.returns_policy,
          rowOrValue?.returnable_to_supplier
        );

  const text = String(value || "").toLowerCase();

  if (text.includes("market")) return "mkt";
  if (text === "yes" || text === "1" || text === "true" || text.includes("returnable")) {
    return "yes";
  }
  return "no";
};

const returnableLabel = (row) => {
  const mode = normalizeReturnableMode(row);
  if (mode === "yes") return "Yes";
  if (mode === "mkt") return "No (Market)";
  return "No";
};

const returnableColorStyle = (row) => {
  const mode = normalizeReturnableMode(row);
  if (mode === "yes") return { color: "#2E8B57", fontWeight: 700 };
  return { color: "#D4552D", fontWeight: 700 };
};

const extractSupplierIds = (row) => {
  const rawIds =
    row?.supplier_ids ??
    row?.linked_supplier_ids ??
    row?.supplier_id ??
    row?.supplier_ids_csv ??
    row?.supplier_ids_string;

  if (Array.isArray(rawIds)) return rawIds.map(String);

  if (rawIds !== undefined && rawIds !== null && String(rawIds).trim() !== "") {
    return String(rawIds)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

const getSupplierNames = (row, suppliers = []) => {
  const direct = textValue(
    row.supplier_names,
    row.linked_suppliers,
    row.suppliers,
    row.supplier_name,
    row.supplier_display
  );

  if (direct) return direct;

  const ids = extractSupplierIds(row);
  if (!ids.length) return "—";

  const names = suppliers
    .filter((supplier) => ids.includes(String(supplier.id)))
    .map((supplier) =>
      textValue(supplier.supplier_name, supplier.name, supplier.contact_person)
    )
    .filter(Boolean);

  return names.length ? names.join(", ") : "—";
};

const formatStorageDisplay = (value) => {
  const text = String(value || "").trim().toLowerCase();

  if (!text) return "—";
  if (text.includes("ambient")) return "Ambient";
  if (text.includes("cool room") || text.includes("8") || text.includes("12")) return "Cool Room";
  if (text.includes("cold room") || text.includes("2") || text.includes("4")) return "Cold Room";
  if (text.includes("freezer") || text.includes("-18")) return "Freezer";
  if (text.includes("chilled")) return "Cold Room";

  return String(value);
};

const getCategoryIdFromRow = (row, categories) => {
  if (row?.category_id !== undefined && row?.category_id !== null && row?.category_id !== "") {
    return String(row.category_id);
  }

  const name = textValue(row?.category_name, row?.category);
  const match = categories.find(
    (item) => textValue(item.category_name, item.name).toLowerCase() === name.toLowerCase()
  );

  return match ? String(match.id) : "";
};

const buildNextItemCode = (rows) => {
  const codes = rows.map((row) => textValue(row.code, row.item_code)).filter(Boolean);

  if (!codes.length) return "FW-PRD-001";

  let bestPrefix = "FW-PRD-";
  let maxNumber = 0;

  codes.forEach((code) => {
    const match = String(code).match(/^(.*?)(\d+)$/);
    if (!match) return;
    const [, prefix, digits] = match;
    const num = Number(digits);
    if (num >= maxNumber) {
      maxNumber = num;
      bestPrefix = prefix;
    }
  });

  return `${bestPrefix}${String(maxNumber + 1).padStart(3, "0")}`;
};

const createEmptyForm = (rows) => ({
  code: buildNextItemCode(rows),
  name: "",
  botanical_name: "",
  category_id: "",
  type: "p",
  unit: "kg",
  reorder_level: "",
  shelf_life: "",
  storage_temp: STORAGE_OPTIONS[0],
  unit_cost: "",
  returnable_mode: "yes",
  supplier_ids: [],
  description: "",
  is_active: 1,
  stock_type: "produce",
});

const ItemListPage = () => {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [activeTab, setActiveTab] = useState("packaging");

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setCategory("All Categories");
  };

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [form, setForm] = useState(createEmptyForm([]));
  const [supplierPickerId, setSupplierPickerId] = useState("");

  const loadPage = async () => {
    try {
      setLoading(true);

      const [itemsRes, categoriesRes, suppliersRes] = await Promise.all([
        api.get("/items"),
        api.get("/items/categories"),
        api.get("/suppliers"),
      ]);

      setRows(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
    } catch (err) {
      console.error("LOAD ITEM MASTER ERROR:", err?.response?.data || err);
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to load Item Master"
      );
      setRows([]);
      setCategories([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const categoryOptions = useMemo(() => {
    const fromItems = rows
      .filter((row) => (row.stock_type || "produce") === activeTab)
      .map((row) => textValue(row.category_name, row.category))
      .filter(Boolean);

    const merged = Array.from(new Set(fromItems)).sort((a, b) =>
      a.localeCompare(b)
    );

    return ["All Categories", ...merged];
  }, [rows, activeTab]);

  const filteredRows = useMemo(() => {
    // Filter by stock_type (activeTab: 'packaging' or 'produce')
    result = result.filter(
      (row) => (row.stock_type || "produce") === activeTab
    );

    if (category !== "All Categories") {
      result = result.filter(
        (row) => textValue(row.category_name, row.category) === category
      );
    }

    const q = search.trim().toLowerCase();

    if (q) {
      result = result.filter((row) =>
        [
          row.code,
          row.item_code,
          row.name,
          row.item_name,
          row.botanical_name,
          row.category_name,
          row.category,
          row.unit,
          row.reorder_level,
          formatStorageDisplay(row.storage_temp),
          getSupplierNames(row, suppliers),
          returnableLabel(row),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return result;
  }, [rows, search, category, activeTab, suppliers]);

  const selectedSupplierRows = useMemo(() => {
    const ids = new Set((form.supplier_ids || []).map(String));
    return suppliers.filter((row) => ids.has(String(row.id)));
  }, [suppliers, form.supplier_ids]);

  const openNewModal = () => {
    setEditingItemId(null);
    setSupplierPickerId("");
    setForm({
      ...createEmptyForm(rows),
      stock_type: activeTab,
    });
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingItemId(row.id || row.item_id);
    setSupplierPickerId("");

    setForm({
      code: textValue(row.code, row.item_code),
      name: textValue(row.name, row.item_name),
      botanical_name: textValue(row.botanical_name),
      category_id: getCategoryIdFromRow(row, categories),
      type: normalizeTypeKey(row.type),
      unit: textValue(row.unit) || "kg",
      reorder_level: row.reorder_level ?? "",
      shelf_life: row.shelf_life ?? row.shelf_life_days ?? "",
      storage_temp: textValue(row.storage_temp) || STORAGE_OPTIONS[0],
      unit_cost: row.unit_cost ?? "",
      returnable_mode: normalizeReturnableMode(row),
      supplier_ids: extractSupplierIds(row),
      description: textValue(row.description, row.notes),
      is_active:
        row.is_active === undefined || row.is_active === null
          ? 1
          : Number(row.is_active) === 1 || row.is_active === true
          ? 1
          : 0,
      stock_type: row.stock_type || "produce",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItemId(null);
    setSupplierPickerId("");
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addSupplierToForm = () => {
    if (!supplierPickerId) return;

    setForm((prev) => {
      const ids = prev.supplier_ids.map(String);
      if (ids.includes(String(supplierPickerId))) return prev;
      return {
        ...prev,
        supplier_ids: [...prev.supplier_ids, String(supplierPickerId)],
      };
    });

    setSupplierPickerId("");
  };

  const removeSupplierFromForm = (supplierId) => {
    setForm((prev) => ({
      ...prev,
      supplier_ids: prev.supplier_ids.filter((id) => String(id) !== String(supplierId)),
    }));
  };

  const buildPayload = () => {
    const categoryId =
      form.category_id ||
      categories.find(
        (row) =>
          textValue(row.category_name, row.name).toLowerCase() ===
          String(form.category_id || "").toLowerCase()
      )?.id ||
      "";

    return {
      code: form.code.trim(),
      name: form.name.trim(),
      botanical_name: form.botanical_name.trim(),
      category_id: Number(categoryId),
      type: form.stock_type === "packaging" ? "Non-Perishable" : "Perishable",
      unit: form.unit.trim(),
      reorder_level: Number(form.reorder_level || 0),
      shelf_life_days: Number(form.shelf_life || 0),
      storage_temp: form.storage_temp.trim(),
      unit_cost: Number(form.unit_cost || 0),
      returnable: Number(form.returnable_mode === "yes"),
      supplier_ids: (form.supplier_ids || []).map((id) => Number(id)).filter(Boolean),
      description: "",
      status: "active",
      stock_type: form.stock_type,
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Item code and item name are required");
      return;
    }

    if (!form.category_id) {
      toast.error("Category is required");
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      if (editingItemId) {
        await api.put(`/items/${editingItemId}`, payload);
        toast.success("Item updated");
      } else {
        await api.post("/items", payload);
        toast.success("Item saved");
      }

      closeModal();
      loadPage();
    } catch (err) {
      console.error("Save item error:", err?.response?.data || err);
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to save item"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (row) => {
    const id = row.id || row.item_id;
    if (!id) {
      toast.error("Item id not found");
      return;
    }

    const itemName =
      textValue(row.name, row.item_name, row.code, row.item_code) || "this item";

    const confirmed = window.confirm(
      `Deactivate ${itemName}? This keeps history and removes it from active use.`
    );

    if (!confirmed) return;

    try {
      const payload = {
        code: textValue(row.code, row.item_code),
        name: textValue(row.name, row.item_name),
        botanical_name: textValue(row.botanical_name),
        category_id:
          Number(getCategoryIdFromRow(row, categories)) ||
          getCategoryIdFromRow(row, categories),
        type: normalizeTypeLabel(row.type),
        unit: textValue(row.unit) || "kg",
        reorder_level: numberValue(row.reorder_level),
        shelf_life_days: row.shelf_life ?? row.shelf_life_days ?? 0,
        storage_temp: textValue(row.storage_temp),
        unit_cost: numberValue(row.unit_cost),
        returnable: Number(normalizeReturnableMode(row) === "yes"),
        supplier_ids: extractSupplierIds(row).map((id) => Number(id)).filter(Boolean),
        description: textValue(row.description, row.notes),
        status: "inactive",
      };

      await api.put(`/items/${id}`, payload);
      toast.success("Item marked inactive");
      loadPage();
    } catch (err) {
      console.error("Deactivate item error:", err?.response?.data || err);
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to deactivate item"
      );
    }
  };

  return (
    <div>
      <div className="tab-bar">
        <button
          className={`tbb ${activeTab === "packaging" ? "on" : ""}`}
          onClick={() => handleTabChange("packaging")}
        >
          📦 Packaging Materials
        </button>
        <button
          className={`tbb ${activeTab === "produce" ? "on" : ""}`}
          onClick={() => handleTabChange("produce")}
        >
          🌱 Export Products
        </button>
      </div>

      <div
        className="fb"
        style={{
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div className="sw" style={filterInputWrapStyle}>
          <input
            className="si"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              height: FILTER_CONTROL_HEIGHT,
              minHeight: FILTER_CONTROL_HEIGHT,
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          className="fc"
          style={filterSelectStyle}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: "auto" }}>
          <button
            type="button"
            style={pageActionButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = PRIMARY_GREEN_HOVER;
              e.currentTarget.style.borderColor = PRIMARY_GREEN_HOVER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = PRIMARY_GREEN;
              e.currentTarget.style.borderColor = PRIMARY_GREEN;
            }}
            onClick={openNewModal}
          >
            + New Item
          </button>
        </div>
      </div>

      <div
        className="tw item-master-table-wrap"
        style={{
          borderRadius: 24,
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
              <th style={{ width: "11%", ...tableHeaderCellStyle }}>CODE</th>
              <th style={{ width: "17%", ...tableHeaderCellStyle }}>ITEM NAME</th>
              <th style={{ width: "16%", ...tableHeaderCellStyle }}>BOTANICAL NAME</th>
              <th style={{ width: "13%", ...tableHeaderCellStyle }}>CATEGORY</th>
              <th style={{ width: "6%", ...tableHeaderCellStyle }}>UNIT</th>
              <th style={{ width: "9%", ...tableHeaderCellStyle }}>REORDER</th>
              <th style={{ width: "10%", ...tableHeaderCellStyle }}>STORAGE</th>
              <th style={{ width: "10%", ...tableHeaderCellStyle }}>RETURNABLE</th>
              <th style={{ width: "12%", ...tableHeaderCellStyle }}>SUPPLIERS</th>
              <th style={{ width: "10%", ...tableHeaderCellStyle }}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10">Loading items...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row, index) => {
                const id = row.id || row.item_id || index;
                const categoryLabel = textValue(row.category_name, row.category) || "—";
                const badgeTone = categoryBadgeStyle(categoryLabel);

                return (
                  <tr
                    key={id}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#F7FBF8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <td style={codeCellStyle}>
                      {textValue(row.code, row.item_code) || "—"}
                    </td>

                    <td style={nameCellStyle}>
                      {textValue(row.name, row.item_name) || "—"}
                    </td>

                    <td style={botanicalCellStyle}>
                      {textValue(row.botanical_name) || "—"}
                    </td>

                    <td>
                      <span
                        style={{
                          ...categoryBadgeBaseStyle,
                          ...badgeTone,
                          padding: "5px 12px",
                          fontSize: 11,
                        }}
                      >
                        <span style={{ fontSize: 9 }}>●</span>
                        {categoryLabel}
                      </span>
                    </td>

                    <td style={{ fontSize: 12, color: "var(--g900)" }}>
                      {textValue(row.unit) || "—"}
                    </td>

                    <td style={{ fontSize: 12, color: "var(--g900)" }}>
                      {numberValue(row.reorder_level)} {textValue(row.unit)}
                    </td>

                    <td style={{ fontSize: 12, color: "var(--g900)" }}>
                      {formatStorageDisplay(textValue(row.storage_temp))}
                    </td>

                    <td style={{ ...returnableColorStyle(row), fontSize: 12 }}>
                      {returnableLabel(row)}
                    </td>

                    <td style={supplierCellStyle}>
                      {getSupplierNames(row, suppliers)}
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          style={editActionStyle}
                          onClick={() => openEditModal(row)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          title="Deactivate"
                          style={deleteActionStyle}
                          onClick={() => handleDeactivate(row)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10">No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal ? (
        <div className="modal-backdrop">
          <div className="md" style={modalCardStyle}>
            <div className="md-h">
              <h3>{editingItemId ? "Edit Item" : "🌿 Add New Item"}</h3>
              <button type="button" className="md-x" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={modalFormStyle}>
              <div className="md-b" style={modalBodyStyle}>
                <div className="fs2" style={{ marginBottom: 18 }}>
                  <div style={modalSectionTitleStyle}>▍ Item Identity</div>

                  <div className="fr3" style={{ marginBottom: 14 }}>
                    <div className="ff">
                      <label className="fl">
                        Item Code <span className="rq">*</span>
                      </label>
                      <input
                        className="fc"
                        value={form.code}
                        onChange={(e) => setField("code", e.target.value)}
                        placeholder="FW-PRD-248"
                      />
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Item Name <span className="rq">*</span>
                      </label>
                      <input
                        className="fc"
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        placeholder="e.g. Dragon Fruit (Red)"
                      />
                    </div>

                    <div className="ff">
                      <label className="fl">Botanical Name</label>
                      <input
                        className="fc"
                        value={form.botanical_name}
                        onChange={(e) => setField("botanical_name", e.target.value)}
                        placeholder="e.g. Hylocereus undatus"
                        style={{ fontStyle: "italic" }}
                      />
                    </div>
                  </div>

                  <div className="fr" style={{ marginBottom: 4 }}>
                    <div className="ff">
                      <label className="fl">
                        Category <span className="rq">*</span>
                      </label>
                      <select
                        className="fc"
                        value={form.category_id}
                        onChange={(e) => setField("category_id", e.target.value)}
                      >
                        <option value="">Select category</option>
                        {categories.map((row) => (
                          <option key={row.id} value={row.id}>
                            {textValue(row.category_name, row.name)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Stock Type <span className="rq">*</span>
                      </label>
                      <select
                        className="fc"
                        value={form.stock_type}
                        onChange={(e) => setField("stock_type", e.target.value)}
                      >
                        <option value="produce">Produce</option>
                        <option value="packaging">Packaging</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="fs2" style={{ marginBottom: 18 }}>
                  <div style={modalSectionTitleStyle}>▍ Stock & Storage</div>

                  <div className="fr3" style={{ marginBottom: 14 }}>
                    <div className="ff">
                      <label className="fl">
                        Unit of Measure <span className="rq">*</span>
                      </label>
                      <select
                        className="fc"
                        value={form.unit}
                        onChange={(e) => setField("unit", e.target.value)}
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="piece">piece</option>
                        <option value="bunch">bunch</option>
                        <option value="tray">tray</option>
                        <option value="box">box</option>
                        <option value="pack">pack</option>
                        <option value="litre">litre</option>
                      </select>
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Reorder Level <span className="rq">*</span>
                      </label>
                      <input
                        className="fc"
                        type="number"
                        min="0"
                        value={form.reorder_level}
                        onChange={(e) => setField("reorder_level", e.target.value)}
                        placeholder="e.g. 50"
                      />
                    </div>

                    <div className="ff">
                      <label className="fl">Shelf Life (days)</label>
                      <input
                        className="fc"
                        type="number"
                        min="0"
                        value={form.shelf_life}
                        onChange={(e) => setField("shelf_life", e.target.value)}
                        placeholder="e.g. 7"
                      />
                    </div>
                  </div>

                  <div className="fr" style={{ marginBottom: 14 }}>
                    <div className="ff">
                      <label className="fl">Storage Temperature</label>
                      <select
                        className="fc"
                        value={form.storage_temp}
                        onChange={(e) => setField("storage_temp", e.target.value)}
                      >
                        {STORAGE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ff">
                      <label className="fl">Standard Unit Cost (LKR)</label>
                      <input
                        className="fc"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.unit_cost}
                        onChange={(e) => setField("unit_cost", e.target.value)}
                        placeholder="0.00"
                      />
                      <span className="fh">Used for stock valuation reports</span>
                    </div>
                  </div>

                  <div className="ff">
                    <label className="fl">Returnable to Supplier?</label>
                    <div className="tg" style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={toggleButtonStyle(form.returnable_mode === "yes")}
                        onClick={() => setField("returnable_mode", "yes")}
                      >
                        Yes — returnable
                      </button>
                      <button
                        type="button"
                        style={toggleButtonStyle(form.returnable_mode === "no")}
                        onClick={() => setField("returnable_mode", "no")}
                      >
                        No — wastage only
                      </button>
                      <button
                        type="button"
                        style={toggleButtonStyle(form.returnable_mode === "mkt")}
                        onClick={() => setField("returnable_mode", "mkt")}
                      >
                        No (Market purchase)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ff">
                  <label className="fl">Linked Suppliers</label>

                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select
                      className="fc"
                      style={{ flex: 1 }}
                      value={supplierPickerId}
                      onChange={(e) => setSupplierPickerId(e.target.value)}
                    >
                      <option value="">— Select supplier —</option>
                      {suppliers.map((row) => (
                        <option key={row.id} value={row.id}>
                          {textValue(row.supplier_name, row.name, row.contact_person)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      style={addSupplierButtonStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#F4FBF6";
                        e.currentTarget.style.color = PRIMARY_GREEN_HOVER;
                        e.currentTarget.style.borderColor = PRIMARY_GREEN_HOVER;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#FFFFFF";
                        e.currentTarget.style.color = PRIMARY_GREEN;
                        e.currentTarget.style.borderColor = PRIMARY_GREEN;
                      }}
                      onClick={addSupplierToForm}
                    >
                      + Add
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      minHeight: 32,
                      padding: 8,
                      background: "var(--ivory)",
                      borderRadius: 9,
                      border: "1.5px solid var(--border)",
                    }}
                  >
                    {selectedSupplierRows.length ? (
                      selectedSupplierRows.map((row) => (
                        <span key={row.id} style={chipStyle}>
                          {textValue(row.supplier_name, row.name, row.contact_person)}
                          <span
                            onClick={() => removeSupplierFromForm(row.id)}
                            style={{ cursor: "pointer", fontWeight: 700 }}
                          >
                            ×
                          </span>
                        </span>
                      ))
                    ) : (
                      <span style={emptyChipTextStyle}>No suppliers linked yet</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="md-f" style={modalFooterStyle}>
                <button type="button" className="btn btn-s" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  style={saveButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = PRIMARY_GREEN_HOVER;
                    e.currentTarget.style.borderColor = PRIMARY_GREEN_HOVER;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = PRIMARY_GREEN;
                    e.currentTarget.style.borderColor = PRIMARY_GREEN;
                  }}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ItemListPage;