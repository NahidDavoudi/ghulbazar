<?php
// ================================================================
//  Ghul Bazar — api.php (نسخهٔ گسترش‌یافته برای پنل ادمین)
//  Single-file API. No external dependencies.
//
//  Endpoints:
//    ?endpoint=products        GET list, GET single (?id=x)
//                              POST create, PUT update, DELETE (admin)
//                              ?action=upload-image&id=x (POST, admin)
//    ?endpoint=categories      GET list
//                              POST create, PUT update, DELETE (admin)
//    ?endpoint=eras            GET list
//                              POST create, PUT update, DELETE (admin)
//    ?endpoint=cart            GET, POST, PUT, DELETE (session-based)
//    ?endpoint=orders          POST create, GET single (?number=x) [guest]
//                              GET single (?id=x) [auth], GET list [auth/admin]
//                              PUT update status (?id=x) [admin]
//    ?endpoint=auth&action=login     POST
//    ?endpoint=auth&action=register  POST
//    ?endpoint=auth&action=me        GET [auth]
//    ?endpoint=discounts&action=validate&code=X   GET
//                              POST create, DELETE deactivate (admin)
//    ?endpoint=admin&action=stats     GET (admin)   آمار داشبورد
//    ?endpoint=users            GET list/?id=x, PUT update, DELETE (admin)
// ================================================================

// ── CORS & Headers ────────────────────────────────────────────
$allowedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '*'; // امن‌تر: از متغیر ORIGIN استفاده کن
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: $allowedOrigin");
header('Access-Control-Allow-Credentials: true'); // برای ارسال کوکی (اختیاری)
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
// ── CONFIG ────────────────────────────────────────────────────
define('DB_HOST',    'localhost');
define('DB_NAME',    'ghulbazar');
define('DB_USER',    'root');
define('DB_PASS',    '');
define('DB_CHARSET', 'utf8mb4');
define('JWT_SECRET', 'CHANGE_THIS_TO_SOMETHING_RANDOM_IN_PRODUCTION');
define('SITE_URL',   'http://localhost/ghulbazar');

// ── DATABASE ─────────────────────────────────────────────────
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

// ── HELPERS ──────────────────────────────────────────────────
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

// ── JWT ──────────────────────────────────────────────────────
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
    // تلاش برای احراز هویت با JWT
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($h, 'Bearer ')) {
        $user = jwt_parse(substr($h, 7));
        if ($user) return $user;
    }

    // در غیر این صورت از سشن استفاده کن
    if (isset($_SESSION['user'])) {
        return [
            'sub'  => $_SESSION['user']['id'],
            'role' => $_SESSION['user']['role']
        ];
    }

    return null;
}
function require_auth(): array {
    $u = auth_user();
    if (!$u) error('Unauthorized', 401);
    return $u;
}
function require_admin(): array {
    $u = require_auth();
    if ($u['role'] !== 'admin') error('Forbidden', 403);
    return $u;
}

// ── ROUTER ───────────────────────────────────────────────────
$endpoint = get('endpoint', '');
$method   = $_SERVER['REQUEST_METHOD'];

match($endpoint) {
    'products'   => handle_products($method),
    'categories' => handle_categories($method),
    'eras'       => handle_eras($method),
    'cart'       => handle_cart($method),
    'orders'     => handle_orders($method),
    'auth'       => handle_auth($method),
    'discounts'  => handle_discounts($method),
    'admin'      => handle_admin($method),
    'users'      => handle_users($method),
    'upload_receipt'=> handle_upload_receipt(),   // ← اضافه کن
    default      => error('Endpoint not found', 404),
};

