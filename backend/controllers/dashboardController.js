const db = require("../config/db");

const runQuery = (sql) => {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getDashboardSummary = async (req, res) => {
  try {
    const suppliers = await runQuery("SELECT COUNT(*) AS total FROM suppliers");
    const items = await runQuery("SELECT COUNT(*) AS total FROM items");
    const purchaseOrders = await runQuery("SELECT COUNT(*) AS total FROM purchase_orders");
    const grns = await runQuery("SELECT COUNT(*) AS total FROM grn");
    const dispatches = await runQuery("SELECT COUNT(*) AS total FROM dispatch_records");
    const exportDocuments = await runQuery("SELECT COUNT(*) AS total FROM export_documents");
    const lowStock = await runQuery(
      "SELECT COUNT(*) AS total FROM inventory_batches WHERE available_quantity > 0 AND available_quantity <= 10"
    );
    const wastage = await runQuery("SELECT COUNT(*) AS total FROM wastage_records");
    const returns = await runQuery("SELECT COUNT(*) AS total FROM goods_returns");

    res.json({
      totalSuppliers: suppliers[0].total,
      totalItems: items[0].total,
      totalPurchaseOrders: purchaseOrders[0].total,
      totalGrns: grns[0].total,
      totalDispatches: dispatches[0].total,
      totalExportDocuments: exportDocuments[0].total,
      lowStockCount: lowStock[0].total,
      totalWastageRecords: wastage[0].total,
      totalReturnRecords: returns[0].total,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({
      message: "Database error",
      error: error.message,
    });
  }
};

const getStockMovementChart = (req, res) => {
  const sql = `
    SELECT movement_type, COUNT(*) AS count
    FROM stock_movements
    GROUP BY movement_type
    ORDER BY movement_type ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Stock movement chart error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getMonthlyDispatchChart = (req, res) => {
  const sql = `
    SELECT 
      DATE_FORMAT(dispatch_date, '%Y-%m') AS month,
      COUNT(*) AS count
    FROM dispatch_records
    GROUP BY DATE_FORMAT(dispatch_date, '%Y-%m')
    ORDER BY month ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Monthly dispatch chart error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getMonthlyExportChart = (req, res) => {
  const sql = `
    SELECT 
      DATE_FORMAT(document_date, '%Y-%m') AS month,
      COUNT(*) AS count
    FROM export_documents
    GROUP BY DATE_FORMAT(document_date, '%Y-%m')
    ORDER BY month ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Monthly export chart error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

module.exports = {
  getDashboardSummary,
  getStockMovementChart,
  getMonthlyDispatchChart,
  getMonthlyExportChart,
};