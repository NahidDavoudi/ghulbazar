<?php
// Controller.php - Handles all API endpoint requests

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Repository.php';
require_once __DIR__ . '/Services.php';

class Controller {
    private Repository $repo;
    private Services $services;
    
    public function __construct() {
        $this->repo = new Repository();
        $this->services = new Services();
    }
    
    // ---------- Auth Endpoints ----------
    public function handleAuth(string $method, string $action): void {
        if ($method === 'POST' && $action === 'login') {
            $data = body();
            if (empty($data['phone']) || empty($data['password'])) {
                error('phone and password required');
            }
            $user = $this->repo->findUserByPhone($data['phone']);
            if (!$user || !password_verify($data['password'], $user['password_hash'])) {
                error('Invalid credentials', 401);
            }
            if ($user['role'] !== 'admin') {
                error('Access denied. Admin privileges required.', 403);
            }
            $token = jwt_make([
                'sub'  => $user['id'],
                'role' => $user['role'],
                'exp'  => time() + 86400 * 30
            ]);
            respond([
                'token' => $token,
                'user' => [
                    'id'    => $user['id'],
                    'name'  => $user['name'],
                    'phone' => $user['phone'],
                    'role'  => $user['role']
                ]
            ]);
        }
        elseif ($method === 'GET' && $action === 'me') {
            $auth = require_admin();
            $user = $this->repo->getUserById($auth['sub']);
            if (!$user) error('User not found', 404);
            respond($user);
        }
        else {
            error('Unknown auth action', 400);
        }
    }
    
    // ---------- Products ----------
    public function handleProducts(string $method, ?int $id, ?string $action): void {
        if ($method === 'GET') {
            require_admin();
            $filters = [
                'category' => get('category'),
                'era'      => get('era'),
                'q'        => get('q'),
                'sort'     => get('sort')
            ];
            $page  = max(1, (int)get('page', 1));
            $limit = min((int)get('limit', 20), 100);
            $result = $this->repo->getProducts($filters, $page, $limit);
            respond([
                'data'  => $result['data'],
                'total' => $result['total'],
                'page'  => $page,
                'limit' => $limit
            ]);
        }
        elseif ($method === 'POST' && $action === 'upload-image') {
            require_admin();
            $productId = (int)get('id', 0);
            if (!$productId) error('product id is required');
            if (!isset($_FILES['image'])) error('No image uploaded', 400);
            $isMain    = (int)($_POST['is_main'] ?? 0);
            $sortOrder = (int)($_POST['sort_order'] ?? 0);
            $result = $this->services->uploadProductImage($productId, $_FILES['image'], $isMain, $sortOrder);
            respond($result, 201);
        }
        elseif ($method === 'DELETE' && $action === 'delete-image') {
            require_admin();
            $imageId = (int)get('image_id', 0);
            if (!$imageId) error('image_id is required');
            $this->services->deleteProductImage($imageId);
            respond(['message' => 'Image deleted']);
        }
        elseif ($method === 'POST' && $action === null) {
            require_admin();
            $data = body();
            if (empty($data['name']) || empty($data['price'])) error('name and price are required');
            $id = $this->repo->createProduct($data);
            respond(['id' => $id, 'message' => 'Product created'], 201);
        }
        elseif ($method === 'PUT') {
            require_admin();
            if (!$id) error('id is required');
            $fields = body();
            $this->repo->updateProduct($id, $fields);
            respond(['message' => 'Product updated']);
        }
        elseif ($method === 'DELETE' && $action === null) {
            require_admin();
            if (!$id) error('id is required');
            $this->repo->softDeleteProduct($id);
            respond(['message' => 'Product removed']);
        }
        else {
            error('Method not allowed', 405);
        }
    }
    
    // ---------- Categories ----------
    public function handleCategories(string $method, ?int $id): void {
        if ($method === 'GET') {
            require_admin();
            respond($this->repo->getAllCategories());
        }
        elseif ($method === 'POST') {
            require_admin();
            $data = body();
            if (empty($data['name'])) error('name is required');
            $slug = $data['slug'] ?? strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $data['name']), '-'));
            $newId = $this->repo->createCategory($data['name'], $slug);
            respond(['id' => $newId, 'message' => 'Category created'], 201);
        }
        elseif ($method === 'PUT') {
            require_admin();
            if (!$id) error('id is required');
            $fields = body();
            $this->repo->updateCategory($id, $fields);
            respond(['message' => 'Category updated']);
        }
        elseif ($method === 'DELETE') {
            require_admin();
            if (!$id) error('id is required');
            $this->repo->deleteCategory($id);
            respond(['message' => 'Category deleted']);
        }
        else {
            error('Method not allowed', 405);
        }
    }
    
    // ---------- Eras ----------
    public function handleEras(string $method, ?int $id): void {
        if ($method === 'GET') {
            require_admin();
            respond($this->repo->getAllEras());
        }
        elseif ($method === 'POST') {
            require_admin();
            $data = body();
            if (empty($data['name'])) error('name is required');
            $slug = $data['slug'] ?? strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $data['name']), '-'));
            $newId = $this->repo->createEra($data['name'], $slug);
            respond(['id' => $newId, 'message' => 'Era created'], 201);
        }
        elseif ($method === 'PUT') {
            require_admin();
            if (!$id) error('id is required');
            $fields = body();
            $this->repo->updateEra($id, $fields);
            respond(['message' => 'Era updated']);
        }
        elseif ($method === 'DELETE') {
            require_admin();
            if (!$id) error('id is required');
            $this->repo->deleteEra($id);
            respond(['message' => 'Era deleted']);
        }
        else {
            error('Method not allowed', 405);
        }
    }
    
    // ---------- Orders ----------
    public function handleOrders(string $method, ?int $id): void {
        if ($method === 'PUT') {
            require_admin();
            if (!$id) error('id is required');
            $data = body();
            $allowed = ['pending','paid','shipped','delivered','cancelled'];
            if (!in_array($data['status'] ?? '', $allowed)) error('Invalid status');
            $this->repo->updateOrderStatus($id, $data['status']);
            respond(['message' => 'Order updated']);
        }
        elseif ($method === 'GET') {
            require_admin();
            $filters = [
                'status'     => get('status'),
                'search'     => get('search'),
                'start_date' => get('start_date'),
                'end_date'   => get('end_date')
            ];
            $page  = max(1, (int)get('page', 1));
            $limit = min((int)get('limit', 20), 100);
            $result = $this->repo->getOrders($filters, $page, $limit);
            respond([
                'data'  => $result['data'],
                'total' => $result['total'],
                'page'  => $page,
                'limit' => $limit
            ]);
        }
        else {
            error('Method not allowed', 405);
        }
    }
    
    // ---------- Discounts ----------
    public function handleDiscounts(string $method, ?int $id): void {
        if ($method === 'GET') {
            // Anyone with admin token can view discounts
            require_admin();
            respond($this->repo->getAllDiscounts());
        }
        elseif ($method === 'POST') {
            require_admin();
            $data = body();
            if (empty($data['code']) || empty($data['type']) || !isset($data['value'])) {
                error('code, type, value required');
            }
            $newId = $this->repo->createDiscount($data);
            respond(['id' => $newId, 'message' => 'Discount code created'], 201);
        }
        elseif ($method === 'DELETE') {
            require_admin();
            if (!$id) error('id is required');
            $this->repo->deactivateDiscount($id);
            respond(['message' => 'Discount code deactivated']);
        }
        else {
            error('Method not allowed', 405);
        }
    }
    
    // ---------- Admin Stats ----------
    public function handleAdminStats(): void {
        require_admin();
        respond($this->repo->getAdminStats());
    }
    
    // ---------- Users ----------
    public function handleUsers(string $method, ?int $id): void {
        require_admin();
        if ($method === 'GET') {
            if ($id) {
                $user = $this->repo->getUserById($id);
                if (!$user) error('User not found', 404);
                respond($user);
            } else {
                $page  = max(1, (int)get('page', 1));
                $limit = min((int)get('limit', 20), 100);
                $result = $this->repo->getUsers($page, $limit);
                respond($result);
            }
        }
        elseif ($method === 'PUT') {
            if (!$id) error('id is required');
            $data = body();
            if (isset($data['role'])) {
                if (!in_array($data['role'], ['user','admin'])) error('Invalid role');
                $this->repo->updateUserRole($id, $data['role']);
                respond(['message' => 'User updated']);
            } else {
                error('Nothing to update');
            }
        }
        elseif ($method === 'DELETE') {
            if (!$id) error('id is required');
            $this->repo->deleteUser($id);
            respond(['message' => 'User deleted']);
        }
        else {
            error('Method not allowed', 405);
        }
    }
    
    // ---------- Chart Data ----------
    public function handleChartData(): void {
        require_admin();
        respond([
            'order_status'   => $this->repo->getOrderStatusCounts(),
            'weekly_revenue' => $this->repo->getWeeklyRevenue()
        ]);
    }
}