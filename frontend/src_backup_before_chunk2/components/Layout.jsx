import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import companyLogo from "../assets/company-logo.png";

const IconDashboard = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z" />
  </svg>
);

const IconActivity = () => (
  <svg viewBox="0 0 24 24">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const IconInventory = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" />
    <path d="M3 7.5V16.5L12 21l9-4.5V7.5" />
    <path d="M12 12v9" />
  </svg>
);

const IconTag = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20.59 13.41 11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82Z" />
    <path d="M7 7h.01" />
  </svg>
);

const IconLayers = () => (
  <svg viewBox="0 0 24 24">
    <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
    <path d="m3 12 9 4.5 9-4.5" />
    <path d="m3 16.5 9 4.5 9-4.5" />
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const IconAlert = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
  </svg>
);

const IconAdjust = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 3v18" />
    <path d="M5 8h14" />
    <path d="M7 8l2-2" />
    <path d="M7 8l2 2" />
  </svg>
);

const IconClipboard = () => (
  <svg viewBox="0 0 24 24">
    <rect x="6" y="4" width="12" height="16" rx="2" />
    <path d="M9 4h6v3H9z" />
  </svg>
);

const IconDollar = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 2v20" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconLeaf = () => (
  <svg viewBox="0 0 24 24">
    <path d="M19 3c-6 1-10 5-11 11 6-1 10-5 11-11Z" />
    <path d="M5 19c1-4 4-7 8-8" />
  </svg>
);

const IconFile = () => (
  <svg viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h8" />
  </svg>
);

const IconInbox = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 13V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
    <path d="M3 13h5l2 3h4l2-3h5" />
    <path d="M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
  </svg>
);

const IconReturn = () => (
  <svg viewBox="0 0 24 24">
    <path d="M9 14 4 9l5-5" />
    <path d="M20 20v-5a6 6 0 0 0-6-6H4" />
  </svg>
);

const IconBox = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" />
    <path d="M3 7.5V16.5L12 21l9-4.5V7.5" />
    <path d="M12 12v9" />
  </svg>
);

const IconHome = () => (
  <svg viewBox="0 0 24 24">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10.5V20h14v-9.5" />
  </svg>
);

