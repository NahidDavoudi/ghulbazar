<?php
/**
 * Product catalog migration runner.
 * Usage: php api/database/migrate_product_catalog.php
 */

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Env;
use App\Core\Database\Database;
use App\Utils\SlugHelper;

Env::load(dirname(__DIR__) . '/.env');

$pdo = Database::getInstance()->getConnection();

function columnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}

function tableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    ");
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}

function addColumnIfMissing(PDO $pdo, string $table, string $column, string $definition): void
{
    if (!columnExists($pdo, $table, $column)) {
        $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
        echo "  + column {$table}.{$column}\n";
    }
}

echo "=== Product Catalog Migration ===\n";

// ─── Extend products ───────────────────────────────────────────
echo "Extending products table...\n";
addColumnIfMissing($pdo, 'products', 'short_description', 'TEXT NULL AFTER description');
addColumnIfMissing($pdo, 'products', 'status', "ENUM('draft','active','archived') NOT NULL DEFAULT 'active' AFTER featured");
addColumnIfMissing($pdo, 'products', 'product_type', "ENUM('simple','variable') NOT NULL DEFAULT 'simple' AFTER status");
addColumnIfMissing($pdo, 'products', 'sale_price', 'BIGINT UNSIGNED NULL AFTER price');
addColumnIfMissing($pdo, 'products', 'low_stock_threshold', 'INT UNSIGNED NOT NULL DEFAULT 5 AFTER stock');

$pdo->exec("UPDATE products SET status = 'active' WHERE is_active = 1 AND status = 'draft'");
$pdo->exec("UPDATE products SET status = 'archived' WHERE is_active = 0");

// ─── Cart / order columns ──────────────────────────────────────
echo "Extending cart_items / order_items...\n";
addColumnIfMissing($pdo, 'cart_items', 'variant_id', 'BIGINT UNSIGNED NULL AFTER product_id');
addColumnIfMissing($pdo, 'order_items', 'variant_id', 'BIGINT UNSIGNED NULL AFTER product_id');
addColumnIfMissing($pdo, 'order_items', 'variant_title', 'VARCHAR(255) NULL AFTER variant_id');
addColumnIfMissing($pdo, 'order_items', 'sku', 'VARCHAR(100) NULL AFTER variant_title');

// ─── Run DDL from SQL file ─────────────────────────────────────
echo "Creating catalog tables...\n";

