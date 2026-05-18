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

    // ---------- User Auth (register / login / profile) ----------
    public function handleUserAuth(string $method, string $action): void {
        if ($method === 'POST' && $action === 'register') {
            $data = body();
            if (empty($data['name']) || empty($data['phone']) || empty($data['password'])) {
                error('name, phone and password required');
            }
            if (strlen($data['password']) < 6) error('Password must be at least 6 characters');
            if ($this->repo->phoneExists($data['phone'])) error('Phone already registered', 409);

            $id = $this->repo->createUser($data['name'], $data['phone'], password_hash($data['password'], PASSWORD_DEFAULT));
            $token = jwt_make(['sub' => $id, 'role' => 'user', 'exp' => time() + 86400 * 30]);
            respond(['token' => $token, 'message' => 'Registered successfully'], 201);
        }
        elseif ($method === 'POST' && $action === 'login') {
            $data = body();
            if (empty($data['phone']) || empty($data['password'])) error('phone and password required');
            $user = $this->repo->findUserByPhone($data['phone']);
            if (!$user || !password_verify($data['password'], $user['password_hash'])) {
                error('Invalid credentials', 401);
            }
            $token = jwt_make(['sub' => $user['id'], 'role' => $user['role'], 'exp' => time() + 86400 * 30]);
            respond([
                'token' => $token,
                'user'  => ['id' => $user['id'], 'name' => $user['name'], 'phone' => $user['phone'], 'role' => $user['role']]
            ]);
        }
        elseif ($method === 'GET' && $action === 'me') {
            $u = auth_user();
            if (!$u) error('Unauthorized', 401);
            $user = $this->repo->getUserById($u['sub']);
            if (!$user) error('User not found', 404);
            respond($user);
        }
        elseif ($method === 'PUT' && $action === 'profile') {
            $u = auth_user();
            if (!$u) error('Unauthorized', 401);
            $data = body();
            // فقط name و password قابل تغییره
            $updates = [];
            $params  = [];
            if (!empty($data['name']))     { $updates[] = 'name = ?';          $params[] = $data['name']; }
            if (!empty($data['password'])) { $updates[] = 'password_hash = ?'; $params[] = password_hash($data['password'], PASSWORD_DEFAULT); }
            if (empty($updates)) error('Nothing to update');
            $params[] = $u['sub'];
            db()->prepare("UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
            respond(['message' => 'Profile updated']);
        }
        else {
            error('Unknown user auth action', 400);
        }
    }

    // ---------- Public Products ----------
    public function handlePublicProducts(string $method, ?string $slug): void {
        if ($method !== 'GET') error('Method not allowed', 405);

        if ($slug) {
            $product = $this->repo->getPublicProductBySlug($slug);
            if (!$product) error('Product not found', 404);
            // reviews
            $product['reviews_list'] = $this->repo->getProductReviews($product['id']);
            respond($product);
        } else {
            $filters = [
                'category'  => get('category'),
                'era'       => get('era'),
                'q'         => get('q'),
                'sort'      => get('sort'),
                'min_price' => get('min_price'),
                'max_price' => get('max_price'),
                'featured'  => get('featured'),
            ];
            $page  = max(1, (int)get('page', 1));
            $limit = min((int)get('limit', 20), 50);
            $result = $this->repo->getPublicProducts($filters, $page, $limit);
            respond(['data' => $result['data'], 'total' => $result['total'], 'page' => $page, 'limit' => $limit]);
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
    
    // ---------- Cart ----------
    public function handleCart(string $method, ?int $itemId): void {
        $u = auth_user();
        if (!$u) error('Unauthorized', 401);

        if ($method === 'GET') {
            respond($this->repo->getCart($u['sub']));
        }
        elseif ($method === 'POST') {
            $data = body();
            if (empty($data['product_id'])) error('product_id required');
            $product = $this->repo->getProductById((int)$data['product_id']);
            if (!$product) error('Product not found', 404);
            $qty = max(1, (int)($data['quantity'] ?? 1));
            if ($product['stock'] < $qty) error('Not enough stock');
            $id = $this->repo->addToCart($u['sub'], $product['id'], $qty, isset($data['selected_options']) ? json_encode($data['selected_options']) : null);
            respond(['message' => 'Added to cart', 'item_id' => $id], 201);
        }
        elseif ($method === 'PUT') {
            if (!$itemId) error('item id required');
            $data = body();
            if (!isset($data['quantity'])) error('quantity required');
            $ok = $this->repo->updateCartItem($itemId, $u['sub'], (int)$data['quantity']);
            if (!$ok) error('Item not found', 404);
            respond(['message' => 'Cart updated']);
        }
        elseif ($method === 'DELETE') {
            if ($itemId) {
                $ok = $this->repo->removeCartItem($itemId, $u['sub']);
                if (!$ok) error('Item not found', 404);
                respond(['message' => 'Item removed']);
            } else {
                $this->repo->clearCart($u['sub']);
                respond(['message' => 'Cart cleared']);
            }
        }
        else {
            error('Method not allowed', 405);
        }
    }

    // ---------- Addresses ----------
    public function handleAddresses(string $method, ?int $id): void {
        $u = auth_user();
        if (!$u) error('Unauthorized', 401);

        if ($method === 'GET') {
            if ($id) {
                $addr = $this->repo->getAddressById($id, $u['sub']);
                if (!$addr) error('Address not found', 404);
                respond($addr);
            } else {
                respond($this->repo->getUserAddresses($u['sub']));
            }
        }
        elseif ($method === 'POST') {
            $data = body();
            if (empty($data['address']) || empty($data['city']) || empty($data['zip_code'])) {
                error('address, city and zip_code required');
            }
            $newId = $this->repo->createAddress($u['sub'], $data);
            respond(['id' => $newId, 'message' => 'Address saved'], 201);
        }
        elseif ($method === 'PUT') {
            if (!$id) error('id required');
            $data = body();
            $ok = $this->repo->updateAddress($id, $u['sub'], $data);
            if (!$ok) error('Address not found', 404);
            respond(['message' => 'Address updated']);
        }
        elseif ($method === 'DELETE') {
            if (!$id) error('id required');
            $ok = $this->repo->deleteAddress($id, $u['sub']);
            if (!$ok) error('Address not found', 404);
            respond(['message' => 'Address deleted']);
        }
        else {
            error('Method not allowed', 405);
        }
    }

    // ---------- Checkout ----------
    public function handleCheckout(): void {
        $u = auth_user();
        if (!$u) error('Unauthorized', 401);

        $data = body();

        // آدرس: می‌تونه از address_id یا inline بیاد
        $shippingAddress = '';
        if (!empty($data['address_id'])) {
            $addr = $this->repo->getAddressById((int)$data['address_id'], $u['sub']);
            if (!$addr) error('Address not found', 404);
            $shippingAddress = "{$addr['recipient_name']} - {$addr['city']} - {$addr['address']} - {$addr['zip_code']}";
        } elseif (!empty($data['shipping_address'])) {
            $shippingAddress = $data['shipping_address'];
        } else {
            error('shipping_address or address_id required');
        }

        if (empty($data['customer_name'])) error('customer_name required');
        if (empty($data['customer_phone'])) error('customer_phone required');

        // آیتم‌های سبد
        $cart = $this->repo->getCart($u['sub']);
        if (empty($cart['items'])) error('Cart is empty');

        // اعمال تخفیف
        $discountId = null;
        $total = $cart['total'];
        if (!empty($data['discount_code'])) {
            $discount = $this->repo->findActiveDiscount($data['discount_code']);
            if (!$discount) error('Invalid or expired discount code');
            $discountId = $discount['id'];
            if ($discount['type'] === 'percent') {
                $total = $total - ($total * $discount['value'] / 100);
            } else {
                $total = max(0, $total - $discount['value']);
            }
        }

        // ساخت سفارش
        $orderId = $this->repo->createOrder([
            'user_id'          => $u['sub'],
            'customer_name'    => $data['customer_name'],
            'customer_phone'   => $data['customer_phone'],
            'customer_email'   => $data['customer_email'] ?? '',
            'shipping_address' => $shippingAddress,
            'total_amount'     => (int)$total,
            'discount_code_id' => $discountId,
        ], array_map(fn($i) => [
            'product_id' => $i['product_id'],
            'quantity'   => $i['quantity'],
            'price'      => $i['price'],
        ], $cart['items']));

        // خالی کردن سبد بعد از ثبت سفارش
        $this->repo->clearCart($u['sub']);

        respond(['message' => 'Order placed', 'order_id' => $orderId], 201);
    }

    // ---------- User Orders ----------
    public function handleUserOrders(string $method, ?string $orderNumber): void {
        $u = auth_user();
        if (!$u) error('Unauthorized', 401);

        if ($method !== 'GET') error('Method not allowed', 405);

        if ($orderNumber) {
            $order = $this->repo->getUserOrderByNumber($orderNumber, $u['sub']);
            if (!$order) error('Order not found', 404);
            respond($order);
        } else {
            $page  = max(1, (int)get('page', 1));
            $limit = min((int)get('limit', 10), 50);
            respond($this->repo->getUserOrders($u['sub'], $page, $limit));
        }
    }

    // ---------- Reviews ----------
    public function handleReviews(string $method, ?int $productId, ?int $reviewId): void {
        if ($method === 'GET') {
            // public: نظرات تایید شده
            if (!$productId) error('product_id required');
            respond($this->repo->getProductReviews($productId));
        }
        elseif ($method === 'POST') {
            $u = auth_user();
            if (!$u) error('Unauthorized', 401);
            $data = body();
            if (!$productId) error('product_id required');
            if (empty($data['review'])) error('review text required');
            $rating = max(1, min(5, (int)($data['rating'] ?? 5)));

            if (!$this->repo->hasPurchasedProduct($u['sub'], $productId)) {
                error('You can only review products you have purchased', 403);
            }
            if ($this->repo->hasUserReviewedProduct($u['sub'], $productId)) {
                error('You have already reviewed this product', 409);
            }
            $id = $this->repo->createReview($productId, $u['sub'], $rating, $data['review']);
            respond(['message' => 'Review submitted, pending approval', 'id' => $id], 201);
        }
        // Admin actions
        elseif ($method === 'PUT') {
            require_admin();
            if (!$reviewId) error('review id required');
            $this->repo->approveReview($reviewId);
            respond(['message' => 'Review approved']);
        }
        elseif ($method === 'DELETE') {
            require_admin();
            if (!$reviewId) error('review id required');
            $this->repo->deleteReview($reviewId);
            respond(['message' => 'Review deleted']);
        }
        else {
            error('Method not allowed', 405);
        }
    }

    // ---------- Admin: Pending Reviews ----------
    public function handleAdminReviews(): void {
        require_admin();
        respond($this->repo->getPendingReviews());
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
