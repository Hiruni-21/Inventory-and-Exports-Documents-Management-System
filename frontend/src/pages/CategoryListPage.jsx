import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const FILTER_HEIGHT = 38;
const PRIMARY_GREEN = "#166534";
const PRIMARY_GREEN_HOVER = "#14532D";

const tableHeaderCellStyle = {
  fontSize: 11,
  letterSpacing: "0.08em",
  fontWeight: 800,
  color: "#4F6F5C",
  textTransform: "uppercase",
};

const searchWrapStyle = {
  width: 320,
};

const addButtonStyle = {
  height: 38,
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
  whiteSpace: "nowrap",
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

const categoryCode = (id) => `CAT-${String(id).padStart(3, "0")}`;

const isPackagingCategory = (categoryName) => {
  const name = String(categoryName || "").toLowerCase();
  return (
    name.includes("carton") ||
    name.includes("box") ||
    name.includes("regiform") ||
    name.includes("foam") ||
    name.includes("liner") ||
    name.includes("label") ||
    name.includes("tape") ||
    name.includes("wrapping") ||
    name.includes("cooling") ||
    name.includes("bag") ||
    name.includes("vacuum") ||
    name.includes("divider") ||
    name.includes("insert") ||
    name.includes("tray") ||
    name.includes("crate") ||
    name.includes("packing")
  );
};

const actionBtnStyle = (hovered, danger = false) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  border: `1px solid ${danger ? "#FCA5A5" : "#D1D5DB"}`,
  background: hovered ? (danger ? "#FEF2F2" : "#F9FAFB") : "#FFFFFF",
  color: danger ? "#EF4444" : "#4B5563",
  fontSize: 12,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s ease-in-out",
});

const emptyForm = {
  category_name: "",
  description: "",
  status: "active",
};

export default function CategoryListPage() {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("packaging");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoveredEditId, setHoveredEditId] = useState(null);
  const [hoveredDeleteId, setHoveredDeleteId] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/categories");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("LOAD CATEGORIES ERROR:", err?.response?.data || err);
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to load categories"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let result = [...rows];

    // Filter categories by the active tab stock classification
    result = result.filter((row) => {
      const isPkg = isPackagingCategory(row.category_name);
      return activeTab === "packaging" ? isPkg : !isPkg;
    });

    if (q) {
      result = result.filter((row) =>
        [
          row.id,
          row.category_name,
          row.description,
          row.status,
          row.item_count,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return result.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }, [rows, search, activeTab]);

  const openNewModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({
      category_name: textValue(row.category_name),
      description: textValue(row.description),
      status: textValue(row.status) || "active",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.category_name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        category_name: form.category_name.trim(),
        description: form.description.trim(),
        status: form.status || "active",
      };

      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
        toast.success("Category updated");
      } else {
        await api.post("/categories", payload);
        toast.success("Category created");
      }

      closeModal();
      loadCategories();
    } catch (err) {
      console.error("SAVE CATEGORY ERROR:", err?.response?.data || err);
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to save category"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const confirmed = window.confirm(`Delete ${row.category_name}?`);
    if (!confirmed) return;

    try {
      await api.delete(`/categories/${row.id}`);
      toast.success("Category deleted");
      loadCategories();
    } catch (err) {
      console.error("DELETE CATEGORY ERROR:", err?.response?.data || err);
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to delete category"
      );
    }
  };

  return (
    <div>
      <div className="tab-bar" style={{ marginBottom: 18 }}>
        <button
          className={`tbb ${activeTab === "packaging" ? "on" : ""}`}
          onClick={() => setActiveTab("packaging")}
        >
          📦 Packaging Materials
        </button>
        <button
          className={`tbb ${activeTab === "produce" ? "on" : ""}`}
          onClick={() => setActiveTab("produce")}
        >
          🌱 Export Products
        </button>
      </div>

      <div
        className="fb"
        style={{
          marginBottom: 18,
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div className="sw" style={searchWrapStyle}>
          <input
            className="si"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              height: FILTER_HEIGHT,
              minHeight: FILTER_HEIGHT,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "#7A9286",
              fontWeight: 700,
            }}
          >
            {filteredRows.length} categories
          </span>

          <button
            type="button"
            style={addButtonStyle}
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
            + Add Category
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 22 }}>
          Loading categories...
        </div>
      ) : (
        <div
          className="tw"
          style={{
            borderRadius: 24,
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          <table style={{ minWidth: 800, tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ width: "12%", ...tableHeaderCellStyle }}>Category Code</th>
                <th style={{ width: "22%", ...tableHeaderCellStyle }}>Category Name</th>
                <th style={{ width: "38%", ...tableHeaderCellStyle }}>Description</th>
                <th style={{ width: "12%", ...tableHeaderCellStyle }}>Item Count</th>
                <th style={{ width: "12%", ...tableHeaderCellStyle }}>Status</th>
                <th style={{ width: "8%", ...tableHeaderCellStyle }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => {
                  const itemCount = numberValue(row.item_count);
                  const isInactive = row.status === "inactive";

                  return (
                    <tr key={row.id}>
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--g700)",
                        }}
                      >
                        {categoryCode(row.id)}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--g900)" }}>
                        {row.category_name}
                      </td>
                      <td style={{ color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {textValue(row.description) || "—"}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--g900)" }}>
                        {itemCount}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: isInactive ? "#FEF2F2" : "#ECFDF5",
                            color: isInactive ? "#EF4444" : "#10B981",
                            border: `1px solid ${isInactive ? "#FEE2E2" : "#D1FAE5"}`,
                          }}
                        >
                          {isInactive ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            style={actionBtnStyle(hoveredEditId === row.id)}
                            onMouseEnter={() => setHoveredEditId(row.id)}
                            onMouseLeave={() => setHoveredEditId(null)}
                            onClick={() => openEditModal(row)}
                            title="Edit category"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            style={actionBtnStyle(hoveredDeleteId === row.id, true)}
                            onMouseEnter={() => setHoveredDeleteId(row.id)}
                            onMouseLeave={() => setHoveredDeleteId(null)}
                            onClick={() => handleDelete(row)}
                            title="Delete category"
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
                  <td colSpan="6" style={{ textAlign: "center", color: "#6B7280", padding: "30px 0" }}>
                    No categories found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal ? (
        <div className="modal-backdrop">
          <div className="md" style={{ maxWidth: 640, width: "92%" }}>
            <div className="md-h">
              <h3>{editingId ? "✏️ Edit Category" : "📂 Add Category"}</h3>
              <button type="button" className="md-x" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="md-b">
                <div className="ff" style={{ marginBottom: 14 }}>
                  <label className="fl">
                    Category Name <span className="rq">*</span>
                  </label>
                  <input
                    className="fc"
                    value={form.category_name}
                    onChange={(e) => setField("category_name", e.target.value)}
                    placeholder="e.g. Tropical Fruits"
                  />
                </div>

                <div className="ff" style={{ marginBottom: 14 }}>
                  <label className="fl">Description</label>
                  <textarea
                    className="fc"
                    rows="4"
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Short category description"
                    style={{ resize: "vertical", paddingTop: 12 }}
                  />
                </div>

                <div className="ff">
                  <label className="fl">Status</label>
                  <select
                    className="fc"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-p" disabled={saving}>
                  {saving ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}