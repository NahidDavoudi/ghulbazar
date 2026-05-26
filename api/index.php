<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Core\Http\Router;
use App\Core\Env;
$allowedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '*'; 
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: $allowedOrigin");
header('Access-Control-Allow-Credentials: true'); // برای ارسال کوکی (اختیاری)
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
Env::load();
$router = new Router();