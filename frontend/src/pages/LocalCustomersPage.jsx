import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "fw_local_customers";

const defaultCustomers = [
  {
    id: 1,
    code: "FW-CLT-L001",
    customer_name: "Cinnamon Grand",
    group_name: "Cinnamon Hotels",
    contact_person: "Chef Ruwan",
    location: "Colombo 03",
    delivery_window: "05:30 AM",
    payment_terms: "7 days",
    orders_count: 24,
  },
  {
    id: 2,
    code: "FW-CLT-L002",
    customer_name: "Hilton Colombo",
    group_name: "Hilton",
    contact_person: "Chef Arosha",
    location: "Colombo 01",
    delivery_window: "06:00 AM",
    payment_terms: "Cash",
    orders_count: 18,
  },
  {
    id: 3,
    code: "FW-CLT-L003",
    customer_name: "Galadari Hotel",
    group_name: "Galadari",
    contact_person: "Chef Malik",
    location: "Colombo 01",
    delivery_window: "04:45 AM",
    payment_terms: "14 days",
    orders_count: 12,
  },
  {
    id: 4,
    code: "FW-CLT-L004",
    customer_name: "Kingsbury",
    group_name: "The Kingsbury",
    contact_person: "Chef Dineth",
    location: "Colombo 01",
    delivery_window: "05:15 AM",
    payment_terms: "7 days",
    orders_count: 9,
  },
];

const emptyForm = {
  customer_name: "",
  group_name: "",
  contact_person: "",
  location: "",
  delivery_window: "",
  payment_terms: "",
};

const LocalCustomersPage = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCustomers(JSON.parse(saved));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCustomers));
      setCustomers(defaultCustomers);
    }
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((customer) =>
      [
        customer.code,
        customer.customer_name,
        customer.group_name,
        customer.contact_person,
        customer.location,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [customers, search]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = (e) => {
    e.preventDefault();

    if (!form.customer_name || !form.contact_person || !form.location) return;

    const nextCode = `FW-CLT-L${String(customers.length + 1).padStart(3, "0")}`;

    const newCustomer = {
      id: Date.now(),
      code: nextCode,
      customer_name: form.customer_name,
      group_name: form.group_name || "Independent",
      contact_person: form.contact_person,
      location: form.location,
      delivery_window: form.delivery_window || "06:00 AM",
      payment_terms: form.payment_terms || "Cash",
      orders_count: 0,
    };

    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setForm(emptyForm);
    setOpenModal(false);
  };

  return (
    <div>
      <div className="ib ib-s">
        <span>🏠</span>
        <div>
          Local customers are used for Sri Lanka dispatch planning. You can create a dispatch directly
          from this customer list.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search local customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button type="button" className="btn btn-p btn-sm" onClick={() => setOpenModal(true)}>
          + Add Customer
        </button>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>🏠 Local Customers</h3>
          <span className="badge bg-a">{filteredCustomers.length} customers</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer Name</th>
              <th>Group</th>
              <th>Contact</th>
              <th>Location</th>
              <th>Delivery Window</th>
              <th>Payment Terms</th>
              <th>Orders</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text3)" }}>
                    {customer.code}
                  </td>
                  <td style={{ fontWeight: 700 }}>{customer.customer_name}</td>
                  <td>{customer.group_name}</td>
                  <td>{customer.contact_person}</td>
                  <td>{customer.location}</td>
                  <td>
                    <span className="badge bg-b">{customer.delivery_window}</span>
                  </td>
                  <td>
                    <span className="badge bg-x">{customer.payment_terms}</span>
                  </td>
                  <td>{customer.orders_count}</td>
                  <td>
                    <button
                      type="button"
                      className="ab"
                      title="Create dispatch"
                      onClick={() =>
                        navigate(`/dispatch/add?customer=${encodeURIComponent(customer.customer_name)}`)
                      }
                    >
                      🚚
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", color: "var(--text3)" }}>
                  No local customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {openModal ? (
        <div className="modal-backdrop">
          <div className="md" style={{ maxWidth: 760, display: "flex" }}>
            <div className="md-h">
              <h3>🏠 Add Local Customer</h3>
              <button type="button" className="md-x" onClick={() => setOpenModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="md-b">
                <div className="fr">
                  <div className="ff">
                    <label className="fl">Customer Name</label>
                    <input
                      className="fc"
                      name="customer_name"
                      value={form.customer_name}
                      onChange={handleChange}
                      placeholder="Cinnamon Grand"
                    />
                  </div>

                  <div className="ff">
                    <label className="fl">Group</label>
                    <input
                      className="fc"
                      name="group_name"
                      value={form.group_name}
                      onChange={handleChange}
                      placeholder="Cinnamon Hotels"
                    />
                  </div>
                </div>

                <div className="fr">
                  <div className="ff">
                    <label className="fl">Contact Person</label>
                    <input
                      className="fc"
                      name="contact_person"
                      value={form.contact_person}
                      onChange={handleChange}
                      placeholder="Chef Ruwan"
                    />
                  </div>

                  <div className="ff">
                    <label className="fl">Location</label>
                    <input
                      className="fc"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      placeholder="Colombo 03"
                    />
                  </div>
                </div>

                <div className="fr">
                  <div className="ff">
                    <label className="fl">Delivery Window</label>
                    <input
                      className="fc"
                      name="delivery_window"
                      value={form.delivery_window}
                      onChange={handleChange}
                      placeholder="06:00 AM"
                    />
                  </div>

                  <div className="ff">
                    <label className="fl">Payment Terms</label>
                    <input
                      className="fc"
                      name="payment_terms"
                      value={form.payment_terms}
                      onChange={handleChange}
                      placeholder="7 days"
                    />
                  </div>
                </div>
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={() => setOpenModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-p">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LocalCustomersPage;