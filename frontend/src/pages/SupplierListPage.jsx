import { useEffect, useMemo, useState } from "react";
import { Leaf, Mail, MessageCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const emptyForm = {
  supplier_code: "",
  supplier_name: "",
  contact_person: "",
  contact_number: "",
  whatsapp_number: "",
  email: "",
  address: "",
  city: "",
  payment_terms: "Immediate cash on delivery",
  lead_time_days: "",
  notes: "",
  organic_certified: true,
  accepts_returns: true,
  portal_enabled: false,
  portal_email: "",
  portal_password: "",
  item_ids: [],
  status: "active",
};

const statusLabel = (value) => (String(value || "active").toLowerCase() === "inactive" ? "Inactive" : "Active");

const normalizeSupplier = (row = {}) => ({
  id: Number(row.id || 0),
  supplier_code: row.supplier_code || row.code || "—",
  supplier_name: row.supplier_name || "—",
  contact_person: row.contact_person || "—",
  contact_number: row.contact_number || "",
  whatsapp_number: row.whatsapp_number || row.contact_number || "",
  email: row.email || "",
  address: row.address || "",
  city: row.city || "—",
  payment_terms: row.payment_terms || "—",
  lead_time_days: Number(row.lead_time_days || 0),
  notes: row.notes || "",
  organic_certified: Number(row.organic_certified || 0) === 1,
  accepts_returns:
    row.accepts_returns !== undefined && row.accepts_returns !== null
      ? Number(row.accepts_returns) === 1
      : String(row.return_eligibility || "Yes").toLowerCase() === "yes",
  portal_enabled: Number(row.portal_enabled || 0) === 1,
  portal_user_email: row.portal_user_email || row.portal_email || "",
  status: String(row.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
  item_count: Number(row.item_count || 0),
  item_names: row.item_names || "",
  total_purchase_orders: Number(row.total_purchase_orders || 0),
  total_return_notes: Number(row.total_return_notes || 0),
  last_order_at: row.last_order_at || "",
  purchase_orders: Array.isArray(row.purchase_orders) ? row.purchase_orders : [],
  return_notes: Array.isArray(row.return_notes) ? row.return_notes : [],
  items: Array.isArray(row.items) ? row.items : [],
});

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const SupplierListPage = () => {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All Districts");
  const [quickFilter, setQuickFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadRows = async ({ focusId } = {}) => {
    try {
      setLoading(true);
      const res = await api.get("/suppliers");
      const normalized = Array.isArray(res.data) ? res.data.map(normalizeSupplier) : [];
      setRows(normalized);

      if (focusId) {
        const found = normalized.find((row) => Number(row.id) === Number(focusId));
        if (found) {
          setSelectedRowId(found.id);
          await openDetails(found.id, { skipListRefresh: true, fallbackRow: found });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load suppliers");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const res = await api.get("/items");
      const list = Array.isArray(res.data)
        ? res.data.map((item) => ({
            id: Number(item.id || item.item_id || 0),
            code: item.code || item.item_code || "",
            name: item.name || item.item_name || "",
          }))
        : [];
      setItems(list.filter((item) => item.id && item.name));
    } catch (err) {
      console.error("Supplier items picker load failed:", err);
      setItems([]);
    }
  };

  useEffect(() => {
    loadRows();
    loadItems();
  }, []);

  useEffect(() => {
    if (!showModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  const districtOptions = useMemo(() => {
    const options = Array.from(new Set(rows.map((row) => row.city).filter(Boolean))).sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
    );
    return ["All Districts", ...options];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        q === ""
          ? true
          : [
              row.supplier_code,
              row.supplier_name,
              row.contact_person,
              row.contact_number,
              row.whatsapp_number,
              row.email,
              row.city,
              row.item_names,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q);

      const matchesDistrict = cityFilter === "All Districts" ? true : row.city === cityFilter;

      const matchesQuick =
        quickFilter === "all"
          ? true
          : quickFilter === "certified"
          ? row.organic_certified
          : row.portal_enabled;

      return matchesSearch && matchesDistrict && matchesQuick;
    });
  }, [rows, search, cityFilter, quickFilter]);

  const openAddModal = () => {
    const previewCode = `FW-SUP-${String(rows.length + 1).padStart(3, "0")}`;
    setModalMode("add");
    setForm({ ...emptyForm, supplier_code: previewCode });
    setShowModal(true);
  };

  const openEditModal = (supplier) => {
    const supplierItemIds = Array.isArray(supplier.items)
      ? supplier.items.map((item) => Number(item.item_id)).filter(Boolean)
      : [];

    setModalMode("edit");
    setForm({
      supplier_code: supplier.supplier_code || "",
      supplier_name: supplier.supplier_name || "",
      contact_person: supplier.contact_person === "—" ? "" : supplier.contact_person || "",
      contact_number: supplier.contact_number || "",
      whatsapp_number: supplier.whatsapp_number || supplier.contact_number || "",
      email: supplier.email || "",
      address: supplier.address || "",
      city: supplier.city === "—" ? "" : supplier.city || "",
      payment_terms: supplier.payment_terms === "—" ? "Immediate cash on delivery" : supplier.payment_terms || "Immediate cash on delivery",
      lead_time_days: supplier.lead_time_days ? String(supplier.lead_time_days) : "",
      notes: supplier.notes || "",
      organic_certified: !!supplier.organic_certified,
      accepts_returns: !!supplier.accepts_returns,
      portal_enabled: !!supplier.portal_enabled,
      portal_email: supplier.portal_user_email || supplier.email || "",
      portal_password: "",
      item_ids: supplierItemIds,
      status: supplier.status || "active",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSaving(false);
    setForm(emptyForm);
  };

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setSelectedSupplier(null);
    setSelectedRowId(null);
  };

  const openDetails = async (supplierId, options = {}) => {
    try {
      if (!options.skipListRefresh) {
        setLoadingDetails(true);
      }

      const res = await api.get(`/suppliers/${supplierId}`);
      const normalized = normalizeSupplier(res.data);
      setSelectedSupplier(normalized);
      setSelectedRowId(normalized.id);
      setShowDetailsPanel(true);
    } catch (err) {
      console.error(err);
      const fallback = options.fallbackRow || rows.find((row) => row.id === supplierId) || null;
      if (fallback) {
        setSelectedSupplier(fallback);
        setSelectedRowId(fallback.id);
        setShowDetailsPanel(true);
      }
      toast.error(err?.response?.data?.message || "Failed to load supplier details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRowOpen = (supplier) => {
    openDetails(supplier.id, { fallbackRow: supplier });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddItem = (itemId) => {
    if (!itemId) return;
    setForm((prev) => {
      const ids = new Set((prev.item_ids || []).map(String));
      ids.add(String(itemId));
      return { ...prev, item_ids: Array.from(ids) };
    });
  };

  const handleRemoveItem = (itemId) => {
    setForm((prev) => ({
      ...prev,
      item_ids: (prev.item_ids || []).filter((id) => String(id) !== String(itemId)),
    }));
  };

  const selectedItemObjects = useMemo(() => {
    const itemMap = new Map(items.map((item) => [String(item.id), item]));
    return (form.item_ids || [])
      .map((id) => itemMap.get(String(id)))
      .filter(Boolean);
  }, [form.item_ids, items]);

  const handleSaveSupplier = async (e) => {
    e.preventDefault();

    if (!form.supplier_name.trim() || !form.contact_number.trim()) {
      toast.error("Supplier name and contact number are required");
      return;
    }

    const payload = {
      supplier_code: form.supplier_code,
      supplier_name: form.supplier_name.trim(),
      contact_person: form.contact_person.trim(),
      contact_number: form.contact_number.trim(),
      whatsapp_number: (form.whatsapp_number || form.contact_number).trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      payment_terms: form.payment_terms.trim(),
      lead_time_days: Number(form.lead_time_days || 0),
      notes: form.notes.trim(),
      organic_certified: form.organic_certified ? 1 : 0,
      accepts_returns: form.accepts_returns ? 1 : 0,
      portal_enabled: form.portal_enabled ? 1 : 0,
      portal_email: form.portal_email.trim(),
      portal_password: form.portal_password.trim(),
      item_ids: (form.item_ids || []).map((id) => Number(id)).filter(Boolean),
      status: form.status,
    };

    try {
      setSaving(true);

      let savedId = null;
      if (modalMode === "add") {
        const res = await api.post("/suppliers", payload);
        savedId = res.data?.supplierId;
        toast.success("Supplier added successfully");
      } else if (selectedSupplier?.id) {
        const res = await api.put(`/suppliers/${selectedSupplier.id}`, payload);
        savedId = res.data?.supplierId || selectedSupplier.id;
        toast.success("Supplier updated successfully");
      }

      closeModal();
      await loadRows({ focusId: savedId || selectedSupplier?.id || null });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier?.id) return;

    const ok = window.confirm(`Delete supplier \"${selectedSupplier.supplier_name}\"?`);
    if (!ok) return;

    try {
      const res = await api.delete(`/suppliers/${selectedSupplier.id}`);
      toast.success(res.data?.message || "Supplier removed successfully");
      closeDetailsPanel();
      await loadRows();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete supplier");
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Supplier Code",
      "Supplier Name",
      "Contact Person",
      "Contact Number",
      "WhatsApp",
      "Email",
      "District",
      "Payment Terms",
      "Lead Time Days",
      "Organic Certified",
      "Accepts Returns",
      "Portal Enabled",
      "Status",
    ];

    const csvRows = filteredRows.map((row) => [
      row.supplier_code,
      row.supplier_name,
      row.contact_person,
      row.contact_number,
      row.whatsapp_number,
      row.email,
      row.city,
      row.payment_terms,
      row.lead_time_days,
      row.organic_certified ? "Yes" : "No",
      row.accepts_returns ? "Yes" : "No",
      row.portal_enabled ? "Yes" : "No",
      statusLabel(row.status),
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fresh-world-suppliers.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Supplier CSV exported");
  };

  const openWhatsApp = (e, supplier) => {
    e?.stopPropagation?.();
    const phone = String(supplier.whatsapp_number || supplier.contact_number || "").replace(/\D/g, "");
    if (!phone) {
      toast.error("No WhatsApp number saved for this supplier");
      return;
    }

    window.open(`https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
  };

  const openEmail = (e, supplier) => {
    e?.stopPropagation?.();
    if (!supplier.email) {
      toast.error("No email saved for this supplier");
      return;
    }

    window.open(`mailto:${supplier.email}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="notice-banner notice-success">
        <Leaf size={16} />
        <span>
          Supplier master is now backend-connected. Add, edit, deactivate, and review supplier
          procurement history from this page.
        </span>
      </div>

        <div
          className="fb"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          <div
            className="fb"
            style={{
              marginBottom: 0,
              gap: 10,
              flex: "1 1 auto",
              minWidth: 0,
              flexWrap: "wrap",
            }}
          >          
          <div className="search-field" style={{ minWidth: 260 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="filter-select" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            {districtOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>

          <button type="button" className={`ft ${quickFilter === "all" ? "on" : ""}`} onClick={() => setQuickFilter("all")}>
            All ({rows.length})
          </button>
          <button
            type="button"
            className={`ft ${quickFilter === "certified" ? "on" : ""}`}
            onClick={() => setQuickFilter("certified")}
          >
            Certified ({rows.filter((row) => row.organic_certified).length})
          </button>
          <button
            type="button"
            className={`ft ${quickFilter === "portal" ? "on" : ""}`}
            onClick={() => setQuickFilter("portal")}
          >
            Portal Active ({rows.filter((row) => row.portal_enabled).length})
          </button>
        </div>

        <div
          className="fb"
          style={{
            marginBottom: 0,
            marginLeft: "auto",
            flexShrink: 0,
            gap: 10,
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
            Export CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>🌿 Registered Suppliers</h3>
          <span className="count-pill">{filteredRows.length} suppliers</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>SUPPLIER NAME</th>
                <th>CONTACT</th>
                <th>MOBILE</th>
                <th>DISTRICT</th>
                <th>ITEMS</th>
                <th>ORGANIC</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="empty-row">
                    Loading suppliers...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((supplier) => (
                  <tr
                    key={supplier.id}
                    onClick={() => handleRowOpen(supplier)}
                    className={selectedRowId === supplier.id ? "details-row-active" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="code-cell">{supplier.supplier_code}</td>
                    <td className="strong-cell">{supplier.supplier_name}</td>
                    <td>{supplier.contact_person}</td>
                    <td>{supplier.contact_number || "—"}</td>
                    <td>{supplier.city}</td>
                    <td>{supplier.item_count}</td>
                    <td>
                      <span className={supplier.organic_certified ? "status-text yes-text" : "status-text no-text"}>
                        {supplier.organic_certified ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <span className={supplier.status === "active" ? "status-text yes-text" : "status-text no-text"}>
                        {statusLabel(supplier.status)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="WhatsApp supplier"
                          onClick={(e) => openWhatsApp(e, supplier)}
                        >
                          <MessageCircle size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="Email supplier"
                          onClick={(e) => openEmail(e, supplier)}
                        >
                          <Mail size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-row">
                    No suppliers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetailsPanel && selectedSupplier && (
        <>
          <div className="details-panel-overlay" onClick={closeDetailsPanel}></div>

          <div className={`details-panel ${showDetailsPanel ? "open" : ""}`}>
            <div className="details-panel-header">
              <div className="details-panel-icon">🌿</div>

              <div className="details-panel-head-text">
                <h3>{selectedSupplier.supplier_name}</h3>
                <p>
                  {selectedSupplier.city} · {selectedSupplier.contact_person}
                </p>
              </div>

              <button type="button" className="details-panel-close" onClick={closeDetailsPanel}>
                <X size={18} />
              </button>
            </div>

            <div className="details-panel-body">
              {loadingDetails ? (
                <div className="empty-row" style={{ padding: 24 }}>
                  Loading supplier details...
                </div>
              ) : (
                <>
                  <div className="details-panel-grid">
                    <div className="details-stat-card">
                      <label>CODE</label>
                      <span>{selectedSupplier.supplier_code}</span>
                    </div>
                    <div className="details-stat-card">
                      <label>STATUS</label>
                      <span className={selectedSupplier.status === "active" ? "yes-text" : "no-text"}>
                        {statusLabel(selectedSupplier.status)}
                      </span>
                    </div>
                    <div className="details-stat-card">
                      <label>CONTACT PERSON</label>
                      <span>{selectedSupplier.contact_person}</span>
                    </div>
                    <div className="details-stat-card">
                      <label>MOBILE</label>
                      <span>{selectedSupplier.contact_number || "—"}</span>
                    </div>
                    <div className="details-stat-card">
                      <label>WHATSAPP</label>
                      <span>{selectedSupplier.whatsapp_number || "—"}</span>
                    </div>
                    <div className="details-stat-card">
                      <label>EMAIL</label>
                      <span>{selectedSupplier.email || "—"}</span>
                    </div>
                    <div className="details-stat-card">
                      <label>DISTRICT</label>
                      <span>{selectedSupplier.city}</span>
                    </div>
                    <div className="details-stat-card">
                      <label>PAYMENT TERMS</label>
                      <span>{selectedSupplier.payment_terms}</span>
                    </div>
                    <div className="details-stat-card">
                      <label>LEAD TIME</label>
                      <span>{selectedSupplier.lead_time_days} days</span>
                    </div>
                    <div className="details-stat-card">
                      <label>RETURNS</label>
                      <span className={selectedSupplier.accepts_returns ? "yes-text" : "no-text"}>
                        {selectedSupplier.accepts_returns ? "Accepted" : "Not accepted"}
                      </span>
                    </div>
                    <div className="details-stat-card">
                      <label>ORGANIC</label>
                      <span className={selectedSupplier.organic_certified ? "yes-text" : "no-text"}>
                        {selectedSupplier.organic_certified ? "Certified" : "No"}
                      </span>
                    </div>
                    <div className="details-stat-card">
                      <label>PORTAL</label>
                      <span className={selectedSupplier.portal_enabled ? "yes-text" : "no-text"}>
                        {selectedSupplier.portal_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="details-stat-card details-stat-card-full">
                      <label>ADDRESS</label>
                      <span>{selectedSupplier.address || "—"}</span>
                    </div>
                    <div className="details-stat-card details-stat-card-full">
                      <label>ITEMS SUPPLIED</label>
                      <span>{selectedSupplier.item_names || "No linked items yet"}</span>
                    </div>
                  </div>

                  <div className="details-stat-card details-stat-card-full">
                    <label>NOTES</label>
                    <span>{selectedSupplier.notes || "—"}</span>
                  </div>

                  <div className="details-mini-title">RECENT PURCHASE ORDERS</div>
                  <table className="details-mini-table">
                    <thead>
                      <tr>
                        <th>PO</th>
                        <th>DATE</th>
                        <th>ITEMS</th>
                        <th>VALUE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSupplier.purchase_orders?.length ? (
                        selectedSupplier.purchase_orders.map((order) => (
                          <tr key={order.id}>
                            <td>{order.po_number}</td>
                            <td>{formatDate(order.order_date)}</td>
                            <td>{order.item_count}</td>
                            <td>
                              {Number(order.total_amount || 0).toLocaleString("en-LK", {
                                style: "currency",
                                currency: "LKR",
                                minimumFractionDigits: 0,
                              })}
                            </td>
                            <td>{String(order.status || "draft").replace(/_/g, " ")}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="empty-row">
                            Purchase orders for this supplier will appear here.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="details-mini-title">RECENT RETURN NOTES</div>
                  <table className="details-mini-table">
                    <thead>
                      <tr>
                        <th>RETURN</th>
                        <th>DATE</th>
                        <th>ITEMS</th>
                        <th>QTY</th>
                        <th>DEDUCTED?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSupplier.return_notes?.length ? (
                        selectedSupplier.return_notes.map((returnNote) => (
                          <tr key={returnNote.id}>
                            <td>{returnNote.return_number}</td>
                            <td>{formatDate(returnNote.return_date)}</td>
                            <td>{returnNote.item_count}</td>
                            <td>{Number(returnNote.total_qty || 0).toFixed(2)}</td>
                            <td>{Number(returnNote.deducted_from_supplier_payment || 0) === 1 ? "Yes" : "No"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="empty-row">
                            Return history for this supplier will appear here.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="details-panel-footer">
              <button
                type="button"
                className="btn btn-primary details-panel-btn-main"
                onClick={() => openEditModal(selectedSupplier)}
              >
                <Pencil size={16} /> Edit
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={(e) => openEmail(e, selectedSupplier)}
              >
                <Mail size={16} /> Email
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={(e) => openWhatsApp(e, selectedSupplier)}
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button
                type="button"
                className="btn btn-danger-outline details-panel-btn-delete"
                onClick={handleDeleteSupplier}
                title="Delete supplier"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-shell modal-lg customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === "add" ? "🌿 Add Supplier" : "✏️ Edit Supplier"}</h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="customer-modal-form">
              <div className="customer-modal-scroll">
                <div className="notice-banner notice-success notice-inside-modal">
                  <Leaf size={16} />
                  <span>
                    Supplier records are now saved to the real backend. Optional supplier portal access
                    can also be linked from this form.
                  </span>
                </div>

                <div className="customer-section-title">Supplier Identity</div>
                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>SUPPLIER CODE</label>
                    <input type="text" name="supplier_code" value={form.supplier_code} readOnly />
                  </div>
                  <div className="form-group">
                    <label>SUPPLIER / FARM NAME *</label>
                    <input
                      type="text"
                      name="supplier_name"
                      value={form.supplier_name}
                      onChange={handleChange}
                      placeholder="Perera Organic Farm"
                    />
                  </div>
                </div>

                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>CONTACT PERSON</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={form.contact_person}
                      onChange={handleChange}
                      placeholder="Sunil Perera"
                    />
                  </div>
                  <div className="form-group">
                    <label>MOBILE / WHATSAPP *</label>
                    <input
                      type="text"
                      name="contact_number"
                      value={form.contact_number}
                      onChange={handleChange}
                      placeholder="07X XXX XXXX"
                    />
                  </div>
                </div>

                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>WHATSAPP NUMBER</label>
                    <input
                      type="text"
                      name="whatsapp_number"
                      value={form.whatsapp_number}
                      onChange={handleChange}
                      placeholder="07X XXX XXXX"
                    />
                  </div>
                  <div className="form-group">
                    <label>EMAIL</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="supplier@email.com"
                    />
                  </div>
                </div>

                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>DISTRICT</label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Kurunegala"
                    />
                  </div>
                  <div className="form-group">
                    <label>PAYMENT TERMS</label>
                    <input
                      type="text"
                      name="payment_terms"
                      value={form.payment_terms}
                      onChange={handleChange}
                      placeholder="Immediate cash on delivery"
                    />
                  </div>
                </div>

                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>LEAD TIME (DAYS)</label>
                    <input
                      type="number"
                      min="0"
                      name="lead_time_days"
                      value={form.lead_time_days}
                      onChange={handleChange}
                      placeholder="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>STATUS</label>
                    <select name="status" value={form.status} onChange={handleChange}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>ADDRESS</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Farm / delivery address..."
                  />
                </div>

                <div className="customer-section-title">Certification & Supply</div>
                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>ORGANIC CERTIFIED?</label>
                    <div className="toggle-row">
                      <button
                        type="button"
                        className={`toggle-btn ${form.organic_certified ? "active" : ""}`}
                        onClick={() => handleToggle("organic_certified", true)}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${!form.organic_certified ? "active" : ""}`}
                        onClick={() => handleToggle("organic_certified", false)}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>ACCEPTS RETURNS?</label>
                    <div className="toggle-row">
                      <button
                        type="button"
                        className={`toggle-btn ${form.accepts_returns ? "active" : ""}`}
                        onClick={() => handleToggle("accepts_returns", true)}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${!form.accepts_returns ? "active" : ""}`}
                        onClick={() => handleToggle("accepts_returns", false)}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>ITEMS SUPPLIED</label>
                  <div className="form-grid two-col" style={{ alignItems: "center" }}>
                    <select
                      onChange={(e) => {
                        handleAddItem(e.target.value);
                        e.target.value = "";
                      }}
                      defaultValue=""
                    >
                      <option value="">Select item to add</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} {item.code ? `(${item.code})` : ""}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>
                      {items.length
                        ? "Selected items appear below"
                        : "Item picker will populate when the Item Master API is available"}
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      minHeight: 46,
                      borderRadius: 14,
                      border: "1px solid var(--line)",
                      background: "#f8fbf7",
                      padding: 10,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {selectedItemObjects.length ? (
                      selectedItemObjects.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          style={{
                            border: "1px solid #b9e0c6",
                            background: "#eaf8ef",
                            color: "#23824c",
                            borderRadius: 999,
                            padding: "6px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {item.name} ×
                        </button>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text3)" }}>No items linked yet</span>
                    )}
                  </div>
                </div>

                <div className="customer-section-title">Supplier Portal</div>
                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>ENABLE PORTAL LOGIN?</label>
                    <div className="toggle-row">
                      <button
                        type="button"
                        className={`toggle-btn ${form.portal_enabled ? "active" : ""}`}
                        onClick={() => handleToggle("portal_enabled", true)}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${!form.portal_enabled ? "active" : ""}`}
                        onClick={() => handleToggle("portal_enabled", false)}
                      >
                        No
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>PORTAL EMAIL</label>
                    <input
                      type="email"
                      name="portal_email"
                      value={form.portal_email}
                      onChange={handleChange}
                      placeholder="supplier@farm.lk"
                      disabled={!form.portal_enabled}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    {modalMode === "add" ? "TEMPORARY PORTAL PASSWORD" : "NEW PORTAL PASSWORD (OPTIONAL)"}
                  </label>
                  <input
                    type="text"
                    name="portal_password"
                    value={form.portal_password}
                    onChange={handleChange}
                    placeholder={modalMode === "add" ? "supplier123" : "Leave blank to keep current password"}
                    disabled={!form.portal_enabled}
                  />
                </div>

                <div className="form-group">
                  <label>NOTES</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Quality history, pricing notes, special handling..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : modalMode === "add" ? "Save Supplier" : "Update Supplier"}
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
