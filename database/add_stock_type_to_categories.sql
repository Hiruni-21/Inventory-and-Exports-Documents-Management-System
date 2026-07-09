-- Migration: Add stock_type to item_categories and backfill values

-- 1. Add stock_type column
ALTER TABLE item_categories ADD COLUMN stock_type VARCHAR(50) DEFAULT 'produce';

-- 2. Backfill stock_type for packaging materials based on category name keywords
UPDATE item_categories
SET stock_type = 'packaging'
WHERE LOWER(category_name) LIKE '%carton%'
   OR LOWER(category_name) LIKE '%box%'
   OR LOWER(category_name) LIKE '%regiform%'
   OR LOWER(category_name) LIKE '%foam%'
   OR LOWER(category_name) LIKE '%liner%'
   OR LOWER(category_name) LIKE '%label%'
   OR LOWER(category_name) LIKE '%tape%'
   OR LOWER(category_name) LIKE '%wrapping%'
   OR LOWER(category_name) LIKE '%cooling%'
   OR LOWER(category_name) LIKE '%bag%'
   OR LOWER(category_name) LIKE '%vacuum%'
   OR LOWER(category_name) LIKE '%divider%'
   OR LOWER(category_name) LIKE '%insert%'
   OR LOWER(category_name) LIKE '%tray%'
   OR LOWER(category_name) LIKE '%crate%'
   OR LOWER(category_name) LIKE '%packing%';

-- 3. Backfill stock_type for produce categories
UPDATE item_categories
SET stock_type = 'produce'
WHERE stock_type IS NULL OR stock_type = '';

-- 4. Backfill category_code sequences
-- Produce sequence (CAT-001, CAT-002, ...)
SET @prod_seq = 0;
UPDATE item_categories
SET category_code = CONCAT('CAT-', LPAD(@prod_seq := @prod_seq + 1, 3, '0'))
WHERE stock_type = 'produce'
ORDER BY id ASC;

-- Packaging sequence (PKG-CAT-001, PKG-CAT-002, ...)
SET @pkg_seq = 0;
UPDATE item_categories
SET category_code = CONCAT('PKG-CAT-', LPAD(@pkg_seq := @pkg_seq + 1, 3, '0'))
WHERE stock_type = 'packaging'
ORDER BY id ASC;
