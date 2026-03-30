import React, { useEffect, useMemo, useState } from "react";
import { Search, Plane, X } from "lucide-react";
import { useToast } from "../context/ToastContext";

const airlineCodeMap = {
  "SriLankan Airlines (UL)": "UL225",
  "Maldivian (Q2)": "Q2 MLE",
  "Emirates (EK)": "EK656",
  "Qatar Airways (QR)": "QR672",
  Other: "OTHER",
};

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

const initialCustomers = [
  {
    id: 1,
    code: "FW-CLT-G001",
    customerName: "Four Seasons — Kuda Huraa",
    group: "Four Seasons",
    contact: "Chef Antoine",
    email: "chef@fourseasons.mv",
    phone: "+960 700 1111",
    country: "Maldives",
    location: "North Malé Atoll",
    preferredAirline: "SriLankan Airlines (UL)",
    airlineCode: "UL225",
    incoterms: "CIF",
    phytoRequired: true,
    coldChainRequired: false,
    shipments: 18,
    notes: "Coordinate with destination delivery agent before cargo arrival.",
    recentShipments: [
      { id: "SHP-2024-041", date: "2024-03-14", flight: "UL225", weight: "96 kg", docs: "7/7", status: "Delivered" },
      { id: "SHP-2024-038", date: "2024-03-07", flight: "UL225", weight: "88 kg", docs: "7/7", status: "Delivered" },
      { id: "SHP-2024-035", date: "2024-02-28", flight: "UL225", weight: "102 kg", docs: "7/7", status: "Delivered" },
    ],
  },
  {
    id: 2,
    code: "FW-CLT-G002",
    customerName: "Hilton Maldives — Amingiri",
    group: "Hilton Hotels",
    contact: "Chef Marco",
    email: "chef@hilton.mv",
    phone: "+960 700 2222",
    country: "Maldives",
    location: "North Malé Atoll",
    preferredAirline: "SriLankan Airlines (UL)",
    airlineCode: "UL225",
    incoterms: "CIF",
    phytoRequired: true,
    coldChainRequired: false,
    shipments: 14,
    notes: "Use standard export labels and notify resort purchasing team on AWB issue.",
    recentShipments: [
      { id: "SHP-2024-040", date: "2024-03-12", flight: "UL225", weight: "92 kg", docs: "7/7", status: "Delivered" },
      { id: "SHP-2024-036", date: "2024-03-02", flight: "UL225", weight: "84 kg", docs: "7/7", status: "Delivered" },
      { id: "SHP-2024-031", date: "2024-02-21", flight: "UL225", weight: "80 kg", docs: "7/7", status: "Delivered" },
    ],
  },
  {
    id: 3,
    code: "FW-CLT-G003",
    customerName: "Waldorf Astoria — Ithaafushi",
    group: "Waldorf",
    contact: "Chef Pierre",
    email: "chef@waldorf.mv",
    phone: "+960 700 3333",
    country: "Maldives",
    location: "South Malé Atoll",
    preferredAirline: "Maldivian (Q2)",
    airlineCode: "Q2 MLE",
    incoterms: "DAP",
    phytoRequired: true,
    coldChainRequired: true,
    shipments: 10,
    notes: "Cold chain required for all leafy and cut produce lines.",
    recentShipments: [
      { id: "SHP-2024-039", date: "2024-03-10", flight: "Q2 MLE", weight: "80 kg", docs: "7/7", status: "Delivered" },
      { id: "SHP-2024-034", date: "2024-02-26", flight: "Q2 MLE", weight: "74 kg", docs: "7/7", status: "Delivered" },
      { id: "SHP-2024-029", date: "2024-02-18", flight: "Q2 MLE", weight: "78 kg", docs: "7/7", status: "Delivered" },
    ],
  },
  {
    id: 4,
    code: "FW-CLT-G004",
    customerName: "Conrad Maldives — Rangali",
    group: "Conrad",
    contact: "Chef James",
    email: "chef@conrad.mv",
    phone: "+960 700 4444",
    country: "Maldives",
    location: "Ari Atoll",
    preferredAirline: "Maldivian (Q2)",
    airlineCode: "Q2 MLE",
    incoterms: "CIF",
    phytoRequired: false,
    coldChainRequired: true,
    shipments: 8,
    notes: "Thermocol box packing required for chilled lines.",
    recentShipments: [
      { id: "SHP-2024-037", date: "2024-03-05", flight: "Q2 MLE", weight: "76 kg", docs: "7/7", status: "Delivered" },
      { id: "SHP-2024-032", date: "2024-02-23", flight: "Q2 MLE", weight: "71 kg", docs: "7/7", status: "Delivered" },
      { id: "SHP-2024-028", date: "2024-02-15", flight: "Q2 MLE", weight: "68 kg", docs: "7/7", status: "Delivered" },
    ],
  },
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

const getAirlineCode = (airline) => airlineCodeMap[airline] || airline;

const getNextGlobalCustomerCode = (customers) => {
  const highest = customers.reduce((max, customer) => {
    const value = Number(String(customer.code).split("G").pop());
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `FW-CLT-G${String(highest + 1).padStart(3, "0")}`;
};

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
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("All Countries");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    ...emptyForm,
    code: getNextGlobalCustomerCode(initialCustomers),
  });

const [shipmentForm, setShipmentForm] = useState({
  shipmentDate: "",
  airline: "",
  flightNo: "",
  awbNo: "",
  incoterms: "CIF",
  totalWeight: "",
  documents: {
    commercialInvoice: true,
    packingList: true,
    phytosanitaryCertificate: false,
    airwayBill: false,
    certificateOfOrigin: false,
    healthCertificate: false,
    insuranceCertificate: false,
  },
});
  const [shipmentItems, setShipmentItems] = useState([
    {
      item: "Dragon Fruit (Red)",
      batch: "BT-089",
      qty: 20,
      boxes: 4,
    },
  ]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
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
  }, [customers, search, countryFilter]);

  useEffect(() => {
    if (!showModal && !showDetailsPanel && !showShipmentModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showShipmentModal) closeShipmentModal();
        if (showModal) closeModal();
        if (showDetailsPanel) closeDetailsPanel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal, showDetailsPanel, showShipmentModal]);

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
      link.download = "global-customers.csv";
      link.click();
      URL.revokeObjectURL(url);
      toast.info("Global customers CSV exported.");
    };

    window.addEventListener("fw-open-global-customer-modal", handleOpenFromTopbar);
    window.addEventListener("fw-export-global-customers", handleExportFromTopbar);

    return () => {
      window.removeEventListener("fw-open-global-customer-modal", handleOpenFromTopbar);
      window.removeEventListener("fw-export-global-customers", handleExportFromTopbar);
    };
  }, [filteredCustomers]);

  const openAddModal = () => {
    setModalMode("add");
    setEditingCustomerId(null);
    setForm({
      ...emptyForm,
      code: getNextGlobalCustomerCode(customers),
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

  const closeShipmentModal = () => {
    setShowShipmentModal(false);
  };

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setSelectedRowId(null);
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
      email: form.email,
      phone: form.phone,
      country: form.country,
      location: form.location,
      preferredAirline: form.preferredAirline,
      airlineCode: getAirlineCode(form.preferredAirline),
      incoterms: form.incoterms,
      phytoRequired: form.phytoRequired,
      coldChainRequired: form.coldChainRequired,
      notes: form.notes,
    };

    if (modalMode === "add") {
      const newCustomer = {
        id: Date.now(),
        ...customerData,
        shipments: 0,
        recentShipments: [],
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

      if (selectedCustomer?.id === editingCustomerId) {
        setSelectedCustomer((prev) => ({
          ...prev,
          ...customerData,
        }));
      }
    }
    if (modalMode === "add") {
  toast.success(`Global customer "${customerData.customerName}" created successfully.`);
} else {
  toast.success(`Global customer "${customerData.customerName}" saved successfully.`);
}

    closeModal();
  };

  const handleRowOpen = (customer) => {
    setSelectedCustomer(customer);
    setSelectedRowId(customer.id);
    setShowDetailsPanel(true);
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
    toast.warning("Customer removed");
  };

  const openShipmentModal = (customer) => {
    if (!customer) return;

    setSelectedCustomer(customer);

    setShipmentForm({
      shipmentDate: "",
      airline: customer.preferredAirline || "SriLankan Airlines (UL)",
      flightNo: "",
      awbNo: "",
      incoterms: customer.incoterms || "CIF",
      totalWeight: "",      documents: {
        commercialInvoice: true,
        packingList: true,
        phytosanitaryCertificate: customer.phytoRequired ?? false,
        airwayBill: false,
        certificateOfOrigin: false,
        healthCertificate: false,
        insuranceCertificate: false,
      },
    });

    setShipmentItems([
      {
        item: "Dragon Fruit (Red)",
        batch: "BT-089",
        qty: 20,
        boxes: 4,
      },
    ]);

    setShowShipmentModal(true);
  };

  const handleNewShipment = (e, customer) => {
    e.stopPropagation();
    openShipmentModal(customer);
  };

  const handleShipmentFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setShipmentForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleShipmentItemChange = (index, field, value) => {
    setShipmentItems((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const handleAddShipmentItem = () => {
    setShipmentItems((prev) => [
      ...prev,
      {
        item: "",
        batch: "",
        qty: "",
        boxes: "",
      },
    ]);
  };

  const handleRemoveShipmentItem = (index) => {
    setShipmentItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const handleShipmentDocumentToggle = (name) => {
    setShipmentForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [name]: !prev.documents[name],
      },
    }));
  };

  const handleCreateShipment = () => {
    if (!selectedCustomer) return;

    const docsDone = Object.values(shipmentForm.documents).filter(Boolean).length;

    const newShipment = {
      id: `SHP-${Date.now().toString().slice(-6)}`,
      date: shipmentForm.shipmentDate || new Date().toISOString().slice(0, 10),
      flight: shipmentForm.flightNo || getAirlineCode(shipmentForm.airline),
      weight: `${shipmentForm.totalWeight || 0} kg`,
      docs: `${docsDone}/7`,
      status: docsDone === 7 ? "Ready" : "Pending",
    };

    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === selectedCustomer.id
          ? {
              ...customer,
              shipments: (customer.shipments || 0) + 1,
              recentShipments: [newShipment, ...(customer.recentShipments || [])],
            }
          : customer
      )
    );

    setSelectedCustomer((prev) =>
      prev
        ? {
            ...prev,
            shipments: (prev.shipments || 0) + 1,
            recentShipments: [newShipment, ...(prev.recentShipments || [])],
          }
        : prev
    );

    setShowShipmentModal(false);
    toast.success(`Shipment ${newShipment.id} created. Generate missing documents.`);
  };

  return (
    <div className="page-shell">
      
      <div className="notice-banner notice-warning">
        <Plane size={16} />
        <span>
          Global customers receive airline shipments. Click any row to view details,
          shipment history and actions. No returns after departure.
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
          <h3>✈️ Global Customers — Export</h3>
          <span className="count-pill">{filteredCustomers.length} customers</span>
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
                          className="btn btn-p btn-xs gc-ship-btn"
                          title="New shipment"
                          onClick={(e) => handleNewShipment(e, customer)}
                        >
                          ✈️ Shipment
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
                        <td>{shipment.id}</td>
                        <td>{shipment.date}</td>
                        <td>{shipment.flight}</td>
                        <td>{shipment.weight}</td>
                        <td>
                          <span className={`mini-badge ${shipment.docs === "7/7" ? "delivered" : "pending"}`}>
                            {shipment.docs}
                          </span>
                        </td>
                        <td>
                          <span className={`mini-badge ${shipment.status === "Delivered" || shipment.status === "Ready" ? "delivered" : "pending"}`}>
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
                onClick={() => {
                  const customer = selectedCustomer;
                  closeDetailsPanel();
                  openShipmentModal(customer);
                }}
              >
                ✈️ New Shipment
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
            </div>
          </div>
        </>
      )}

