<?php
/**
 * Add enamad_html column to shop_settings.
 * Usage: php api/database/migrate_enamad_settings.php
 */

require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Env;
use App\Core\Database\Database;

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

echo "=== Enamad Settings Migration ===\n";

if (!columnExists($pdo, 'shop_settings', 'enamad_html')) {
    $pdo->exec('ALTER TABLE shop_settings ADD COLUMN enamad_html TEXT NULL AFTER meta_description');
    echo "  + column shop_settings.enamad_html\n";
} else {
    echo "  = column shop_settings.enamad_html already exists\n";
}

echo "Done.\n";
