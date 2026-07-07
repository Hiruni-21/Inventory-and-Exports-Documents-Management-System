import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import companyLogo from "../assets/company-logo.png";

const IconDashboard = () => (
  <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z" /></svg>
);
const IconActivity = () => (
  <svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
);
const IconInventory = () => (
  <svg viewBox="0 0 24 24"><path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" /><path d="M3 7.5V16.5L12 21l9-4.5V7.5" /><path d="M12 12v9" /></svg>
);
const IconTag = () => (
  <svg viewBox="0 0 24 24"><path d="M20.59 13.41 11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82Z" /><path d="M7 7h.01" /></svg>
);
const IconLayers = () => (
  <svg viewBox="0 0 24 24"><path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const IconAlert = () => (
  <svg viewBox="0 0 24 24"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
);
const IconAdjust = () => (
  <svg viewBox="0 0 24 24"><path d="M12 3v18" /><path d="M5 8h14" /><path d="M7 8l2-2" /><path d="M7 8l2 2" /></svg>
);
const IconClipboard = () => (
  <svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 4h6v3H9z" /></svg>
);
const IconDollar = () => (
  <svg viewBox="0 0 24 24"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" /></svg>
);
const IconLeaf = () => (
  <svg viewBox="0 0 24 24"><path d="M19 3c-6 1-10 5-11 11 6-1 10-5 11-11Z" /><path d="M5 19c1-4 4-7 8-8" /></svg>
);
const IconFile = () => (
  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h8" /></svg>
);
const IconInbox = () => (
  <svg viewBox="0 0 24 24"><path d="M3 13V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" /><path d="M3 13h5l2 3h4l2-3h5" /><path d="M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></svg>
);
const IconReturn = () => (
  <svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5" /><path d="M20 20v-5a6 6 0 0 0-6-6H4" /></svg>
);
const IconBox = () => (
  <svg viewBox="0 0 24 24"><path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" /><path d="M3 7.5V16.5L12 21l9-4.5V7.5" /><path d="M12 12v9" /></svg>
);
const IconHome = () => (
  <svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10.5V20h14v-9.5" /></svg>
);
const IconPlane = () => (
  <svg viewBox="0 0 24 24"><path d="M2 16l20-8-8 20-2-8-10-4z" /></svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const IconUserCircle = () => (
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 19a5 5 0 0 1 10 0" /></svg>
);
const IconShieldCheck = () => (
  <svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" /><path d="m9.5 12 1.8 1.8 3.7-3.8" /></svg>
);
const IconMessage = () => (
  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);

const notificationsByRole = {
  manager: [
    { type: "Expiry Alert", message: "Batch BT-089 Dragon Fruit expires in 2 days.", time: "Just now", unread: true },
    { type: "Low Stock", message: "Cardboard Box (Large) is below reorder level.", time: "10 min", unread: true },
    { type: "Export Docs", message: "Shipment SHP-2024-042 has 2 missing documents.", time: "2 hours", unread: false },
  ],
  ops: [
    { type: "Low Stock", message: "5 items need purchase orders.", time: "Just now", unread: true },
    { type: "GRN", message: "One GRN needs verification.", time: "1 hour", unread: true },
  ],
  supervisor: [
    { type: "Expiry", message: "Dragon Fruit BT-089 should dispatch first today.", time: "Just now", unread: true },
    { type: "Notify Ops", message: "Low stock items need to be escalated.", time: "45 min", unread: true },
  ],
  logistics: [
    { type: "Dispatch", message: "3 local dispatches are scheduled for today.", time: "Just now", unread: true },
    { type: "Export", message: "One export shipment is waiting for document completion.", time: "1 hour", unread: true },
  ],
  supplier: [
    { type: "Purchase Order", message: "Fresh World sent a purchase order for your review.", time: "Just now", unread: true },
    { type: "Return Note", message: "A return note is awaiting your feedback.", time: "1 hour", unread: true },
  ],
};

const navByRole = {
  manager: [
    {
      label: "OVERVIEW",
      items: [
        { to: "/dashboard", text: "Dashboard", icon: <IconDashboard /> },
        { to: "/profile", text: "My Profile", icon: <IconUserCircle /> },
        { to: "/activity", text: "Activity Log", icon: <IconActivity /> },
      ],
    },
    {
      label: "INVENTORY",
      items: [
        { to: "/inventory", text: "Inventory", icon: <IconInventory /> },
        { to: "/items", text: "Items", icon: <IconTag /> },
        { to: "/categories", text: "Item Categories", icon: <IconLayers /> },
        { to: "/inventory/low-stock", text: "Low Stock", icon: <IconAlert />, badge: { text: "5", cls: "nb-r" } },
        { to: "/stock-adjustments", text: "Stock Adjustments", icon: <IconAdjust /> },
        { to: "/stock-count", text: "Physical Stock Count", icon: <IconClipboard /> },
        { to: "/inventory/valuation", text: "Stock Valuation", icon: <IconDollar /> },
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
      label: "PACKAGING",
      items: [{ to: "/packaging", text: "Packaging Stock", icon: <IconBox />, badge: { text: "!", cls: "nb-r" } }],
    },
    {
      label: "CLIENTS & DISPATCH",
      items: [
        { to: "/customers/local", text: "Local Customers", icon: <IconHome /> },
        { to: "/customers/global", text: "Global Customers", icon: <IconPlane /> },
        { to: "/dispatch/local", text: "Local Dispatch", icon: <IconBox /> },
        { to: "/dispatch/global", text: "Global Dispatch", icon: <IconPlane /> },
        { to: "/export-documents", text: "Export Documents", icon: <IconFile /> },
      ],
    },
    {
      label: "ANALYTICS",
      items: [{ to: "/reports", text: "Reports & Analytics", icon: <IconActivity /> }],
    },
    {
      label: "SYSTEM",
      items: [{ to: "/users", text: "Users & Roles", icon: <IconUsers /> }],
    },
  ],
  ops: [
    {
      label: "OVERVIEW",
      items: [
        { to: "/dashboard", text: "Dashboard", icon: <IconDashboard /> },
        { to: "/profile", text: "My Profile", icon: <IconUserCircle /> },
        { to: "/approvals", text: "Approval Notes", icon: <IconShieldCheck /> },
      ],
    },
    {
      label: "INVENTORY",
      items: [
        { to: "/inventory", text: "Inventory", icon: <IconInventory /> },
        { to: "/items", text: "Items", icon: <IconTag /> },
        { to: "/inventory/low-stock", text: "Low Stock", icon: <IconAlert />, badge: { text: "5", cls: "nb-r" } },
        { to: "/packaging", text: "Packaging Stock", icon: <IconBox />, badge: { text: "!", cls: "nb-r" } },
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
      label: "CLIENTS & DISPATCH",
      items: [
        { to: "/customers/local", text: "Local Customers", icon: <IconHome /> },
        { to: "/customers/global", text: "Global Customers", icon: <IconPlane /> },
        { to: "/dispatch/local", text: "Local Dispatch", icon: <IconBox /> },
        { to: "/dispatch/global", text: "Global Dispatch", icon: <IconPlane /> },
        { to: "/export-documents", text: "Export Documents", icon: <IconFile /> },
      ],
    },
    { label: "ANALYTICS", items: [{ to: "/reports", text: "Reports", icon: <IconActivity /> }] },
  ],
  supervisor: [
    {
      label: "OVERVIEW",
      items: [
        { to: "/dashboard", text: "Dashboard", icon: <IconDashboard /> },
        { to: "/profile", text: "My Profile", icon: <IconUserCircle /> },
        { to: "/approvals", text: "Approval Notes", icon: <IconShieldCheck /> },
      ],
    },
    {
      label: "INVENTORY",
      items: [
        { to: "/inventory", text: "Inventory", icon: <IconInventory /> },
        { to: "/items", text: "Items", icon: <IconTag /> },
        { to: "/categories", text: "Item Categories", icon: <IconLayers /> },
        { to: "/inventory/low-stock", text: "Low Stock", icon: <IconAlert />, badge: { text: "5", cls: "nb-r" } },
        { to: "/stock-adjustments", text: "Stock Adjustments", icon: <IconAdjust /> },
        { to: "/stock-count", text: "Physical Stock Count", icon: <IconClipboard /> },
        { to: "/inventory/valuation", text: "Stock Valuation", icon: <IconDollar /> },
      ],
    },
    {
      label: "PROCUREMENT",
      items: [
        { to: "/purchase-orders", text: "Purchase Orders (View)", icon: <IconFile />, badge: { text: "3", cls: "nb-a" } },
        { to: "/grn", text: "Goods Receiving", icon: <IconInbox /> },
        { to: "/returns", text: "Returns & Wastage", icon: <IconReturn /> },
      ],
    },
    {
      label: "PACKAGING",
      items: [{ to: "/packaging", text: "Packaging Stock", icon: <IconBox />, badge: { text: "!", cls: "nb-r" } }],
    },
  ],
  logistics: [
    { label: "OVERVIEW", items: [{ to: "/dashboard", text: "Dashboard", icon: <IconDashboard /> }, { to: "/profile", text: "My Profile", icon: <IconUserCircle /> }] },
    {
      label: "CLIENTS & DISPATCH",
      items: [
        { to: "/customers/local", text: "Local Customers", icon: <IconHome /> },
        { to: "/customers/global", text: "Global Customers", icon: <IconPlane /> },
        { to: "/dispatch/local", text: "Local Dispatch", icon: <IconBox /> },
        { to: "/dispatch/global", text: "Global Dispatch", icon: <IconPlane /> },
        { to: "/export-documents", text: "Export Documents", icon: <IconFile /> },
      ],
    },
  ],
  supplier: [
    {
      label: "MY PORTAL",
      items: [
        { to: "/dashboard", text: "My Dashboard", icon: <IconDashboard /> },
        { to: "/profile", text: "My Profile", icon: <IconUserCircle /> },
        { to: "/supplier/orders", text: "My Purchase Orders", icon: <IconFile /> },
        { to: "/supplier/returns", text: "My Return Notes", icon: <IconReturn /> },
        { to: "/supplier/messages", text: "Messages", icon: <IconMessage /> },
      ],
    },
  ],
};

const pageMeta = {
  "/dashboard": { title: "Dashboard", subtitle: "Fresh World Exporters ERP" },
  "/suppliers": { title: "Suppliers", subtitle: "85 active suppliers" },
  "/suppliers/add": { title: "Suppliers", subtitle: "Add new supplier" },
  "/categories": { title: "Item Categories", subtitle: "Manage item groups" },
  "/categories/add": { title: "Item Categories", subtitle: "Create category" },
  "/items": { title: "Items", subtitle: "Manage selling and storage items" },
  "/items/add": { title: "Items", subtitle: "Create item" },
  "/inventory": { title: "Inventory", subtitle: "Current stock levels" },
  "/inventory/low-stock": { title: "Low Stock Alerts", subtitle: "Items below reorder level" },
  "/inventory/expiry": { title: "Expiry Items", subtitle: "Items with batches expiring within 14 days" },
  "/inventory/valuation": { title: "Stock Valuation", subtitle: "Current inventory value" },
  "/stock-adjustments": { title: "Stock Adjustments", subtitle: "Adjustment history" },
  "/stock-adjustments/add": { title: "Stock Adjustments", subtitle: "Create adjustment" },
  "/stock-count": { title: "Physical Stock Count", subtitle: "Count and reconcile warehouse stock" },
  "/packaging": { title: "Packaging Stock", subtitle: "Boxes, labels and packing materials" },
  "/purchase-orders": { title: "Purchase Orders", subtitle: "Procurement orders" },
  "/purchase-orders/add": { title: "Purchase Orders", subtitle: "Create purchase order" },
  "/grn": { title: "Goods Receiving", subtitle: "Goods Received Notes" },
  "/grn/add": { title: "Goods Receiving", subtitle: "Create GRN" },
  "/returns": { title: "Returns & Wastage", subtitle: "Supplier and customer returns" },
  "/returns/add": { title: "Returns & Wastage", subtitle: "Record return" },
  "/wastage": { title: "Returns & Wastage", subtitle: "Wastage records" },
  "/wastage/add": { title: "Returns & Wastage", subtitle: "Record wastage" },
  "/customers/local": { title: "Local Customers", subtitle: "Sri Lanka customers" },
  "/customers/global": { title: "Global Customers", subtitle: "Export customers" },
  "/dispatch/local": { title: "Local Dispatch", subtitle: "Lorry deliveries · Sri Lanka" },
  "/dispatch/global": { title: "Global Dispatch", subtitle: "Export shipments · Maldives & international" },
  "/dispatch/global/add": { title: "Dispatch", subtitle: "Create dispatch" },
  "/export-documents": { title: "Export Documents", subtitle: "Shipment document sets" },
  "/export-documents/add": { title: "Export Documents", subtitle: "Create export document" },
  "/reports": { title: "Reports & Analytics", subtitle: "Operational reporting" },
  "/users": { title: "Users & Roles", subtitle: "System access management" },
  "/profile": { title: "My Profile", subtitle: "Manage your account details" },
  "/activity": { title: "Activity Log", subtitle: "Immutable audit trail" },
  "/supplier/orders": { title: "My Purchase Orders", subtitle: "Supplier portal" },
  "/supplier/returns": { title: "My Return Notes", subtitle: "Supplier portal" },
  "/supplier/messages": { title: "Messages", subtitle: "Supplier portal" },
  "/approvals": { title: "Approvals", subtitle: "Approval decisions and notes" },
};

const actionButtons = {
  "/suppliers": [{ label: "+ Add Supplier", to: "/suppliers/add", className: "btn btn-p btn-sm" }],
  "/purchase-orders": [{ label: "+ Create PO", to: "/purchase-orders/add", className: "btn btn-p btn-sm" }],
  "/grn": [{ label: "+ New GRN", to: "/grn/add", className: "btn btn-p btn-sm" }],
  "/returns": [
    { label: "Record Return", to: "/returns/add", className: "btn btn-s btn-sm" },
    { label: "Record Wastage", to: "/wastage/add", className: "btn btn-p btn-sm" },
  ],
  "/wastage": [{ label: "Record Wastage", to: "/wastage/add", className: "btn btn-p btn-sm" }],
  "/dispatch/local": [{ label: "+ New Dispatch", eventName: "fw-open-local-dispatch-modal", className: "btn btn-p btn-sm" }],
  "/dispatch/global": [{ label: "+ New Shipment", eventName: "fw-open-global-shipment-modal", className: "btn btn-p btn-sm" }],
  "/export-documents": [{ label: "+ Create Document Set", eventName: "fw-open-export-docs-modal", className: "btn btn-p btn-sm" }],
  "/users": [{ label: "+ Add User", to: "/users/add", className: "btn btn-p btn-sm", disabled: true }],
  "/customers/local": [
    { label: "+ Add Customer", eventName: "fw-open-local-customer-modal", className: "btn btn-p btn-sm" },
    { label: "Export CSV", eventName: "fw-export-local-customers", className: "btn btn-s btn-sm" },
  ],
  "/customers/global": [
    { label: "+ Add Customer", eventName: "fw-open-global-customer-modal", className: "btn btn-p btn-sm" },
    { label: "Export CSV", eventName: "fw-export-global-customers", className: "btn btn-s btn-sm" },
  ],
};

const normalizeRole = (role) => {
  const value = String(role || "manager").toLowerCase();

  if (value.includes("ops")) return "ops";
  if (value.includes("operation")) return "ops";
  if (value.includes("supervisor")) return "supervisor";
  if (value.includes("logistics")) return "logistics";
  if (value.includes("supplier")) return "supplier";

  return "manager";
};

const getMeta = (pathname) => {
  if (pageMeta[pathname]) return pageMeta[pathname];
  if (/^\/purchase-orders\/\d+$/.test(pathname)) return { title: "Purchase Orders", subtitle: "Purchase order details" };
  if (/^\/grn\/\d+$/.test(pathname)) return { title: "Goods Receiving", subtitle: "GRN details" };
  if (/^\/dispatch\/\d+$/.test(pathname)) return { title: "Dispatch", subtitle: "Dispatch details" };
  if (/^\/dispatch\/print\//.test(pathname)) return { title: "Dispatch", subtitle: "Printable dispatch sheet" };
  if (/^\/export-documents\/\d+$/.test(pathname)) return { title: "Export Documents", subtitle: "Document details" };
  if (/^\/export-documents\/print\//.test(pathname)) return { title: "Export Documents", subtitle: "Printable export document" };
  if (/^\/supplier\/orders\/\d+$/.test(pathname)) return { title: "Purchase Order Note", subtitle: "Supplier portal" };
  if (/^\/supplier\/returns\/\d+$/.test(pathname)) return { title: "Return Note", subtitle: "Supplier portal" };
  return { title: "Dashboard", subtitle: "Fresh World Exporters ERP" };
};

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [approvalCount, setApprovalCount] = useState(0);
  const [expiryCount, setExpiryCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const roleKey = normalizeRole(user?.role);

  useEffect(() => {
    const loadSidebarCounts = async () => {
      try {
        const requests = [
          roleKey === "manager" ? api.get("/approvals/counts") : Promise.resolve({ data: { total: 0 } }),
          api.get("/inventory/expiry", { params: { days: 14 } }),
          api.get("/inventory/low-stock"),
        ];

        const [approvalsRes, expiryRes, lowStockRes] = await Promise.allSettled(requests);

        if (approvalsRes.status === "fulfilled") {
          setApprovalCount(Number(approvalsRes.value?.data?.total || 0));
        } else {
          setApprovalCount(0);
        }

        if (expiryRes.status === "fulfilled") {
          setExpiryCount(Array.isArray(expiryRes.value?.data) ? expiryRes.value.data.length : 0);
        } else {
          setExpiryCount(0);
        }

        if (lowStockRes.status === "fulfilled") {
          setLowStockCount(Array.isArray(lowStockRes.value?.data) ? lowStockRes.value.data.length : 0);
        } else {
          setLowStockCount(0);
        }
      } catch (err) {
        console.error(err);
        setApprovalCount(0);
        setExpiryCount(0);
        setLowStockCount(0);
      }
    };

    loadSidebarCounts();
  }, [roleKey, location.pathname]);
  const sections = useMemo(() => {
    const base = navByRole[roleKey] || navByRole.manager;

    const withDynamicCounts = base.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.to === "/inventory/expiry") {
          return {
            ...item,
            badge: expiryCount > 0 ? { text: String(expiryCount), cls: "nb-r" } : null,
          };
        }

        if (item.to === "/inventory/low-stock") {
          return {
            ...item,
            badge: lowStockCount > 0 ? { text: String(lowStockCount), cls: "nb-r" } : null,
          };
        }

        return item;
      }),
    }));

    if (roleKey !== "manager") {
      return withDynamicCounts;
    }

    return withDynamicCounts.map((section) => {
      if (section.label !== "OVERVIEW") {
        return section;
      }

      return {
        ...section,
        items: [
          ...section.items,
          {
            to: "/approvals",
            text: "Pending Approvals",
            icon: <IconShieldCheck />,
            badge: approvalCount > 0 ? { text: String(approvalCount), cls: "nb-r" } : null,
          },
        ],
      };
    });
  }, [roleKey, approvalCount, expiryCount, lowStockCount]);

  const meta = getMeta(location.pathname);
  const notifications = notificationsByRole[roleKey] || notificationsByRole.manager;
  const pageActions = actionButtons[location.pathname] || [];
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
                  <img src={companyLogo} alt="Fresh World logo" className="sidebar-logo-img" />
                </div>
                <div className="sb-brand-text">
                  <h2>Fresh World</h2>
                  <p>Exporters · ERP v5</p>
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
                      <div className="ni-icon">{item.icon}</div>
                      <div className="ni-txt">{item.text}</div>
                      {item.badge ? <span className={`nb ${item.badge.cls}`}>{item.badge.text}</span> : null}
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
                <div className="sb-u-role">{user?.role || "Manager"}</div>
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
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>

            <div className="tb-a">
              {pageActions.map((action) =>
                action.disabled ? (
                  <button key={action.label} className={action.className} disabled title="Not wired yet">
                    {action.label}
                  </button>
                ) : action.eventName ? (
                  <button
                    key={action.label}
                    type="button"
                    className={action.className}
                    onClick={() => window.dispatchEvent(new CustomEvent(action.eventName))}
                  >
                    {action.label}
                  </button>
                ) : (
                  <Link key={action.label} to={action.to} className={action.className}>
                    {action.label}
                  </Link>
                )
              )}

              <button className="nb-btn" onClick={() => setNotifOpen((p) => !p)}>
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
            <div key={`${note.type}-${index}`} className={`np-item ${note.unread ? "unread" : ""}`}>
              <div className="np-type">{note.type}</div>
              <div className="np-msg">{note.message}</div>
              <div className="np-time">{note.time}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Layout;