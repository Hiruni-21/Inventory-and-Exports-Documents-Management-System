import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plane, X } from "lucide-react";
import { useToast } from "../context/ToastContext";
import api from "../utils/api";

const countryOptions = [
  "All Countries",
  "Maldives",
  "Singapore",
  "UAE",
  "Qatar",
  "UK",
  "Australia",
  "Other",
];

const airlineOptions = [
  "SriLankan Airlines (UL)",
  "Maldivian (Q2)",
  "Emirates (EK)",
  "Qatar Airways (QR)",
  "Other",
];

const emptyForm = {
  code: "",
  customerName: "",
  group: "",
  contact: "",
  email: "",
  phone: "",
  country: "Maldives",
  location: "",
  preferredAirline: "SriLankan Airlines (UL)",
  incoterms: "CIF",
  phytoRequired: true,
  coldChainRequired: false,
  notes: "",
};

const airlineLabelFromApi = (value) => {
  const raw = String(value || "").trim().toUpperCase();

  if (raw === "Q2") return "Maldivian (Q2)";
  if (raw === "EK") return "Emirates (EK)";
  if (raw === "QR") return "Qatar Airways (QR)";
  if (raw === "OTHER") return "Other";
  return "SriLankan Airlines (UL)";
};

const airlineCodeFromUi = (value) => {
  const raw = String(value || "").toUpperCase();

  if (raw.includes("Q2") || raw.includes("MALDIV")) return "Q2";
  if (raw.includes("EK") || raw.includes("EMIRATES")) return "EK";
  if (raw.includes("QR") || raw.includes("QATAR")) return "QR";
  if (raw.includes("OTHER")) return "OTHER";
  return "UL";
};

const airlineBadgeFromUi = (value) => {
  const code = airlineCodeFromUi(value);
  if (code === "Q2") return "Q2";
  if (code === "EK") return "EK";
  if (code === "QR") return "QR";
  if (code === "OTHER") return "OTHER";
  return "UL";
};

