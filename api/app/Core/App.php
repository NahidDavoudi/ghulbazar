<?php
namespace App\Core;

class App {
    private static ?App $instance = null;
    private Router $router;

    public function __construct() {
        self::$instance = $this;
        Env::load();
        $basePath = Env::get('BASE_PATH', '');
        $this->router = new Router($basePath);
    }

    public static function getInstance(): ?App {
        return self::$instance;
    }

    public function router(): Router {
        return $this->router;
    }

    public function run(): void {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        $this->router->dispatch();
    }
}