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
import AdminDashboard from "./pages/AdminDashboard";

import SupplierListPage from "./pages/SupplierListPage";
import CategoryListPage from "./pages/CategoryListPage";
import AddCategoryPage from "./pages/AddCategoryPage";
import ItemListPage from "./pages/ItemListPage";
import AddItemPage from "./pages/AddItemPage";
import InventoryListPage from "./pages/InventoryListPage";
import LowStockPage from "./pages/LowStockPage";
import ExpiryItemsPage from "./pages/ExpiryItemsPage";
import StockAdjustmentListPage from "./pages/StockAdjustmentListPage";
import AddStockAdjustmentPage from "./pages/AddStockAdjustmentPage";
import ReportsPage from "./pages/ReportsPage";
import ManagerApprovalsPage from "./pages/ManagerApprovalsPage";

import PurchaseOrderListPage from "./pages/PurchaseOrderListPage";
import PurchaseOrderDetailsPage from "./pages/PurchaseOrderDetailsPage";
import GrnListPage from "./pages/GrnListPage";
import GrnDetailsPage from "./pages/GrnDetailsPage";
import ReturnListPage from "./pages/ReturnListPage";

import GlobalCustomersPage from "./pages/GlobalCustomersPage";
import GlobalDispatchListPage from "./pages/GlobalDispatchListPage";
import AddGlobalDispatchPage from "./pages/AddGlobalDispatchPage";

import ExportDocumentListPage from "./pages/ExportDocumentListPage";
import AddExportDocumentPage from "./pages/AddExportDocumentPage";
import ExportDocumentDetailsPage from "./pages/ExportDocumentDetailsPage";
import ExportDocumentPrintPage from "./pages/ExportDocumentPrintPage";

import StockMovementsPage from "./pages/StockMovementsPage";
import SupplierDashboardPage from "./pages/SupplierDashboard";
import SupplierOrdersPage from "./pages/SupplierOrdersPage";
import SupplierReturnsPage from "./pages/SupplierReturnsPage";
import SupplierOrderDetailsPage from "./pages/SupplierOrderDetailsPage";
import SupplierReturnDetailsPage from "./pages/SupplierReturnDetailsPage";
import SupplierMessagesPage from "./pages/SupplierMessagesPage";

import StockValuationPage from "./pages/StockValuationPage";
import PhysicalStockCountPage from "./pages/PhysicalStockCountPage";
import UserProfilePage from "./pages/UserProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UserManagementPage from "./pages/UserManagementPage";

const DashboardRouter = () => {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();

  if (role.includes("operation")) return <OperationsDashboard />;
  if (role.includes("logistics")) return <LogisticsDashboard />;
  if (role.includes("supervisor")) return <SupervisorDashboard />;
  if (role.includes("supplier")) return <SupplierDashboard />;
  if (role.includes("admin")) return <AdminDashboard />;
  return <ManagerDashboard />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route path="/suppliers" element={<SupplierListPage />} />

        <Route path="/categories" element={<CategoryListPage />} />
        <Route path="/categories/add" element={<AddCategoryPage />} />

        <Route path="/items" element={<ItemListPage />} />
        <Route path="/items/add" element={<AddItemPage />} />
        <Route path="/items/edit/:id" element={<AddItemPage />} />
        <Route path="/inventory/low-stock" element={<LowStockPage />} />
        <Route path="/inventory/expiry" element={<ExpiryItemsPage />} />
        <Route path="/inventory/valuation" element={<StockValuationPage />} />
        <Route path="/inventory/movements" element={<StockMovementsPage />} />

        <Route path="/stock-adjustments" element={<StockAdjustmentListPage />} />
        <Route path="/stock-adjustments/add" element={<AddStockAdjustmentPage />} />
        <Route path="/stock-count" element={<PhysicalStockCountPage />} />
        <Route path="/packaging" element={<InventoryListPage />} />
        <Route path="/approvals" element={<ManagerApprovalsPage />} />

        <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailsPage />} />

        <Route path="/grn" element={<GrnListPage />} />
        <Route path="/grn/:id" element={<GrnDetailsPage />} />

        <Route path="/returns" element={<ReturnListPage />} />

        <Route path="/customers" element={<GlobalCustomersPage />} />

        <Route path="/dispatch" element={<GlobalDispatchListPage />} />
        <Route path="/dispatch/add" element={<AddGlobalDispatchPage />} />

        <Route path="/export-documents" element={<ExportDocumentListPage />} />
        <Route path="/export-documents/add" element={<AddExportDocumentPage />} />
        <Route path="/export-documents/:id" element={<ExportDocumentDetailsPage />} />
        <Route path="/export-documents/print/:id" element={<ExportDocumentPrintPage />} />

        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/activity" element={<ReportsPage />} />

        <Route path="/supplier/dashboard" element={<SupplierDashboardPage />} />
        <Route path="/supplier/orders" element={<SupplierOrdersPage />} />
        <Route path="/supplier/orders/:id" element={<SupplierOrderDetailsPage />} />
        <Route path="/supplier/returns" element={<SupplierReturnsPage />} />
        <Route path="/supplier/returns/:id" element={<SupplierReturnDetailsPage />} />
        <Route path="/supplier/messages" element={<SupplierMessagesPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
      </Route>
    </Routes>
  );
}

export default App;