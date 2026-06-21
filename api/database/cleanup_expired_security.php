<?php
/**
 * Cron: php api/database/cleanup_expired_security.php
 * Purges expired rows from security tables.
 */
require_once dirname(__DIR__) . '/vendor/autoload.php';

use App\Core\Env;
use App\Core\Database\Database;

Env::load(dirname(__DIR__) . '/.env');

$pdo = Database::getInstance()->getConnection();

$tables = [
    'DELETE FROM token_blacklist WHERE expires_at <= NOW()',
    'DELETE FROM refresh_tokens WHERE expires_at <= NOW()',
    'DELETE FROM login_attempts WHERE expires_at <= NOW()',
    'DELETE FROM otp_codes WHERE expires_at <= NOW() AND verified_at IS NULL',
];

foreach ($tables as $sql) {
    $count = $pdo->exec($sql);
    echo date('Y-m-d H:i:s') . " {$sql} => {$count}\n";
}
