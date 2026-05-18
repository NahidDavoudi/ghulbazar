<?php
// ================================================================
//  Ghul Bazar — admin_api.php (پنل مدیریت)
//  ONLY admin endpoints. Requires valid admin JWT token.
//
//  Endpoints:
//    ?endpoint=products    POST, PUT, DELETE, ?action=upload-image
//    ?endpoint=categories  POST, PUT, DELETE
//    ?endpoint=eras        POST, PUT, DELETE
//    ?endpoint=orders      PUT (status), GET (list with filters)
//    ?endpoint=discounts   POST, DELETE
//    ?endpoint=admin       GET (stats)
//    ?endpoint=users       GET, PUT, DELETE
// ================================================================

header('Content-Type: application/json; charset=utf-8');
$allowedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $allowedOrigin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── CONFIG ──
define('DB_HOST',    'localhost');
define('DB_NAME',    'nadstore');
define('DB_USER',    'root');
define('DB_PASS',    '');
define('DB_CHARSET', 'utf8mb4');
define('JWT_SECRET', 'CHANGE_THIS_TO_SOMETHING_RANDOM_IN_PRODUCTION');

// ── DB ──
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ── HELPERS ──
function respond(mixed $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function error(string $msg, int $code = 400): void {
    respond(['error' => $msg], $code);
}
function body(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
function get(string $key, mixed $default = null): mixed {
    return $_GET[$key] ?? $default;
}

// ── JWT ──
function b64e(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function b64d(string $d): string { return base64_decode(strtr($d, '-_', '+/')); }

function jwt_make(array $payload): string {
    $h = b64e(json_encode(['alg'=>'HS256','typ'=>'JWT']));
    $p = b64e(json_encode($payload));
    $s = b64e(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    return "$h.$p.$s";
}
function jwt_parse(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    if (!hash_equals(b64e(hash_hmac('sha256', "$h.$p", JWT_SECRET, true)), $s)) return null;
    $data = json_decode(b64d($p), true);
    if (isset($data['exp']) && $data['exp'] < time()) return null;
    return $data;
}
function auth_user(): ?array {
    $h = '';
    
    // 1. تلاش با getallheaders() (بیشترین سازگاری)
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $h = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    // 2. اگر پیدا نشد، از متغیرهای سرور
    if (empty($h)) {
        $h = $_SERVER['HTTP_AUTHORIZATION'] 
          ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
          ?? '';
    }
    
    // 3. روش کمکی: سرور برخی هاست‌ها با پیشوند HTTP_ و پسوند AUTHORIZATION
    if (empty($h)) {
        foreach ($_SERVER as $key => $value) {
            if (stripos($key, 'AUTHORIZATION') !== false) {
                $h = $value;
                break;
            }
        }
    }
    
    if (!str_starts_with($h, 'Bearer ')) {
        return null;
    }
    
    return jwt_parse(trim(substr($h, 7)));
}
function require_admin(): array {
    $u = auth_user();
    if (!$u) error('Unauthorized', 401);
    if ($u['role'] !== 'admin') error('Forbidden - Admin access required', 403);
    return $u;
}

// ── ROUTER ──
$endpoint = get('endpoint', '');
$method   = $_SERVER['REQUEST_METHOD'];

match($endpoint) {
    'auth'       => handle_auth($method),
    'products'   => handle_products_admin($method),
    'categories' => handle_categories_admin($method),
    'eras'       => handle_eras_admin($method),
    'orders'     => handle_orders_admin($method),
    'discounts'  => handle_discounts_admin($method),
    'admin'      => handle_admin_stats($method),
    'users'      => handle_users_admin($method),
    'chart_data' => handle_chart_data($method),
    default      => error('Endpoint not found', 404),
};

// ================================================================
//  AUTH
// ================================================================
function handle_auth(string $method): void {
    $action = get('action', '');

    // POST login
    if ($method === 'POST' && $action === 'login') {
        $b = body();
        if (empty($b['phone']) || empty($b['password'])) error('phone and password required');

        $stmt = db()->prepare('SELECT * FROM users WHERE phone = ?');
        $stmt->execute([$b['phone']]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($b['password'], $user['password_hash'])) {
            error('Invalid credentials', 401);
        }

        // Check if user is admin
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
            'user'  => [
                'id'    => $user['id'],
                'name'  => $user['name'],
                'phone' => $user['phone'],
                'role'  => $user['role']
            ]
        ]);
    }

    // GET me (اطلاعات کاربر جاری)
    if ($method === 'GET' && $action === 'me') {
        $u = auth_user();
        if (!$u) error('Unauthorized', 401);

        $stmt = db()->prepare('SELECT id, name, phone, role, created_at FROM users WHERE id = ?');
        $stmt->execute([$u['sub']]);
        $user = $stmt->fetch();
        if (!$user) error('User not found', 404);

        respond($user);
    }

    error('Unknown auth action', 400);
}

// ================================================================
//  PRODUCTS (ادمین)
// ================================================================
function handle_products_admin(string $method){
    if ($method === 'GET') {
        require_admin();
        $where  = ['1=1'];
        $params = [];
        if ($cat = get('category'))  { $where[] = 'p.category_id = ?';   $params[] = (int)$cat; }
        if ($era = get('era'))        { $where[] = 'p.era LIKE ?';        $params[] = "%$era%"; }
        if ($q = get('q'))            { $where[] = '(p.name LIKE ? OR p.description LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
        $sort = match(get('sort')) {
            'price_asc' => 'p.price ASC', 'price_desc' => 'p.price DESC',
            'newest' => 'p.created_at DESC', default => 'p.id DESC',
        };
        $limit  = min((int)get('limit', 20), 100);
        $offset = ((int)get('page', 1) - 1) * $limit;
        $whereSQL = implode(' AND ', $where);

        $stmt = db()->prepare("
            SELECT p.*, c.name AS category_name,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE $whereSQL
            ORDER BY $sort
            LIMIT $limit OFFSET $offset
        ");
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // Get all images for each product
        $imagesStmt = db()->prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id');
        foreach ($products as &$product) {
            $imagesStmt->execute([$product['id']]);
            $product['images'] = $imagesStmt->fetchAll();
        }
        unset($product);

        $countStmt = db()->prepare("SELECT COUNT(*) FROM products p WHERE $whereSQL");
        $countStmt->execute($params);
        respond([
            'data'  => $products,
            'total' => (int)$countStmt->fetchColumn(),
            'page'  => (int)get('page', 1),
            'limit' => $limit,
        ]);
    }

    // آپلود تصویر
    if ($method === 'POST' && get('action') === 'upload-image') {
        require_admin();
        $productId = (int)get('id', 0);
        if (!$productId) error('product id is required');

        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            error('No image uploaded', 400);
        }
        $file = $_FILES['image'];
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file['type'], $allowed)) {
            error('Invalid image type. Allowed: jpeg, png, webp', 400);
        }
        
        // Create uploads directory if not exists
        if (!is_dir('uploads')) {
            mkdir('uploads', 0755, true);
        }
        
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid('prod_') . '.' . $ext;
        $dest = 'uploads/' . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            error('Failed to upload image', 500);
        }
        
        $isMain = (int)($_POST['is_main'] ?? 0);
        $sortOrder = (int)($_POST['sort_order'] ?? 0);

        db()->prepare('INSERT INTO product_images (product_id, image_url, is_main, sort_order) VALUES (?, ?, ?, ?)')
            ->execute([$productId, '/uploads/' . $filename, $isMain, $sortOrder]);

        respond(['message' => 'Image uploaded', 'url' => '/uploads/' . $filename], 201);
    }
    
    // Delete image
    if ($method === 'DELETE' && get('action') === 'delete-image') {
        require_admin();
        $imageId = (int)get('image_id', 0);
        if (!$imageId) error('image_id is required');
        
        $stmt = db()->prepare('SELECT * FROM product_images WHERE id = ?');
        $stmt->execute([$imageId]);
        $image = $stmt->fetch();
        
        if (!$image) error('Image not found', 404);
        
        // Delete file
        $filepath = ltrim($image['image_url'], '/');
        if (file_exists($filepath)) {
            unlink($filepath);
        }
        
        db()->prepare('DELETE FROM product_images WHERE id = ?')->execute([$imageId]);
        respond(['message' => 'Image deleted']);
    }

    $id = get('id');
    // POST create
    if ($method === 'POST') {
        require_admin();
        $b = body();
        if (empty($b['name']) || empty($b['price'])) error('name and price are required');
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $b['name']), '-'));

        db()->prepare('
            INSERT INTO products (name, slug, description, price, category_id, era, material, badge, stock, featured, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ')->execute([
            $b['name'], $slug, $b['description'] ?? '', $b['price'],
            !empty($b['category_id']) ? (int)$b['category_id'] : null,
            $b['era'] ?? '', $b['material'] ?? '',
            $b['badge'] ?? null, $b['stock'] ?? 1, $b['featured'] ?? 0,
        ]);
        
        $productId = (int)db()->lastInsertId();
        respond(['id' => $productId, 'message' => 'Product created'], 201);
    }

    // PUT update
    if ($method === 'PUT') {
        require_admin();
        if (!$id) error('id is required');
        $b = body();
        $fields = [];
        $params = [];
        foreach (['name','description','price','era','material','category_id','badge','stock','featured'] as $f) {
            if (array_key_exists($f, $b)) { $fields[] = "$f = ?"; $params[] = $b[$f]; }
        }
        if (!$fields) error('Nothing to update');
        $params[] = $id;
        db()->prepare('UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        respond(['message' => 'Product updated']);
    }

    // DELETE (soft delete)
    if ($method === 'DELETE' && !get('action')) {
        require_admin();
        if (!$id) error('id is required');
        db()->prepare('UPDATE products SET stock = 0 WHERE id = ?')->execute([$id]);
        respond(['message' => 'Product removed']);
    }

    error('Method not allowed', 405);
}

