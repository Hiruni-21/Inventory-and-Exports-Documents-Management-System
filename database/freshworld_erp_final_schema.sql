-- Fresh World Exporters Pvt Ltd
-- Final ERP Schema
-- MySQL / MariaDB compatible

CREATE DATABASE IF NOT EXISTS fresh_world_system;
USE fresh_world_system;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS export_documents;
DROP TABLE IF EXISTS global_dispatch_items;
DROP TABLE IF EXISTS global_dispatch;
DROP TABLE IF EXISTS local_dispatch_items;
DROP TABLE IF EXISTS local_dispatch;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS packaging;
DROP TABLE IF EXISTS stock_adjustments;
DROP TABLE IF EXISTS wastage_photos;
DROP TABLE IF EXISTS wastage;
DROP TABLE IF EXISTS return_photos;
DROP TABLE IF EXISTS return_items;
DROP TABLE IF EXISTS returns;
DROP TABLE IF EXISTS grn_photos;
DROP TABLE IF EXISTS grn_items;
DROP TABLE IF EXISTS grn;
DROP TABLE IF EXISTS po_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS supplier_items;
DROP TABLE IF EXISTS batches;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS item_categories;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('manager','ops','supervisor','logistics','supplier') NOT NULL,
  phone VARCHAR(30),
  department VARCHAR(100),
  profile_photo VARCHAR(255),
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  supplier_id INT NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
);

-- =========================================================
-- SUPPLIERS
-- =========================================================
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_code VARCHAR(30) NOT NULL UNIQUE,
  supplier_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(150),
  contact_number VARCHAR(30),
  whatsapp_number VARCHAR(30),
  email VARCHAR(150),
  address TEXT,
  city VARCHAR(100),
  payment_terms VARCHAR(100),
  lead_time_days INT NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_suppliers_name (supplier_name),
  INDEX idx_suppliers_status (status),
  CONSTRAINT fk_suppliers_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);

ALTER TABLE users
ADD CONSTRAINT fk_users_supplier
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  ON DELETE SET NULL;

-- =========================================================
-- ITEM CATEGORIES
-- =========================================================
CREATE TABLE item_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_categories_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- ITEMS
-- =========================================================
CREATE TABLE items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  botanical_name VARCHAR(180),
  category_id INT NOT NULL,
  type ENUM('Perishable','Non-Perishable') NOT NULL,
  unit VARCHAR(30) NOT NULL,
  shelf_life_days INT DEFAULT 0,
  reorder_level DECIMAL(12,2) NOT NULL DEFAULT 0,
  storage_temp VARCHAR(50),
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  returnable TINYINT(1) NOT NULL DEFAULT 1,
  description TEXT,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_items_category (category_id),
  INDEX idx_items_type (type),
  INDEX idx_items_status (status),
  CONSTRAINT fk_items_category
    FOREIGN KEY (category_id) REFERENCES item_categories(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_items_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- INVENTORY SUMMARY
-- One row per item for fast dashboard / listing
-- =========================================================
CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL UNIQUE,
  qty_on_hand DECIMAL(12,2) NOT NULL DEFAULT 0,
  qty_reserved DECIMAL(12,2) NOT NULL DEFAULT 0,
  qty_available DECIMAL(12,2) NOT NULL DEFAULT 0,
  avg_unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(14,2) NOT NULL DEFAULT 0,
  last_movement_at DATETIME NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE CASCADE
);

-- =========================================================
-- SUPPLIER ITEMS
-- Which supplier supplies which item
-- =========================================================
CREATE TABLE supplier_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  item_id INT NOT NULL,
  supplier_item_code VARCHAR(50),
  last_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  preferred TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supplier_item (supplier_id, item_id),
  CONSTRAINT fk_supplier_items_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_supplier_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE CASCADE
);

-- =========================================================
-- PURCHASE ORDERS
-- Supervisor requests -> Manager approves -> Ops sends
-- =========================================================
CREATE TABLE purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_number VARCHAR(40) NOT NULL UNIQUE,
  supplier_id INT NOT NULL,
  requested_by INT NULL,
  approved_by INT NULL,
  sent_by INT NULL,
  order_date DATE NOT NULL,
  expected_date DATE NULL,
  payment_terms VARCHAR(100),
  notes TEXT,
  status ENUM('draft','pending_approval','approved','sent','grn_created','closed') NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_po_supplier (supplier_id),
  INDEX idx_po_status (status),
  CONSTRAINT fk_purchase_orders_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_orders_requested_by
    FOREIGN KEY (requested_by) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_purchase_orders_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_purchase_orders_sent_by
    FOREIGN KEY (sent_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE po_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  item_id INT NOT NULL,
  ordered_qty DECIMAL(12,2) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_po_items_po (purchase_order_id),
  CONSTRAINT fk_po_items_po
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_po_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT
);

-- =========================================================
-- GRN
-- =========================================================
CREATE TABLE grn (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_number VARCHAR(40) NOT NULL UNIQUE,
  purchase_order_id INT NOT NULL,
  supplier_id INT NOT NULL,
  received_date DATE NOT NULL,
  verified_by INT NULL,
  verified_at DATETIME NULL,
  variance_flag TINYINT(1) NOT NULL DEFAULT 0,
  variance_reason TEXT,
  notes TEXT,
  status ENUM('draft','received','verified') NOT NULL DEFAULT 'received',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_grn_po (purchase_order_id),
  INDEX idx_grn_supplier (supplier_id),
  CONSTRAINT fk_grn_po
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_grn_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_grn_verified_by
    FOREIGN KEY (verified_by) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_grn_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE grn_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_id INT NOT NULL,
  purchase_order_item_id INT NULL,
  item_id INT NOT NULL,
  ordered_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
  received_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
  variance_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
  variance_percent DECIMAL(8,2) NOT NULL DEFAULT 0,
  batch_number VARCHAR(60) NOT NULL,
  expiry_date DATE NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_grn_items_grn (grn_id),
  INDEX idx_grn_items_item (item_id),
  CONSTRAINT fk_grn_items_grn
    FOREIGN KEY (grn_id) REFERENCES grn(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_grn_items_po_item
    FOREIGN KEY (purchase_order_item_id) REFERENCES po_items(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_grn_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT
);

CREATE TABLE grn_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_grn_photos_grn
    FOREIGN KEY (grn_id) REFERENCES grn(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_grn_photos_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- BATCHES
-- FEFO uses expiry_date in app logic
-- =========================================================
CREATE TABLE batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  batch_number VARCHAR(60) NOT NULL,
  qty_received DECIMAL(12,2) NOT NULL DEFAULT 0,
  qty_remaining DECIMAL(12,2) NOT NULL DEFAULT 0,
  qty_reserved DECIMAL(12,2) NOT NULL DEFAULT 0,
  received_date DATE NOT NULL,
  expiry_date DATE NULL,
  grn_id INT NOT NULL,
  source_type ENUM('supplier_purchase','market_purchase','return') NOT NULL DEFAULT 'supplier_purchase',
  source_reference_id INT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('active','depleted','expired') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_batches_item_batch (item_id, batch_number),
  INDEX idx_batches_item (item_id),
  INDEX idx_batches_expiry (expiry_date),
  INDEX idx_batches_remaining (qty_remaining),
  CONSTRAINT fk_batches_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_batches_grn
    FOREIGN KEY (grn_id) REFERENCES grn(id)
    ON DELETE RESTRICT
);

-- =========================================================
-- RETURNS
-- Supplier returns and local customer returns
-- =========================================================
CREATE TABLE returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_number VARCHAR(40) NOT NULL UNIQUE,
  return_type ENUM('supplier_return','local_dispatch_return') NOT NULL,
  source_type ENUM('supplier_purchase','market_purchase','local_dispatch') NOT NULL,
  supplier_id INT NULL,
  local_dispatch_id INT NULL,
  return_date DATE NOT NULL,
  reason TEXT,
  notes TEXT,
  deducted_from_supplier_payment TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_returns_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_returns_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  item_id INT NOT NULL,
  batch_id INT NULL,
  qty DECIMAL(12,2) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_return_items_return
    FOREIGN KEY (return_id) REFERENCES returns(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_return_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_return_items_batch
    FOREIGN KEY (batch_id) REFERENCES batches(id)
    ON DELETE SET NULL
);

CREATE TABLE return_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_return_photos_return
    FOREIGN KEY (return_id) REFERENCES returns(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_return_photos_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- WASTAGE
-- WhatsApp notification triggered by app on POST
-- =========================================================
CREATE TABLE wastage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wastage_number VARCHAR(40) NOT NULL UNIQUE,
  item_id INT NOT NULL,
  batch_id INT NULL,
  source_type ENUM('supplier_purchase','market_purchase','local_return') NOT NULL,
  wastage_date DATE NOT NULL,
  qty DECIMAL(12,2) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  reason VARCHAR(255),
  notes TEXT,
  notified_manager TINYINT(1) NOT NULL DEFAULT 0,
  notified_ops TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wastage_item (item_id),
  CONSTRAINT fk_wastage_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_wastage_batch
    FOREIGN KEY (batch_id) REFERENCES batches(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_wastage_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE wastage_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wastage_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wastage_photos_wastage
    FOREIGN KEY (wastage_id) REFERENCES wastage(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_wastage_photos_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- STOCK ADJUSTMENTS
-- Includes physical stock count variances
-- =========================================================
CREATE TABLE stock_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adjustment_number VARCHAR(40) NOT NULL UNIQUE,
  item_id INT NOT NULL,
  batch_id INT NULL,
  adjustment_type ENUM('increase','decrease','variance','stock_count') NOT NULL,
  system_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
  variance_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
  adjustment_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
  reason VARCHAR(255),
  notes TEXT,
  created_by INT NULL,
  approved_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_adjustments_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_adjustments_batch
    FOREIGN KEY (batch_id) REFERENCES batches(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_stock_adjustments_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_stock_adjustments_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- PACKAGING
-- Separate from produce inventory
-- =========================================================
CREATE TABLE packaging (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  usage_type ENUM('warehouse_only','export_only','both') NOT NULL DEFAULT 'both',
  cold_chain_only TINYINT(1) NOT NULL DEFAULT 0,
  unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
  qty_on_hand DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(12,2) NOT NULL DEFAULT 0,
  lead_time_days INT NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  supplier_id INT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_packaging_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_packaging_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- CUSTOMERS
-- One table, type local/global
-- =========================================================
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_code VARCHAR(40) NOT NULL UNIQUE,
  customer_type ENUM('local','global') NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(150),
  phone VARCHAR(30),
  whatsapp_number VARCHAR(30),
  email VARCHAR(150),
  address TEXT,
  city VARCHAR(100),
  delivery_window VARCHAR(50),           -- local only
  returns_policy VARCHAR(255),           -- local only
  driver_preference VARCHAR(150),        -- local only
  location_island VARCHAR(150),          -- global only
  airline_preference ENUM('UL','Q2') NULL,
  incoterm ENUM('CIF','FOB','DAP') NULL,
  cold_chain_required TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_type (customer_type),
  CONSTRAINT fk_customers_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- LOCAL DISPATCH
-- Stock deducted only when status becomes delivered
-- =========================================================
CREATE TABLE local_dispatch (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dispatch_number VARCHAR(40) NOT NULL UNIQUE,
  delivery_note_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  dispatch_date DATE NOT NULL,
  delivery_date DATE NULL,
  status ENUM('scheduled','out_for_delivery','delivered','return_received') NOT NULL DEFAULT 'scheduled',
  stock_deducted TINYINT(1) NOT NULL DEFAULT 0,
  driver_name VARCHAR(150),
  vehicle_number VARCHAR(50),
  delivery_window VARCHAR(50),
  notes TEXT,
  created_by INT NULL,
  delivered_by INT NULL,
  delivered_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_local_dispatch_customer (customer_id),
  INDEX idx_local_dispatch_status (status),
  CONSTRAINT fk_local_dispatch_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_local_dispatch_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_local_dispatch_delivered_by
    FOREIGN KEY (delivered_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE local_dispatch_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  local_dispatch_id INT NOT NULL,
  item_id INT NOT NULL,
  batch_id INT NULL,
  qty DECIMAL(12,2) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_local_dispatch_items_dispatch
    FOREIGN KEY (local_dispatch_id) REFERENCES local_dispatch(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_local_dispatch_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_local_dispatch_items_batch
    FOREIGN KEY (batch_id) REFERENCES batches(id)
    ON DELETE SET NULL
);

-- =========================================================
-- GLOBAL DISPATCH
-- Stock deducted only when all 7 docs verified and cleared
-- =========================================================
CREATE TABLE global_dispatch (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dispatch_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  dispatch_date DATE NOT NULL,
  departure_date DATE NULL,
  airline ENUM('UL','Q2') NOT NULL,
  incoterm ENUM('CIF','FOB','DAP') NOT NULL,
  cold_chain_required TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('created','docs_pending','cleared','delivered') NOT NULL DEFAULT 'created',
  stock_deducted TINYINT(1) NOT NULL DEFAULT 0,
  remarks TEXT,
  created_by INT NULL,
  cleared_by INT NULL,
  cleared_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_global_dispatch_customer (customer_id),
  INDEX idx_global_dispatch_status (status),
  CONSTRAINT fk_global_dispatch_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_global_dispatch_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_global_dispatch_cleared_by
    FOREIGN KEY (cleared_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE global_dispatch_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  global_dispatch_id INT NOT NULL,
  item_id INT NOT NULL,
  batch_id INT NULL,
  qty DECIMAL(12,2) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_global_dispatch_items_dispatch
    FOREIGN KEY (global_dispatch_id) REFERENCES global_dispatch(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_global_dispatch_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_global_dispatch_items_batch
    FOREIGN KEY (batch_id) REFERENCES batches(id)
    ON DELETE SET NULL
);

-- =========================================================
-- EXPORT DOCUMENTS
-- One row per global shipment, 7 statuses
-- Insurance required only for CIF (app logic)
-- =========================================================
CREATE TABLE export_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  global_dispatch_id INT NOT NULL UNIQUE,
  commercial_invoice_status ENUM('pending','done') NOT NULL DEFAULT 'pending',
  packing_list_status ENUM('pending','done') NOT NULL DEFAULT 'pending',
  phytosanitary_certificate_status ENUM('pending','done') NOT NULL DEFAULT 'pending',
  airway_bill_status ENUM('pending','done') NOT NULL DEFAULT 'pending',
  certificate_of_origin_status ENUM('pending','done') NOT NULL DEFAULT 'pending',
  health_certificate_status ENUM('pending','done') NOT NULL DEFAULT 'pending',
  insurance_certificate_status ENUM('pending','done') NOT NULL DEFAULT 'pending',
  all_cleared TINYINT(1) NOT NULL DEFAULT 0,
  commercial_invoice_file VARCHAR(255) NULL,
  packing_list_file VARCHAR(255) NULL,
  phytosanitary_certificate_file VARCHAR(255) NULL,
  airway_bill_file VARCHAR(255) NULL,
  certificate_of_origin_file VARCHAR(255) NULL,
  health_certificate_file VARCHAR(255) NULL,
  insurance_certificate_file VARCHAR(255) NULL,
  notes TEXT,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_export_documents_dispatch
    FOREIGN KEY (global_dispatch_id) REFERENCES global_dispatch(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_export_documents_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role_target ENUM('manager','ops','supervisor','logistics','supplier') NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  module VARCHAR(80) NOT NULL,
  reference_type VARCHAR(80) NULL,
  reference_id INT NULL,
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (is_read),
  INDEX idx_notifications_priority (priority),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- =========================================================
-- ACTIVITY LOG
-- Immutable by app rule
-- =========================================================
CREATE TABLE activity_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_name VARCHAR(150) NOT NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  reference_type VARCHAR(80) NULL,
  reference_id INT NULL,
  details JSON NULL,
  ip_address VARCHAR(60) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_module (module),
  INDEX idx_activity_created (created_at),
  CONSTRAINT fk_activity_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

-- =========================================================
-- SEED USERS
-- demo123 works for any role if you hash it later in app seed
-- For raw schema only, insert placeholders and update with bcrypt hashes later
-- =========================================================
INSERT INTO suppliers (
  supplier_code, supplier_name, contact_person, contact_number, whatsapp_number, email, address, city, payment_terms, lead_time_days, status
) VALUES
('SUP-001', 'Organic Farm Lanka', 'Mahinda', '0771111111', '0771111111', 'mahinda@organicfarm.lk', 'Manning Market, Colombo', 'Colombo', '30 days', 2, 'active');

INSERT INTO users (full_name, email, password, role, phone, status, supplier_id) VALUES
('Manager User', 'manager@freshworld.lk', 'REPLACE_WITH_BCRYPT_HASH', 'manager', '0770000001', 'active', NULL),
('Ops User', 'ops@freshworld.lk', 'REPLACE_WITH_BCRYPT_HASH', 'ops', '0770000002', 'active', NULL),
('Nishantha', 'nishantha@freshworld.lk', 'REPLACE_WITH_BCRYPT_HASH', 'supervisor', '0770000003', 'active', NULL),
('Dilani', 'dilani@freshworld.lk', 'REPLACE_WITH_BCRYPT_HASH', 'logistics', '0770000004', 'active', NULL),
('Mahinda', 'mahinda@organicfarm.lk', 'REPLACE_WITH_BCRYPT_HASH', 'supplier', '0771111111', 'active',
  (SELECT id FROM suppliers WHERE supplier_code = 'SUP-001')
);

-- Optional starter categories
INSERT INTO item_categories (category_name, description, status) VALUES
('Leafy Greens', 'Fresh leafy produce', 'active'),
('Herbs', 'Fresh herb products', 'active'),
('Fruits', 'Export fruits', 'active'),
('Vegetables', 'Export vegetables', 'active');

-- Optional starter items
INSERT INTO items (
  code, name, botanical_name, category_id, type, unit, shelf_life_days,
  reorder_level, storage_temp, unit_cost, returnable, description, status
) VALUES
('ITM-001', 'Lettuce', 'Lactuca sativa', 1, 'Perishable', 'kg', 7, 25, '2-5°C', 220.00, 1, 'Fresh lettuce', 'active'),
('ITM-002', 'Mint', 'Mentha', 2, 'Perishable', 'kg', 5, 10, '2-5°C', 180.00, 1, 'Fresh mint', 'active'),
('ITM-003', 'Papaya', 'Carica papaya', 3, 'Perishable', 'kg', 10, 30, '8-12°C', 150.00, 1, 'Fresh papaya', 'active');

-- Initialize inventory summary rows
INSERT INTO inventory (item_id, qty_on_hand, qty_reserved, qty_available, avg_unit_cost, total_value)
SELECT id, 0, 0, 0, unit_cost, 0
FROM items;