// ================================================================
//  PRODUCTS
// ================================================================
function handle_products(string $method): void {
    // ── آپلود تصویر (ادمین) ──
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

    $id = get('id');
    $featured = get('featured');

    // ── GET single ──
    if ($method === 'GET' && $id) {
        $stmt = db()->prepare('
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.id = ?
        ');
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        if (!$product) error('Product not found', 404);

        $img = db()->prepare('SELECT image_url AS url, is_main, sort_order FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC');
        $img->execute([$id]);
        $product['images'] = $img->fetchAll();

        $opt = db()->prepare('SELECT option_type, option_value FROM product_options WHERE product_id = ? ORDER BY id');
        $opt->execute([$id]);
        $product['options'] = $opt->fetchAll();

        db()->prepare('UPDATE products SET views = views + 1 WHERE id = ?')->execute([$id]);

        $rel = db()->prepare('
            SELECT p.id, p.name, p.slug, p.price, p.era, p.material,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
            FROM products p
            WHERE p.category_id = ? AND p.id != ? AND p.stock > 0
            LIMIT 4
        ');
        $rel->execute([$product['category_id'], $id]);
        $product['related'] = $rel->fetchAll();

        respond($product);
    }

    // ── GET featured ──
    if ($method === 'GET' && $featured) {
        $stmt = db()->prepare('
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.featured = 1
        ');
        $stmt->execute();
        $products = $stmt->fetchAll();
        if (!$products) error('Product not found', 404);
        respond($products);
    }

    // ── GET list ──
    if ($method === 'GET') {
        $where  = ['1=1'];
        $params = [];

        if ($cat = get('category'))  { $where[] = 'p.category_id = ?';   $params[] = (int)$cat; }
        if ($era = get('era'))        { $where[] = 'p.era LIKE ?';        $params[] = "%$era%"; }
        if ($feat = get('featured'))  { $where[] = 'p.featured = ?';     $params[] = (int)$feat; }
        if ($q = get('q'))            { $where[] = '(p.name LIKE ? OR p.description LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }

        $sort = match(get('sort')) {
            'price_asc'  => 'p.price ASC',
            'price_desc' => 'p.price DESC',
            'newest'     => 'p.created_at DESC',
            default      => 'p.id DESC',
        };

        $limit  = min((int)get('limit', 20), 100);
        $offset = ((int)get('page', 1) - 1) * $limit;
        $whereSQL = implode(' AND ', $where);

        $stmt = db()->prepare("
            SELECT p.id, p.name, p.slug, p.price, p.era, p.material, p.badge, p.stock, p.rating, p.reviews, p.featured,
                c.name AS category_name,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE $whereSQL
            ORDER BY $sort
            LIMIT $limit OFFSET $offset
        ");
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        $countStmt = db()->prepare("SELECT COUNT(*) FROM products p WHERE $whereSQL");
        $countStmt->execute($params);

        respond([
            'data'  => $products,
            'total' => (int)$countStmt->fetchColumn(),
            'page'  => (int)get('page', 1),
            'limit' => $limit,
        ]);
    }

    // ── POST create (admin) ──
    if ($method === 'POST') {
        require_admin();
        $b = body();
        if (empty($b['name']) || empty($b['price'])) error('name and price are required');
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $b['name']), '-'));

        $stmt = db()->prepare('
            INSERT INTO products (name, slug, description, price, category_id, era, material, badge, stock, featured, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ');
        $stmt->execute([
            $b['name'], $slug, $b['description'] ?? '', $b['price'],
            !empty($b['category_id']) ? (int)$b['category_id'] : null,
            $b['era'] ?? '', $b['material'] ?? '',
            $b['badge'] ?? null, $b['stock'] ?? 1, $b['featured'] ?? 0,
        ]);
        respond(['id' => (int)db()->lastInsertId(), 'message' => 'Product created'], 201);
    }

    // ── PUT update (admin) ──
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

    // ── DELETE (admin, soft delete via stock=0) ──
    if ($method === 'DELETE') {
        require_admin();
        if (!$id) error('id is required');
        db()->prepare('UPDATE products SET stock = 0 WHERE id = ?')->execute([$id]);
        respond(['message' => 'Product removed']);
    }

    error('Method not allowed', 405);
}

// ================================================================
//  CATEGORIES (گسترش‌یافته برای پنل ادمین)
// ================================================================
function handle_categories(string $method): void {
    // ── GET list (عمومی) ──
    if ($method === 'GET') {
        $rows = db()->query('SELECT id, name, slug FROM categories ORDER BY name')->fetchAll();
        respond($rows);
    }

    // ── POST create (ادمین) ──
    if ($method === 'POST') {
        require_admin();
        $b = body();
        if (empty($b['name'])) error('name is required');
        $slug = $b['slug'] ?? strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $b['name']), '-'));
        db()->prepare('INSERT INTO categories (name, slug) VALUES (?, ?)')->execute([$b['name'], $slug]);
        respond(['id' => (int)db()->lastInsertId(), 'message' => 'Category created'], 201);
    }

    // ── PUT update (ادمین) ──
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

    // ── DELETE (ادمین) ──
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
//  ERAS  (دوران‌های تاریخی – مدیریت‌شده با جدول مجزا)
// ================================================================
function handle_eras(string $method): void {
    // ── GET list (عمومی) ──
    if ($method === 'GET') {
        $rows = db()->query('SELECT id, name, slug FROM eras ORDER BY name')->fetchAll();
        respond($rows);
    }

    // ── POST create (ادمین) ──
    if ($method === 'POST') {
        require_admin();
        $b = body();
        if (empty($b['name'])) error('name is required');
        $slug = $b['slug'] ?? strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $b['name']), '-'));
        db()->prepare('INSERT INTO eras (name, slug) VALUES (?, ?)')->execute([$b['name'], $slug]);
        respond(['id' => (int)db()->lastInsertId(), 'message' => 'Era created'], 201);
    }

    // ── PUT update (ادمین) ──
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

    // ── DELETE (ادمین) ──
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
//  CART  (session-based, no login required)
// ================================================================
function handle_cart(string $method): void {
    session_start();
    if (!isset($_SESSION['cart'])) $_SESSION['cart'] = [];

    // ── GET ──
    if ($method === 'GET') {
        $items = [];
        $total = 0;
        foreach ($_SESSION['cart'] as $pid => $qty) {
            $stmt = db()->prepare('
                SELECT p.id, p.name, p.slug, p.price, p.stock,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
                FROM products p WHERE p.id = ?
            ');
            $stmt->execute([$pid]);
            $p = $stmt->fetch();
            if ($p) {
                $p['qty']      = $qty;
                $p['subtotal'] = $p['price'] * $qty;
                $total        += $p['subtotal'];
                $items[]       = $p;
            }
        }
        respond(['items' => $items, 'total' => $total, 'count' => array_sum($_SESSION['cart'])]);
    }

    // ── POST add ──
    if ($method === 'POST') {
        $b   = body();
        $pid = (int)($b['product_id'] ?? 0);
        $qty = max(1, (int)($b['qty'] ?? 1));
        if (!$pid) error('product_id is required');

        $stmt = db()->prepare('SELECT id, stock FROM products WHERE id = ?');
        $stmt->execute([$pid]);
        $p = $stmt->fetch();
        if (!$p) error('Product not found', 404);
        if ($p['stock'] < 1) error('Out of stock', 409);

        $_SESSION['cart'][$pid] = ($_SESSION['cart'][$pid] ?? 0) + $qty;
        respond(['message' => 'Added to cart', 'count' => array_sum($_SESSION['cart'])]);
    }

    // ── PUT update qty ──
    if ($method === 'PUT') {
        $b   = body();
        $pid = (int)($b['product_id'] ?? 0);
        $qty = (int)($b['qty'] ?? 0);
        if (!$pid) error('product_id is required');
        if ($qty <= 0) unset($_SESSION['cart'][$pid]);
        else           $_SESSION['cart'][$pid] = $qty;
        respond(['message' => 'Cart updated', 'count' => array_sum($_SESSION['cart'])]);
    }

    // ── DELETE remove item or clear ──
    if ($method === 'DELETE') {
        $pid = get('product_id');
        if ($pid) unset($_SESSION['cart'][(int)$pid]);
        else      $_SESSION['cart'] = [];
        respond(['message' => 'Cart updated', 'count' => array_sum($_SESSION['cart'])]);
    }

    error('Method not allowed', 405);
}

// ================================================================
//  ORDERS (لیست پیشرفته برای ادمین، به‌علاوهٔ پشتیبانی از session_start)
// ================================================================
function handle_orders(string $method): void
{
    session_start(); // برای پاک‌سازی سبد خرید پس از ثبت سفارش

    // ── POST ایجاد سفارش (مهمان یا کاربر لاگین‌شده) ──
    if ($method === 'POST') {
        $b = body();

        if (empty($b['items']))            error('items are required');
        if (empty($b['customer_name']))    error('customer_name is required');
        if (empty($b['customer_phone']))   error('customer_phone is required');
        if (empty($b['shipping_address'])) error('shipping_address is required');

        $total = 0;
        $validItems = [];

        foreach ($b['items'] as $item) {
            $stmt = db()->prepare('SELECT id, price, stock FROM products WHERE id = ?');
            $stmt->execute([$item['product_id']]);
            $p = $stmt->fetch();

            if (!$p)               error("Product {$item['product_id']} not found", 404);
            if ($p['stock'] < 1)   error("Product {$item['product_id']} out of stock", 409);

            $qty = max(1, (int)$item['qty']);
            $total += $p['price'] * $qty;

            $validItems[] = [
                'product_id' => $p['id'],
                'qty'        => $qty,
                'price'      => $p['price']
            ];
        }

        // اعمال کد تخفیف
        $discountId = null;
        $discountAmount = 0;

        if (!empty($b['discount_code'])) {
            $d = db()->prepare('SELECT * FROM discount_codes
                                WHERE code = ? AND is_active = 1
                                AND valid_from <= NOW() AND valid_to >= NOW()');
            $d->execute([$b['discount_code']]);
            $discount = $d->fetch();

            if ($discount) {
                $discountId = $discount['id'];
                $discountAmount = ($discount['type'] === 'percent')
                    ? $total * ($discount['value'] / 100)
                    : min($total, $discount['value']);
                $total -= $discountAmount;
            }
        }

        // هزینه ارسال
        $shipping = $total >= 1500000 ? 0 : 50000;
        $total += $shipping;

        $orderNumber = 'GB-' . strtoupper(substr(uniqid(), -6));

        $user = auth_user();
        $userId = $user ? $user['sub'] : null;

        // آپلود رسید پرداخت (در صورت وجود)
        $receipt_url = null;
        if (isset($_FILES['receipt']) && $_FILES['receipt']['error'] === UPLOAD_ERR_OK) {
            $receipt = $_FILES['receipt'];
            $allowed_types = ['image/jpeg', 'image/png', 'application/pdf'];
            if (!in_array($receipt['type'], $allowed_types)) {
                error('Invalid file type. Allowed types: JPEG, PNG, PDF', 400);
            }
            $filename = uniqid() . '_' . basename($receipt['name']);
            $destination = 'uploads/' . $filename;
            if (move_uploaded_file($receipt['tmp_name'], $destination)) {
                $receipt_url = '/uploads/' . $filename;
            } else {
                error('Failed to upload receipt file', 500);
            }
        }

        db()->beginTransaction();
        try {
            $stmt = db()->prepare('
                INSERT INTO orders (
                    order_number, customer_name,
                    customer_phone, shipping_address, total_amount,
                    discount_code_id, status, created_at, user_id, receipt_url
                ) VALUES (?,?,?,?,?,?,?,?,?,?)
            ');
            $stmt->execute([
                $orderNumber,
                $b['customer_name'],
                $b['customer_phone'],
                $b['shipping_address'],
                $total,
                $discountId,
                'pending',
                date('Y-m-d H:i:s'),
                $userId,
                $receipt_url
            ]);

            $orderId = (int)db()->lastInsertId();

            $itemStmt = db()->prepare('
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (?,?,?,?)
            ');
            foreach ($validItems as $item) {
                $itemStmt->execute([
                    $orderId,
                    $item['product_id'],
                    $item['qty'],
                    $item['price']
                ]);
            }

            db()->commit();

            // پاک‌سازی سبد خرید پس از ثبت موفق
            if (isset($_SESSION['cart'])) {
                $_SESSION['cart'] = [];
            }
        } catch (Exception $e) {
            db()->rollBack();
            error_log('Order creation error: ' . $e->getMessage());
            error('Order creation failed: ' . $e->getMessage(), 500);
        }

        respond([
            'id'           => $orderId,
            'order_number' => $orderNumber,
            'total_amount' => $total,
            'message'      => 'Order created successfully',
            'cart_count'   => 0
        ], 201);
        return; // مهم: جلوگیری از ادامه اجرا
    }

    // ── GET دریافت سفارش(ها) ──
    if ($method === 'GET') {
        $orderNumber = get('number');
        $orderId     = get('id');
        // مهمان: دریافت با شماره سفارش
        if ($orderNumber) {
            $stmt = db()->prepare('SELECT * FROM orders WHERE order_number = ?');
            $stmt->execute([$orderNumber]);
            $order = $stmt->fetch();
            if (!$order) error('سفارش یافت نشد', 404);

            $itemsStmt = db()->prepare('
                SELECT oi.*, p.name,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = ?
            ');
            $itemsStmt->execute([$order['id']]);
            $order['items'] = $itemsStmt->fetchAll();
            respond($order);
        }
        // کاربر وارد شده یا ادمین
        $user = auth_user();
        if (!$user) error('برای این بخش باید وارد شوید', 401);

        // دریافت یک سفارش با id
        if ($orderId) {
            $stmt = db()->prepare('SELECT * FROM orders WHERE id = ?');
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();
            if (!$order) error('سفارش یافت نشد', 404);

            $isOwner = ($order['user_id'] ?? null) === $user['sub'];
            $isAdmin = $user['role'] === 'admin';
            if (!($isOwner || $isAdmin)) error('دسترسی غیرمجاز', 403);

            $itemsStmt = db()->prepare('
                SELECT oi.*, p.name,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = ?
            ');
            $itemsStmt->execute([$order['id']]);
            $order['items'] = $itemsStmt->fetchAll();
            respond($order);
        }

        // لیست سفارشات (با فیلتر و صفحه‌بندی برای ادمین)
        if ($user['role'] === 'admin') {
            // پارامترهای فیلتر
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

            // افزودن آیتم‌ها به هر سفارش
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
        } else {
            // کاربر عادی: فقط سفارش‌های خودش
            $stmt = db()->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
            $stmt->execute([$user['sub']]);
            $orders = $stmt->fetchAll();

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
            respond($orders);
        }
    }

    // ── PUT به‌روزرسانی وضعیت (فقط ادمین) ──
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

    error('Method not allowed', 405);
}

// ================================================================
//  AUTH
// ================================================================
function handle_auth(string $method): void {
    session_start();  // ← اضافه کن

    $action = get('action', '');

    // ── POST register ──
    // ── POST register ──
if ($method === 'POST' && $action === 'register') {
    $b = body();
    if (empty($b['phone']) || empty($b['password']) || empty($b['name'])) error('name, phone, password required');

    // بررسی تکراری نبودن شماره همراه
    $exists = db()->prepare('SELECT id FROM users WHERE phone = ?');
    $exists->execute([$b['phone']]);
    if ($exists->fetch()) error('Phone number already exists', 409);

    $hash = password_hash($b['password'], PASSWORD_BCRYPT);
    $stmt = db()->prepare('INSERT INTO users (name, phone, password_hash, role, created_at) VALUES (?, ?, ?, "user", NOW())');
    $stmt->execute([$b['name'], $b['phone'], $hash]);
    $uid = (int)db()->lastInsertId();

    // دریافت اطلاعات کاربر تازه ایجاد شده
    $userStmt = db()->prepare('SELECT id, name, phone, role FROM users WHERE id = ?');
    $userStmt->execute([$uid]);
    $newUser = $userStmt->fetch();

    $token = jwt_make(['sub' => $uid, 'role' => 'user', 'exp' => time() + 86400 * 30]);

    // مقداردهی صحیح سشن
    $_SESSION['user'] = [
        'id'   => $newUser['id'],
        'role' => $newUser['role'],
        'name' => $newUser['name'],
        'phone'=> $newUser['phone']
    ];

    respond([
        'token' => $token,
        'user' => [
            'id'   => $newUser['id'],
            'name' => $newUser['name'],
            'role' => $newUser['role']
        ]
    ], 201);
}

    // ── POST login ──
    if ($method === 'POST' && $action === 'login') {
        $b = body();
        if (empty($b['phone']) || empty($b['password'])) error('phone and password required');

        $stmt = db()->prepare('SELECT * FROM users WHERE phone = ?');
        $stmt->execute([$b['phone']]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($b['password'], $user['password_hash'])) error('Invalid credentials', 401);

        $token = jwt_make(['sub' => $user['id'], 'role' => $user['role'], 'exp' => time() + 86400 * 30]);
        $_SESSION['user'] = [
            'id'   => $user['id'],
            'role' => $user['role'],
            'name' => $user['name'],
            'phone'=> $user['phone']
        ];
        respond(['token' => $token, 'user' => ['id' => $user['id'],'phone'=>$user['phone'] ,'name' => $user['name'], 'role' => $user['role']]]);
    }

    // ── GET me ──
    if ($method === 'GET' && $action === 'me') {
        $u    = require_auth();
        $stmt = db()->prepare('SELECT id, name, phone, role, created_at FROM users WHERE id = ?');
        $stmt->execute([$u['sub']]);
        respond($stmt->fetch());
    }

    error('Unknown auth action', 400);
}
// ================================================================
//  DISCOUNTS
// ================================================================
function handle_discounts(string $method): void {
    $action = get('action', '');

    if ($method === 'GET' && $action === 'validate') {
        $code = get('code', '');
        if (!$code) error('code is required');
        $stmt = db()->prepare('SELECT id, code, type, value FROM discount_codes WHERE code = ? AND is_active = 1 AND valid_from <= NOW() AND valid_to >= NOW()');
        $stmt->execute([$code]);
        $d = $stmt->fetch();
        if (!$d) error('Invalid or expired code', 404);
        respond($d);
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
//  ADMIN DASHBOARD (آمار)
// ================================================================
function handle_admin(string $method): void {
    if ($method !== 'GET') error('Method not allowed', 405);
    require_admin();

    $action = get('action', 'stats');
    if ($action !== 'stats') error('Unknown admin action', 400);

    // تعداد کل محصولات، دسته‌بندی‌ها، کاربران، سفارشات
    $totalProducts  = db()->query('SELECT COUNT(*) FROM products')->fetchColumn();
    $totalCategories= db()->query('SELECT COUNT(*) FROM categories')->fetchColumn();
    $totalUsers     = db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $totalOrders    = db()->query('SELECT COUNT(*) FROM orders')->fetchColumn();

    // درآمد کل (سفارشات با وضعیت‌های پرداخت‌شده، ارسال‌شده، تحویل‌شده)
    $revenue = db()->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status IN ('paid','shipped','delivered')")->fetchColumn();

    // سفارشات امروز
    $todayOrders = db()->query("SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()")->fetchColumn();

    // سفارشات در انتظار بررسی
    $pendingOrders = db()->query("SELECT COUNT(*) FROM orders WHERE status='pending'")->fetchColumn();

    // محصولات کم‌موجودی (موجودی کمتر از ۵)
    $lowStock = db()->query("SELECT COUNT(*) FROM products WHERE stock < 5 AND stock > 0")->fetchColumn();

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
//  USERS (مدیریت کاربران توسط ادمین)
// ================================================================
function handle_users(string $method): void {
    require_admin();

    // ── GET لیست یا تک کاربر ──
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

    // ── PUT به‌روزرسانی نقش ──
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

    // ── DELETE حذف کاربر ──
    if ($method === 'DELETE') {
        $id = get('id');
        if (!$id) error('id is required');
        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        respond(['message' => 'User deleted']);
    }

    error('Method not allowed', 405);
}
// ========== آپلود رسید پرداخت ==========
function handle_upload_receipt(): void {
    header('Content-Type: application/json');
    
    // بررسی ارسال فایل
    if (!isset($_FILES['receipt']) || $_FILES['receipt']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'فایل ارسال نشده یا خطایی رخ داده']);
        exit;
    }
    
    $file = $_FILES['receipt'];
    
    // اعتبارسنجی نوع فایل
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['error' => 'فرمت فایل مجاز نیست (jpeg, png, webp, gif)']);
        exit;
    }
    
    // اعتبارسنجی حجم (حداکثر ۵ مگابایت)
    $maxSize = 5 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['error' => 'حجم فایل بیش از ۵ مگابایت است']);
        exit;
    }
    
    // بررسی شماره سفارش
    if (!isset($_POST['order_number']) || empty($_POST['order_number'])) {
        http_response_code(400);
        echo json_encode(['error' => 'شماره سفارش الزامی است']);
        exit;
    }
    
    $orderNumber = preg_replace('/[^a-zA-Z0-9\-_]/', '', $_POST['order_number']);
    
    // ساخت پوشه آپلود
    $uploadDir = __DIR__ . '/uploads/receipts/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // تولید نام یکتا برای فایل
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $orderNumber . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $targetPath = $uploadDir . $filename;
    
    // ذخیره فایل
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        // به‌روزرسانی دیتابیس (وضعیت را هم paid کنید)
        $stmt = db()->prepare("UPDATE orders SET receipt_file = ?, status = 'paid' WHERE order_number = ?");
        $stmt->execute([$filename, $orderNumber]);
        
        echo json_encode([
            'success' => true,
            'filename' => $filename,
            'message' => 'رسید با موفقیت آپلود شد'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'خطا در ذخیره فایل']);
    }
}