// ================================================================
//  CATEGORIES (ادمین)
// ================================================================
function handle_categories_admin(string $method): void {
    if ($method === 'GET') {
        require_admin();
        $stmt = db()->query('SELECT id, name, slug FROM categories ORDER BY id');
        $categories = $stmt->fetchAll();
        respond($categories);
    }
    if ($method === 'POST') {
        require_admin();
        $b = body();
        if (empty($b['name'])) error('name is required');
        $slug = $b['slug'] ?? strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $b['name']), '-'));
        db()->prepare('INSERT INTO categories (name, slug) VALUES (?, ?)')->execute([$b['name'], $slug]);
        respond(['id' => (int)db()->lastInsertId(), 'message' => 'Category created'], 201);
    }
    if ($method === 'PUT') {
        require_admin();
        $id = get('id');
        if (!$id) error('id is required');
        $b = body();
        $fields = [];
        $params = [];
        if (isset($b['name'])) { $fields[] = 'name = ?'; $params[] = $b['name']; }
        if (isset($b['slug'])) { $fields[] = 'slug = ?'; $params[] = $b['slug']; }
        if (!$fields) error('Nothing to update');
        $params[] = $id;
        db()->prepare('UPDATE categories SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        respond(['message' => 'Category updated']);
    }
    if ($method === 'DELETE') {
        require_admin();
        $id = get('id');
        if (!$id) error('id is required');
        db()->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
        respond(['message' => 'Category deleted']);
    }
    error('Method not allowed', 405);
}