const buildNextGlobalCustomerCode = (customers) => {
  const highest = customers.reduce((max, customer) => {
    const match = String(customer.code || "").match(/(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `FW-CLT-G${String(highest + 1).padStart(3, "0")}`;
};

const mapShipmentRowToUi = (shipment) => ({
  id: shipment.id,
  dispatchNumber: shipment.dispatch_number || "—",
  date: shipment.dispatch_date ? String(shipment.dispatch_date).slice(0, 10) : "—",
  flight: shipment.flight || "—",
  weight: shipment.weight || "0 kg",
  docs: shipment.docs || "0/7",
  status: shipment.status || "Docs Pending",
});

const mapApiCustomerToUi = (customer) => ({
  id: customer.id,
  code: customer.customer_code || "",
  customerName: customer.customer_name || "",
  group: customer.group_name || "Independent",
  contact: customer.contact_person || "",
  email: customer.email || "",
  phone: customer.phone || customer.whatsapp || customer.whatsapp_number || "",
  country: customer.city || "Maldives",
  location: customer.location_island || "",
  preferredAirline: airlineLabelFromApi(customer.airline_preference),
  airlineCode: airlineBadgeFromUi(customer.airline_preference),
  incoterms: customer.incoterm || "CIF",
  phytoRequired: true,
  coldChainRequired:
    Number(customer.cold_chain_required || 0) === 1 || customer.cold_chain_required === true,
  shipments: Number(customer.shipments_count || customer.shipment_count || 0),
  notes: customer.notes || "",
  recentShipments: Array.isArray(customer.recent_shipments)
    ? customer.recent_shipments.map(mapShipmentRowToUi)
    : [],
});

const buildExportRows = (rows) => {
  const headers = [
    "Code",
    "Customer Name",
    "Group",
    "Contact",
    "Email",
    "Phone",
    "Country",
    "Location",
    "Preferred Airline",
    "Airline Code",
    "Incoterms",
    "Phytosanitary Required",
    "Cold Chain Required",
    "Shipments",
    "Special Instructions",
  ];

  const csvRows = rows.map((customer) => [
    customer.code,
    customer.customerName,
    customer.group,
    customer.contact,
    customer.email,
    customer.phone,
    customer.country,
    customer.location,
    customer.preferredAirline,
    customer.airlineCode,
    customer.incoterms,
    customer.phytoRequired ? "Yes" : "No",
    customer.coldChainRequired ? "Yes" : "No",
    customer.shipments,
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

export default function GlobalCustomersPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("All Countries");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    ...emptyForm,
    code: "FW-CLT-G001",
  });

  const loadCustomers = async (preferredId = null) => {
    try {
      const res = await api.get("/customers");
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
      console.error("Failed to load global customers:", err);
      toast.error("Failed to load global customers");
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const rows = customers.filter((customer) => {
      const q = search.toLowerCase().trim();

      const matchesSearch =
        q === "" ||
        [
          customer.code,
          customer.customerName,
          customer.group,
          customer.contact,
          customer.country,
          customer.location,
          customer.preferredAirline,
          customer.airlineCode,
          customer.incoterms,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesCountry =
        countryFilter === "All Countries" || customer.country === countryFilter;

      return matchesSearch && matchesCountry;
    });

    return rows.sort((a, b) =>
      String(a.code || "").localeCompare(String(b.code || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [customers, search, countryFilter]);

  useEffect(() => {
    if (!showModal && !showDetailsPanel) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showModal) closeModal();
        if (showDetailsPanel) closeDetailsPanel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal, showDetailsPanel]);

  useEffect(() => {
    const handleOpenFromTopbar = () => {
      openAddModal();
    };

    const handleExportFromTopbar = () => {
      const csv = buildExportRows(filteredCustomers);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "customers.csv";
      link.click();
      URL.revokeObjectURL(url);
      toast.info("Customers CSV exported.");
    };

    window.addEventListener("fw-open-global-customer-modal", handleOpenFromTopbar);
    window.addEventListener("fw-export-global-customers", handleExportFromTopbar);

    return () => {
      window.removeEventListener("fw-open-global-customer-modal", handleOpenFromTopbar);
      window.removeEventListener("fw-export-global-customers", handleExportFromTopbar);
    };
  }, [filteredCustomers, toast]);

  const openAddModal = () => {
    setModalMode("add");
    setEditingCustomerId(null);

    setForm({
      ...emptyForm,
      code: buildNextGlobalCustomerCode(customers),
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
      country: customer.country || "Maldives",
      location: customer.location || "",
      preferredAirline: customer.preferredAirline || "SriLankan Airlines (UL)",
      incoterms: customer.incoterms || "CIF",
      phytoRequired: customer.phytoRequired ?? true,
      coldChainRequired: customer.coldChainRequired ?? false,
      notes: customer.notes || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalMode("add");
    setEditingCustomerId(null);
  };

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setSelectedRowId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.customerName.trim()) {
      return toast.error("Customer name is required");
    }

    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        return toast.error("Please enter a valid email address");
      }
    }

    if (!form.country) {
      return toast.error("Country is required");
    }

    if (!form.location || !form.location.trim()) {
      return toast.error("Location / Island is required");
    }

    if (!form.preferredAirline) {
      return toast.error("Preferred airline is required");
    }

    if (!form.incoterms) {
      return toast.error("Incoterms are required");
    }

    const payload = {      customer_name: form.customerName,
      group_name: form.group || "Independent",
      contact_person: form.contact,
      email: form.email,
      phone: form.phone,
      whatsapp: form.phone,
      city: form.country,
      location_island: form.location,
      airline_preference: airlineCodeFromUi(form.preferredAirline),
      incoterm: form.incoterms || "CIF",
      cold_chain_required: form.coldChainRequired ? 1 : 0,
      notes: form.notes,
      status: "active",
    };

    try {
      setSaving(true);

      if (modalMode === "add") {
        const res = await api.post("/customers", payload);
        await loadCustomers(res.data?.id);
        toast.success(`Customer "${form.customerName}" created successfully.`);
      } else {
        await api.put(`/customers/${editingCustomerId}`, payload);
        await loadCustomers(editingCustomerId);
        toast.success(`Customer "${form.customerName}" saved successfully.`);
      }

      closeModal();
    } catch (err) {
      console.error("Failed to save global customer:", err);
      toast.error(err?.response?.data?.message || "Failed to save global customer");
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

  const openRealShipmentFlow = (customer, e = null) => {
    if (e?.stopPropagation) e.stopPropagation();

    navigate(`/dispatch?customerId=${customer.id}`);
    toast.info("Customer opened in Global Dispatch.");
  };

  return (
    <div className="page-shell">
      <div className="page-toolbar">
        <div className="toolbar-left">
          <div className="search-field">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
          >
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header-row">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            ✈️ Customers — Export
            <span 
              title="Global customers receive airline shipments. Click any row to view details, shipment history and actions. No returns after departure."
              style={{ cursor: "help", color: "#6B7D71", display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "#F1F5F9", fontSize: 12, border: "1px solid #E2E8F0" }}
            >
              ℹ
            </span>
          </h3>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span className="count-pill">{filteredCustomers.length} customers</span>
            <button className="btn btn-s btn-sm" onClick={() => alert("Export CSV coming soon!")}>Export CSV</button>
            <button className="btn btn-p btn-sm" onClick={() => openAddModal()}>+ Add Customer</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table global-customers-table">
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
                    <td>{customer.location}</td>
                    <td>
                      <span className="badge bg-a">{customer.airlineCode}</span>
                    </td>
                    <td>
                      <span className="badge bg-x">{customer.incoterms}</span>
                    </td>
                    <td>{customer.shipments}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          title="Create shipment for this customer"
                          style={{ width: 34, height: 34, borderRadius: 14, border: "1.5px solid #CFE2D4", background: "#FFFFFF", color: "#2E8B57", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          onClick={(e) => openRealShipmentFlow(customer, e)}
                        >
                          <Plane size={16} />
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

      {showDetailsPanel && selectedCustomer && (
        <>
          <div className="details-panel-overlay" onClick={closeDetailsPanel}></div>

          <div className={`details-panel ${showDetailsPanel ? "open" : ""}`}>
            <div className="details-panel-header">
              <div className="details-panel-icon">✈️</div>

              <div className="details-panel-head-text">
                <h3>{selectedCustomer.customerName}</h3>
                <p>
                  {selectedCustomer.location} · {selectedCustomer.airlineCode} · {selectedCustomer.incoterms}
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
                  <label>COUNTRY</label>
                  <span>{selectedCustomer.country}</span>
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
                  <label>LOCATION</label>
                  <span>{selectedCustomer.location || "-"}</span>
                </div>

                <div className="details-stat-card">
                  <label>PREFERRED AIRLINE</label>
                  <span>{selectedCustomer.preferredAirline}</span>
                </div>

                <div className="details-stat-card">
                  <label>INCOTERMS</label>
                  <span>{selectedCustomer.incoterms}</span>
                </div>
              </div>

              <div className="details-panel-grid" style={{ marginTop: 12 }}>
                <div className="details-stat-card">
                  <label>PHYTOSANITARY REQUIRED?</label>
                  <span className={selectedCustomer.phytoRequired ? "yes-text" : "no-text"}>
                    {selectedCustomer.phytoRequired ? "Yes" : "No"}
                  </span>
                </div>

                <div className="details-stat-card">
                  <label>COLD CHAIN REQUIRED?</label>
                  <span className={selectedCustomer.coldChainRequired ? "yes-text" : "no-text"}>
                    {selectedCustomer.coldChainRequired ? "Yes" : "No"}
                  </span>
                </div>

                <div className="details-stat-card details-stat-card-full">
                  <label>SPECIAL INSTRUCTIONS</label>
                  <span>{selectedCustomer.notes || "-"}</span>
                </div>
              </div>

              <div className="details-stat-card details-stat-card-full">
                <label>TOTAL SHIPMENTS</label>
                <strong>{selectedCustomer.shipments}</strong>
              </div>

              <div className="details-mini-title">RECENT SHIPMENTS</div>

              <table className="details-mini-table">
                <thead>
                  <tr>
                    <th>SHIPMENT</th>
                    <th>DATE</th>
                    <th>FLIGHT</th>
                    <th>WEIGHT</th>
                    <th>DOCS</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomer.recentShipments?.length ? (
                    selectedCustomer.recentShipments.map((shipment) => (
                      <tr key={shipment.id}>
                        <td>{shipment.dispatchNumber}</td>
                        <td>{shipment.date}</td>
                        <td>{shipment.flight}</td>
                        <td>{shipment.weight}</td>
                        <td>
                          <span
                            className={`mini-badge ${
                              shipment.docs === "7/7" ? "delivered" : "pending"
                            }`}
                          >
                            {shipment.docs}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`mini-badge ${
                              shipment.status === "Delivered" || shipment.status === "Cleared"
                                ? "delivered"
                                : "pending"
                            }`}
                          >
                            {shipment.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-row">
                        No shipment history yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="details-panel-footer">
              <button
                type="button"
                className="btn btn-primary details-panel-btn-main new-dispatch-btn"
                onClick={() => openRealShipmentFlow(selectedCustomer)}
              >
                New Shipment
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
          <div className="md md-lg" onClick={(e) => e.stopPropagation()}>
            <div className="md-h">
              <h3>{modalMode === "add" ? "✈️ Add Customer" : "✏️ Edit Customer"}</h3>
              <button type="button" className="md-x" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveCustomer}
              style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}
            >
              <div className="md-b" style={{ overflowY: "auto", maxHeight: "calc(90vh - 150px)" }}>
                <div className="ib ib-w" style={{ marginTop: "-4px", marginBottom: "14px" }}>
                  <span>✈️</span>
                  <div>
                    Global customers receive airline shipments. All 7 export documents required per shipment.{" "}
                    <strong>No returns after departure.</strong>
                  </div>
                </div>

                <div className="fs2">
                  <div className="fst">Customer Details</div>

                  <div className="fr">
                    <div className="ff">
                      <label className="fl">Customer Code</label>
                      <input
                        className="fc"
                        type="text"
                        name="code"
                        value={form.code}
                        readOnly
                        style={{ background: "var(--ivory)" }}
                      />
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Customer Name <span className="rq">*</span>
                      </label>
                      <input
                        className="fc"
                        type="text"
                        name="customerName"
                        placeholder="e.g. Anantara Maldives"
                        value={form.customerName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="fr">
                    <div className="ff">
                      <label className="fl">Hotel / Group</label>
                      <input
                        className="fc"
                        type="text"
                        name="group"
                        placeholder="e.g. Minor Hotels"
                        value={form.group}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Contact Person <span className="rq">*</span>
                      </label>
                      <input
                        className="fc"
                        type="text"
                        name="contact"
                        placeholder="e.g. Chef Bruno"
                        value={form.contact}
                        onChange={handleChange}
                        required
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
                        placeholder="chef@hotel.com"
                        value={form.email}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="ff">
                      <label className="fl">WhatsApp / Mobile</label>
                      <input
                        className="fc"
                        type="text"
                        name="phone"
                        placeholder="+960 XXX XXXX"
                        value={form.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="fs2">
                  <div className="fst">Shipping Information</div>

                  <div className="fr">
                    <div className="ff">
                      <label className="fl">
                        Country <span className="rq">*</span>
                      </label>
                      <select
                        className="fc"
                        name="country"
                        value={form.country}
                        onChange={handleChange}
                        required
                      >
                        {countryOptions
                          .filter((country) => country !== "All Countries")
                          .map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Island / Location <span className="rq">*</span>
                      </label>
                      <input
                        className="fc"
                        type="text"
                        name="location"
                        placeholder="e.g. North Malé Atoll, Kuda Huraa"
                        value={form.location}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="fr">
                    <div className="ff">
                      <label className="fl">
                        Preferred Airline <span className="rq">*</span>
                      </label>
                      <select
                        className="fc"
                        name="preferredAirline"
                        value={form.preferredAirline}
                        onChange={handleChange}
                        required
                      >
                        {airlineOptions.map((airline) => (
                          <option key={airline} value={airline}>
                            {airline}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ff">
                      <label className="fl">
                        Incoterms <span className="rq">*</span>
                      </label>
                      <div className="tg">
                        <button
                          type="button"
                          className={`to ${form.incoterms === "CIF" ? "on" : ""}`}
                          onClick={() => setForm((prev) => ({ ...prev, incoterms: "CIF" }))}
                        >
                          CIF
                        </button>
                        <button
                          type="button"
                          className={`to ${form.incoterms === "FOB" ? "on" : ""}`}
                          onClick={() => setForm((prev) => ({ ...prev, incoterms: "FOB" }))}
                        >
                          FOB
                        </button>
                        <button
                          type="button"
                          className={`to ${form.incoterms === "DAP" ? "on" : ""}`}
                          onClick={() => setForm((prev) => ({ ...prev, incoterms: "DAP" }))}
                        >
                          DAP
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="fr">
                    <div className="ff">
                      <label className="fl">Phytosanitary Required?</label>
                      <div className="tg">
                        <button
                          type="button"
                          className={`to ${form.phytoRequired ? "on" : ""}`}
                          onClick={() => setForm((prev) => ({ ...prev, phytoRequired: true }))}
                        >
                          ✅ Yes (standard)
                        </button>
                        <button
                          type="button"
                          className={`to ${!form.phytoRequired ? "on" : ""}`}
                          onClick={() => setForm((prev) => ({ ...prev, phytoRequired: false }))}
                        >
                          ❌ Not required
                        </button>
                      </div>
                    </div>

                    <div className="ff">
                      <label className="fl">Cold Chain Required?</label>
                      <div className="tg">
                        <button
                          type="button"
                          className={`to ${form.coldChainRequired ? "on" : ""}`}
                          onClick={() => setForm((prev) => ({ ...prev, coldChainRequired: true }))}
                        >
                          🧊 Yes — Thermocol boxes
                        </button>
                        <button
                          type="button"
                          className={`to ${!form.coldChainRequired ? "on" : ""}`}
                          onClick={() => setForm((prev) => ({ ...prev, coldChainRequired: false }))}
                        >
                          No cold chain
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="ff">
                    <label className="fl">Special Instructions</label>
                    <textarea
                      className="fc"
                      name="notes"
                      placeholder="Delivery agent at destination, special labelling, temperature requirements..."
                      value={form.notes}
                      onChange={handleChange}
                      rows="2"
                    />
                  </div>
                </div>
              </div>

              <div className="md-f">
                <button type="button" className="btn btn-s" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="btn btn-p" disabled={saving}>
                  {saving ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}