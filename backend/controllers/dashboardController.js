const db = require("../config/db");

const getDashboardStats = (req, res) => {
  const stats = {};

  const queries = {
    items: "SELECT COUNT(*) AS total FROM items WHERE status = 'active'",
    suppliers: "SELECT COUNT(*) AS total FROM suppliers WHERE status = 'active'",
    localCustomers:
      "SELECT COUNT(*) AS total FROM customers WHERE customer_type = 'local' AND status = 'active'",
    globalCustomers:
      "SELECT COUNT(*) AS total FROM customers WHERE customer_type = 'global' AND status = 'active'",

    pendingApprovals:
      "SELECT COUNT(*) AS total FROM purchase_orders WHERE status IN ('pending_approval', 'draft')",
    openPOs:
      "SELECT COUNT(*) AS total FROM purchase_orders WHERE status IN ('approved', 'sent', 'grn_created')",
    pendingExportDocs:
      "SELECT COUNT(*) AS total FROM export_documents WHERE all_cleared = 0",
    activeGlobalShipments:
      "SELECT COUNT(*) AS total FROM global_dispatch WHERE status NOT IN ('delivered')",
    localDispatchesToday:
      "SELECT COUNT(*) AS total FROM local_dispatch WHERE DATE(dispatch_date) = CURDATE()",

    returnsMonth: `
      SELECT COUNT(*) AS total
      FROM returns
      WHERE MONTH(created_at) = MONTH(CURDATE())
        AND YEAR(created_at) = YEAR(CURDATE())
    `,

    wastageMonth: `
      SELECT COUNT(*) AS total
      FROM wastage
      WHERE MONTH(created_at) = MONTH(CURDATE())
        AND YEAR(created_at) = YEAR(CURDATE())
    `,

    packagingLowStock: `
      SELECT COUNT(*) AS total
      FROM items i
      LEFT JOIN inventory inv ON inv.item_id = i.id
      WHERE i.item_kind = 'packaging_supply'
        AND i.status = 'active'
        AND COALESCE(inv.qty_on_hand, 0) <= COALESCE(i.reorder_level, 0)
    `,

    packagingOutOfStock: `
      SELECT COUNT(*) AS total
      FROM items i
      LEFT JOIN inventory inv ON inv.item_id = i.id
      WHERE i.item_kind = 'packaging_supply'
        AND i.status = 'active'
        AND COALESCE(inv.qty_on_hand, 0) <= 0
    `,

    physicalCountVariancesMonth: `
      SELECT COUNT(*) AS total
      FROM stock_adjustments
      WHERE (reason LIKE '%Physical Count%' OR notes LIKE '%Physical Count%' OR adjustment_type = 'stock_count')
        AND MONTH(created_at) = MONTH(CURDATE())
        AND YEAR(created_at) = YEAR(CURDATE())
    `,

    todaysGrns:
      "SELECT COUNT(*) AS total FROM grn WHERE DATE(received_date) = CURDATE()",
  };

  const keys = Object.keys(queries);
  let completed = 0;
  let hasError = false;

  keys.forEach((key) => {
    db.query(queries[key], (err, results) => {
      if (hasError) return;

      if (err) {
        hasError = true;
        console.error(`Dashboard query failed for ${key}:`, err);
        return res.status(500).json({
          message: "Database error",
          error: err.message,
        });
      }

      stats[key] = Number(results?.[0]?.total || 0);
      completed += 1;

      if (completed === keys.length) {
        res.json(stats);
      }
    });
  });
};

module.exports = { getDashboardStats };