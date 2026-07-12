import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const AddCategoryPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    category_name: "",
    description: "",
    status: "active",
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.category_name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSaving(true);

      await api.post("/items/categories", {
        category_name: form.category_name.trim(),
        description: form.description.trim(),
        status: form.status,
      });

      toast.success("Category created successfully");
      navigate("/categories");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="ib ib-i">

        <div>
          Create item categories that match your real Fresh World product groups such as Organic
          Vegetables, Organic Fruits, Herbs, Dairy Products and Hotel Requirements.
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="content-card" style={{ marginTop: 16 }}>
          <div className="card-header-row">
            <h3> Add Item Category</h3>
          </div>

          <div style={{ padding: 20 }}>
            <div className="fs2">
              <div className="fst">Category Details</div>

              <div className="ff">
                <label className="fl">
                  Category Name <span className="rq">*</span>
                </label>
                <input
                  className="fc"
                  name="category_name"
                  value={form.category_name}
                  onChange={handleChange}
                  placeholder="e.g. Organic Vegetables"
                />
              </div>

              <div className="ff">
                <label className="fl">Description</label>
                <textarea
                  className="fc"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Short description for this category..."
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
          </div>

          <div className="md-f" style={{ padding: "16px 20px 20px" }}>
            <button
              type="button"
              className="btn btn-s"
              onClick={() => navigate("/categories")}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-p" disabled={saving}>
              {saving ? "Saving..." : "Save Category"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default AddCategoryPage;