<?php
// Router.php - Routeur RESTful با پشتیبانی از آدرس‌های تمیز

require_once __DIR__ . '/Controller.php';

class Router {
    public static function route(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        
        // دریافت مسیر درخواست (بدون Query String)
        $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $basePath = '/ghulbazar/api/';  // مسیر پایه (بسته به تنظیمات شما)
        
        // حذف basePath از ابتدای مسیر
        if (strpos($requestUri, $basePath) === 0) {
            $path = substr($requestUri, strlen($basePath));
        } else {
            $path = $requestUri;
        }
        $path = trim($path, '/');
        $segments = explode('/', $path);
        
        $controller = new Controller();
        
        // اگر مسیر خالی بود یا فقط api بود -> 404
        if (empty($segments[0])) {
            error('Endpoint not found', 404);
        }
        
        $resource = $segments[0];      // auth, products, categories, ...
        $id = $segments[1] ?? null;    // عدد id اگر باشد
        $action = $segments[2] ?? null; // عملیات فرعی مثل upload-image
        
        // -----------------------------------------------------------------
        // مسیریابی بر اساس resource
        // -----------------------------------------------------------------
        switch ($resource) {
            case 'auth':
                self::handleAuth($method, $action, $controller);
                break;
                
            case 'products':
                self::handleProducts($method, $id, $action, $controller);
                break;
                
            case 'categories':
                self::handleCategories($method, $id, $controller);
                break;
                
            case 'eras':
                self::handleEras($method, $id, $controller);
                break;
                
            case 'orders':
                self::handleOrders($method, $id, $controller);
                break;
                
            case 'discounts':
                self::handleDiscounts($method, $id, $controller);
                break;
                
            case 'admin':
                if ($id === 'stats') {
                    $controller->handleAdminStats();
                } else {
                    error('Endpoint not found', 404);
                }
                break;
                
            case 'chart-data':
                $controller->handleChartData();
                break;
                
            case 'users':
                self::handleUsers($method, $id, $controller);
                break;
                
            default:
                error('Endpoint not found', 404);
        }
    }
    
    // ----- Auth -----
    private static function handleAuth(string $method, ?string $action, Controller $ctrl): void {
        if ($method === 'POST' && $action === 'login') {
            $ctrl->handleAuth($method, 'login');
        } 
        elseif ($method === 'GET' && $action === 'me') {
            $ctrl->handleAuth($method, 'me');
        }
        else {
            error('Invalid auth endpoint', 404);
        }
    }
    
    // ----- Products -----
    private static function handleProducts(string $method, ?string $id, ?string $action, Controller $ctrl): void {
        // آپلود تصویر: POST /products/{id}/upload-image
        if ($method === 'POST' && $action === 'upload-image' && $id !== null) {
            // action=upload-image و product_id از id گرفته می‌شود
            $_GET['id'] = $id;
            $_GET['action'] = 'upload-image';
            $ctrl->handleProducts('POST', null, 'upload-image');
            return;
        }
        
        // حذف تصویر: DELETE /products/image/{imageId}
        if ($method === 'DELETE' && $id === 'image' && $action !== null) {
            $_GET['image_id'] = $action;
            $_GET['action'] = 'delete-image';
            $ctrl->handleProducts('DELETE', null, 'delete-image');
            return;
        }
        
        // PUT /products/{id}  (ویرایش)
        if ($method === 'PUT' && $id !== null) {
            $ctrl->handleProducts('PUT', (int)$id, null);
            return;
        }
        
        // DELETE /products/{id} (حذف نرم)
        if ($method === 'DELETE' && $id !== null) {
            $ctrl->handleProducts('DELETE', (int)$id, null);
            return;
        }
        
        // POST /products (ایجاد)
        if ($method === 'POST' && $id === null) {
            $ctrl->handleProducts('POST', null, null);
            return;
        }
        
        // GET /products (لیست) و GET /products?id=... (تکی؟ در api اصلی GET تکی نداریم ولی می‌توان اضافه کرد)
        if ($method === 'GET') {
            // اگر id داشته باشی، می‌توانی یک محصول خاص را برگردانی (در صورت نیاز)
            if ($id !== null) {
                // فعلاً همان endpoint قدیمی که id را از query می‌گیرد استفاده می‌شود
                $_GET['id'] = $id;
            }
            $ctrl->handleProducts('GET', null, null);
            return;
        }
        
        error('Method not allowed for products', 405);
    }
    
    // ----- Categories -----
    private static function handleCategories(string $method, ?string $id, Controller $ctrl): void {
        if ($method === 'GET') {
            $ctrl->handleCategories('GET', null);
        }
        elseif ($method === 'POST') {
            $ctrl->handleCategories('POST', null);
        }
        elseif ($method === 'PUT' && $id !== null) {
            $ctrl->handleCategories('PUT', (int)$id);
        }
        elseif ($method === 'DELETE' && $id !== null) {
            $ctrl->handleCategories('DELETE', (int)$id);
        }
        else {
            error('Method not allowed for categories', 405);
        }
    }
    
    // ----- Eras -----
    private static function handleEras(string $method, ?string $id, Controller $ctrl): void {
        if ($method === 'GET') {
            $ctrl->handleEras('GET', null);
        }
        elseif ($method === 'POST') {
            $ctrl->handleEras('POST', null);
        }
        elseif ($method === 'PUT' && $id !== null) {
            $ctrl->handleEras('PUT', (int)$id);
        }
        elseif ($method === 'DELETE' && $id !== null) {
            $ctrl->handleEras('DELETE', (int)$id);
        }
        else {
            error('Method not allowed for eras', 405);
        }
    }
    
    // ----- Orders -----
    private static function handleOrders(string $method, ?string $id, Controller $ctrl): void {
        if ($method === 'GET') {
            $ctrl->handleOrders('GET', null);
        }
        elseif ($method === 'PUT' && $id !== null) {
            $ctrl->handleOrders('PUT', (int)$id);
        }
        else {
            error('Method not allowed for orders', 405);
        }
    }
    
    // ----- Discounts -----
    private static function handleDiscounts(string $method, ?string $id, Controller $ctrl): void {
        if ($method === 'GET') {
            $ctrl->handleDiscounts('GET', null);
        }
        elseif ($method === 'POST') {
            $ctrl->handleDiscounts('POST', null);
        }
        elseif ($method === 'DELETE' && $id !== null) {
            $ctrl->handleDiscounts('DELETE', (int)$id);
        }
        else {
            error('Method not allowed for discounts', 405);
        }
    }
    
    // ----- Users -----
    private static function handleUsers(string $method, ?string $id, Controller $ctrl): void {
        if ($method === 'GET') {
            if ($id !== null) {
                $_GET['id'] = $id;
            }
            $ctrl->handleUsers('GET', $id ? (int)$id : null);
        }
        elseif ($method === 'PUT' && $id !== null) {
            $ctrl->handleUsers('PUT', (int)$id);
        }
        elseif ($method === 'DELETE' && $id !== null) {
            $ctrl->handleUsers('DELETE', (int)$id);
        }
        else {
            error('Method not allowed for users', 405);
        }
    }
}