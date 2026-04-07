import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const emptyForm = {
  category_name: "",
  description: "",
  status: "active",
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const CategoryListPage = () => {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/items/categories");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load item categories");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    if (!showEditModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeEdit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showEditModal]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return [...rows]
      .filter((row) =>
        q === ""
          ? true
          : [row.category_name, row.description, row.status]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q)
      )
      .sort((a, b) =>
        String(a.category_name || "").localeCompare(String(b.category_name || ""), undefined, {
          sensitivity: "base",
        })
      );
  }, [rows, search]);

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      category_name: row.category_name || "",
      description: row.description || "",
      status: row.status || "active",
    });
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!form.category_name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSaving(true);
      await api.put(`/items/categories/${editingId}`, {
        category_name: form.category_name.trim(),
        description: form.description.trim(),
        status: form.status,
      });

      toast.success("Category updated successfully");
      closeEdit();
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = window.confirm(`Delete category "${row.category_name}"?`);
    if (!ok) return;

    try {
      await api.delete(`/items/categories/${row.id}`);
      toast.success("Category deleted successfully");
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete category");
    }
  };

  return (
    <div>
      <div className="ib ib-i">
        <span>🗂️</span>
        <div>
          Item categories structure your real product list for Item Master, Inventory, GRN, Dispatch
          and Reports.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="tw">
        <div className="tw-h">
          <h3>Item Categories</h3>
          <span className="badge bg-b">{filteredRows.length} categories</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>CATEGORY NAME</th>
              <th>DESCRIPTION</th>
              <th>STATUS</th>
              <th>CREATED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td style={{ fontWeight: 700, color: "var(--g900)" }}>{row.category_name}</td>
                  <td>{row.description || "—"}</td>
                  <td>
                    <span className={`badge ${row.status === "active" ? "bg-g" : "bg-r"}`}>
                      {row.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{fmtDateTime(row.created_at)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="ab" title="Edit" onClick={() => openEdit(row)}>
                        ✏️
                      </button>

                      <button
                        type="button"
                        className="ab d"
                        title="Delete"
                        onClick={() => handleDelete(row)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No categories found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showEditModal && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="md" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="md-h">
              <h3>✏️ Edit Category</h3>
              <button type="button" className="md-x" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="md-b">
                <div className="ff">
                  <label className="fl">Category Name</label>
                  <input
                    className="fc"
                    name="category_name"
                    value={form.category_name}
                    onChange={handleChange}
                    placeholder="Organic Vegetables"
                  />
                </div>

                <div className="ff">
                  <label className="fl">Description</label>
                  <textarea
                    className="fc"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Fresh vegetables and produce items"
                    rows="4"
                  />
                </div>

                <div className="ff">
                  <label className="fl">Status</label>
                  <select className="fc" name="status" value={form.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={closeEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-p" disabled={saving}>
                  {saving ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryListPage;