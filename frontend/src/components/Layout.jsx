import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/suppliers", label: "Suppliers" },
    { to: "/suppliers/add", label: "Add Supplier" },
    { to: "/categories", label: "Item Categories" },
    { to: "/categories/add", label: "Add Category" },
    { to: "/items", label: "Item Master" },
    { to: "/items/add", label: "Add Item" },
    { to: "/purchase-orders", label: "Purchase Orders" },
    { to: "/purchase-orders/add", label: "Create PO" },
    { to: "/grn", label: "GRN" },
    { to: "/grn/add", label: "Create GRN" },
    { to: "/inventory", label: "Inventory" },
    { to: "/inventory/movements", label: "Stock Movements" },
    { to: "/inventory/low-stock", label: "Low Stock" },
    { to: "/stock-adjustments", label: "Stock Adjustments" },
    { to: "/stock-adjustments/add", label: "Add Adjustment" },
    { to: "/wastage", label: "Wastage" },
    { to: "/wastage/add", label: "Record Wastage" },
    { to: "/returns", label: "Returns" },
    { to: "/returns/add", label: "Record Return" },
    { to: "/dispatch", label: "Dispatch" },
    { to: "/dispatch/add", label: "Create Dispatch" },
    { to: "/export-documents", label: "Export Documents" },
    { to: "/export-documents/add", label: "Create Export Document" },
    { to: "/reports", label: "Reports" },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>Fresh World</h2>
          <p className="role-label">{user?.role_name || user?.role}</p>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`sidebar-link ${
                location.pathname === link.to ? "active" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Inventory & Export Documents Management System</h1>
            <p className="topbar-subtitle">Fresh World ERP Workspace</p>
          </div>

          <div className="topbar-user-box">
            <span className="topbar-user-label">Welcome</span>
            <strong>{user?.name}</strong>
          </div>
        </header>

        <section className="content-area">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default Layout;