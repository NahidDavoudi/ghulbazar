<?php
// Router.php - RESTful Router

require_once __DIR__ . '/Controller.php';

class Router {
    public static function route(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        
        // Get the request path without query string
        $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        // Adjust base path to match your installation
        // Example: if your API is at http://localhost/ghulbazar/api/
        $basePath = '/ghulbazar/api/';
        
        // Remove base path from the beginning
        if (strpos($requestUri, $basePath) === 0) {
            $path = substr($requestUri, strlen($basePath));
        } else {
            // Fallback: try to remove first directory if base path doesn't match
            $path = ltrim($requestUri, '/');
            $parts = explode('/', $path);
            if ($parts[0] === 'api') {
                array_shift($parts);
                $path = implode('/', $parts);
            }
        }
        
        $path = trim($path, '/');
        $segments = $path === '' ? [] : explode('/', $path);
        
        if (empty($segments)) {
            error('Endpoint not found', 404);
        }
        
        $resource = $segments[0];
        $controller = new Controller();
        
        // Route based on resource
        switch ($resource) {
            case 'auth':
                self::routeAuth($method, $segments, $controller);
                break;
            case 'products':
                self::routeProducts($method, $segments, $controller);
                break;
            case 'categories':
                self::routeCategories($method, $segments, $controller);
                break;
            case 'eras':
                self::routeEras($method, $segments, $controller);
                break;
            case 'orders':
                self::routeOrders($method, $segments, $controller);
                break;
            case 'discounts':
                self::routeDiscounts($method, $segments, $controller);
                break;
            case 'admin':
                self::routeAdmin($segments, $controller);
                break;
            case 'chart-data':
                $controller->handleChartData();
                break;
            case 'users':
                self::routeUsers($method, $segments, $controller);
                break;
            default:
                error('Endpoint not found', 404);
        }
    }
    
    // -------------------- Auth --------------------
    private static function routeAuth(string $method, array $segments, Controller $ctrl): void {
        $action = $segments[1] ?? null;
        
        if ($method === 'POST' && $action === 'login') {
            $ctrl->handleAuth('POST', 'login');
        } 
        elseif ($method === 'GET' && $action === 'me') {
            $ctrl->handleAuth('GET', 'me');
        }
        else {
            error('Invalid auth endpoint', 404);
        }
    }
    
    // -------------------- Products --------------------
    private static function routeProducts(string $method, array $segments, Controller $ctrl): void {
        $count = count($segments);
        
        // POST /products/upload-image (legacy? not used)
        // POST /products/{id}/upload-image
        if ($method === 'POST' && $count === 3 && $segments[2] === 'upload-image') {
            $_GET['id'] = $segments[1];
            $_GET['action'] = 'upload-image';
            $ctrl->handleProducts('POST', null, 'upload-image');
            return;
        }
        
        // DELETE /products/image/{imageId}
        if ($method === 'DELETE' && $count === 3 && $segments[1] === 'image') {
            $_GET['image_id'] = $segments[2];
            $_GET['action'] = 'delete-image';
            $ctrl->handleProducts('DELETE', null, 'delete-image');
            return;
        }
        
        // PUT /products/{id}
        if ($method === 'PUT' && $count === 2) {
            $ctrl->handleProducts('PUT', (int)$segments[1], null);
            return;
        }
        
        // DELETE /products/{id}
        if ($method === 'DELETE' && $count === 2) {
            $ctrl->handleProducts('DELETE', (int)$segments[1], null);
            return;
        }
        
        // GET /products (maybe with query params like ?page=1)
        // POST /products (create)
        if ($method === 'GET' || $method === 'POST') {
            // For GET, pass any id from segment? Not standard, but support single product if needed
            if ($method === 'GET' && $count === 2) {
                $_GET['id'] = $segments[1];
            }
            $ctrl->handleProducts($method, null, null);
            return;
        }
        
        error('Method not allowed for products', 405);
    }
    
    // -------------------- Categories --------------------
    private static function routeCategories(string $method, array $segments, Controller $ctrl): void {
        $count = count($segments);
        
        if ($method === 'GET' && $count === 1) {
            $ctrl->handleCategories('GET', null);
        }
        elseif ($method === 'POST' && $count === 1) {
            $ctrl->handleCategories('POST', null);
        }
        elseif (($method === 'PUT' || $method === 'DELETE') && $count === 2) {
            $ctrl->handleCategories($method, (int)$segments[1]);
        }
        else {
            error('Method not allowed for categories', 405);
        }
    }
    
    // -------------------- Eras --------------------
    private static function routeEras(string $method, array $segments, Controller $ctrl): void {
        $count = count($segments);
        
        if ($method === 'GET' && $count === 1) {
            $ctrl->handleEras('GET', null);
        }
        elseif ($method === 'POST' && $count === 1) {
            $ctrl->handleEras('POST', null);
        }
        elseif (($method === 'PUT' || $method === 'DELETE') && $count === 2) {
            $ctrl->handleEras($method, (int)$segments[1]);
        }
        else {
            error('Method not allowed for eras', 405);
        }
    }
    
    // -------------------- Orders --------------------
    private static function routeOrders(string $method, array $segments, Controller $ctrl): void {
        $count = count($segments);
        
        if ($method === 'GET' && $count === 1) {
            $ctrl->handleOrders('GET', null);
        }
        elseif ($method === 'PUT' && $count === 2) {
            $ctrl->handleOrders('PUT', (int)$segments[1]);
        }
        else {
            error('Method not allowed for orders', 405);
        }
    }
    
    // -------------------- Discounts --------------------
    private static function routeDiscounts(string $method, array $segments, Controller $ctrl): void {
        $count = count($segments);
        
        if ($method === 'GET' && $count === 1) {
            $ctrl->handleDiscounts('GET', null);
        }
        elseif ($method === 'POST' && $count === 1) {
            $ctrl->handleDiscounts('POST', null);
        }
        elseif ($method === 'DELETE' && $count === 2) {
            $ctrl->handleDiscounts('DELETE', (int)$segments[1]);
        }
        else {
            error('Method not allowed for discounts', 405);
        }
    }
    
    // -------------------- Admin --------------------
    private static function routeAdmin(array $segments, Controller $ctrl): void {
        if (isset($segments[1]) && $segments[1] === 'stats') {
            $ctrl->handleAdminStats();
        } else {
            error('Admin endpoint not found', 404);
        }
    }
    
    // -------------------- Users --------------------
    private static function routeUsers(string $method, array $segments, Controller $ctrl): void {
        $count = count($segments);
        
        if ($method === 'GET' && $count === 1) {
            $ctrl->handleUsers('GET', null);
        }
        elseif ($method === 'GET' && $count === 2) {
            $ctrl->handleUsers('GET', (int)$segments[1]);
        }
        elseif ($method === 'PUT' && $count === 2) {
            $ctrl->handleUsers('PUT', (int)$segments[1]);
        }
        elseif ($method === 'DELETE' && $count === 2) {
            $ctrl->handleUsers('DELETE', (int)$segments[1]);
        }
        else {
            error('Method not allowed for users', 405);
        }
    }
}