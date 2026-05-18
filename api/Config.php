<?php
// Config.php - Configuration, DB, JWT, Helpers

// Load .env file
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!isset($_ENV[$key])) {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

// CORS headers (must be sent before any output)
header('Content-Type: application/json; charset=utf-8');
$allowedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $allowedOrigin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Database configuration from .env
define('DB_HOST',     $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME',     $_ENV['DB_NAME'] ?? 'ghulbazar');
define('DB_USER',     $_ENV['DB_USER'] ?? 'root');
define('DB_PASS',     $_ENV['DB_PASS'] ?? '');
define('DB_CHARSET',  $_ENV['DB_CHARSET'] ?? 'utf8mb4');
define('JWT_SECRET',  $_ENV['JWT_SECRET'] ?? 'CHANGE_THIS_TO_SOMETHING_RANDOM_IN_PRODUCTION');

// Database connection (singleton)
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// JSON response helpers (unchanged)
function respond(mixed $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function error(string $msg, int $code = 400): void {
    respond(['error' => $msg], $code);
}
function body(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
function get(string $key, mixed $default = null): mixed {
    return $_GET[$key] ?? $default;
}

// JWT helpers (unchanged)
function b64e(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function b64d(string $d): string { return base64_decode(strtr($d, '-_', '+/')); }

function jwt_make(array $payload): string {
    $h = b64e(json_encode(['alg'=>'HS256','typ'=>'JWT']));
    $p = b64e(json_encode($payload));
    $s = b64e(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    return "$h.$p.$s";
}
function jwt_parse(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    if (!hash_equals(b64e(hash_hmac('sha256', "$h.$p", JWT_SECRET, true)), $s)) return null;
    $data = json_decode(b64d($p), true);
    if (isset($data['exp']) && $data['exp'] < time()) return null;
    return $data;
}

// Authentication helpers (unchanged)
function auth_user(): ?array {
    $h = '';
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $h = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (empty($h)) {
        $h = $_SERVER['HTTP_AUTHORIZATION'] 
          ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
          ?? '';
    }
    if (empty($h)) {
        foreach ($_SERVER as $key => $value) {
            if (stripos($key, 'AUTHORIZATION') !== false) {
                $h = $value;
                break;
            }
        }
    }
    if (!str_starts_with($h, 'Bearer ')) return null;
    return jwt_parse(trim(substr($h, 7)));
}

function require_admin(): array {
    $u = auth_user();
    if (!$u) error('Unauthorized', 401);
    if ($u['role'] !== 'admin') error('Forbidden - Admin access required', 403);
    return $u;
}