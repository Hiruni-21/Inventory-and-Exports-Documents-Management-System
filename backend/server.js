require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const itemRoutes = require("./routes/itemRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const grnRoutes = require("./routes/grnRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const stockAdjustmentRoutes = require("./routes/stockAdjustmentRoutes");
const wastageRoutes = require("./routes/wastageRoutes");
const returnRoutes = require("./routes/returnRoutes");
const dispatchRoutes = require("./routes/dispatchRoutes");
const exportDocumentRoutes = require("./routes/exportDocumentRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));


app.use("/api/auth", authRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/grn", grnRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);
app.use("/api/wastage", wastageRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/dispatch", dispatchRoutes);
app.use("/api/export-documents", exportDocumentRoutes);
app.use("/api/reports", reportRoutes);


app.get("/", (req, res) => {
  res.send("Fresh World Backend is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API working fine" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});