import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Truck, Eye, Pencil, X } from "lucide-react";

const initialCustomers = [
  {
    id: 1,
    code: "FW-CLT-001",
    customerName: "Colombo Hilton",
    group: "Hilton Hotels",
    contact: "Chef Ravi Kumar",
    city: "Colombo 2",
    deliveryWindow: "05:00 – 07:00 AM",
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
    deliveryWindow: "05:30 – 07:30 AM",
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
    deliveryWindow: "04:30 – 06:30 AM",
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
    deliveryWindow: "05:00 – 07:00 AM",
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
  deliveryWindow: "04:00 – 06:00 AM",
  preferredDriver: "",
  returnsAllowed: true,
  notes: "",
};

export default function LocalCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [showModal, setShowModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm] = useState({
    ...emptyForm,
    code: `FW-CLT-${String(initialCustomers.length + 1).padStart(3, "0")}`,
  });

  useEffect(() => {
    if (!showModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowModal(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

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

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const q = search.toLowerCase();
      const matchesSearch =
        customer.code.toLowerCase().includes(q) ||
        customer.customerName.toLowerCase().includes(q) ||
        customer.group.toLowerCase().includes(q) ||
        customer.contact.toLowerCase().includes(q);

      const matchesCity = cityFilter === "All Cities" || customer.city === cityFilter;
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

  const closeModal = () => setShowModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();

    const newCustomer = {
      id: Date.now(),
      code: form.code,
      customerName: form.customerName,
      group: form.group || "Independent",
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
    closeModal();
  };

  const handleRowOpen = () => {};
  const handleNewDispatch = (e, customer) => {
  e.stopPropagation();
  setSelectedCustomer(customer);
  setShowDispatchModal(true);
};
  const handleEdit = (e) => {
    e.stopPropagation();
    setShowModal(true);
  };
  const closeDispatchModal = () => {
  setShowDispatchModal(false);
  setSelectedCustomer(null);
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
                  <tr
                    key={customer.id}
                    
                  >
                    <td className="code-cell">{customer.code}</td>
                    <td className="strong-cell">{customer.customerName}</td>
                    <td>{customer.group}</td>
                    <td>{customer.contact}</td>
                    <td>{customer.city}</td>
                    <td>{customer.deliveryWindow}</td>
                    <td>
                      <span className={customer.returnsAllowed ? "status-text yes-text" : "status-text no-text"}>
                        {customer.returnsAllowed ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>{customer.dispatches}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="View details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowOpen(customer);
                          }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="New dispatch"
                          onClick={(e) => handleNewDispatch(e, customer)}
                        >
                          <Truck size={15} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="Edit"
                          onClick={handleEdit}
                        >
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
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-shell modal-lg" onClick={(e) => e.stopPropagation()}>
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
                  <input type="text" name="customerName" placeholder="e.g. Galle Face Hotel" value={form.customerName} onChange={handleChange} required />
                </div>

                <div className="form-group">
                  <label>HOTEL / GROUP</label>
                  <input type="text" name="group" placeholder="e.g. Aitken Spence Hotels" value={form.group} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>CONTACT PERSON *</label>
                  <input type="text" name="contact" placeholder="e.g. Chef Samantha" value={form.contact} onChange={handleChange} required />
                </div>

                <div className="form-group">
                  <label>EMAIL</label>
                  <input type="email" name="email" placeholder="chef@hotel.lk" value={form.email} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>WHATSAPP / MOBILE *</label>
                  <input type="text" name="phone" placeholder="07XXXXXXX" value={form.phone} onChange={handleChange} required />
                </div>
              </div>

              <div className="modal-divider" />

              <div className="modal-section-title">DELIVERY INFORMATION</div>

              <div className="form-grid two-col">
                <div className="form-group form-group-full">
                  <label>DELIVERY ADDRESS *</label>
                  <textarea name="address" placeholder="Full street address..." value={form.address} onChange={handleChange} rows="3" required />
                </div>

                <div className="form-group">
                  <label>CITY *</label>
                  <select name="city" value={form.city} onChange={handleChange} required>
                    {cityOptions.filter((x) => x !== "All Cities").map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>DELIVERY WINDOW *</label>
                  <select name="deliveryWindow" value={form.deliveryWindow} onChange={handleChange} required>
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
                  <input type="text" name="preferredDriver" placeholder="e.g. Nuwan (optional)" value={form.preferredDriver} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>RETURNS ALLOWED?</label>
                  <div className="toggle-row">
                    <button type="button" className={`toggle-btn ${form.returnsAllowed ? "active" : ""}`} onClick={() => setForm((prev) => ({ ...prev, returnsAllowed: true }))}>
                      ✅ Yes — returns accepted
                    </button>
                    <button type="button" className={`toggle-btn ${!form.returnsAllowed ? "active danger" : ""}`} onClick={() => setForm((prev) => ({ ...prev, returnsAllowed: false }))}>
                      ❌ No returns
                    </button>
                  </div>
                </div>

                <div className="form-group form-group-full">
                  <label>NOTES</label>
                  <textarea name="notes" placeholder="Special instructions, gate codes, contact on arrival..." value={form.notes} onChange={handleChange} rows="3" />
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
      {showDispatchModal && selectedCustomer && (
  <div className="modal-backdrop" onClick={closeDispatchModal}>
    <div className="modal-shell modal-lg" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>🚚 New Local Dispatch</h2>
        <button type="button" className="modal-close" onClick={closeDispatchModal}>
          <X size={20} />
        </button>
      </div>

      <div className="notice-banner notice-success notice-inside-modal">
        <Truck size={16} />
        <span>
          Stock deducted when marked Delivered. FEFO batch applied. Delivery Note
          auto-generated. Returns possible.
        </span>
      </div>

      <div style={{ padding: "20px 24px 0" }}>
        <div className="form-grid two-col">
          <div className="form-group">
            <label>CUSTOMER *</label>
            <input value={`${selectedCustomer.customerName} — ${selectedCustomer.city}`} readOnly />
          </div>

          <div className="form-group">
            <label>DISPATCH DATE *</label>
            <input type="date" />
          </div>

          <div className="form-group">
            <label>DRIVER</label>
            <input placeholder="e.g. Nuwan" />
          </div>

          <div className="form-group">
            <label>VEHICLE NO.</label>
            <input placeholder="WP CAS-XXXX" />
          </div>

          <div className="form-group">
            <label>DELIVERY WINDOW</label>
            <input value={selectedCustomer.deliveryWindow} readOnly />
          </div>
        </div>

        <div className="modal-section-title" style={{ marginTop: 18 }}>
          ITEMS — FEFO AUTO-SELECTED
        </div>

        <table className="it">
          <thead>
            <tr>
              <th>ITEM</th>
              <th>BATCH (FEFO)</th>
              <th>QTY</th>
              <th>PACKAGING</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <select>
                  <option>Dragon Fruit (Red)</option>
                </select>
              </td>
              <td>
                <select>
                  <option>BT-089 (18kg, exp 2d)</option>
                </select>
              </td>
              <td>
                <input type="number" defaultValue="10" />
              </td>
              <td>
                <select>
                  <option>Cardboard Box</option>
                </select>
              </td>
              <td>
                <button type="button" className="ab d">✕</button>
              </td>
            </tr>
          </tbody>
        </table>

        <button type="button" className="add-r" style={{ marginTop: 12 }}>
          + Add Item
        </button>

        <div className="modal-section-title" style={{ marginTop: 18 }}>
          DOCUMENTS TO GENERATE
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <label className="ck">
            <input type="checkbox" defaultChecked />
            <span>Delivery Note (DN)</span>
          </label>

          <label className="ck">
            <input type="checkbox" />
            <span>Local Invoice</span>
          </label>

          <label className="ck">
            <input type="checkbox" />
            <span>Goods Dispatch Note</span>
          </label>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={closeDispatchModal}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary">
          Create Dispatch + Print DN
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}