import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

import ManagerDashboard from "./pages/ManagerDashboard";
import OperationsDashboard from "./pages/OperationsDashboard";
import LogisticsDashboard from "./pages/LogisticsDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";

import SupplierListPage from "./pages/SupplierListPage";
import CategoryListPage from "./pages/CategoryListPage";
import ItemListPage from "./pages/ItemListPage";
import InventoryListPage from "./pages/InventoryListPage";
import LowStockPage from "./pages/LowStockPage";
import StockAdjustmentListPage from "./pages/StockAdjustmentListPage";
import ReportsPage from "./pages/ReportsPage";

import PurchaseOrderListPage from "./pages/PurchaseOrderListPage";
import AddPurchaseOrderPage from "./pages/AddPurchaseOrderPage";
import PurchaseOrderDetailsPage from "./pages/PurchaseOrderDetailsPage";

import GrnListPage from "./pages/GrnListPage";
import AddGrnPage from "./pages/AddGrnPage";
import GrnDetailsPage from "./pages/GrnDetailsPage";

import ReturnListPage from "./pages/ReturnListPage";
import WastageListPage from "./pages/WastageListPage";
import SupplierDashboardPage from "./pages/SupplierDashboard";

const DashboardRouter = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case "Manager":
      return <ManagerDashboard />;
    case "Operations Executive":
      return <OperationsDashboard />;
    case "Logistics Executive":
      return <LogisticsDashboard />;
    case "Supervisor":
      return <SupervisorDashboard />;
    case "Supplier":
      return <SupplierDashboardPage />;
    default:
      return <ManagerDashboard />;
  }
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardRouter />} />

        <Route path="/suppliers" element={<SupplierListPage />} />
        <Route path="/categories" element={<CategoryListPage />} />
        <Route path="/items" element={<ItemListPage />} />
        <Route path="/inventory" element={<InventoryListPage />} />
        <Route path="/inventory/low-stock" element={<LowStockPage />} />
        <Route path="/stock-adjustments" element={<StockAdjustmentListPage />} />
        <Route path="/reports" element={<ReportsPage />} />

        <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
        <Route path="/purchase-orders/add" element={<AddPurchaseOrderPage />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailsPage />} />

        <Route path="/grn" element={<GrnListPage />} />
        <Route path="/grn/add" element={<AddGrnPage />} />
        <Route path="/grn/:id" element={<GrnDetailsPage />} />

        <Route path="/returns" element={<ReturnListPage />} />
        <Route path="/wastage" element={<WastageListPage />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;