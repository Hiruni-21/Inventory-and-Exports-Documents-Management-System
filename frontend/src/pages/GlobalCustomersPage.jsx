import React, { useEffect, useMemo, useState } from "react";
import { Bell, Search, Plane, Eye, Pencil, X } from "lucide-react";

const initialCustomers = [
  {
    id: 1,
    code: "FW-EXP-001",
    customerName: "Four Seasons Kuda Huraa",
    group: "Four Seasons",
    contact: "Chef Ibrahim",
    location: "Maldives",
    airline: "SriLankan Airlines",
    incoterms: "CIF",
    shipments: 14,
    email: "chef@fourseasons.mv",
    phone: "+9607001111",
    address: "Kuda Huraa, Maldives",
    notes: "",
  },
  {
    id: 2,
    code: "FW-EXP-002",
    customerName: "Hilton Maldives Amingiri",
    group: "Hilton",
    contact: "Chef Raheem",
    location: "Maldives",
    airline: "SriLankan Airlines",
    incoterms: "DAP",
    shipments: 10,
    email: "chef@hilton.mv",
    phone: "+9607002222",
    address: "Amingiri, Maldives",
    notes: "",
  },
  {
    id: 3,
    code: "FW-EXP-003",
    customerName: "Waldorf Astoria Ithaafushi",
    group: "Hilton Luxury",
    contact: "Chef Adam",
    location: "Maldives",
    airline: "Qatar Airways",
    incoterms: "FOB",
    shipments: 8,
    email: "chef@waldorf.mv",
    phone: "+9607003333",
    address: "Ithaafushi, Maldives",
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
  location: "Maldives",
  airline: "SriLankan Airlines",
  incoterms: "CIF",
  notes: "",
};

export default function GlobalCustomersPage() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    ...emptyForm,
    code: `FW-EXP-${String(initialCustomers.length + 1).padStart(3, "0")}`,
  });

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((customer) =>
      [
        customer.code,
        customer.customerName,
        customer.group,
        customer.contact,
        customer.location,
        customer.airline,
        customer.incoterms,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [customers, search]);

  const openAddModal = () => {
    setForm({
      ...emptyForm,
      code: `FW-EXP-${String(customers.length + 1).padStart(3, "0")}`,
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
      location: form.location,
      airline: form.airline,
      incoterms: form.incoterms,
      shipments: 0,
      email: form.email,
      phone: form.phone,
      address: form.address,
      notes: form.notes,
    };

    setCustomers((prev) => [...prev, newCustomer]);
    closeModal();
  };

  return (
    <div className="page-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Global Customers</h1>
          <p className="page-subtitle">Export customers</p>
        </div>

        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            + Add Global Customer
          </button>
          <button type="button" className="btn btn-secondary">
            Export CSV
          </button>
          <button type="button" className="icon-btn" aria-label="Notifications">
            <Bell size={20} />
          </button>
        </div>
      </div>

      <div className="notice-banner notice-warning">
        <Plane size={16} />
        <span>
          Global customers are used for export shipments. Airline, incoterms and shipment
          planning apply. No returns after export departure.
        </span>
      </div>

      <div className="page-toolbar">
        <div className="toolbar-left">
          <div className="search-field">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search global customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3>✈️ Global Customers — Export</h3>
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
                <th>LOCATION</th>
                <th>AIRLINE</th>
                <th>INCOTERMS</th>
                <th>SHIPMENTS</th>
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
                    <td>{customer.location}</td>
                    <td><span className="badge bg-a">{customer.airline}</span></td>
                    <td><span className="badge bg-x">{customer.incoterms}</span></td>
                    <td>{customer.shipments}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="table-icon-btn" title="View">
                          <Eye size={15} />
                        </button>
                        <button type="button" className="table-icon-btn" title="Dispatch">
                          <Plane size={15} />
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
                    No global customers found
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
              <h2>✈️ Add Global Customer</h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="notice-banner notice-warning notice-inside-modal">
                <Plane size={16} />
                <span>
                  Export customers require airline and incoterm planning for global dispatch.
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
                  <input type="text" name="customerName" value={form.customerName} onChange={handleChange} required />
                </div>

                <div className="form-group">
                  <label>HOTEL / GROUP</label>
                  <input type="text" name="group" value={form.group} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>CONTACT PERSON *</label>
                  <input type="text" name="contact" value={form.contact} onChange={handleChange} required />
                </div>

                <div className="form-group">
                  <label>EMAIL</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>WHATSAPP / MOBILE *</label>
                  <input type="text" name="phone" value={form.phone} onChange={handleChange} required />
                </div>

                <div className="form-group form-group-full">
                  <label>LOCATION *</label>
                  <input type="text" name="location" value={form.location} onChange={handleChange} required />
                </div>

                <div className="form-group">
                  <label>PREFERRED AIRLINE *</label>
                  <select name="airline" value={form.airline} onChange={handleChange} required>
                    <option>SriLankan Airlines</option>
                    <option>Qatar Airways</option>
                    <option>Emirates</option>
                    <option>Manta Air</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>INCOTERMS *</label>
                  <select name="incoterms" value={form.incoterms} onChange={handleChange} required>
                    <option>CIF</option>
                    <option>DAP</option>
                    <option>FOB</option>
                  </select>
                </div>

                <div className="form-group form-group-full">
                  <label>DELIVERY / SHIPMENT ADDRESS *</label>
                  <textarea name="address" value={form.address} onChange={handleChange} rows="3" required />
                </div>

                <div className="form-group form-group-full">
                  <label>NOTES</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} rows="3" />
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