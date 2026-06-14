<?php
/**
 * Phase 5 cleanup: migrate legacy fields to product_attributes, drop deprecated tables/columns.
 * Usage: php api/database/migrate_product_cleanup.php
 */

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Env;
use App\Core\Database\Database;
use App\Utils\SlugHelper;

Env::load(dirname(__DIR__) . '/.env');
$pdo = Database::getInstance()->getConnection();

echo "=== Product Catalog Cleanup ===\n";

$legacyTypes = [
    'material' => ['name' => 'Material', 'input_type' => 'text'],
    'era'      => ['name' => 'Era', 'input_type' => 'text'],
    'badge'    => ['name' => 'Badge', 'input_type' => 'text'],
];

$typeIds = [];
foreach ($legacyTypes as $slug => $meta) {
    $stmt = $pdo->prepare('SELECT id FROM attribute_types WHERE slug = ?');
    $stmt->execute([$slug]);
    $id = $stmt->fetchColumn();
    if (!$id) {
        $ins = $pdo->prepare("
            INSERT INTO attribute_types (name, slug, input_type, is_variant_axis, is_filterable, sort_order)
            VALUES (?, ?, ?, 0, 0, 99)
        ");
        $ins->execute([$meta['name'], $slug, $meta['input_type']]);
        $id = (int) $pdo->lastInsertId();
        echo "  + attribute type: {$slug}\n";
    }
    $typeIds[$slug] = (int) $id;
}

$products = $pdo->query('SELECT id, material, era, badge FROM products')->fetchAll(PDO::FETCH_ASSOC);
foreach ($products as $p) {
    foreach (['material', 'era', 'badge'] as $field) {
        $value = trim($p[$field] ?? '');
        if ($value === '') continue;

        $check = $pdo->prepare('
            SELECT id FROM product_attributes WHERE product_id = ? AND attribute_type_id = ?
        ');
        $check->execute([$p['id'], $typeIds[$field]]);
        if ($check->fetchColumn()) continue;

        $ins = $pdo->prepare('
            INSERT INTO product_attributes (product_id, attribute_type_id, custom_value)
            VALUES (?, ?, ?)
        ');
        $ins->execute([$p['id'], $typeIds[$field], $value]);
    }
}
echo "  Migrated legacy product fields to product_attributes\n";

try {
    $pdo->exec('DROP TABLE IF EXISTS product_options');
    echo "  Dropped product_options\n";
} catch (PDOException $e) {
    echo "  ! product_options: " . $e->getMessage() . "\n";
}

foreach (['era', 'material', 'badge'] as $col) {
    try {
        $pdo->exec("ALTER TABLE products DROP COLUMN {$col}");
        echo "  Dropped products.{$col}\n";
    } catch (PDOException $e) {
        if (!str_contains($e->getMessage(), "check that it exists")) {
            echo "  ! products.{$col}: " . $e->getMessage() . "\n";
        }
    }
}

echo "=== Cleanup complete ===\n";
