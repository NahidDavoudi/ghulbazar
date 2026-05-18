<?php
// ================================================================
//  Ghul Bazar — api.php
//  Single-file API. No external dependencies.
//
//  Endpoints:
//    ?endpoint=products        GET list, GET single (?id=x)
//    ?endpoint=categories      GET list
//    ?endpoint=eras            GET list
//    ?endpoint=cart            GET, POST, PUT, DELETE (session-based)
//    ?endpoint=orders          POST create, GET single (?id=x) [auth]
//    ?endpoint=auth&action=login     POST
//    ?endpoint=auth&action=register  POST
//    ?endpoint=auth&action=me        GET [auth]
//    ?endpoint=discounts&action=validate&code=X   GET
// ================================================================

// ── CORS & Headers ────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
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
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($h, 'Bearer ')) return null;
    return jwt_parse(substr($h, 7));
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
    default      => error('Endpoint not found', 404),
};

// ================================================================
//  PRODUCTS
// ================================================================
function handle_products(string $method): void {
    $id = get('id');

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

        // images
        $img = db()->prepare('SELECT image_url AS url, is_main, sort_order FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC');
        $img->execute([$id]);
        $product['images'] = $img->fetchAll();

        // options (sizes / chain_lengths)
        $opt = db()->prepare('SELECT option_type, option_value FROM product_options WHERE product_id = ? ORDER BY id');
        $opt->execute([$id]);
        $product['options'] = $opt->fetchAll();

        // view count
        db()->prepare('UPDATE products SET views = views + 1 WHERE id = ?')->execute([$id]);

        // related (same category_id, excluding self)
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
//  CATEGORIES
// ================================================================
function handle_categories(string $method): void {
    if ($method !== 'GET') error('Method not allowed', 405);
    $rows = db()->query('SELECT id, name, slug FROM categories ORDER BY name')->fetchAll();
    respond($rows);
}

// ================================================================
//  ERAS (دوران‌های تاریخی)
// ================================================================
function handle_eras(string $method): void {
    if ($method !== 'GET') error('Method not allowed', 405);
    // eras are stored in products table; return distinct list
    $rows = db()->query('SELECT DISTINCT era, COUNT(*) AS count FROM products WHERE era != "" GROUP BY era ORDER BY era')->fetchAll();
    respond($rows);
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
//  ORDERS
// ================================================================
function handle_orders(string $method): void {

    // ── POST create (no login required for guest checkout) ──
    if ($method === 'POST') {
        $b = body();
        if (empty($b['items']))            error('items are required');
        if (empty($b['customer_name']))    error('customer_name is required');
        if (empty($b['customer_phone']))   error('customer_phone is required');
        if (empty($b['shipping_address'])) error('shipping_address is required');

        // Validate & price items
        $total      = 0;
        $validItems = [];
        foreach ($b['items'] as $item) {
            $stmt = db()->prepare('SELECT id, price, stock FROM products WHERE id = ?');
            $stmt->execute([$item['product_id']]);
            $p = $stmt->fetch();
            if (!$p) error("Product {$item['product_id']} not found", 404);
            if ($p['stock'] < 1) error("Product {$item['product_id']} out of stock", 409);
            $qty          = max(1, (int)$item['qty']);
            $total       += $p['price'] * $qty;
            $validItems[] = ['product_id' => $p['id'], 'qty' => $qty, 'price' => $p['price']];
        }

        // Discount
        $discountId     = null;
        $discountAmount = 0;
        if (!empty($b['discount_code'])) {
            $d = db()->prepare('SELECT * FROM discount_codes WHERE code = ? AND is_active = 1 AND valid_from <= NOW() AND valid_to >= NOW()');
            $d->execute([$b['discount_code']]);
            $discount = $d->fetch();
            if ($discount) {
                $discountId     = $discount['id'];
                $discountAmount = $discount['type'] === 'percent'
                    ? $total * ($discount['value'] / 100)
                    : min($total, $discount['value']);
                $total -= $discountAmount;
            }
        }

        // Shipping fee
        $shipping = $total >= 1500000 ? 0 : 50000;
        $total   += $shipping;

        $orderNumber = 'GB-' . strtoupper(substr(uniqid(), -6));

        db()->beginTransaction();
        try {
            $stmt = db()->prepare('
                INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, shipping_address, total_amount, discount_code_id, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, "pending", NOW())
            ');
            $stmt->execute([
                $orderNumber, $b['customer_name'], $b['customer_email'] ?? '',
                $b['customer_phone'], $b['shipping_address'], $total, $discountId,
            ]);
            $orderId = (int)db()->lastInsertId();

            $itemStmt = db()->prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
            foreach ($validItems as $item) {
                $itemStmt->execute([$orderId, $item['product_id'], $item['qty'], $item['price']]);
            }
            db()->commit();
        } catch (Exception $e) {
            db()->rollBack();
            error('Order creation failed: ' . $e->getMessage(), 500);
        }

        respond([
            'id'           => $orderId,
            'order_number' => $orderNumber,
            'total'        => $total,
            'message'      => 'Order created successfully',
        ], 201);
    }

    // ── GET orders (single by number, single by id, or list) ──
    if ($method === 'GET') {
        $num = get('number');
        $id  = get('id');

        // Guest: single by order_number
        if ($num) {
            $stmt = db()->prepare('SELECT * FROM orders WHERE order_number = ?');
            $stmt->execute([$num]);
            $order = $stmt->fetch();
            if (!$order) error('Order not found', 404);
            $q = db()->prepare('SELECT oi.*, p.name FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?');
            $q->execute([$order['id']]);
            $order['items'] = $q->fetchAll();
            respond($order);
        }

        // Auth required for list / id-based lookup
        $user = auth_user();
        if (!$user) error('Authentication required', 401);

        if ($id) {
            $stmt = db()->prepare('SELECT * FROM orders WHERE id = ?');
            $stmt->execute([$id]);
            $order = $stmt->fetch();
            if (!$order) error('Order not found', 404);
            $q = db()->prepare('SELECT oi.*, p.name, (SELECT image_url FROM product_images WHERE product_id=p.id AND is_main=1 LIMIT 1) AS image FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?');
            $q->execute([$order['id']]);
            $order['items'] = $q->fetchAll();
            respond($order);
        }

        // List all orders
        if ($user['role'] === 'admin') {
            $orders = db()->query('SELECT o.*, u.name AS user_name FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC')->fetchAll();
        } else {
            $stmt = db()->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
            $stmt->execute([$user['sub']]);
            $orders = $stmt->fetchAll();
        }
        $q = db()->prepare('SELECT oi.product_id, p.name, (SELECT image_url FROM product_images WHERE product_id=p.id AND is_main=1 LIMIT 1) AS image FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=?');
        foreach ($orders as &$o) { $q->execute([$o['id']]); $o['items'] = $q->fetchAll(); }
        respond($orders);
    }

    // ── PUT update status (admin) ──
    if ($method === 'PUT') {
        require_admin();
        $id = get('id');
        if (!$id) error('id is required');
        $b       = body();
        $allowed = ['pending','paid','shipped','delivered','cancelled'];
        if (!in_array($b['status'] ?? '', $allowed)) error('Invalid status');
        db()->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$b['status'], $id]);
        respond(['message' => 'Order updated']);
    }

    error('Method not allowed', 405);
}

