import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const buildNextItemCode = (items, categoryName = "") => {
  const prefixMap = {
    "Organic Vegetables": "VEG",
    "Organic Fruits": "FRT",
    Herbs: "HRB",
    "Leafy Items & Lettuce Range": "LFL",
    "Dairy Products": "DAR",
    "Pussalla Products": "PUS",
    "NorFolk Products": "NOR",
    "Kern & Hundt Products": "KHU",
    "Munchee Products": "MUN",
    "Dry Items": "DRY",
    Mushrooms: "MSH",
    "Tea & Coffee": "TEA",
    "Other Products": "OTH",
    "Hotel Requirements": "HOT",
  };

  const prefix = prefixMap[categoryName] || "ITM";

  const highest = items.reduce((max, row) => {
    const match = String(row.code || "").match(/(\d+)$/);
    const num = match ? Number(match[1]) : 0;
    return Math.max(max, num);
  }, 0);

  return `FW-${prefix}-${String(highest + 1).padStart(3, "0")}`;
};

const AddItemPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [form, setForm] = useState({
    code: "",
    name: "",
    botanical_name: "",
    category_id: "",
    type: "Perishable",
    unit: "kg",
    shelf_life_days: 7,
    reorder_level: 10,
    storage_temp: "Chilled",
    unit_cost: 0,
    returnable: 1,
    description: "",
    status: "active",
  });

  const [saving, setSaving] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((row) => String(row.id) === String(form.category_id)),
    [categories, form.category_id]
  );

  const loadPage = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        api.get("/items/categories"),
        api.get("/items"),
      ]);

      const categoryRows = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      const itemRows = Array.isArray(itemsRes.data) ? itemsRes.data : [];

      setCategories(categoryRows);
      setItems(itemRows);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load item form data");
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;

    setForm((prev) => ({
      ...prev,
      code: prev.code || buildNextItemCode(items, selectedCategory.category_name),
    }));
  }, [selectedCategory, items]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "category_id") {
      const picked = categories.find((row) => String(row.id) === String(value));
      setForm((prev) => ({
        ...prev,
        category_id: value,
        code: buildNextItemCode(items, picked?.category_name),
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.code || !form.name || !form.category_id || !form.type || !form.unit) {
      toast.error("Code, name, category, type and unit are required");
      return;
    }

    try {
      setSaving(true);

      await api.post("/items", {
        ...form,
        category_id: Number(form.category_id),
        shelf_life_days: Number(form.shelf_life_days || 0),
        reorder_level: Number(form.reorder_level || 0),
        unit_cost: Number(form.unit_cost || 0),
        returnable: Number(form.returnable),
      });

      toast.success("Item created successfully");
      navigate("/items");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="md md-xl" style={{ maxWidth: "100%", display: "flex" }}>
      <div className="md-h">
        <h3>🥬 Add Item</h3>
        <button type="button" className="md-x" onClick={() => navigate("/items")}>
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="md-b">
          <div className="ib ib-i">
            <span>🥬</span>
            <div>
              Add real products from your Fresh World list such as organic vegetables, fruits,
              herbs, dairy and hotel requirements.
            </div>
          </div>

          <div className="fs2">
            <div className="fst">Basic Item Details</div>

            <div className="fr">
              <div className="ff">
                <label className="fl">Item Code</label>
                <input className="fc" name="code" value={form.code} onChange={handleChange} />
              </div>

              <div className="ff">
                <label className="fl">Item Name</label>
                <input
                  className="fc"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ash Pumpkin"
                />
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
                  placeholder="Benincasa hispida"
                />
              </div>

              <div className="ff">
                <label className="fl">Category</label>
                <select className="fc" name="category_id" value={form.category_id} onChange={handleChange}>
                  <option value="">Select category</option>
                  {categories.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.category_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="fs2">
            <div className="fst">Inventory Controls</div>

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
                <input
                  className="fc"
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  placeholder="kg / pcs / pkt"
                />
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
                <select className="fc" name="returnable" value={form.returnable} onChange={handleChange}>
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
                placeholder="Short item notes..."
              />
            </div>
          </div>
        </div>

        <div className="md-f">
          <button type="button" className="btn btn-s" onClick={() => navigate("/items")}>
            Cancel
          </button>
          <button type="submit" className="btn btn-p" disabled={saving}>
            {saving ? "Saving..." : "Save Item"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddItemPage;