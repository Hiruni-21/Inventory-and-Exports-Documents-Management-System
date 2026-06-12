USE fresh_world_system;

DELIMITER //

CREATE PROCEDURE add_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @sql_text = p_alter_sql;
    PREPARE stmt FROM @sql_text;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

CALL add_column_if_missing(
  'items',
  'item_kind',
  "ALTER TABLE items ADD COLUMN item_kind ENUM('export_product','packaging_supply') NOT NULL DEFAULT 'export_product' AFTER inventory_tracked"
);

CALL add_column_if_missing(
  'items',
  'purchase_source',
  "ALTER TABLE items ADD COLUMN purchase_source ENUM('supplier','market') NOT NULL DEFAULT 'supplier' AFTER item_kind"
);

CALL add_column_if_missing(
  'customers',
  'group_name',
  "ALTER TABLE customers ADD COLUMN group_name VARCHAR(150) NULL AFTER customer_name"
);

CALL add_column_if_missing(
  'customers',
  'payment_terms',
  "ALTER TABLE customers ADD COLUMN payment_terms VARCHAR(100) NULL AFTER delivery_window"
);

CALL add_column_if_missing(
  'customers',
  'notes',
  "ALTER TABLE customers ADD COLUMN notes TEXT NULL AFTER driver_preference"
);

DROP PROCEDURE add_column_if_missing;

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  batch_id INT NULL,
  movement_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
  reference_type VARCHAR(80) NULL,
  reference_id INT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_movements_item (item_id),
  INDEX idx_stock_movements_reference (reference_type, reference_id),
  CONSTRAINT fk_stock_movements_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_batch
    FOREIGN KEY (batch_id) REFERENCES batches(id)
    ON DELETE SET NULL
);

UPDATE items
SET item_kind = 'export_product'
WHERE item_kind IS NULL OR item_kind = '';

UPDATE items
SET purchase_source = 'supplier'
WHERE purchase_source IS NULL OR purchase_source = '';

DELIMITER //

CREATE PROCEDURE add_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @sql_text = p_alter_sql;
    PREPARE stmt FROM @sql_text;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

CALL add_column_if_missing(
  'global_dispatch',
  'total_weight',
  "ALTER TABLE global_dispatch ADD COLUMN total_weight DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER incoterm"
);

CALL add_column_if_missing(
  'global_dispatch',
  'total_boxes',
  "ALTER TABLE global_dispatch ADD COLUMN total_boxes INT NOT NULL DEFAULT 0 AFTER total_weight"
);

DROP PROCEDURE add_column_if_missing;

USE fresh_world_system;

DROP PROCEDURE IF EXISTS add_column_if_missing;

DELIMITER $$

CREATE PROCEDURE add_column_if_missing(
  IN table_name_param VARCHAR(64),
  IN column_name_param VARCHAR(64),
  IN alter_sql_param TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = table_name_param
      AND column_name = column_name_param
  ) THEN
    SET @sql = alter_sql_param;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

CALL add_column_if_missing(
  'global_dispatch',
  'total_weight',
  'ALTER TABLE global_dispatch ADD COLUMN total_weight DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER incoterm'
);

CALL add_column_if_missing(
  'global_dispatch',
  'total_boxes',
  'ALTER TABLE global_dispatch ADD COLUMN total_boxes INT NOT NULL DEFAULT 0 AFTER total_weight'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;