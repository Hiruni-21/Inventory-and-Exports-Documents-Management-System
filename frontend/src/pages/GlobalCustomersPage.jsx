import React, { useMemo, useState } from "react";
import { Bell, Search, Truck, Eye, Pencil, X, Download } from "lucide-react";

const initialCustomers = [
  {
    id: 1,
    code: "FW-CLT-001",
    customerName: "Colombo Hilton",
    group: "Hilton Hotels",
    contact: "Chef Ravi Kumar",
    city: "Colombo 2",
    deliveryWindow: "05:00-07:00 AM",
    returnsAllowed: true,
    dispatches: 24,
    email: "chef@hilton.lk",
    phone: "0771234567",
    address: "Colombo 2, Sri Lanka",
    preferredDriver: "Nuwan",
    notes: "",
  },
  {
    id: 2,
    code: "FW-CLT-002",
    customerName: "Cinnamon Grand",
    group: "Cinnamon Hotels",
    contact: "Chef Nilufar",
    city: "Colombo 3",
    deliveryWindow: "05:30-07:30 AM",
    returnsAllowed: true,
    dispatches: 18,
    email: "chef@cinnamongrand.lk",
    phone: "0771111111",
    address: "Colombo 3, Sri Lanka",
    preferredDriver: "",
    notes: "",
  },
  {
    id: 3,
    code: "FW-CLT-003",
    customerName: "Galadari Hotel",
    group: "Independent",
    contact: "Chef Sampath",
    city: "Colombo 1",
    deliveryWindow: "04:30-06:30 AM",
    returnsAllowed: false,
    dispatches: 12,
    email: "chef@galadari.lk",
    phone: "0772222222",
    address: "Colombo 1, Sri Lanka",
    preferredDriver: "",
    notes: "",
  },
  {
    id: 4,
    code: "FW-CLT-004",
    customerName: "Kingsbury Hotel",
    group: "Kingsbury",
    contact: "Chef Fernando",
    city: "Colombo 1",
    deliveryWindow: "05:00-07:00 AM",
    returnsAllowed: true,
    dispatches: 15,
    email: "chef@kingsbury.lk",
    phone: "0773333333",
    address: "Colombo 1, Sri Lanka",
    preferredDriver: "",
    notes: "",
  },
];

const emptyForm = {
  code: "",
  customerName: "",
  group: "",
  contact: "",
  email: "",
  phone: "",
  address: "",
  city: "Colombo 1",
  deliveryWindow: "04:00-06:00 AM",
  preferredDriver: "",
  returnsAllowed: true,
  notes: "",
};

export default function LocalCustomersPage() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    ...emptyForm,
    code: `FW-CLT-${String(initialCustomers.length + 1).padStart(3, "0")}`,
  });

  const cityOptions = [
    "All Cities",
    "Colombo 1",
    "Colombo 2",
    "Colombo 3",
    "Colombo 4",
    "Colombo 5",
    "Colombo 7",
  ];

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.code.toLowerCase().includes(search.toLowerCase()) ||
        customer.customerName.toLowerCase().includes(search.toLowerCase()) ||
        customer.group.toLowerCase().includes(search.toLowerCase()) ||
        customer.contact.toLowerCase().includes(search.toLowerCase());

      const matchesCity =
        cityFilter === "All Cities" ? true : customer.city === cityFilter;

      return matchesSearch && matchesCity;
    });
  }, [customers, search, cityFilter]);

  const openAddModal = () => {
    setForm({
      ...emptyForm,
      code: `FW-CLT-${String(customers.length + 1).padStart(3, "0")}`,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();

    const newCustomer = {
      id: Date.now(),
      code: form.code,
      customerName: form.customerName,
      group: form.group,
      contact: form.contact,
      city: form.city,
      deliveryWindow: form.deliveryWindow,
      returnsAllowed: form.returnsAllowed,
      dispatches: 0,
      email: form.email,
      phone: form.phone,
      address: form.address,
      preferredDriver: form.preferredDriver,
      notes: form.notes,
    };

    setCustomers((prev) => [...prev, newCustomer]);
    setShowModal(false);
  };

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Local Customers</h1>
          <p className="page-subtitle">Sri Lanka — {filteredCustomers.length} customers</p>
        </div>

        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            + Add Local Customer
          </button>

          <button type="button" className="btn btn-secondary">
            Export CSV
          </button>

          <button type="button" className="icon-btn" aria-label="Notifications">
            <Bell size={20} />
          </button>
        </div>
      </div>

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
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>🚚 Local Customers — Sri Lanka</h3>
          <span className="count-pill">{filteredCustomers.length} customers</span>
        </div>

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
                  <tr key={customer.id}>
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
                        <button type="button" className="table-icon-btn" title="View">
                          <Eye size={15} />
                        </button>
                        <button type="button" className="table-icon-btn" title="Dispatch">
                          <Truck size={15} />
                        </button>
                        <button type="button" className="table-icon-btn" title="Edit">
                          <Pencil size={15} />
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

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-shell modal-lg">
            <div className="modal-header">
              <h2>🚚 Add Local Customer</h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="notice-banner notice-success notice-inside-modal">
                <Truck size={16} />
                <span>
                  Local customers receive lorry deliveries within Sri Lanka. A Delivery
                  Note is auto-generated for every dispatch.
                </span>
              </div>

              <div className="modal-section-title">CUSTOMER DETAILS</div>

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

              <div className="modal-section-title">DELIVERY INFORMATION</div>

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
                    <option>Colombo 1</option>
                    <option>Colombo 2</option>
                    <option>Colombo 3</option>
                    <option>Colombo 4</option>
                    <option>Colombo 5</option>
                    <option>Colombo 7</option>
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
                    <option>04:00-06:00 AM</option>
                    <option>05:00-07:00 AM</option>
                    <option>05:30-07:30 AM</option>
                    <option>06:00-08:00 AM</option>
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
                      onClick={() => setForm((prev) => ({ ...prev, returnsAllowed: true }))}
                    >
                      ✅ Yes — returns accepted
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${!form.returnsAllowed ? "active danger" : ""}`}
                      onClick={() => setForm((prev) => ({ ...prev, returnsAllowed: false }))}
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

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  💾 Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}