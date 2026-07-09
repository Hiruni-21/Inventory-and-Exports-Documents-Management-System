import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const emptyForm = {
  supplier_name: "",
  contact_number: "",
  email: "",
  address: "",
  return_eligibility: "Yes",
  rating_score: "",
  status: "active",
};

const SupplierListPage = () => {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
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
    const handleOpenAdd = () => {
      openNew();
    };
    window.addEventListener("fw-open-add-supplier-modal", handleOpenAdd);
    return () => window.removeEventListener("fw-open-add-supplier-modal", handleOpenAdd);
  }, []);

  useEffect(() => {
    if (!showModal && !showDetailsModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeDetails();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal, showDetailsModal]);

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

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (row, e) => {
    if (e) e.stopPropagation();
    setEditingId(row.id);
    setForm({
      supplier_name: row.supplier_name || "",
      contact_number: row.contact_number || "",
      email: row.email || "",
      address: row.address || "",
      return_eligibility: row.return_eligibility || "Yes",
      rating_score: row.rating_score || "",
      status: row.status || "active",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const closeDetails = () => {
    setShowDetailsModal(false);
    setSelectedSupplier(null);
  };

  const handleRowClick = async (row) => {
    try {
      const res = await api.get(`/suppliers/${row.id}`);
      setSelectedSupplier(res.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load supplier details");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.supplier_name.trim() || !form.contact_number.trim()) {
      toast.error("Supplier name and contact number are required");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        supplier_name: form.supplier_name.trim(),
        contact_number: form.contact_number.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        return_eligibility: form.return_eligibility,
        rating_score: Number(form.rating_score || 0),
        status: form.status,
      };

      if (editingId) {
        await api.put(`/suppliers/${editingId}`, payload);
        toast.success("Supplier updated successfully");
      } else {
        await api.post("/suppliers", payload);
        toast.success("Supplier added successfully");
      }

      closeModal();
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row, e) => {
    if (e) e.stopPropagation();
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
              <th>RETURN ELIGIBLE</th>
              <th>RATING</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.id} onClick={() => handleRowClick(row)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: 700 }}>{row.supplier_name}</td>
                  <td>{row.contact_number || "—"}</td>
                  <td>{row.email || "—"}</td>
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
                      <button type="button" className="ab" title="Edit" onClick={(e) => openEdit(row, e)}>
                        ✏️
                      </button>
                      <button type="button" className="ab d" title="Delete" onClick={(e) => handleDelete(row, e)}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No suppliers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="md md-lg" onClick={(e) => e.stopPropagation()}>
            <div className="md-h">
              <h3>{editingId ? "✏️ Edit Supplier" : "🌿 Add Supplier"}</h3>
              <button type="button" className="md-x" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
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

                {editingId && (
                  <div className="ff">
                    <label className="fl">Status</label>
                    <select className="fc" name="status" value={form.status} onChange={handleChange}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={closeModal}>
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

      {showDetailsModal && selectedSupplier && (
        <div className="modal-backdrop" onClick={closeDetails}>
          <div className="md md-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="md-h">
              <h3>🔍 Supplier Details</h3>
              <button type="button" className="md-x" onClick={closeDetails}>
                ✕
              </button>
            </div>

            <div className="md-b">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                <div>
                  <h4 style={{ margin: "0 0 16px", color: "var(--g800)", borderBottom: "2px solid var(--border)", paddingBottom: 6 }}>Contact Profile</h4>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text3)" }}>Supplier Name</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{selectedSupplier.supplier_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text3)" }}>Contact Number</div>
                      <div style={{ fontSize: 14, color: "var(--text2)" }}>{selectedSupplier.contact_number || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text3)" }}>Email</div>
                      <div style={{ fontSize: 14, color: "var(--text2)" }}>{selectedSupplier.email || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text3)" }}>Address</div>
                      <div style={{ fontSize: 14, color: "var(--text2)", whiteSpace: "pre-wrap" }}>{selectedSupplier.address || "—"}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 16px", color: "var(--g800)", borderBottom: "2px solid var(--border)", paddingBottom: 6 }}>Metrics & Status</h4>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text3)" }}>Return Eligibility</div>
                      <span className={`badge ${String(selectedSupplier.return_eligibility || "Yes") === "Yes" ? "bg-g" : "bg-r"}`} style={{ marginTop: 4, display: "inline-block" }}>
                        {selectedSupplier.return_eligibility || "Yes"}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text3)" }}>Rating Score</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)" }}>{Number(selectedSupplier.rating_score || 0).toFixed(1)} / 5.0</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text3)" }}>Status</div>
                      <span className={`badge ${String(selectedSupplier.status || "active").toLowerCase() === "active" ? "bg-g" : "bg-r"}`} style={{ marginTop: 4, display: "inline-block" }}>
                        {String(selectedSupplier.status || "active").toLowerCase() === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                <h4 style={{ margin: "0 0 16px", color: "var(--g800)" }}>📦 What They Supply</h4>
                
                {(!selectedSupplier.items || selectedSupplier.items.length === 0) ? (
                  <div className="ib ib-i" style={{ margin: 0 }}>
                    <span>ℹ️</span>
                    <div>No linked items found for this supplier. You can link items from the <strong>Items form</strong> page.</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <h5 style={{ margin: "0 0 10px", color: "var(--text2)", borderBottom: "1px dashed var(--border)", paddingBottom: 4 }}>
                        📦 Packaging Materials
                      </h5>
                      {selectedSupplier.items.filter(i => i.stock_type === "packaging").length === 0 ? (
                        <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>No linked packaging materials.</div>
                      ) : (
                        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: "var(--text2)" }}>
                          {selectedSupplier.items
                            .filter(i => i.stock_type === "packaging")
                            .map(i => (
                              <li key={i.id} style={{ marginBottom: 4 }}>
                                <strong>{i.code}</strong> — {i.name}
                              </li>
                            ))
                          }
                        </ul>
                      )}
                    </div>

                    <div>
                      <h5 style={{ margin: "0 0 10px", color: "var(--text2)", borderBottom: "1px dashed var(--border)", paddingBottom: 4 }}>
                        🌱 Export Products
                      </h5>
                      {selectedSupplier.items.filter(i => i.stock_type === "produce").length === 0 ? (
                        <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>No linked produce products.</div>
                      ) : (
                        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: "var(--text2)" }}>
                          {selectedSupplier.items
                            .filter(i => i.stock_type === "produce")
                            .map(i => (
                              <li key={i.id} style={{ marginBottom: 4 }}>
                                <strong>{i.code}</strong> — {i.name}
                              </li>
                            ))
                          }
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="md-f">
              <button type="button" className="btn btn-s" onClick={closeDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupplierListPage;