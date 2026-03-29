
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
  const [modalMode, setModalMode] = useState("add");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);

  const [dispatchForm, setDispatchForm] = useState({
  dispatchDate: "",
  driver: "",
  vehicleNo: "",
  deliveryWindow: "",
  documents: {
    deliveryNote: true,
    localInvoice: false,
    goodsDispatchNote: false,
  },
});

const [dispatchItems, setDispatchItems] = useState([
  {
    item: "Dragon Fruit (Red)",
    batch: "BT-089 (18kg, exp 2d)",
    qty: 10,
    packaging: "Cardboard Box",
  },
]);

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
  useEffect(() => {
  const handleOpenFromTopbar = () => {
    openAddModal();
  };

  window.addEventListener("fw-open-local-customer-modal", handleOpenFromTopbar);

  return () => {
    window.removeEventListener("fw-open-local-customer-modal", handleOpenFromTopbar);
  };
}, [customers.length]);

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
  setModalMode("add");
  setEditingCustomerId(null);

  setForm({
    ...emptyForm,
    code: `FW-CLT-${String(customers.length + 1).padStart(3, "0")}`,
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

const handleSaveCustomer = (e) => {
  e.preventDefault();

  const customerData = {
    code: form.code,
    customerName: form.customerName,
    group: form.group || "Independent",
    contact: form.contact,
    city: form.city,
    deliveryWindow: form.deliveryWindow,
    returnsAllowed: form.returnsAllowed,
    email: form.email,
    phone: form.phone,
    address: form.address,
    preferredDriver: form.preferredDriver,
    notes: form.notes,
  };

  if (modalMode === "add") {
    const newCustomer = {
      id: Date.now(),
      ...customerData,
      dispatches: 0,
    };

    setCustomers((prev) => [...prev, newCustomer]);
  } else {
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === editingCustomerId
          ? { ...customer, ...customerData }
          : customer
      )
    );
  }

  closeModal();
};
  const handleRowOpen = (customer) => {
  setSelectedCustomer(customer);
  setSelectedRowId(customer.id);
  setShowDetailsPanel(true);
};
const closeDetailsPanel = () => {
  setShowDetailsPanel(false);
  setSelectedRowId(null);
};
const handleDeleteCustomer = () => {
  if (!selectedCustomer) return;

  const ok = window.confirm(
    `Are you sure you want to delete ${selectedCustomer.customerName}?`
  );

  if (!ok) return;

  setCustomers((prev) =>
    prev.filter((customer) => customer.id !== selectedCustomer.id)
  );

  closeDetailsPanel();
};

const handleNewDispatch = (e, customer) => {
  e.stopPropagation();
  setSelectedCustomer(customer);

  setDispatchForm({
    dispatchDate: "",
    driver: customer.preferredDriver || "",
    vehicleNo: "",
    deliveryWindow: customer.deliveryWindow || "",
    documents: {
      deliveryNote: true,
      localInvoice: false,
      goodsDispatchNote: false,
    },
  });

  setDispatchItems([
    {
      item: "Dragon Fruit (Red)",
      batch: "BT-089 (18kg, exp 2d)",
      qty: 10,
      packaging: "Cardboard Box",
    },
  ]);

  setShowDispatchModal(true);
};const handleEdit = (e, customer) => {
  e.stopPropagation();
  openEditModal(customer);
};
  const closeDispatchModal = () => {
  setShowDispatchModal(false);
  setSelectedCustomer(null);
};
const handleDispatchFormChange = (e) => {
  const { name, value } = e.target;
  setDispatchForm((prev) => ({ ...prev, [name]: value }));
};

const handleDispatchItemChange = (index, field, value) => {
  setDispatchItems((prev) =>
    prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
  );
};

const handleAddDispatchItem = () => {
  setDispatchItems((prev) => [
    ...prev,
    {
      item: "",
      batch: "",
      qty: "",
      packaging: "Cardboard Box",
    },
  ]);
};

const handleRemoveDispatchItem = (index) => {
  setDispatchItems((prev) =>
    prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
  );
};

const handleDispatchDocumentToggle = (field) => {
  setDispatchForm((prev) => ({
    ...prev,
    documents: {
      ...prev.documents,
      [field]: !prev.documents[field],
    },
  }));
};

const handleCreateDispatch = () => {
  const newDispatchCount = (selectedCustomer?.dispatches || 0) + 1;

  setCustomers((prev) =>
    prev.map((customer) =>
      customer.id === selectedCustomer.id
        ? { ...customer, dispatches: newDispatchCount }
        : customer
    )
  );

  alert("Dispatch created successfully");
  closeDispatchModal();
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
              <td>DSP-L-023</td>
              <td>2024-03-15</td>
              <td>Nuwan</td>
              <td>58 kg</td>
              <td><span className="mini-badge delivered">Delivered</span></td>
            </tr>
            <tr>
              <td>DSP-L-019</td>
              <td>2024-03-12</td>
              <td>Chamara</td>
              <td>44 kg</td>
              <td><span className="mini-badge delivered">Delivered</span></td>
            </tr>
            <tr>
              <td>DSP-L-014</td>
              <td>2024-03-08</td>
              <td>Nuwan</td>
              <td>52 kg</td>
              <td><span className="mini-badge delivered">Delivered</span></td>
            </tr>
          </tbody>
        </table>
      </div>

<div className="details-panel-footer">
  <button
    type="button"
    className="btn btn-primary details-panel-btn-main"
    onClick={() => {
      closeDetailsPanel();
      handleNewDispatch({ stopPropagation: () => {} }, selectedCustomer);
    }}
  >
    🚚 New Dispatch
  </button>

  <button
    type="button"
    className="btn btn-secondary"
    onClick={() => {
      closeDetailsPanel();
      openEditModal(selectedCustomer);
    }}
  >
    ✏️ Edit
  </button>

  <button
    type="button"
    className="btn btn-danger-outline details-panel-btn-delete"
    onClick={handleDeleteCustomer}
    title="Delete customer"
  >
    🗑
  </button>
</div>    </div>
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
          {cityOptions.filter((x) => x !== "All Cities").map((city) => (
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
<button type="submit" className="btn btn-primary">
  Save Customer
</button>
</div>
</form>          
</div>
        
        </div>
      )}
      {showDispatchModal && selectedCustomer && (
  <div className="modal-backdrop" onClick={closeDispatchModal}>
    <div className="modal-shell modal-lg customer-modal" onClick={(e) => e.stopPropagation()}>
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

<div className="dispatch-modal-body">        
<div className="form-grid two-col">
  <div className="form-group">
    <label>CUSTOMER *</label>
    <input value={`${selectedCustomer.customerName} — ${selectedCustomer.city}`} readOnly />
  </div>

  <div className="form-group">
    <label>DISPATCH DATE *</label>
    <input
        type="date"
        name="dispatchDate"
        value={dispatchForm.dispatchDate}
        onChange={handleDispatchFormChange}
      />
  </div>
</div>

<div className="form-grid three-col">
  <div className="form-group">
    <label>DRIVER</label>
    <input
        name="driver"
        placeholder="e.g. Nuwan"
        value={dispatchForm.driver}
        onChange={handleDispatchFormChange}
      />
  </div>

  <div className="form-group">
    <label>VEHICLE NO.</label>
    <input
        name="vehicleNo"
        placeholder="WP CAS-XXXX"
        value={dispatchForm.vehicleNo}
        onChange={handleDispatchFormChange}
      />

    
  </div>

  <div className="form-group">
    <label>DELIVERY WINDOW</label>
    <input
        name="deliveryWindow"
        value={dispatchForm.deliveryWindow}
        onChange={handleDispatchFormChange}
/>
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
  {dispatchItems.map((row, index) => (
    <tr key={index}>
      <td>
        <select
          value={row.item}
          onChange={(e) =>
            handleDispatchItemChange(index, "item", e.target.value)
          }
        >
          <option value="">Select item</option>
          <option value="Dragon Fruit (Red)">Dragon Fruit (Red)</option>
          <option value="Mango">Mango</option>
          <option value="Pineapple">Pineapple</option>
        </select>
      </td>
      <td>
        <select
          value={row.batch}
          onChange={(e) =>
            handleDispatchItemChange(index, "batch", e.target.value)
          }
        >
          <option value="">Select batch</option>
          <option value="BT-089 (18kg, exp 2d)">BT-089 (18kg, exp 2d)</option>
          <option value="BT-102 (20kg, exp 4d)">BT-102 (20kg, exp 4d)</option>
        </select>
      </td>
      <td>
        <input
          type="number"
          value={row.qty}
          onChange={(e) =>
            handleDispatchItemChange(index, "qty", e.target.value)
          }
        />
      </td>
      <td>
        <select
          value={row.packaging}
          onChange={(e) =>
            handleDispatchItemChange(index, "packaging", e.target.value)
          }
        >
          <option value="Cardboard Box">Cardboard Box</option>
          <option value="Plastic Crate">Plastic Crate</option>
        </select>
      </td>
      <td>
        <button
          type="button"
          className="ab d"
          onClick={() => handleRemoveDispatchItem(index)}
        >
          ✕
        </button>
      </td>
    </tr>
  ))}
</tbody>        

</table>

<button
  type="button"
  className="add-r"
  style={{ marginTop: 12 }}
  onClick={handleAddDispatchItem}
>
  + Add Item
</button>
        <div className="documents-wrap">
        <div className="modal-section-title" style={{ marginTop: 18 }}>
          DOCUMENTS TO GENERATE
        </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className="ck">
          <input
            type="checkbox"
            checked={dispatchForm.documents.deliveryNote}
            onChange={() => handleDispatchDocumentToggle("deliveryNote")}
          />
          <span>Delivery Note (DN)</span>
        </label>

        <label className="ck">
          <input
            type="checkbox"
            checked={dispatchForm.documents.localInvoice}
            onChange={() => handleDispatchDocumentToggle("localInvoice")}
          />
          <span>Local Invoice</span>
        </label>

        <label className="ck">
          <input
            type="checkbox"
            checked={dispatchForm.documents.goodsDispatchNote}
            onChange={() => handleDispatchDocumentToggle("goodsDispatchNote")}
          />
          <span>Goods Dispatch Note</span>
        </label>
      </div>        
      </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={closeDispatchModal}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCreateDispatch}
        >
          Create Dispatch + Print DN
        </button>      
        </div>
      
    </div>
  </div>
)}
    </div>
  );
}