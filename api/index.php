<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Core\Http\Router;
use App\Core\Env;
Env::load();
$router = new Router();