import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const emptyForm = {
  code: "",
  name: "",
  botanical_name: "",
  category_id: "",
  type: "Perishable",
  unit: "kg",
  shelf_life_days: 0,
  reorder_level: 0,
  storage_temp: "",
  unit_cost: 0,
  returnable: 1,
  description: "",
  status: "active",
};

const ItemListPage = () => {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const loadPage = async () => {
    try {
      setLoading(true);

      const [itemsRes, categoriesRes] = await Promise.all([
        api.get("/items"),
        api.get("/items/categories"),
      ]);

      setRows(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load item master");
      setRows([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!showEditModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowEditModal(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showEditModal]);

  const categoryOptions = useMemo(() => {
    return ["All Categories", ...categories.map((row) => row.category_name)];
  }, [categories]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        q === "" ||
        [
          row.code,
          row.name,
          row.botanical_name,
          row.category_name,
          row.type,
          row.unit,
          row.storage_temp,
          row.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesCategory =
        categoryFilter === "All Categories" || row.category_name === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [rows, search, categoryFilter]);

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      code: row.code || "",
      name: row.name || "",
      botanical_name: row.botanical_name || "",
      category_id: row.category_id || "",
      type: row.type || "Perishable",
      unit: row.unit || "kg",
      shelf_life_days: row.shelf_life_days || 0,
      reorder_level: row.reorder_level || 0,
      storage_temp: row.storage_temp || "",
      unit_cost: row.unit_cost || 0,
      returnable: Number(row.returnable ?? 1),
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
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "returnable" ||
        name === "category_id" ||
        name === "shelf_life_days" ||
        name === "reorder_level" ||
        name === "unit_cost"
          ? value
          : value,
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!form.code || !form.name || !form.category_id || !form.type || !form.unit) {
      toast.error("Code, name, category, type and unit are required");
      return;
    }

    try {
      setSaving(true);
      await api.put(`/items/${editingId}`, {
        ...form,
        category_id: Number(form.category_id),
        shelf_life_days: Number(form.shelf_life_days || 0),
        reorder_level: Number(form.reorder_level || 0),
        unit_cost: Number(form.unit_cost || 0),
        returnable: Number(form.returnable),
      });
      toast.success("Item updated successfully");
      closeEdit();
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = window.confirm(`Delete item "${row.name}"?`);
    if (!ok) return;

    try {
      await api.delete(`/items/${row.id}`);
      toast.success("Item deleted successfully");
      await loadPage();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete item");
    }
  };

  return (
    <>
      <div className="ib ib-i">
        <span>🥬</span>
        <div>
          Item Master stores your real products, botanical names, category mapping, reorder level,
          shelf life and unit cost for inventory control.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="fs"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      
      <div className="tw">
        <div className="tw-h">
          <h3>Item Master</h3>
          <span className="badge bg-b">{filteredRows.length} items</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>CODE</th>
              <th>ITEM NAME</th>
              <th>BOTANICAL NAME</th>
              <th>CATEGORY</th>
              <th>TYPE</th>
              <th>UNIT</th>
              <th>REORDER</th>
              <th>COST</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--g800)" }}>
                    {row.code}
                  </td>
                  <td style={{ fontWeight: 700 }}>{row.name}</td>
                  <td>{row.botanical_name || "—"}</td>
                  <td>{row.category_name}</td>
                  <td>
                    <span className={`badge ${row.type === "Perishable" ? "bg-a" : "bg-b"}`}>
                      {row.type}
                    </span>
                  </td>
                  <td>{row.unit}</td>
                  <td>{Number(row.reorder_level || 0)}</td>
                  <td>LKR {Number(row.unit_cost || 0).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${row.status === "active" ? "bg-g" : "bg-r"}`}>
                      {row.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
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
                <td colSpan="10">No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showEditModal ? (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="md md-lg" onClick={(e) => e.stopPropagation()}>
            <div className="md-h">
              <h3>✏️ Edit Item</h3>
              <button type="button" className="md-x" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="md-b">
                <div className="fr">
                  <div className="ff">
                    <label className="fl">Item Code</label>
                    <input className="fc" name="code" value={form.code} onChange={handleChange} />
                  </div>
                  <div className="ff">
                    <label className="fl">Item Name</label>
                    <input className="fc" name="name" value={form.name} onChange={handleChange} />
                  </div>
                </div>

                <div className="fr">
                  <div className="ff">
                    <label className="fl">Botanical Name</label>
                    <input
                      className="fc"
                      name="botanical_name"
                      value={form.botanical_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="ff">
                    <label className="fl">Category</label>
                    <select
                      className="fc"
                      name="category_id"
                      value={form.category_id}
                      onChange={handleChange}
                    >
                      <option value="">Select category</option>
                      {categories.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="fr3">
                  <div className="ff">
                    <label className="fl">Type</label>
                    <select className="fc" name="type" value={form.type} onChange={handleChange}>
                      <option value="Perishable">Perishable</option>
                      <option value="Non-Perishable">Non-Perishable</option>
                    </select>
                  </div>
                  <div className="ff">
                    <label className="fl">Unit</label>
                    <input className="fc" name="unit" value={form.unit} onChange={handleChange} />
                  </div>
                  <div className="ff">
                    <label className="fl">Shelf Life (days)</label>
                    <input
                      className="fc"
                      type="number"
                      name="shelf_life_days"
                      value={form.shelf_life_days}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="fr3">
                  <div className="ff">
                    <label className="fl">Reorder Level</label>
                    <input
                      className="fc"
                      type="number"
                      step="0.01"
                      name="reorder_level"
                      value={form.reorder_level}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="ff">
                    <label className="fl">Unit Cost</label>
                    <input
                      className="fc"
                      type="number"
                      step="0.01"
                      name="unit_cost"
                      value={form.unit_cost}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="ff">
                    <label className="fl">Returnable</label>
                    <select
                      className="fc"
                      name="returnable"
                      value={form.returnable}
                      onChange={handleChange}
                    >
                      <option value={1}>Yes</option>
                      <option value={0}>No</option>
                    </select>
                  </div>
                </div>

                <div className="fr">
                  <div className="ff">
                    <label className="fl">Storage Temp</label>
                    <input
                      className="fc"
                      name="storage_temp"
                      value={form.storage_temp}
                      onChange={handleChange}
                      placeholder="Chilled / Ambient / Frozen"
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

                <div className="ff">
                  <label className="fl">Description</label>
                  <textarea
                    className="fc"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="4"
                  />
                </div>
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={closeEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-p" disabled={saving}>
                  {saving ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ItemListPage;