const IconPlane = () => (
  <svg viewBox="0 0 24 24">
    <path d="M2 16l20-8-8 20-2-8-10-4z" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24">
    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9.5" cy="7" r="4" />
    <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const normalizeRole = (role) => {
  switch (role) {
    case "Manager":
      return "manager";
    case "Operations Executive":
      return "ops";
    case "Supervisor":
      return "supervisor";
    case "Logistics Executive":
      return "logistics";
    case "Supplier":
      return "supplier";
    default:
      return "manager";
  }
};

const navByRole = {
  manager: [
    {
      label: "OVERVIEW",
      items: [
        { to: "/dashboard", text: "Dashboard", icon: <IconDashboard /> },
        { to: "/reports", text: "Activity Log", icon: <IconActivity /> },
      ],
    },
    {
      label: "INVENTORY",
      items: [
        { to: "/inventory", text: "Inventory", icon: <IconInventory /> },
        { to: "/items", text: "Item Master", icon: <IconTag /> },
        { to: "/categories", text: "Item Categories", icon: <IconLayers /> },
        { to: "/inventory/low-stock", text: "Low Stock", icon: <IconAlert />, badge: { text: "5", cls: "nb-r" } },
        { to: "/stock-adjustments", text: "Stock Adjustments", icon: <IconAdjust /> },
      ],
    },
    {
      label: "PROCUREMENT",
      items: [
        { to: "/suppliers", text: "Suppliers", icon: <IconLeaf /> },
        { to: "/purchase-orders", text: "Purchase Orders", icon: <IconFile />, badge: { text: "3", cls: "nb-a" } },
        { to: "/grn", text: "Goods Receiving", icon: <IconInbox /> },
        { to: "/returns", text: "Returns & Wastage", icon: <IconReturn /> },
      ],
    },
    {
      label: "ANALYTICS",
      items: [{ to: "/reports", text: "Reports & Analytics", icon: <IconActivity /> }],
    },
    {
      label: "SYSTEM",
      items: [{ to: "/dashboard", text: "Users & Roles", icon: <IconUsers /> }],
    },
  ],
  ops: [
    {
      label: "OVERVIEW",
      items: [{ to: "/dashboard", text: "Dashboard", icon: <IconDashboard /> }],
    },
    {
      label: "INVENTORY",
      items: [
        { to: "/inventory", text: "Inventory", icon: <IconInventory /> },
        { to: "/items", text: "Item Master", icon: <IconTag /> },
        { to: "/inventory/low-stock", text: "Low Stock", icon: <IconAlert />, badge: { text: "5", cls: "nb-r" } },
      ],
    },
    {
      label: "PROCUREMENT",
      items: [
        { to: "/suppliers", text: "Suppliers", icon: <IconLeaf /> },
        { to: "/purchase-orders", text: "Purchase Orders", icon: <IconFile />, badge: { text: "3", cls: "nb-a" } },
        { to: "/grn", text: "Goods Receiving", icon: <IconInbox /> },
        { to: "/returns", text: "Returns & Wastage", icon: <IconReturn /> },
      ],
    },
    {
      label: "ANALYTICS",
      items: [{ to: "/reports", text: "Reports", icon: <IconActivity /> }],
    },
  ],
  supervisor: [
    {
      label: "OVERVIEW",
      items: [{ to: "/dashboard", text: "Dashboard", icon: <IconDashboard /> }],
    },
    {
      label: "INVENTORY",
      items: [
        { to: "/inventory", text: "Inventory", icon: <IconInventory /> },
        { to: "/inventory/low-stock", text: "Low Stock", icon: <IconAlert /> },
        { to: "/stock-adjustments", text: "Stock Adjustments", icon: <IconAdjust /> },
      ],
    },
    {
      label: "PROCUREMENT",
      items: [
        { to: "/purchase-orders", text: "Purchase Orders", icon: <IconFile /> },
        { to: "/grn", text: "Goods Receiving", icon: <IconInbox /> },
        { to: "/returns", text: "Returns & Wastage", icon: <IconReturn /> },
      ],
    },
  ],
  logistics: [
    {
      label: "OVERVIEW",
      items: [{ to: "/dashboard", text: "Dashboard", icon: <IconDashboard /> }],
    },
    {
      label: "INVENTORY",
      items: [{ to: "/inventory", text: "Inventory", icon: <IconInventory /> }],
    },
    {
      label: "PROCUREMENT",
      items: [{ to: "/grn", text: "Goods Receiving", icon: <IconInbox /> }],
    },
  ],
  supplier: [
    {
      label: "OVERVIEW",
      items: [{ to: "/dashboard", text: "Dashboard", icon: <IconDashboard /> }],
    },
    {
      label: "SUPPLY",
      items: [{ to: "/purchase-orders", text: "Purchase Orders", icon: <IconFile /> }],
    },
  ],
};

const pageMeta = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Fresh World Exporters ERP",
  },
  "/suppliers": {
    title: "Suppliers",
    subtitle: "Manage supplier records and procurement partners",
  },
  "/categories": {
    title: "Item Categories",
    subtitle: "Maintain inventory categories and structure",
  },
  "/items": {
    title: "Item Master",
    subtitle: "Manage finished goods, produce, and stock items",
  },
  "/inventory": {
    title: "Inventory",
    subtitle: "Track live stock levels and available quantities",
  },
  "/inventory/low-stock": {
    title: "Low Stock",
    subtitle: "Monitor urgent restocking requirements",
  },
  "/stock-adjustments": {
    title: "Stock Adjustments",
    subtitle: "Review and manage stock corrections",
  },
  "/purchase-orders": {
    title: "Purchase Orders",
    subtitle: "Create and manage supplier purchase orders",
  },
  "/purchase-orders/add": {
    title: "Create Purchase Order",
    subtitle: "Prepare a new supplier purchase order",
  },
  "/grn": {
    title: "Goods Receiving",
    subtitle: "Receive supplier deliveries and update stock",
  },
  "/grn/add": {
    title: "New Goods Received Note",
    subtitle: "Record received goods against a purchase order",
  },
  "/returns": {
    title: "Returns & Wastage",
    subtitle: "Manage returns, wastage, and stock losses",
  },
  "/reports": {
    title: "Reports & Analytics",
    subtitle: "View operational and inventory insights",
  },
};