// ================================================================
//  ERAS (ادمین)
// ================================================================
function handle_eras_admin(string $method): void {
    if ($method === 'POST') {
        require_admin();
        $b = body();
        if (empty($b['name'])) error('name is required');
        $slug = $b['slug'] ?? strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $b['name']), '-'));
        db()->prepare('INSERT INTO eras (name, slug) VALUES (?, ?)')->execute([$b['name'], $slug]);
        respond(['id' => (int)db()->lastInsertId(), 'message' => 'Era created'], 201);
    }

    if ($method === 'PUT') {
        require_admin();
        $id = get('id');
        if (!$id) error('id is required');
        $b = body();
        $fields = [];
        $params = [];
        if (isset($b['name'])) { $fields[] = 'name = ?'; $params[] = $b['name']; }
        if (isset($b['slug'])) { $fields[] = 'slug = ?'; $params[] = $b['slug']; }
        if (!$fields) error('Nothing to update');
        $params[] = $id;
        db()->prepare('UPDATE eras SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        respond(['message' => 'Era updated']);
    }

    if ($method === 'DELETE') {
        require_admin();
        $id = get('id');
        if (!$id) error('id is required');
        db()->prepare('DELETE FROM eras WHERE id = ?')->execute([$id]);
        respond(['message' => 'Era deleted']);
    }

    error('Method not allowed', 405);
}