$ddlStatements = [
    "CREATE TABLE IF NOT EXISTS attribute_types (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS attribute_values (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS product_variants (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS variant_attribute_values (
        variant_id BIGINT UNSIGNED NOT NULL,
        attribute_value_id BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (variant_id, attribute_value_id),
        CONSTRAINT fk_vav_variant FOREIGN KEY (variant_id)
            REFERENCES product_variants(id) ON DELETE CASCADE,
        CONSTRAINT fk_vav_value FOREIGN KEY (attribute_value_id)
            REFERENCES attribute_values(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS inventory_items (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS product_attributes (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

foreach ($ddlStatements as $statement) {
    try {
        $pdo->exec($statement);
        echo "  + table created/verified\n";
    } catch (PDOException $e) {
        echo "  ! DDL error: " . $e->getMessage() . "\n";
        throw $e;
    }
}

// ─── Seed attribute types & values ─────────────────────────────
echo "Seeding attributes...\n";

$seeds = [
    'color' => [
        'name' => 'Color', 'input_type' => 'swatch', 'is_variant_axis' => 1,
        'values' => [
            ['value' => 'Black', 'slug' => 'black', 'swatch_hex' => '#000000'],
            ['value' => 'White', 'slug' => 'white', 'swatch_hex' => '#FFFFFF'],
            ['value' => 'Navy',  'slug' => 'navy',  'swatch_hex' => '#1B2A4A'],
        ],
    ],
    'size' => [
        'name' => 'Size', 'input_type' => 'select', 'is_variant_axis' => 1,
        'values' => [
            ['value' => 'S',  'slug' => 's'],
            ['value' => 'M',  'slug' => 'm'],
            ['value' => 'L',  'slug' => 'l'],
            ['value' => 'XL', 'slug' => 'xl'],
        ],
    ],
];

foreach ($seeds as $slug => $type) {
    $stmt = $pdo->prepare('SELECT id FROM attribute_types WHERE slug = ?');
    $stmt->execute([$slug]);
    $typeId = $stmt->fetchColumn();

    if (!$typeId) {
        $ins = $pdo->prepare("
            INSERT INTO attribute_types (name, slug, input_type, is_variant_axis, is_filterable, sort_order)
            VALUES (?, ?, ?, ?, 1, ?)
        ");
        $ins->execute([$type['name'], $slug, $type['input_type'], $type['is_variant_axis'], 0]);
        $typeId = (int) $pdo->lastInsertId();
        echo "  + attribute type: {$slug}\n";
    }

    foreach ($type['values'] as $i => $val) {
        $check = $pdo->prepare('SELECT id FROM attribute_values WHERE attribute_type_id = ? AND slug = ?');
        $check->execute([$typeId, $val['slug']]);
        if ($check->fetchColumn()) {
            continue;
        }
        $ins = $pdo->prepare("
            INSERT INTO attribute_values (attribute_type_id, value, slug, swatch_hex, sort_order)
            VALUES (?, ?, ?, ?, ?)
        ");
        $ins->execute([
            $typeId,
            $val['value'],
            $val['slug'],
            $val['swatch_hex'] ?? null,
            $i,
        ]);
    }
}

// ─── Migrate existing products to default variants ─────────────
echo "Migrating existing products to default variants...\n";

$products = $pdo->query('SELECT * FROM products')->fetchAll(PDO::FETCH_ASSOC);

foreach ($products as $product) {
    $productId = (int) $product['id'];

    $check = $pdo->prepare('SELECT id FROM product_variants WHERE product_id = ? LIMIT 1');
    $check->execute([$productId]);
    if ($check->fetchColumn()) {
        continue;
    }

    $slug = $product['slug'] ?: SlugHelper::make($product['name'], 'product-' . $productId);
    if (!$product['slug']) {
        $pdo->prepare('UPDATE products SET slug = ? WHERE id = ?')->execute([$slug, $productId]);
    }

    $sku = 'SKU-' . strtoupper(preg_replace('/[^A-Z0-9]/', '', $slug) ?: 'P' . $productId);
    $skuCheck = $pdo->prepare('SELECT id FROM product_variants WHERE sku = ?');
    $skuCheck->execute([$sku]);
    if ($skuCheck->fetchColumn()) {
        $sku = 'SKU-P' . $productId;
    }

    $ins = $pdo->prepare("
        INSERT INTO product_variants (product_id, sku, title, price, is_default, is_active, position)
        VALUES (?, ?, ?, ?, 1, 1, 0)
    ");
    $ins->execute([
        $productId,
        $sku,
        'Default',
        (int) $product['price'],
    ]);
    $variantId = (int) $pdo->lastInsertId();

    $inv = $pdo->prepare("
        INSERT INTO inventory_items (variant_id, quantity, low_stock_threshold, track_inventory)
        VALUES (?, ?, ?, 1)
    ");
    $inv->execute([
        $variantId,
        (int) $product['stock'],
        (int) ($product['low_stock_threshold'] ?? 5),
    ]);

    echo "  + default variant for product #{$productId} ({$product['name']})\n";
}

// ─── Backfill cart_items.variant_id ────────────────────────────
echo "Backfilling cart_items.variant_id...\n";
$pdo->exec("
    UPDATE cart_items ci
    JOIN product_variants pv ON pv.product_id = ci.product_id AND pv.is_default = 1
    SET ci.variant_id = pv.id
    WHERE ci.variant_id IS NULL
");

echo "=== Migration complete ===\n";
