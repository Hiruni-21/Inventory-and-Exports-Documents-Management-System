import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const AddSupplierPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    supplier_name: "",
    contact_number: "",
    email: "",
    address: "",
    lead_time_days: "",
    return_eligibility: "Yes",
    rating_score: "",
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.supplier_name.trim() || !form.contact_number.trim()) {
      toast.error("Supplier name and contact number are required");
      return;
    }

    try {
      setSaving(true);

      await api.post("/suppliers", {
        supplier_name: form.supplier_name.trim(),
        contact_number: form.contact_number.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        lead_time_days: Number(form.lead_time_days || 0),
        return_eligibility: form.return_eligibility,
        rating_score: Number(form.rating_score || 0),
      });

      toast.success("Supplier added successfully");
      navigate("/suppliers");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to add supplier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="ib ib-i">
        <span>🌿</span>
        <div>
          Add suppliers for procurement and receiving. Save their contact details, lead time,
          return eligibility and rating.
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="content-card" style={{ marginTop: 16 }}>
          <div className="card-header-row">
            <h3>🌿 Add Supplier</h3>
          </div>

          <div style={{ padding: 20 }}>
            <div className="fs2">
              <div className="fst">Supplier Details</div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">
                    Supplier Name <span className="rq">*</span>
                  </label>
                  <input
                    className="fc"
                    name="supplier_name"
                    value={form.supplier_name}
                    onChange={handleChange}
                    placeholder="e.g. Green Farm Exports"
                  />
                </div>

                <div className="ff">
                  <label className="fl">
                    Contact Number <span className="rq">*</span>
                  </label>
                  <input
                    className="fc"
                    name="contact_number"
                    value={form.contact_number}
                    onChange={handleChange}
                    placeholder="0771234567"
                  />
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Email</label>
                  <input
                    className="fc"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="supplier@email.com"
                  />
                </div>

                <div className="ff">
                  <label className="fl">Lead Time (days)</label>
                  <input
                    className="fc"
                    type="number"
                    name="lead_time_days"
                    value={form.lead_time_days}
                    onChange={handleChange}
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Return Eligibility</label>
                  <select
                    className="fc"
                    name="return_eligibility"
                    value={form.return_eligibility}
                    onChange={handleChange}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">Rating Score</label>
                  <input
                    className="fc"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    name="rating_score"
                    value={form.rating_score}
                    onChange={handleChange}
                    placeholder="4.5"
                  />
                </div>
              </div>

              <div className="ff">
                <label className="fl">Address</label>
                <textarea
                  className="fc"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Supplier address..."
                />
              </div>
            </div>
          </div>

          <div className="md-f" style={{ padding: "16px 20px 20px" }}>
            <button type="button" className="btn btn-s" onClick={() => navigate("/suppliers")}>
              Cancel
            </button>

            <button type="submit" className="btn btn-p" disabled={saving}>
              {saving ? "Saving..." : "Save Supplier"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default AddSupplierPage;