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
import InventoryListPage from "./pages/InventoryListPage";
import LowStockPage from "./pages/LowStockPage";
import StockAdjustmentListPage from "./pages/StockAdjustmentListPage";
import AddStockAdjustmentPage from "./pages/AddStockAdjustmentPage";
import ReportsPage from "./pages/ReportsPage";

import PurchaseOrderListPage from "./pages/PurchaseOrderListPage";
import AddPurchaseOrderPage from "./pages/AddPurchaseOrderPage";
import PurchaseOrderDetailsPage from "./pages/PurchaseOrderDetailsPage";
import GrnListPage from "./pages/GrnListPage";
import AddGrnPage from "./pages/AddGrnPage";
import GrnDetailsPage from "./pages/GrnDetailsPage";
import ReturnListPage from "./pages/ReturnListPage";
import AddReturnPage from "./pages/AddReturnPage";
import WastageListPage from "./pages/WastageListPage";
import AddWastagePage from "./pages/AddWastagePage";

import LocalCustomersPage from "./pages/LocalCustomersPage";
import GlobalCustomersPage from "./pages/GlobalCustomersPage";
import DispatchListPage from "./pages/DispatchListPage";
import AddDispatchPage from "./pages/AddDispatchPage";
import DispatchDetailsPage from "./pages/DispatchDetailsPage";
import DispatchPrintPage from "./pages/DispatchPrintPage";
import GlobalDispatchListPage from "./pages/GlobalDispatchListPage";
import AddGlobalDispatchPage from "./pages/AddGlobalDispatchPage";

import ExportDocumentListPage from "./pages/ExportDocumentListPage";
import AddExportDocumentPage from "./pages/AddExportDocumentPage";
import ExportDocumentDetailsPage from "./pages/ExportDocumentDetailsPage";
import ExportDocumentPrintPage from "./pages/ExportDocumentPrintPage";

import StockMovementsPage from "./pages/StockMovementsPage";
import SupplierDashboardPage from "./pages/SupplierDashboard";
import SupplierOrdersPage from "./pages/PurchaseOrderListPage";
import SupplierReturnsPage from "./pages/ReturnListPage";

const DashboardRouter = () => {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();

  if (role.includes("operation")) return <OperationsDashboard />;
  if (role.includes("logistics")) return <LogisticsDashboard />;
  if (role.includes("supervisor")) return <SupervisorDashboard />;
  if (role.includes("supplier")) return <SupplierDashboard />;
  return <ManagerDashboard />;
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
        <Route path="/inventory/expiry" element={<InventoryListPage />} />
        <Route path="/inventory/valuation" element={<InventoryListPage />} />
        <Route path="/inventory/movements" element={<StockMovementsPage />} />

        <Route path="/stock-adjustments" element={<StockAdjustmentListPage />} />
        <Route path="/stock-adjustments/add" element={<AddStockAdjustmentPage />} />
        <Route path="/stock-count" element={<InventoryListPage />} />
        <Route path="/packaging" element={<InventoryListPage />} />

        <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
        <Route path="/purchase-orders/add" element={<AddPurchaseOrderPage />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailsPage />} />

        <Route path="/grn" element={<GrnListPage />} />
        <Route path="/grn/add" element={<AddGrnPage />} />
        <Route path="/grn/:id" element={<GrnDetailsPage />} />

        <Route path="/returns" element={<ReturnListPage />} />
        <Route path="/returns/add" element={<AddReturnPage />} />
        <Route path="/wastage" element={<WastageListPage />} />
        <Route path="/wastage/add" element={<AddWastagePage />} />

        <Route path="/customers/local" element={<LocalCustomersPage />} />
        <Route path="/customers/global" element={<GlobalCustomersPage />} />

        <Route path="/dispatch/local" element={<DispatchListPage />} />
        <Route path="/dispatch/local/add" element={<AddDispatchPage />} />
        <Route path="/dispatch/:id" element={<DispatchDetailsPage />} />
        <Route path="/dispatch/print/:id" element={<DispatchPrintPage />} />

        <Route path="/dispatch/global" element={<GlobalDispatchListPage />} />
        <Route path="/dispatch/global/add" element={<AddGlobalDispatchPage />} />

        <Route path="/export-documents" element={<ExportDocumentListPage />} />
        <Route path="/export-documents/add" element={<AddExportDocumentPage />} />
        <Route path="/export-documents/:id" element={<ExportDocumentDetailsPage />} />
        <Route path="/export-documents/print/:id" element={<ExportDocumentPrintPage />} />

        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/users" element={<ReportsPage />} />
        <Route path="/activity" element={<ReportsPage />} />

        <Route path="/supplier/orders" element={<SupplierOrdersPage />} />
        <Route path="/supplier/returns" element={<SupplierReturnsPage />} />
        <Route path="/supplier/dashboard" element={<SupplierDashboardPage />} />
      </Route>
    </Routes>
  );
}

export default App;