// ================================================================
//  ORDERS (ادمین)
// ================================================================
function handle_orders_admin(string $method): void {
    if ($method === 'PUT') {
        require_admin();
        $orderId = get('id');
        if (!$orderId) error('id is required');
        $b = body();
        $allowed = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
        if (!in_array($b['status'] ?? '', $allowed)) error('Invalid status');
        db()->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$b['status'], $orderId]);
        respond(['message' => 'Order updated']);
    }

    // GET لیست سفارشات با فیلترهای ادمین
    if ($method === 'GET') {
        require_admin();
        $status    = get('status');
        $search    = get('search');
        $startDate = get('start_date');
        $endDate   = get('end_date');

        $where = ['1=1'];
        $params = [];

        if ($status) {
            $where[] = 'o.status = ?';
            $params[] = $status;
        }
        if ($search) {
            $where[] = '(o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.order_number LIKE ?)';
            $searchTerm = "%$search%";
            $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
        }
        if ($startDate) {
            $where[] = 'DATE(o.created_at) >= ?';
            $params[] = $startDate;
        }
        if ($endDate) {
            $where[] = 'DATE(o.created_at) <= ?';
            $params[] = $endDate;
        }

        $limit  = min((int)get('limit', 20), 100);
        $page   = (int)get('page', 1);
        $offset = ($page - 1) * $limit;
        $whereSQL = implode(' AND ', $where);

        $stmt = db()->prepare("
            SELECT o.*, u.name AS user_name
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE $whereSQL
            ORDER BY o.created_at DESC
            LIMIT $limit OFFSET $offset
        ");
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        $countStmt = db()->prepare("SELECT COUNT(*) FROM orders o WHERE $whereSQL");
        $countStmt->execute($params);
        $totalCount = (int)$countStmt->fetchColumn();

        $itemsStmt = db()->prepare('
            SELECT oi.product_id, p.name,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
        ');
        foreach ($orders as &$o) {
            $itemsStmt->execute([$o['id']]);
            $o['items'] = $itemsStmt->fetchAll();
        }
        unset($o);

        respond([
            'data'  => $orders,
            'total' => $totalCount,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    error('Method not allowed', 405);
}

// ================================================================
//  DISCOUNTS (ادمین)
// ================================================================
function handle_discounts_admin(string $method): void {
    if ($method === 'GET') {
        // برگرداندن همهٔ کدهای تخفیف (حتی غیرفعال‌ها)
        $stmt = db()->query('SELECT id, code, type, value, valid_from, valid_to, is_active, created_at FROM discount_codes ORDER BY created_at DESC');
        $discounts = $stmt->fetchAll();
        respond($discounts);
    }

    if ($method === 'POST') {
        require_admin();
        $b = body();
        if (empty($b['code']) || empty($b['type']) || !isset($b['value'])) error('code, type, value required');
        db()->prepare('INSERT INTO discount_codes (code, type, value, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?, 1)')
            ->execute([$b['code'], $b['type'], $b['value'], $b['valid_from'], $b['valid_to']]);
        respond(['id' => (int)db()->lastInsertId(), 'message' => 'Discount code created'], 201);
    }

    if ($method === 'DELETE') {
        require_admin();
        $id = get('id');
        if (!$id) error('id is required');
        db()->prepare('UPDATE discount_codes SET is_active = 0 WHERE id = ?')->execute([$id]);
        respond(['message' => 'Discount code deactivated']);
    }

    error('Method not allowed', 405);
}
// ================================================================
//  ADMIN STATS
// ================================================================
function handle_admin_stats(string $method): void {
    if ($method !== 'GET') error('Method not allowed', 405);
    require_admin();
    $totalProducts   = db()->query('SELECT COUNT(*) FROM products')->fetchColumn();
    $totalCategories = db()->query('SELECT COUNT(*) FROM categories')->fetchColumn();
    $totalUsers      = db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $totalOrders     = db()->query('SELECT COUNT(*) FROM orders')->fetchColumn();
    $revenue         = db()->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status IN ('paid','shipped','delivered')")->fetchColumn();
    $todayOrders     = db()->query("SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()")->fetchColumn();
    $pendingOrders   = db()->query("SELECT COUNT(*) FROM orders WHERE status='pending'")->fetchColumn();
    $lowStock        = db()->query("SELECT COUNT(*) FROM products WHERE stock < 5 AND stock > 0")->fetchColumn();

    respond([
        'total_products'   => (int)$totalProducts,
        'total_categories' => (int)$totalCategories,
        'total_users'      => (int)$totalUsers,
        'total_orders'     => (int)$totalOrders,
        'total_revenue'    => (int)$revenue,
        'today_orders'     => (int)$todayOrders,
        'pending_orders'   => (int)$pendingOrders,
        'low_stock_items'  => (int)$lowStock,
    ]);
}

// ================================================================
//  USERS (ادمین)
// ================================================================
function handle_users_admin(string $method): void {
    require_admin();

    if ($method === 'GET') {
        $id = get('id');
        if ($id) {
            $stmt = db()->prepare('SELECT id, name, phone, role, created_at FROM users WHERE id = ?');
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            if (!$user) error('User not found', 404);
            respond($user);
        }
        $limit  = min((int)get('limit', 20), 100);
        $page   = (int)get('page', 1);
        $offset = ($page - 1) * $limit;
        $stmt = db()->prepare("SELECT id, name, phone, role, created_at FROM users ORDER BY id DESC LIMIT $limit OFFSET $offset");
        $stmt->execute();
        $users = $stmt->fetchAll();
        $total = db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
        respond(['data' => $users, 'total' => (int)$total, 'page' => $page, 'limit' => $limit]);
    }

    if ($method === 'PUT') {
        $id = get('id');
        if (!$id) error('id is required');
        $b = body();
        $fields = [];
        $params = [];
        if (isset($b['role'])) {
            if (!in_array($b['role'], ['user','admin'])) error('Invalid role');
            $fields[] = 'role = ?';
            $params[] = $b['role'];
        }
        if (!$fields) error('Nothing to update');
        $params[] = $id;
        db()->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        respond(['message' => 'User updated']);
    }

    if ($method === 'DELETE') {
        $id = get('id');
        if (!$id) error('id is required');
        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        respond(['message' => 'User deleted']);
    }

    error('Method not allowed', 405);
}

// ================================================================
//  CHART DATA
// ================================================================
function handle_chart_data(string $method): void {
    if ($method !== 'GET') error('Method not allowed', 405);
    require_admin();

    // ۱. وضعیت سفارش‌ها (نمودار دایره‌ای)
    $statuses = db()->query("
        SELECT status, COUNT(*) as count
        FROM orders
        GROUP BY status
    ")->fetchAll();

    $orderStatus = [];
    $statusLabels = [
        'pending'   => 'در انتظار',
        'paid'      => 'پرداخت شده',
        'shipped'   => 'ارسال شده',
        'delivered' => 'تحویل داده',
        'cancelled' => 'لغو شده',
    ];
    foreach ($statuses as $row) {
        $label = $statusLabels[$row['status']] ?? $row['status'];
        $orderStatus[$label] = (int)$row['count'];
    }

    // ۲. درآمد ۷ روز اخیر (نمودار خطی)
    $weeklyRevenue = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $revenue = db()->prepare("
            SELECT COALESCE(SUM(total_amount),0)
            FROM orders
            WHERE DATE(created_at) = ?
              AND status IN ('paid','shipped','delivered')
        ");
        $revenue->execute([$date]);
        $amount = (int)$revenue->fetchColumn();

        $formattedDate = date('m/d', strtotime($date));
        $weeklyRevenue[] = [
            'date'   => $formattedDate,
            'amount' => $amount,
        ];
    }

    respond([
        'order_status'   => $orderStatus,
        'weekly_revenue' => $weeklyRevenue,
    ]);
}