<?php
// Router.php - Maps endpoint to controller actions

require_once __DIR__ . '/Controller.php';

class Router {
    public static function route(): void {
        $endpoint = get('endpoint', '');
        $method   = $_SERVER['REQUEST_METHOD'];
        $id       = get('id') ? (int)get('id') : null;
        $action   = get('action');
        
        $controller = new Controller();
        
        match($endpoint) {
            'auth'       => $controller->handleAuth($method, $action),
            'products'   => $controller->handleProducts($method, $id, $action),
            'categories' => $controller->handleCategories($method, $id),
            'eras'       => $controller->handleEras($method, $id),
            'orders'     => $controller->handleOrders($method, $id),
            'discounts'  => $controller->handleDiscounts($method, $id),
            'admin'      => $controller->handleAdminStats(),
            'users'      => $controller->handleUsers($method, $id),
            'chart_data' => $controller->handleChartData(),
            default      => error('Endpoint not found', 404),
        };
    }
}