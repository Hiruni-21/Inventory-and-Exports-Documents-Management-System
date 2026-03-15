import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>Fresh World</h2>
        <p className="role-label">{user?.role_name}</p>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/suppliers">Suppliers</Link>
          <Link to="/suppliers/add">Add Supplier</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/categories/add">Add Category</Link>
          <Link to="/items">Items</Link>
          <Link to="/items/add">Add Item</Link>
          <Link to="/purchase-orders">Purchase Orders</Link>
          <Link to="/purchase-orders/add">Create PO</Link>
          <Link to="/grn">GRN</Link>
          <Link to="/grn/add">Create GRN</Link>
          <Link to="/inventory">Inventory</Link>
          <Link to="/inventory/movements">Stock Movements</Link>
          <Link to="/inventory/low-stock">Low Stock</Link>
          <Link to="/stock-adjustments">Stock Adjustments</Link>
          <Link to="/stock-adjustments/add">Add Adjustment</Link>
          <Link to="/wastage">Wastage</Link>
          <Link to="/wastage/add">Record Wastage</Link>
          <Link to="/returns">Returns</Link>
          <Link to="/returns/add">Record Return</Link>
          <Link to="/dispatch">Dispatch</Link>
          <Link to="/dispatch/add">Create Dispatch</Link>
          <Link to="/export-documents">Export Documents</Link>
          <Link to="/export-documents/add">Create Export Document</Link>
        </nav>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h1>Inventory & Export Documents Management System</h1>
          <div>
            Welcome, <strong>{user?.name}</strong>
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