const notificationsByRole = {
  manager: [
    "5 low stock alerts require review",
    "3 purchase orders are pending approval",
    "1 GRN was created today",
  ],
  ops: [
    "2 supplier orders need follow-up",
    "Low stock found in 5 inventory items",
    "1 new delivery was received today",
  ],
  supervisor: [
    "New stock adjustment needs review",
    "1 receiving note needs verification",
    "Batch quality check is pending",
  ],
  logistics: [
    "Inbound stock updated from latest GRN",
    "Dispatch prep list is ready",
    "Warehouse team reported a delay",
  ],
  supplier: [
    "A purchase order is waiting for confirmation",
    "Delivery date update requested",
    "Your latest order summary is available",
  ],
};

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  const roleKey = normalizeRole(user?.role);
  const sections = useMemo(() => navByRole[roleKey] || navByRole.manager, [roleKey]);

  const matchedMeta =
    pageMeta[location.pathname] ||
    (location.pathname.startsWith("/purchase-orders/")
      ? { title: "Purchase Order Details", subtitle: "Review purchase order information and line items" }
      : location.pathname.startsWith("/grn/")
      ? { title: "GRN Details", subtitle: "Review received stock and delivery details" }
      : { title: "Dashboard", subtitle: "Fresh World Exporters ERP" });

  const initials = (user?.name || "FW")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handlePrimaryAction = () => {
    if (location.pathname === "/purchase-orders") {
      navigate("/purchase-orders/add");
      return;
    }

    if (location.pathname === "/grn") {
      navigate("/grn/add");
      return;
    }

    navigate("/dashboard");
  };

  const primaryButtonLabel =
    location.pathname === "/purchase-orders"
      ? "Create PO"
      : location.pathname === "/grn"
      ? "Create GRN"
      : "Quick Action";

  const notifications = notificationsByRole[roleKey] || notificationsByRole.manager;

  return (
    <>
      <div id="app">
        <div className="sb">
          <div className="sb-top">
            <div className="sb-head">
              <div className="sb-brand">
                <div className="sb-brand-box">
                  <img src={companyLogo} alt="Fresh World logo" className="sidebar-logo-img" />
                </div>

                <div className="sb-brand-text">
                  <h2>Fresh World Exporters</h2>
                </div>
              </div>
            </div>

            <div className="sb-nav">
              {sections.map((section) => (
                <div key={section.label}>
                  <div className="sbl">{section.label}</div>

                  {section.items.map((item) => {
                    const isActive =
                      location.pathname === item.to ||
                      (item.to === "/purchase-orders" && location.pathname.startsWith("/purchase-orders")) ||
                      (item.to === "/grn" && location.pathname.startsWith("/grn"));

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`ni ${isActive ? "active" : ""}`}
                      >
                        <div className="ni-icon">{item.icon}</div>
                        <div className="ni-txt">{item.text}</div>
                        {item.badge ? (
                          <span className={`nb ${item.badge.cls}`}>{item.badge.text}</span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="sb-user">
            <div className="sb-user-row">
              <div className="sb-av">{initials}</div>
              <div>
                <div className="sb-u-name">{user?.name || "Fresh World User"}</div>
                <div className="sb-u-role">{user?.role || "User"}</div>
              </div>
            </div>

            <button className="sb-signout" onClick={logout}>
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div className="tb-t">
              <h1>{matchedMeta.title}</h1>
              <p>{matchedMeta.subtitle}</p>
            </div>

            <div className="tb-a">
              <button className="btn btn-s btn-sm">Export</button>
              <button className="btn btn-p btn-sm" onClick={handlePrimaryAction}>
                {primaryButtonLabel}
              </button>
              <button className="nb-btn" onClick={() => setNotifOpen((prev) => !prev)}>
                <svg viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="ndot"></span>
              </button>
            </div>
          </div>

          <div className="ca">
            <Outlet />
          </div>
        </div>
      </div>

      <div className={`np ${notifOpen ? "open" : ""}`}>
        <div className="np-h">
          <h3>Notifications</h3>
          <button className="np-close" onClick={() => setNotifOpen(false)}>
            ✕
          </button>
        </div>

        <div className="np-body">
          {notifications.map((note, index) => (
            <div key={index} className="dashboard-card" style={{ marginBottom: "12px" }}>
              {note}
            </div>
          ))}
        </div>
      </div>

      <div id="toast-wrap"></div>
    </>
  );
};

export default Layout;