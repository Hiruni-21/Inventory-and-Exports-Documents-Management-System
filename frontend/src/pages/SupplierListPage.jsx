import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const emptyForm = {
  supplier_name: "",
  contact_number: "",
  email: "",
  address: "",
  lead_time_days: "",
  return_eligibility: "Yes",
  rating_score: "",
  status: "active",
};

const SupplierListPage = () => {
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
      const res = await api.get("/suppliers");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load suppliers");
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
          : [
              row.supplier_name,
              row.contact_number,
              row.email,
              row.address,
              row.return_eligibility,
              row.rating_score,
              row.status,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q)
      )
      .sort((a, b) =>
        String(a.supplier_name || "").localeCompare(String(b.supplier_name || ""), undefined, {
          sensitivity: "base",
        })
      );
  }, [rows, search]);

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      supplier_name: row.supplier_name || "",
      contact_number: row.contact_number || "",
      email: row.email || "",
      address: row.address || "",
      lead_time_days: row.lead_time_days || "",
      return_eligibility: row.return_eligibility || "Yes",
      rating_score: row.rating_score || "",
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

    if (!form.supplier_name.trim() || !form.contact_number.trim()) {
      toast.error("Supplier name and contact number are required");
      return;
    }

    try {
      setSaving(true);
      await api.put(`/suppliers/${editingId}`, {
        supplier_name: form.supplier_name.trim(),
        contact_number: form.contact_number.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        lead_time_days: Number(form.lead_time_days || 0),
        return_eligibility: form.return_eligibility,
        rating_score: Number(form.rating_score || 0),
        status: form.status,
      });

      toast.success("Supplier updated successfully");
      closeEdit();
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = window.confirm(`Delete supplier "${row.supplier_name}"?`);
    if (!ok) return;

    try {
      await api.delete(`/suppliers/${row.id}`);
      toast.success("Supplier deleted successfully");
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete supplier");
    }
  };

  return (
    <>
      <div className="ib ib-i">
        <span>🌿</span>
        <div>
          Supplier master for procurement. Keep supplier contacts, lead time, return eligibility and
          rating up to date.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Suppliers</h3>
          <span className="badge bg-b">{filteredRows.length} suppliers</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>SUPPLIER NAME</th>
              <th>CONTACT NUMBER</th>
              <th>EMAIL</th>
              <th>LEAD TIME</th>
              <th>RETURN ELIGIBLE</th>
              <th>RATING</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 700 }}>{row.supplier_name}</td>
                  <td>{row.contact_number || "—"}</td>
                  <td>{row.email || "—"}</td>
                  <td>{Number(row.lead_time_days || 0)} days</td>
                  <td>
                    <span className={`badge ${String(row.return_eligibility || "Yes") === "Yes" ? "bg-g" : "bg-r"}`}>
                      {row.return_eligibility || "Yes"}
                    </span>
                  </td>
                  <td>{Number(row.rating_score || 0).toFixed(1)}</td>
                  <td>
                    <span className={`badge ${String(row.status || "active").toLowerCase() === "active" ? "bg-g" : "bg-r"}`}>
                      {String(row.status || "active").toLowerCase() === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="ab" title="Edit" onClick={() => openEdit(row)}>
                        ✏️
                      </button>
                      <button type="button" className="ab d" title="Delete" onClick={() => handleDelete(row)}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No suppliers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showEditModal && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="md md-lg" onClick={(e) => e.stopPropagation()}>
            <div className="md-h">
              <h3>✏️ Edit Supplier</h3>
              <button type="button" className="md-x" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="md-b">
                <div className="fr">
                  <div className="ff">
                    <label className="fl">Supplier Name</label>
                    <input className="fc" name="supplier_name" value={form.supplier_name} onChange={handleChange} />
                  </div>
                  <div className="ff">
                    <label className="fl">Contact Number</label>
                    <input className="fc" name="contact_number" value={form.contact_number} onChange={handleChange} />
                  </div>
                </div>

                <div className="fr">
                  <div className="ff">
                    <label className="fl">Email</label>
                    <input className="fc" type="email" name="email" value={form.email} onChange={handleChange} />
                  </div>
                  <div className="ff">
                    <label className="fl">Lead Time (days)</label>
                    <input className="fc" type="number" name="lead_time_days" value={form.lead_time_days} onChange={handleChange} />
                  </div>
                </div>

                <div className="fr">
                  <div className="ff">
                    <label className="fl">Return Eligibility</label>
                    <select className="fc" name="return_eligibility" value={form.return_eligibility} onChange={handleChange}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="ff">
                    <label className="fl">Rating Score</label>
                    <input className="fc" type="number" step="0.1" min="0" max="5" name="rating_score" value={form.rating_score} onChange={handleChange} />
                  </div>
                </div>

                <div className="ff">
                  <label className="fl">Address</label>
                  <textarea className="fc" name="address" value={form.address} onChange={handleChange} rows="4" />
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
                  {saving ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SupplierListPage;