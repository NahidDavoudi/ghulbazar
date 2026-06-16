<?php
require_once 'vendor/autoload.php';
\App\Core\Logger::boot();
use App\Core\Env;
use App\Core\Http\Router;
use App\Core\Http\Request;
use App\Core\Http\ExceptionHandler;

// ─── Load environment ────────────────────────
Env::load('.env');
Env::assertProductionReady();

// ─── Exception Handler ───────────────────────
// باید قبل از هر چیز دیگه‌ای ست بشه
$handler = new ExceptionHandler();
set_exception_handler([$handler, 'handle']);
set_error_handler([$handler, 'handleError']);

// ─── Router ──────────────────────────────────
$router = new Router();
require_once 'routes/api.php';
$router->dispatch(new Request());