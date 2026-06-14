-- Product Catalog MVP Migration
-- Run via: php api/database/migrate_product_catalog.php

-- ─── Extend products table (columns added safely by migrate script) ──

-- Sync status from legacy is_active (safe to re-run)
UPDATE products SET status = 'active' WHERE is_active = 1 AND (status IS NULL OR status = 'draft');
UPDATE products SET status = 'archived' WHERE is_active = 0;

-- ─── Attribute types ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attribute_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    input_type ENUM('select','multiselect','text','number','boolean','swatch') NOT NULL DEFAULT 'select',
    is_variant_axis TINYINT(1) NOT NULL DEFAULT 0,
    is_filterable TINYINT(1) NOT NULL DEFAULT 1,
    is_required TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attribute_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Attribute values ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attribute_values (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attribute_type_id BIGINT UNSIGNED NOT NULL,
    value VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    swatch_hex VARCHAR(7) NULL,
    metadata JSON NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attr_values_type_slug (attribute_type_id, slug),
    CONSTRAINT fk_attr_values_type FOREIGN KEY (attribute_type_id)
        REFERENCES attribute_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Product variants ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    sku VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    price BIGINT UNSIGNED NULL,
    sale_price BIGINT UNSIGNED NULL,
    cost_price BIGINT UNSIGNED NULL,
    image_id BIGINT UNSIGNED NULL,
    position INT NOT NULL DEFAULT 0,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_product_variants_sku (sku),
    KEY idx_product_variants_product (product_id),
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Variant attribute values ──────────────────────────────────
CREATE TABLE IF NOT EXISTS variant_attribute_values (
    variant_id BIGINT UNSIGNED NOT NULL,
    attribute_value_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (variant_id, attribute_value_id),
    CONSTRAINT fk_vav_variant FOREIGN KEY (variant_id)
        REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_vav_value FOREIGN KEY (attribute_value_id)
        REFERENCES attribute_values(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Inventory items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 0,
    reserved_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    low_stock_threshold INT UNSIGNED NULL,
    track_inventory TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_inventory_variant (variant_id),
    CONSTRAINT fk_inventory_variant FOREIGN KEY (variant_id)
        REFERENCES product_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Descriptive product attributes ────────────────────────────
CREATE TABLE IF NOT EXISTS product_attributes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    attribute_type_id BIGINT UNSIGNED NOT NULL,
    attribute_value_id BIGINT UNSIGNED NULL,
    custom_value VARCHAR(500) NULL,
    UNIQUE KEY uq_product_attr (product_id, attribute_type_id),
    CONSTRAINT fk_pa_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_type FOREIGN KEY (attribute_type_id)
        REFERENCES attribute_types(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_value FOREIGN KEY (attribute_value_id)
        REFERENCES attribute_values(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart/order variant columns added safely by migrate script