{showShipmentModal && selectedCustomer && (
  <div className="modal-backdrop" onClick={closeShipmentModal}>
<div className="md md-lg" onClick={(e) => e.stopPropagation()}>
  <div className="md-h">        <h3>✈️ New Global Dispatch (Export Shipment)</h3>
          <button type="button" className="md-x" onClick={closeShipmentModal}>
            ✕
          </button>       
      </div>

      <div className="md-b" style={{ overflowY: "auto", maxHeight: "calc(90vh - 150px)" }}>
        <div className="ib ib-w" style={{ marginTop: "-4px", marginBottom: "14px" }}>
          <span>✈️</span>
          <div>
            Stock deducted when all 7 export documents are verified & shipment Cleared. No returns after departure.
          </div>
        </div>
        <div className="fr">
          <div className="ff">
            <label className="fl">
              Customer <span className="rq">*</span>
            </label>
            <select className="fc">
              <option>
                {selectedCustomer.customerName}, {selectedCustomer.country}
              </option>
            </select>
          </div>

          <div className="ff">
            <label className="fl">
              Shipment Date <span className="rq">*</span>
            </label>
            <input
              className="fc"
              type="date"
              name="shipmentDate"
              value={shipmentForm.shipmentDate}
              onChange={handleShipmentFormChange}
            />
          </div>
        </div>

        <div className="fr3">
          <div className="ff">
            <label className="fl">Airline</label>
            <select
              className="fc"
              name="airline"
              value={shipmentForm.airline}
              onChange={handleShipmentFormChange}
            >
              {airlineOptions.map((airline) => (
                <option key={airline} value={airline}>
                  {airline}
                </option>
              ))}
            </select>
          </div>

          <div className="ff">
            <label className="fl">Flight No.</label>
            <input
              className="fc"
              name="flightNo"
              placeholder="e.g. UL225"
              value={shipmentForm.flightNo}
              onChange={handleShipmentFormChange}
            />
          </div>

          <div className="ff">
            <label className="fl">AWB No.</label>
            <input
              className="fc"
              name="awbNo"
              placeholder="603-XXXXXXXX"
              value={shipmentForm.awbNo}
              onChange={handleShipmentFormChange}
            />
          </div>
        </div>

        <div className="fr">
          <div className="ff">
            <label className="fl">Incoterms</label>
            <select
              className="fc"
              name="incoterms"
              value={shipmentForm.incoterms}
              onChange={handleShipmentFormChange}
            >
              <option value="CIF">CIF</option>
              <option value="FOB">FOB</option>
              <option value="DAP">DAP</option>
            </select>
          </div>

          <div className="ff">
            <label className="fl">Total Weight (kg)</label>
            <input
              className="fc"
              type="number"
              name="totalWeight"
              placeholder="0.0"
              value={shipmentForm.totalWeight}
              onChange={handleShipmentFormChange}
            />
          </div>
        </div>

        <div className="fst" style={{ marginBottom: "10px" }}>
          Items — FEFO Applied
        </div>

        <table className="it">
          <thead>
            <tr>
              <th>Item</th>
              <th>Batch</th>
              <th>Qty (kg)</th>
              <th>Boxes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shipmentItems.map((row, index) => (
              <tr key={index}>
                <td>
                  <select
                    value={row.item}
                    onChange={(e) =>
                      handleShipmentItemChange(index, "item", e.target.value)
                    }
                  >
                    <option value="Dragon Fruit (Red)">Dragon Fruit (Red)</option>
                    <option value="Rambutan">Rambutan</option>
                    <option value="Mango">Mango</option>
                  </select>
                </td>

                <td>
                  <select
                    value={row.batch}
                    onChange={(e) =>
                      handleShipmentItemChange(index, "batch", e.target.value)
                    }
                  >
                    <option value="BT-089">BT-089</option>
                    <option value="BT-088">BT-088</option>
                    <option value="BT-102">BT-102</option>
                  </select>
                </td>

                <td>
                  <input
                    type="number"
                    value={row.qty}
                    onChange={(e) =>
                      handleShipmentItemChange(index, "qty", e.target.value)
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={row.boxes}
                    onChange={(e) =>
                      handleShipmentItemChange(index, "boxes", e.target.value)
                    }
                  />
                </td>

                <td>
                  <button
                    type="button"
                    className="ab d"
                    onClick={() => handleRemoveShipmentItem(index)}
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
          onClick={handleAddShipmentItem}
        >
          ＋ Add Item
        </button>

        <div className="fst" style={{ margin: "13px 0 9px" }}>
          Export Document Checklist
        </div>

        <ul className="ck-l">
          <li>
            <input
              type="checkbox"
              checked={shipmentForm.documents.commercialInvoice}
              onChange={() => handleShipmentDocumentToggle("commercialInvoice")}
            />{" "}
            Commercial Invoice
          </li>
          <li>
            <input
              type="checkbox"
              checked={shipmentForm.documents.packingList}
              onChange={() => handleShipmentDocumentToggle("packingList")}
            />{" "}
            Packing List
          </li>
          <li>
            <input
              type="checkbox"
              checked={shipmentForm.documents.phytosanitaryCertificate}
              onChange={() => handleShipmentDocumentToggle("phytosanitaryCertificate")}
            />{" "}
            Phytosanitary Certificate
          </li>
          <li>
            <input
              type="checkbox"
              checked={shipmentForm.documents.airwayBill}
              onChange={() => handleShipmentDocumentToggle("airwayBill")}
            />{" "}
            Airway Bill (AWB)
          </li>
          <li>
            <input
              type="checkbox"
              checked={shipmentForm.documents.certificateOfOrigin}
              onChange={() => handleShipmentDocumentToggle("certificateOfOrigin")}
            />{" "}
            Certificate of Origin
          </li>
          <li>
            <input
              type="checkbox"
              checked={shipmentForm.documents.healthCertificate}
              onChange={() => handleShipmentDocumentToggle("healthCertificate")}
            />{" "}
            Health Certificate
          </li>
          <li>
            <input
              type="checkbox"
              checked={shipmentForm.documents.insuranceCertificate}
              onChange={() => handleShipmentDocumentToggle("insuranceCertificate")}
            />{" "}
            Insurance Certificate
          </li>
        </ul>
      </div>

      <div className="md-f">
        <button
          type="button"
          className="btn btn-s"
          onClick={closeShipmentModal}
        >
          Cancel
        </button>

        <button
          type="button"
          className="btn btn-a"
          onClick={handleCreateShipment}
        >
          Create Shipment + Generate Docs
        </button>
      </div>
    </div>
  </div>
)}
{showModal && (
  <div className="modal-backdrop" onClick={closeModal}>
<div className="md md-lg" onClick={(e) => e.stopPropagation()}>
  <div className="md-h">        
    <h3>{modalMode === "add" ? "✈️ Add Global Customer" : "✏️ Edit Global Customer"}</h3>
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

          <button type="submit" className="btn btn-p">
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