// ================================================================
//  AUTH
// ================================================================
function handle_auth(string $method): void {
    $action = get('action', '');

    // ── POST register ──
    if ($method === 'POST' && $action === 'register') {
        $b = body();
        if (empty($b['email']) || empty($b['password']) || empty($b['name'])) error('name, email, password required');

        $exists = db()->prepare('SELECT id FROM users WHERE email = ?');
        $exists->execute([$b['email']]);
        if ($exists->fetch()) error('Email already exists', 409);

        $hash = password_hash($b['password'], PASSWORD_BCRYPT);
        $stmt = db()->prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, "user", NOW())');
        $stmt->execute([$b['name'], $b['email'], $hash]);
        $uid   = (int)db()->lastInsertId();
        $token = jwt_make(['sub' => $uid, 'role' => 'user', 'exp' => time() + 86400 * 30]);
        respond(['token' => $token, 'user' => ['id' => $uid, 'name' => $b['name'], 'role' => 'user']], 201);
    }

    // ── POST login ──
    if ($method === 'POST' && $action === 'login') {
        $b = body();
        if (empty($b['email']) || empty($b['password'])) error('email and password required');

        $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$b['email']]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($b['password'], $user['password_hash'])) error('Invalid credentials', 401);

        $token = jwt_make(['sub' => $user['id'], 'role' => $user['role'], 'exp' => time() + 86400 * 30]);
        respond(['token' => $token, 'user' => ['id' => $user['id'], 'name' => $user['name'], 'role' => $user['role']]]);
    }

    // ── GET me ──
    if ($method === 'GET' && $action === 'me') {
        $u    = require_auth();
        $stmt = db()->prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?');
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

    // ── GET validate ──
    if ($method === 'GET' && $action === 'validate') {
        $code = get('code', '');
        if (!$code) error('code is required');
        $stmt = db()->prepare('SELECT id, code, type, value FROM discount_codes WHERE code = ? AND is_active = 1 AND valid_from <= NOW() AND valid_to >= NOW()');
        $stmt->execute([$code]);
        $d = $stmt->fetch();
        if (!$d) error('Invalid or expired code', 404);
        respond($d);
    }

    // ── POST create (admin) ──
    if ($method === 'POST') {
        require_admin();
        $b = body();
        if (empty($b['code']) || empty($b['type']) || !isset($b['value'])) error('code, type, value required');
        $stmt = db()->prepare('INSERT INTO discount_codes (code, type, value, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?, 1)');
        $stmt->execute([$b['code'], $b['type'], $b['value'], $b['valid_from'], $b['valid_to']]);
        respond(['id' => (int)db()->lastInsertId(), 'message' => 'Discount code created'], 201);
    }

    // ── DELETE deactivate (admin) ──
    if ($method === 'DELETE') {
        require_admin();
        $id = get('id');
        if (!$id) error('id is required');
        db()->prepare('UPDATE discount_codes SET is_active = 0 WHERE id = ?')->execute([$id]);
        respond(['message' => 'Discount code deactivated']);
    }

    error('Method not allowed', 405);
}
