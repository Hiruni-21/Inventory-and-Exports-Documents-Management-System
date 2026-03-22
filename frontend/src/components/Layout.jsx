import { Link, Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const navByRole = {
  manager: [
    {
      label: "Overview",
      items: [
        { to: "/dashboard", text: "Dashboard", icon: "▦" },
        { to: "/activity", text: "Activity Log", icon: "🕘" },
      ],
    },
    {
      label: "Inventory",
      items: [
        { to: "/inventory", text: "Inventory", icon: "📦" },
        { to: "/items", text: "Item Master", icon: "🏷" },
        { to: "/categories", text: "Item Categories", icon: "🗂" },
        { to: "/inventory/expiry", text: "Expiry Items", icon: "⏱" },
        { to: "/inventory/low-stock", text: "Low Stock", icon: "⚠" },
        { to: "/stock-adjustments", text: "Stock Adjustments", icon: "🧮" },
        { to: "/stock-count", text: "Physical Stock Count", icon: "☑" },
        { to: "/inventory/valuation", text: "Stock Valuation", icon: "💰" },
      ],
    },
    {
      label: "Procurement",
      items: [
        { to: "/suppliers", text: "Suppliers", icon: "🚜" },
        { to: "/purchase-orders", text: "Purchase Orders", icon: "🧾" },
        { to: "/grn", text: "GRN", icon: "📥" },
        { to: "/returns", text: "Returns & Wastage", icon: "↩" },
      ],
    },
    {
      label: "Operations",
      items: [
        { to: "/packaging", text: "Packaging Stock", icon: "📦" },
        { to: "/customers/local", text: "Local Customers", icon: "🏠" },
        { to: "/customers/global", text: "Global Customers", icon: "🌍" },
        { to: "/dispatch/local", text: "Local Dispatch", icon: "🚚" },
        { to: "/dispatch/global", text: "Global Dispatch", icon: "✈" },
        { to: "/export-documents", text: "Export Documents", icon: "📄" },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/reports", text: "Reports & Analytics", icon: "📊" },
        { to: "/users", text: "Users & Roles", icon: "👤" },
      ],
    },
  ],
  ops: [
    {
      label: "Overview",
      items: [{ to: "/dashboard", text: "Dashboard", icon: "▦" }],
    },
    {
      label: "Inventory",
      items: [
        { to: "/inventory", text: "Inventory", icon: "📦" },
        { to: "/items", text: "Item Master", icon: "🏷" },
        { to: "/inventory/expiry", text: "Expiry Items", icon: "⏱" },
        { to: "/inventory/low-stock", text: "Low Stock", icon: "⚠" },
        { to: "/packaging", text: "Packaging Stock", icon: "📦" },
      ],
    },
    {
      label: "Procurement",
      items: [
        { to: "/suppliers", text: "Suppliers", icon: "🚜" },
        { to: "/purchase-orders", text: "Purchase Orders", icon: "🧾" },
        { to: "/grn", text: "GRN", icon: "📥" },
        { to: "/returns", text: "Returns & Wastage", icon: "↩" },
      ],
    },
    {
      label: "Operations",
      items: [
        { to: "/customers/local", text: "Local Customers", icon: "🏠" },
        { to: "/customers/global", text: "Global Customers", icon: "🌍" },
        { to: "/dispatch/local", text: "Local Dispatch", icon: "🚚" },
        { to: "/dispatch/global", text: "Global Dispatch", icon: "✈" },
        { to: "/export-documents", text: "Export Documents", icon: "📄" },
        { to: "/reports", text: "Reports", icon: "📊" },
      ],
    },
  ],
  supervisor: [
    {
      label: "Overview",
      items: [{ to: "/dashboard", text: "Dashboard", icon: "▦" }],
    },
    {
      label: "Inventory",
      items: [
        { to: "/inventory", text: "Inventory", icon: "📦" },
        { to: "/inventory/expiry", text: "Expiry Items", icon: "⏱" },
        { to: "/inventory/low-stock", text: "Low Stock", icon: "⚠" },
        { to: "/stock-adjustments", text: "Stock Adjustments", icon: "🧮" },
        { to: "/stock-count", text: "Physical Stock Count", icon: "☑" },
      ],
    },
    {
      label: "Operations",
      items: [
        { to: "/purchase-orders", text: "Purchase Orders", icon: "🧾" },
        { to: "/grn", text: "GRN", icon: "📥" },
        { to: "/returns", text: "Returns & Wastage", icon: "↩" },
        { to: "/packaging", text: "Packaging Stock", icon: "📦" },
      ],
    },
  ],
  logistics: [
    {
      label: "Overview",
      items: [{ to: "/dashboard", text: "Dashboard", icon: "▦" }],
    },
    {
      label: "Operations",
      items: [
        { to: "/customers/local", text: "Local Customers", icon: "🏠" },
        { to: "/customers/global", text: "Global Customers", icon: "🌍" },
        { to: "/dispatch/local", text: "Local Dispatch", icon: "🚚" },
        { to: "/dispatch/global", text: "Global Dispatch", icon: "✈" },
        { to: "/export-documents", text: "Export Documents", icon: "📄" },
      ],
    },
  ],
  supplier: [
    {
      label: "Portal",
      items: [
        { to: "/dashboard", text: "My Dashboard", icon: "▦" },
        { to: "/supplier-portal/orders", text: "My Orders", icon: "🧾" },
        { to: "/supplier-portal/returns", text: "My Return Notes", icon: "↩" },
      ],
    },
  ],
};

const pageTitles = {
  "/dashboard": ["Dashboard", "Fresh World Exporters ERP"],
  "/inventory": ["Inventory", "Batch-wise stock overview"],
  "/items": ["Item Master", "Manage produce items"],
  "/categories": ["Item Categories", "Item grouping and setup"],
  "/inventory/low-stock": ["Low Stock", "Items requiring replenishment"],
  "/reports": ["Reports & Analytics", "Operational insights"],
  "/suppliers": ["Suppliers", "Supplier master records"],
  "/purchase-orders": ["Purchase Orders", "Procurement workflow"],
  "/grn": ["GRN", "Goods received notes"],
  "/returns": ["Returns & Wastage", "Returns and wastage management"],
  "/export-documents": ["Export Documents", "Shipment document tracking"],
};

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);

  const roleKey = user?.role || "manager";
  const roleLabel =
    {
      manager: "Manager",
      ops: "Operations Executive",
      supervisor: "Supervisor",
      logistics: "Logistics Executive",
      supplier: "Supplier Portal",
    }[roleKey] || "Manager";

  const sections = useMemo(() => navByRole[roleKey] || navByRole.manager, [roleKey]);

  const [title, subtitle] = pageTitles[location.pathname] || [
    "Fresh World Exporters ERP",
    "Inventory & Export Documents Management System",
  ];

  const initials = (user?.name || "FW")
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div id="app">
        <div className="sb">
          <div className="sb-top">
            <div className="sb-head">
              <div className="sb-brand">
                <div className="sb-brand-box">
                  <svg viewBox="0 0 40 40">
                    <path d="M20 4C10 4 4 12 4 20c0 10 8 16 16 16s16-6 16-16c0-8-6-16-16-16zM16 14c2-4 6-6 10-4-4 2-6 6-6 10 0-4-2-8-4-6zm-2 6c-2-4 0-10 4-12 0 4-2 8-2 12-2-2-4 0-2 0zm6 0c0 4-2 8-6 10 0-4 2-8 6-10zm0 0c0 4 2 8 6 10 0-4-2-8-6-10z" />
                  </svg>
                </div>
                <div className="sb-brand-text">
                  <h2>Fresh World Exporters</h2>
                  <p>ERP System</p>
                </div>
              </div>
            </div>

            <div className="sb-nav">
              {sections.map((section) => (
                <div key={section.label}>
                  <div className="sbl">{section.label}</div>

                  {section.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`ni ${location.pathname === item.to ? "active" : ""}`}
                    >
                      <div className="ni-icon">
                        <span>{item.icon}</span>
                      </div>
                      <div className="ni-txt">{item.text}</div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="sb-user">
            <div className="sb-user-row">
              <div className="sb-av">{initials}</div>
              <div>
                <div className="sb-u-name">{user?.name || "Fresh World User"}</div>
                <div className="sb-u-role">{roleLabel}</div>
              </div>
            </div>

            <button className="sb-signout" onClick={logout}>
              <svg viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div className="tb-t">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>

            <div className="tb-a">
              <button className="btn btn-s btn-sm">Export</button>
              <button className="btn btn-p btn-sm">Quick Action</button>

              <button className="nb-btn" onClick={() => setNotifOpen((p) => !p)}>
                <svg viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
                  <path d="M10 21a2 2 0 0 0 4 0" />
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
          <div className="np-item unread">
            <div className="np-type">Low Stock</div>
            <div className="np-msg">Mint is below reorder level. Ops action required.</div>
            <div className="np-time">2 mins ago</div>
          </div>

          <div className="np-item unread">
            <div className="np-type">Export Docs</div>
            <div className="np-msg">Shipment FW-GD-001 still has pending documents.</div>
            <div className="np-time">18 mins ago</div>
          </div>

          <div className="np-item">
            <div className="np-type">Wastage</div>
            <div className="np-msg">A wastage record was created for lettuce batch B-102.</div>
            <div className="np-time">1 hour ago</div>
          </div>
        </div>
      </div>

      <div id="toast-wrap"></div>
    </>
  );
};

export default Layout;