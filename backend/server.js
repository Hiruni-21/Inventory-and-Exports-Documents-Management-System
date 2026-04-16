require("dotenv").config();
const express = require("express");
const cors = require("cors");
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

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items/categories", categoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/grn", grnRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/wastage", wastageRoutes);
app.use("/api/dispatch/global", globalDispatchRoutes);
app.use("/api/dispatch", dispatchRoutes);
app.use("/api/export-docs", exportDocumentRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);

app.get("/", (req, res) => {
  res.send("Fresh World ERP backend is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API working fine" });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});