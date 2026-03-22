import { Routes, Route } from "react-router-dom";
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
import ExportDocumentListPage from "./pages/ExportDocumentListPage";
import AddExportDocumentPage from "./pages/AddExportDocumentPage";
import ExportDocumentDetailsPage from "./pages/ExportDocumentDetailsPage";
import ReportsPage from "./pages/ReportsPage";

const DashboardRouter = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case "manager":
      return <ManagerDashboard />;
    case "ops":
      return <OperationsDashboard />;
    case "logistics":
      return <LogisticsDashboard />;
    case "supervisor":
      return <SupervisorDashboard />;
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

        <Route path="/inventory" element={<InventoryListPage />} />
        <Route path="/inventory/low-stock" element={<LowStockPage />} />

        <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
        <Route path="/purchase-orders/add" element={<AddPurchaseOrderPage />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailsPage />} />

        <Route path="/grn" element={<GrnListPage />} />
        <Route path="/grn/add" element={<AddGrnPage />} />
        <Route path="/grn/:id" element={<GrnDetailsPage />} />

        <Route path="/stock-adjustments" element={<StockAdjustmentListPage />} />
        <Route path="/stock-adjustments/add" element={<AddStockAdjustmentPage />} />

        <Route path="/wastage" element={<WastageListPage />} />
        <Route path="/wastage/add" element={<AddWastagePage />} />

        <Route path="/returns" element={<ReturnListPage />} />
        <Route path="/returns/add" element={<AddReturnPage />} />

        <Route path="/dispatch" element={<DispatchListPage />} />
        <Route path="/dispatch/add" element={<AddDispatchPage />} />
        <Route path="/dispatch/:id" element={<DispatchDetailsPage />} />

        <Route path="/export-documents" element={<ExportDocumentListPage />} />
        <Route path="/export-documents/add" element={<AddExportDocumentPage />} />
        <Route path="/export-documents/:id" element={<ExportDocumentDetailsPage />} />

        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}

export default App;