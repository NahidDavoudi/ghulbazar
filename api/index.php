<?php
// index.php - Front controller

require_once __DIR__ . '/Config.php';   // sets CORS, helpers
require_once __DIR__ . '/Router.php';

Router::route();