import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Truck, X } from "lucide-react";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

const emptyForm = {
  code: "",
  customerName: "",
  group: "",
  contact: "",
  email: "",
  phone: "",
  address: "",
  city: "Colombo 1",
  deliveryWindow: "04:00 – 06:00 AM",
  preferredDriver: "",
  returnsAllowed: true,
  notes: "",
};

const mapApiCustomerToUi = (customer) => ({
  id: customer.id,
  code: customer.customer_code || "",
  customerName: customer.customer_name || "",
  group: customer.group_name || "Independent",
  contact: customer.contact_person || "",
  city: customer.city || "",
  deliveryWindow: customer.delivery_window || "",
  returnsAllowed: !String(customer.returns_policy || "")
    .toLowerCase()
    .includes("no"),
  dispatches: Number(customer.orders_count || customer.shipment_count || 0),
  email: customer.email || "",
  phone: customer.phone || customer.whatsapp || customer.whatsapp_number || "",
  address: customer.address || "",
  preferredDriver: customer.driver_preference || "",
  notes: customer.notes || "",
  status: customer.status || "active",
  createdAt: customer.created_at || "",
});

const buildLocalExportRows = (rows) => {
  const headers = [
    "Code",
    "Customer Name",
    "Group",
    "Contact",
    "Email",
    "Phone",
    "Address",
    "City",
    "Delivery Window",
    "Preferred Driver",
    "Returns Allowed",
    "Dispatches",
    "Notes",
  ];

  const csvRows = rows.map((customer) => [
    customer.code,
    customer.customerName,
    customer.group,
    customer.contact,
    customer.email,
    customer.phone,
    customer.address,
    customer.city,
    customer.deliveryWindow,
    customer.preferredDriver,
    customer.returnsAllowed ? "Yes" : "No",
    customer.dispatches,
    customer.notes,
  ]);

  return [headers, ...csvRows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
};

export default function LocalCustomersPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    ...emptyForm,
    code: "FW-CLT-L001",
  });

  const cityOptions = [
    "All Cities",
    "Colombo 1",
    "Colombo 2",
    "Colombo 3",
    "Colombo 4",
    "Colombo 5",
    "Colombo 7",
    "Dehiwala",
    "Mount Lavinia",
    "Negombo",
    "Kandy",
    "Galle",
    "Other",
  ];

  const loadCustomers = async (preferredId = null) => {
    try {
      const res = await api.get("/customers?type=local");
      const rows = Array.isArray(res.data) ? res.data.map(mapApiCustomerToUi) : [];

      setCustomers(rows);

      if (preferredId) {
        const found = rows.find((c) => String(c.id) === String(preferredId));
        if (found) {
          setSelectedCustomer(found);
          setSelectedRowId(found.id);
          setShowDetailsPanel(true);
        }
      } else if (selectedRowId) {
        const found = rows.find((c) => String(c.id) === String(selectedRowId));
        if (found) {
          setSelectedCustomer(found);
        }
      }
    } catch (err) {
      console.error("Failed to load local customers:", err);
      toast.error("Failed to load local customers");
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const rows = customers.filter((customer) => {
      const q = search.toLowerCase().trim();

      const matchesSearch =
        customer.code.toLowerCase().includes(q) ||
        customer.customerName.toLowerCase().includes(q) ||
        customer.group.toLowerCase().includes(q) ||
        customer.contact.toLowerCase().includes(q) ||
        customer.city.toLowerCase().includes(q);

      const matchesCity = cityFilter === "All Cities" || customer.city === cityFilter;
      return matchesSearch && matchesCity;
    });

    return rows.sort((a, b) =>
      String(a.code || "").localeCompare(String(b.code || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [customers, search, cityFilter]);
    useEffect(() => {
    if (!showModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowModal(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  useEffect(() => {
    const handleOpenFromTopbar = () => {
      openAddModal();
    };

    const handleExportFromTopbar = () => {
      const csv = buildLocalExportRows(filteredCustomers);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "local-customers.csv";
      link.click();
      URL.revokeObjectURL(url);

      toast.info("Local customers CSV exported.");
    };

    window.addEventListener("fw-open-local-customer-modal", handleOpenFromTopbar);
    window.addEventListener("fw-export-local-customers", handleExportFromTopbar);

    return () => {
      window.removeEventListener("fw-open-local-customer-modal", handleOpenFromTopbar);
      window.removeEventListener("fw-export-local-customers", handleExportFromTopbar);
    };
  }, [filteredCustomers, toast]);

  const openAddModal = () => {
    setModalMode("add");
    setEditingCustomerId(null);

    setForm({
      ...emptyForm,
      code: `FW-CLT-L${String(customers.length + 1).padStart(3, "0")}`,
    });

    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setModalMode("edit");
    setEditingCustomerId(customer.id);

    setForm({
      code: customer.code || "",
      customerName: customer.customerName || "",
      group: customer.group || "",
      contact: customer.contact || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "Colombo 1",
      deliveryWindow: customer.deliveryWindow || "04:00 – 06:00 AM",
      preferredDriver: customer.preferredDriver || "",
      returnsAllowed: customer.returnsAllowed ?? true,
      notes: customer.notes || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalMode("add");
    setEditingCustomerId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();

    const payload = {
      customer_type: "local",
      customer_name: form.customerName,
      group_name: form.group || "Independent",
      contact_person: form.contact,
      email: form.email,
      phone: form.phone,
      whatsapp: form.phone,
      address: form.address,
      city: form.city,
      delivery_window: form.deliveryWindow,
      payment_terms: "Cash",
      returns_policy: form.returnsAllowed ? "Returns allowed" : "No returns",
      driver_preference: form.preferredDriver,
      notes: form.notes,
      status: "active",
    };

    try {
      setSaving(true);

      if (modalMode === "add") {
        const res = await api.post("/customers", payload);
        await loadCustomers(res.data?.id);
        toast.success(`Local customer "${form.customerName}" created successfully.`);
      } else {
        await api.put(`/customers/${editingCustomerId}`, payload);
        await loadCustomers(editingCustomerId);
        toast.success(`Local customer "${form.customerName}" saved successfully.`);
      }

      closeModal();
    } catch (err) {
      console.error("Failed to save customer:", err);
      toast.error(err?.response?.data?.message || "Failed to save local customer");
    } finally {
      setSaving(false);
    }
  };

  const handleRowOpen = async (customer) => {
    try {
      const res = await api.get(`/customers/${customer.id}`);
      const freshCustomer = mapApiCustomerToUi(res.data);

      setSelectedCustomer(freshCustomer);
      setSelectedRowId(freshCustomer.id);
      setShowDetailsPanel(true);
    } catch (err) {
      console.error("Failed to load customer details:", err);
      setSelectedCustomer(customer);
      setSelectedRowId(customer.id);
      setShowDetailsPanel(true);
    }
  };

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setSelectedRowId(null);
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    const ok = window.confirm(
      `Are you sure you want to delete ${selectedCustomer.customerName}?`
    );

    if (!ok) return;

    try {
      await api.delete(`/customers/${selectedCustomer.id}`);
      await loadCustomers();
      closeDetailsPanel();
      toast.warning("Customer removed");
    } catch (err) {
      console.error("Failed to delete customer:", err);
      toast.error(err?.response?.data?.message || "Failed to delete customer");
    }
  };

  const handleNewDispatch = (e, customer) => {
    if (e?.stopPropagation) e.stopPropagation();

    const customerLabel = `${customer.customerName} — ${customer.city}`;
    navigate(`/dispatch/local/add?customer=${encodeURIComponent(customerLabel)}`);
  };

  return (
    <div className="page-shell">
      <div className="notice-banner notice-success">
        <Truck size={16} />
        <span>
          Local customers receive lorry deliveries within Sri Lanka. Delivery Note
          auto-generated. Stock deducted on Delivered status. Returns possible.
        </span>
      </div>

      <div className="page-toolbar">
        <div className="toolbar-left">
          <div className="search-field">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search local customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="count-pill">{filteredCustomers.length} customers</span>

          <button
            type="button"
            className="btn btn-p btn-sm"
            onClick={() => window.dispatchEvent(new Event("fw-open-local-customer-modal"))}
          >
            + Add Customer
          </button>

          <button
            type="button"
            className="btn btn-s btn-sm"
            onClick={() => window.dispatchEvent(new Event("fw-export-local-customers"))}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="content-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>CUSTOMER NAME</th>
                <th>GROUP</th>
                <th>CONTACT</th>
                <th>CITY</th>
                <th>DELIVERY WINDOW</th>
                <th>RETURNS?</th>
                <th>DISPATCHES</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => handleRowOpen(customer)}
                    className={selectedRowId === customer.id ? "details-row-active" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="code-cell">{customer.code}</td>
                    <td className="strong-cell">{customer.customerName}</td>
                    <td>{customer.group}</td>
                    <td>{customer.contact}</td>
                    <td>{customer.city}</td>
                    <td>{customer.deliveryWindow}</td>
                    <td>
                      <span
                        className={
                          customer.returnsAllowed ? "status-text yes-text" : "status-text no-text"
                        }
                      >
                        {customer.returnsAllowed ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>{customer.dispatches}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="New dispatch"
                          onClick={(e) => handleNewDispatch(e, customer)}
                        >
                          <Truck size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-row">
                    No local customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetailsPanel && selectedCustomer && (
        <>
          <div className="details-panel-overlay" onClick={closeDetailsPanel}></div>

          <div className={`details-panel ${showDetailsPanel ? "open" : ""}`}>
            <div className="details-panel-header">
              <div className="details-panel-icon">🚚</div>

              <div className="details-panel-head-text">
                <h3>{selectedCustomer.customerName}</h3>
                <p>
                  {selectedCustomer.city} · Delivery {selectedCustomer.deliveryWindow}
                </p>
              </div>

              <button
                type="button"
                className="details-panel-close"
                onClick={closeDetailsPanel}
              >
                <X size={18} />
              </button>
            </div>

            <div className="details-panel-body">
              <div className="details-panel-grid">
                <div className="details-stat-card">
                  <label>CODE</label>
                  <span>{selectedCustomer.code}</span>
                </div>

                <div className="details-stat-card">
                  <label>HOTEL / GROUP</label>
                  <span>{selectedCustomer.group}</span>
                </div>

                <div className="details-stat-card">
                  <label>CONTACT PERSON</label>
                  <span>{selectedCustomer.contact}</span>
                </div>

                <div className="details-stat-card">
                  <label>CITY</label>
                  <span>{selectedCustomer.city}</span>
                </div>

                <div className="details-stat-card">
                  <label>EMAIL</label>
                  <span>{selectedCustomer.email || "-"}</span>
                </div>

                <div className="details-stat-card">
                  <label>CONTACT NUMBER</label>
                  <span>{selectedCustomer.phone || "-"}</span>
                </div>

                <div className="details-stat-card details-stat-card-full">
                  <label>ADDRESS</label>
                  <span>{selectedCustomer.address || "-"}</span>
                </div>

                <div className="details-stat-card">
                  <label>DELIVERY WINDOW</label>
                  <span>{selectedCustomer.deliveryWindow}</span>
                </div>

                <div className="details-stat-card">
                  <label>RETURNS ALLOWED?</label>
                  <span className={selectedCustomer.returnsAllowed ? "yes-text" : "no-text"}>
                    {selectedCustomer.returnsAllowed ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              <div className="details-stat-card details-stat-card-full">
                <label>TOTAL DISPATCHES</label>
                <strong>{selectedCustomer.dispatches}</strong>
              </div>

              <div className="details-mini-title">RECENT DISPATCHES</div>

              <table className="details-mini-table">
                <thead>
                  <tr>
                    <th>DISPATCH</th>
                    <th>DATE</th>
                    <th>DRIVER</th>
                    <th>WEIGHT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5" className="empty-row">
                      Recent local dispatch history will appear here from the real dispatch module.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="details-panel-footer">
              <button
                type="button"
                className="btn btn-primary details-panel-btn-main new-dispatch-btn"
                onClick={() => handleNewDispatch(null, selectedCustomer)}
              >
                New Dispatch
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  closeDetailsPanel();
                  openEditModal(selectedCustomer);
                }}
              >
                Edit
              </button>

              <button
                type="button"
                className="btn btn-danger-outline details-panel-btn-delete"
                onClick={handleDeleteCustomer}
                title="Delete customer"
              >
                🗑
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-shell modal-lg customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === "add" ? "🚚 Add Local Customer" : "✏️ Edit Local Customer"}</h2>

              <button type="button" className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="customer-modal-form">
              <div className="customer-modal-scroll">
                <div className="notice-banner notice-success notice-inside-modal">
                  <Truck size={16} />
                  <span>
                    Local customers receive lorry deliveries within Sri Lanka. A Delivery
                    Note is auto-generated for every dispatch.
                  </span>
                </div>

                <div className="customer-section-title">Customer Details</div>

                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>CUSTOMER CODE</label>
                    <input type="text" name="code" value={form.code} readOnly />
                  </div>

                  <div className="form-group">
                    <label>CUSTOMER NAME *</label>
                    <input
                      type="text"
                      name="customerName"
                      placeholder="e.g. Galle Face Hotel"
                      value={form.customerName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>HOTEL / GROUP</label>
                    <input
                      type="text"
                      name="group"
                      placeholder="e.g. Aitken Spence Hotels"
                      value={form.group}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>CONTACT PERSON *</label>
                    <input
                      type="text"
                      name="contact"
                      placeholder="e.g. Chef Samantha"
                      value={form.contact}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>EMAIL</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="chef@hotel.lk"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>WHATSAPP / MOBILE *</label>
                    <input
                      type="text"
                      name="phone"
                      placeholder="07XXXXXXX"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="modal-divider" />

                <div className="customer-section-title">Delivery Information</div>

                <div className="form-grid two-col">
                  <div className="form-group form-group-full">
                    <label>DELIVERY ADDRESS *</label>
                    <textarea
                      name="address"
                      placeholder="Full street address..."
                      value={form.address}
                      onChange={handleChange}
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>CITY *</label>
                    <select name="city" value={form.city} onChange={handleChange} required>
                      {cityOptions
                        .filter((x) => x !== "All Cities")
                        .map((city) => (
                          <option key={city}>{city}</option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>DELIVERY WINDOW *</label>
                    <select
                      name="deliveryWindow"
                      value={form.deliveryWindow}
                      onChange={handleChange}
                      required
                    >
                      <option>04:00 – 06:00 AM</option>
                      <option>04:30 – 06:30 AM</option>
                      <option>05:00 – 07:00 AM</option>
                      <option>05:30 – 07:30 AM</option>
                      <option>06:00 – 08:00 AM</option>
                      <option>Custom</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>PREFERRED DRIVER</label>
                    <input
                      type="text"
                      name="preferredDriver"
                      placeholder="e.g. Nuwan (optional)"
                      value={form.preferredDriver}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>RETURNS ALLOWED?</label>
                    <div className="toggle-row">
                      <button
                        type="button"
                        className={`toggle-btn ${form.returnsAllowed ? "active" : ""}`}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, returnsAllowed: true }))
                        }
                      >
                        ✅ Yes — returns accepted
                      </button>

                      <button
                        type="button"
                        className={`toggle-btn ${!form.returnsAllowed ? "active danger" : ""}`}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, returnsAllowed: false }))
                        }
                      >
                        ❌ No returns
                      </button>
                    </div>
                  </div>

                  <div className="form-group form-group-full">
                    <label>NOTES</label>
                    <textarea
                      name="notes"
                      placeholder="Special instructions, gate codes, contact on arrival..."
                      value={form.notes}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : modalMode === "add"
                    ? "Save Customer"
                    : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}