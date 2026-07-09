import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const prefixMap = {
  "Organic Vegetables": "VEG",
  Vegetables: "VEG",
  "Organic Fruits": "FRT",
  Fruits: "FRT",
  Herbs: "HRB",
  "Leafy Items & Lettuce Range": "LFL",
  "Leafy Greens": "LFL",
  "Leafy Greens & Lettuce": "LFL",
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
  "Cartons / Boxes": "CTN",
  "Regiform / Foam": "FOA",
  "Liners": "LIN",
  "Labels": "LBL",
  "Tape / Wrapping": "TAP",
  "Cooling Materials": "COL",
  "Bags / Vacuum Packs": "BAG",
  "Dividers / Inserts": "DIV",
  "Trays / Crates": "TRY",
  "Hotel Packing Supplies": "HPK",
};

const buildNextItemCode = (items, categoryName = "") => {
  const prefix = prefixMap[categoryName] || "ITM";

  const existingCodes = new Set(items.map((row) => String(row.code || "").trim().toLowerCase()));

  const matching = items.filter((row) => {
    const code = String(row.code || "").toUpperCase();
    return code.includes(`FW-${prefix}-`) || code.includes(`${prefix}-`);
  });

  let highest = matching.reduce((max, row) => {
    const match = String(row.code || "").match(/(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Math.max(max, value);
  }, 0);

  let nextNum = highest + 1;
  let code = `FW-${prefix}-${String(nextNum).padStart(3, "0")}`;

  const isTaken = (c) => {
    const lc = c.toLowerCase();
    if (existingCodes.has(lc)) return true;
    const bare = lc.replace(/^fw-/, "");
    if (existingCodes.has(bare)) return true;
    return false;
  };

  while (isTaken(code)) {
    nextNum++;
    code = `FW-${prefix}-${String(nextNum).padStart(3, "0")}`;
  }

  return code;
};

const AddItemPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    stock_type: "produce",
  });

  const selectedCategory = useMemo(
    () => categories.find((row) => String(row.id) === String(form.category_id)),
    [categories, form.category_id]
  );

  const loadPage = async () => {
    try {
      setLoading(true);

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
      setCategories([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;

    setForm((prev) => ({
      ...prev,
      code: buildNextItemCode(items, selectedCategory.category_name),
    }));
  }, [selectedCategory, items]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "category_id") {
      const picked = categories.find((row) => String(row.id) === String(value));

      setForm((prev) => ({
        ...prev,
        category_id: value,
        code: buildNextItemCode(items, picked?.category_name || ""),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCodeBlur = (e) => {
    const value = e.target.value;
    if (!value.trim()) return;

    const isTaken = items.some(
      (row) => String(row.code || "").trim().toLowerCase() === value.trim().toLowerCase()
    );

    if (isTaken) {
      toast.error(`Item code "${value}" is already taken. A fresh unique code has been suggested.`);
      const freshCode = buildNextItemCode(items, selectedCategory?.category_name || "");
      setForm((prev) => ({
        ...prev,
        code: freshCode,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.code || !form.name || !form.category_id || !form.type || !form.unit) {
      toast.error("Code, name, category, type and unit are required");
      return;
    }

    const isTaken = items.some(
      (row) => String(row.code || "").trim().toLowerCase() === form.code.trim().toLowerCase()
    );

    if (isTaken) {
      toast.error(`Item code "${form.code}" is already taken. Suggesting a new unique code...`);
      const freshCode = buildNextItemCode(items, selectedCategory?.category_name || "");
      setForm((prev) => ({
        ...prev,
        code: freshCode,
      }));
      return;
    }

    try {
      setSaving(true);

      await api.post("/items", {
        code: form.code,
        name: form.name.trim(),
        botanical_name: form.botanical_name.trim(),
        category_id: Number(form.category_id),
        type: form.type,
        unit: form.unit.trim(),
        shelf_life_days: Number(form.shelf_life_days || 0),
        reorder_level: Number(form.reorder_level || 0),
        storage_temp: form.storage_temp.trim(),
        unit_cost: Number(form.unit_cost || 0),
        returnable: Number(form.returnable),
        description: form.description.trim(),
        status: form.status,
        stock_type: form.stock_type,
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
    <>
      <div className="ib ib-i">
        <span>🥬</span>
        <div>
          Add real Fresh World products with botanical names, category mapping, reorder level,
          shelf life, storage temperature and unit cost.
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="content-card" style={{ marginTop: 16 }}>
          <div className="card-header-row">
            <h3>🥬 Add Item</h3>
          </div>

          <div style={{ padding: 20 }}>
            {loading ? (
              <div className="ib ib-i">
                <span>⏳</span>
                <div>Loading item form data...</div>
              </div>
            ) : (
              <>
                <div className="fs2">
                  <div className="fst">Basic Item Details</div>

                  <div className="fr">
                    <div className="ff">
                      <label className="fl">
                        Item Code <span className="rq">*</span>
                      </label>
                      <input
                        className="fc"
                        name="code"
                        value={form.code}
                        onChange={handleChange}
                        onBlur={handleCodeBlur}
                        placeholder="FW-VEG-001"
                      />
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Item Name <span className="rq">*</span>
                      </label>
                      <input
                        className="fc"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. Ash Pumpkin"
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
                        placeholder="e.g. Benincasa hispida"
                      />
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Category <span className="rq">*</span>
                      </label>
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

                    <div className="ff">
                      <label className="fl">
                        Stock Type <span className="rq">*</span>
                      </label>
                      <select
                        className="fc"
                        name="stock_type"
                        value={form.stock_type}
                        onChange={handleChange}
                      >
                        <option value="produce">Produce</option>
                        <option value="packaging">Packaging</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="fs2">
                  <div className="fst">Inventory Controls</div>

                  <div className="fr3">
                    <div className="ff">
                      <label className="fl">
                        Type <span className="rq">*</span>
                      </label>
                      <select className="fc" name="type" value={form.type} onChange={handleChange}>
                        <option value="Perishable">Perishable</option>
                        <option value="Non-Perishable">Non-Perishable</option>
                      </select>
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Unit <span className="rq">*</span>
                      </label>
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
                      <select
                        className="fc"
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                      >
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
              </>
            )}
          </div>

          <div className="md-f" style={{ padding: "16px 20px 20px" }}>
            <button
              type="button"
              className="btn btn-s"
              onClick={() => navigate("/items")}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-p" disabled={saving || loading}>
              {saving ? "Saving..." : "Save Item"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default AddItemPage;