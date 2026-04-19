require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
require("./config/db");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const itemRoutes = require("./routes/itemRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const grnRoutes = require("./routes/grnRoutes");
const returnRoutes = require("./routes/returnRoutes");
const wastageRoutes = require("./routes/wastageRoutes");
const dispatchRoutes = require("./routes/dispatchRoutes");
const globalDispatchRoutes = require("./routes/globalDispatchRoutes");
const exportDocumentRoutes = require("./routes/exportDocumentRoutes");
const customerRoutes = require("./routes/customerRoutes");
const stockAdjustmentRoutes = require("./routes/stockAdjustmentRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const supplierPortalRoutes = require("./routes/supplierPortalRoutes");


const app = express();

app.use(
  cors({
    origin: process.env.APP_BASE_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items/categories", categoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/suppliers", supplierRoutes);

/*
  Keep all purchase order routes under this one route file.
  Add the new send routes into backend/routes/purchaseOrderRoutes.js:
  - POST /:id/render-pdf
  - POST /:id/send-email
  - POST /:id/send-whatsapp
  - POST /:id/send-all
  - GET  /:id/document
*/
app.use("/api/purchase-orders", purchaseOrderRoutes);

app.use("/api/grn", grnRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/wastage", wastageRoutes);
app.use("/api/dispatch/global", globalDispatchRoutes);
app.use("/api/dispatch", dispatchRoutes);
app.use("/api/export-docs", exportDocumentRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/supplier-portal", supplierPortalRoutes);

app.get("/", (req, res) => {
  res.send("Fresh World ERP backend is running");
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API working fine",
    appBaseUrl: process.env.APP_BASE_URL || "http://localhost:5173",
    backendBaseUrl: process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5001}`,
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});