import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const FILTER_HEIGHT = 38;
const PRIMARY_GREEN = "#166534";
const PRIMARY_GREEN_HOVER = "#14532D";

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

const statBoxStyle = {
  background: "#F7FAF8",
  border: "1px solid #E7F0EA",
  borderRadius: 16,
  padding: "10px 12px",
  minHeight: 58,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const metaBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 10px",
  borderRadius: 999,
  background: "#F2F7F4",
  color: "#7D9486",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
};

const getActionButtonStyle = (hovered, danger = false) => ({
  width: 38,
  height: 38,
  borderRadius: 12,
  border: `1px solid ${danger ? "#F3D4CD" : "#CFE2D4"}`,
  background: hovered ? (danger ? "#FFF4F1" : "#F4FBF6") : "#FFFFFF",
  color: danger ? "#D15D47" : "#587064",
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.18s ease",
  boxShadow: hovered ? "0 4px 10px rgba(16,24,40,.06)" : "none",
});

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

const categoryCode = (row) =>
  row.category_code || `CAT-${String(row.id).padStart(3, "0")}`;

const shelfLifeLabel = (minValue, maxValue) => {
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!min && !max) return "—";
  if (min && max && min !== max) return `${min}-${max}d`;
  return `${max || min}d`;
};

const getCategoryAccent = (name) => {
  const text = String(name || "").toLowerCase();

  if (text.includes("leaf")) return "#2F69C8";
  if (text.includes("herb") || text.includes("aromatic")) return "#7C3AED";
  if (text.includes("fruit")) return "#2E8B57";
  if (text.includes("exotic")) return "#E39A1C";
  if (text.includes("micro")) return "#4F8B3A";
  if (text.includes("dry")) return "#6E8B74";
  if (text.includes("dairy")) return "#0F766E";

  return "#2E8B57";
};

const emptyForm = {
  category_name: "",
  description: "",
  status: "active",
};

export default function CategoryListPage() {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
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

    const base = !q
      ? rows
      : rows.filter((row) =>
          [
            row.id,
            row.category_name,
            row.description,
            row.status,
            row.item_count,
            row.min_shelf_life,
            row.max_shelf_life,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        );

    return [...base].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }, [rows, search]);

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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
            gap: 18,
          }}
        >
          {filteredRows.length ? (
            filteredRows.map((row) => {
              const accent = getCategoryAccent(row.category_name);
              const itemCount = numberValue(row.item_count);
              const shelfRange = shelfLifeLabel(
                row.min_shelf_life,
                row.max_shelf_life
              );
              const isHovered = hoveredCardId === row.id;

              return (
                <div
                  key={row.id}
                  className="card"
                  onMouseEnter={() => setHoveredCardId(row.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  style={{
                    borderRadius: 24,
                    border: isHovered
                      ? `1px solid ${accent}55`
                      : "1px solid #D8E6DD",
                    background: "#FFFFFF",
                    padding: "12px 20px",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.18s ease",
                    transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                    boxShadow: isHovered
                      ? "0 12px 28px rgba(16,24,40,.08)"
                      : "0 2px 8px rgba(16,24,40,.03)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 5,
                      background: accent,
                    }}
                  />

                  <div
                    className="fb"
                    style={{
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...metaBadgeStyle, marginBottom: 8 }}>
                        {categoryCode(row)}
                      </div>

                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "var(--g900)",
                          lineHeight: 1.2,
                          marginBottom: 2,
                        }}
                      >
                        {row.category_name}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#7F978A",
                          lineHeight: 1.45,
                        }}
                      >
                        {textValue(row.description) || "No description"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div style={statBoxStyle}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#7F978A",
                          marginBottom: 5,
                        }}
                      >
                        Items
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 800,
                          color: "var(--g900)",
                          lineHeight: 1,
                        }}
                      >
                        {itemCount}
                      </div>
                    </div>

                    <div style={statBoxStyle}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#7F978A",
                          marginBottom: 5,
                        }}
                      >
                        Shelf Life
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "var(--g900)",
                          lineHeight: 1,
                        }}
                      >
                        {shelfRange}
                      </div>
                    </div>
                  </div>

                  <div
                    className="fb"
                    style={{
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#8AA092",
                        fontWeight: 700,
                      }}
                    >
                      {textValue(row.status) === "inactive" ? "Inactive" : "Active"}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={getActionButtonStyle(hoveredEditId === row.id)}
                        onMouseEnter={() => setHoveredEditId(row.id)}
                        onMouseLeave={() => setHoveredEditId(null)}
                        onClick={() => openEditModal(row)}
                        title="Edit category"
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        style={getActionButtonStyle(hoveredDeleteId === row.id, true)}
                        onMouseEnter={() => setHoveredDeleteId(row.id)}
                        onMouseLeave={() => setHoveredDeleteId(null)}
                        onClick={() => handleDelete(row)}
                        title="Delete category"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card" style={{ padding: 22 }}>
              No categories found
            </div>
          )}
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