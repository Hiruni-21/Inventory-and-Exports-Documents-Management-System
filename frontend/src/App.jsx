import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import OperationsDashboard from "./pages/OperationsDashboard";
import LogisticsDashboard from "./pages/LogisticsDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";

import SupplierListPage from "./pages/SupplierListPage";
import AddSupplierPage from "./pages/AddSupplierPage";

import CategoryListPage from "./pages/CategoryListPage";
import AddCategoryPage from "./pages/AddCategoryPage";

import ItemListPage from "./pages/ItemListPage";
import AddItemPage from "./pages/AddItemPage";

import PurchaseOrderListPage from "./pages/PurchaseOrderListPage";
import AddPurchaseOrderPage from "./pages/AddPurchaseOrderPage";
import PurchaseOrderDetailsPage from "./pages/PurchaseOrderDetailsPage";

import GrnListPage from "./pages/GrnListPage";
import AddGrnPage from "./pages/AddGrnPage";
import GrnDetailsPage from "./pages/GrnDetailsPage";

import InventoryListPage from "./pages/InventoryListPage";
import StockMovementsPage from "./pages/StockMovementsPage";
import LowStockPage from "./pages/LowStockPage";

import StockAdjustmentListPage from "./pages/StockAdjustmentListPage";
import AddStockAdjustmentPage from "./pages/AddStockAdjustmentPage";

import WastageListPage from "./pages/WastageListPage";
import AddWastagePage from "./pages/AddWastagePage";

import ReturnListPage from "./pages/ReturnListPage";
import AddReturnPage from "./pages/AddReturnPage";

import DispatchListPage from "./pages/DispatchListPage";
import AddDispatchPage from "./pages/AddDispatchPage";
import DispatchDetailsPage from "./pages/DispatchDetailsPage";
import DispatchPrintPage from "./pages/DispatchPrintPage";

import ExportDocumentListPage from "./pages/ExportDocumentListPage";
import AddExportDocumentPage from "./pages/AddExportDocumentPage";
import ExportDocumentDetailsPage from "./pages/ExportDocumentDetailsPage";
import ExportDocumentPrintPage from "./pages/ExportDocumentPrintPage";

import ReportsPage from "./pages/ReportsPage";

const DashboardRouter = () => {
  const { user } = useAuth();

  switch (user?.role_name || user?.role) {
    case "Admin":
      return <AdminDashboard />;
    case "Manager":
    case "manager":
      return <ManagerDashboard />;
    case "Operations Executive":
    case "ops":
      return <OperationsDashboard />;
    case "Logistics Executive":
    case "logistics":
      return <LogisticsDashboard />;
    case "Supervisor":
    case "supervisor":
      return <SupervisorDashboard />;
    case "Supplier":
    case "supplier":
      return <SupplierDashboard />;
    default:
      return <div>No dashboard found</div>;
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
        <Route path="/suppliers/add" element={<AddSupplierPage />} />

        <Route path="/categories" element={<CategoryListPage />} />
        <Route path="/categories/add" element={<AddCategoryPage />} />

        <Route path="/items" element={<ItemListPage />} />
        <Route path="/items/add" element={<AddItemPage />} />

        <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
        <Route path="/purchase-orders/add" element={<AddPurchaseOrderPage />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailsPage />} />

        <Route path="/grn" element={<GrnListPage />} />
        <Route path="/grn/add" element={<AddGrnPage />} />
        <Route path="/grn/:id" element={<GrnDetailsPage />} />

        <Route path="/inventory" element={<InventoryListPage />} />
        <Route path="/inventory/movements" element={<StockMovementsPage />} />
        <Route path="/inventory/low-stock" element={<LowStockPage />} />

        <Route path="/stock-adjustments" element={<StockAdjustmentListPage />} />
        <Route path="/stock-adjustments/add" element={<AddStockAdjustmentPage />} />

        <Route path="/wastage" element={<WastageListPage />} />
        <Route path="/wastage/add" element={<AddWastagePage />} />

        <Route path="/returns" element={<ReturnListPage />} />
        <Route path="/returns/add" element={<AddReturnPage />} />

        <Route path="/dispatch" element={<DispatchListPage />} />
        <Route path="/dispatch/add" element={<AddDispatchPage />} />
        <Route path="/dispatch/:id" element={<DispatchDetailsPage />} />
        <Route path="/dispatch/:id/print" element={<DispatchPrintPage />} />

        <Route path="/export-documents" element={<ExportDocumentListPage />} />
        <Route path="/export-documents/add" element={<AddExportDocumentPage />} />
        <Route path="/export-documents/:id" element={<ExportDocumentDetailsPage />} />
        <Route path="/export-documents/:id/print" element={<ExportDocumentPrintPage />} />

        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}

export default App;