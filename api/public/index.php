<?php
// index.php - Front controller

require_once __DIR__ . '/vendor/autoload.php';
use App\Core\Router;

Router::route();