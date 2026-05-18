<?php
// Repository.php - Data Access Layer

require_once __DIR__ . '/Config.php';

class Repository {
    private PDO $db;

    public function __construct() {
        $this->db = db();
    }

    // ---------- Products ----------
    public function getProducts(array $filters, int $page, int $limit): array {
        $where = ['1=1'];
        $params = [];
        if (!empty($filters['category'])) {
            $where[] = 'p.category_id = ?';
            $params[] = (int)$filters['category'];
        }
        if (!empty($filters['era'])) {
            $where[] = 'p.era LIKE ?';
            $params[] = '%' . $filters['era'] . '%';
        }
        if (!empty($filters['q'])) {
            $where[] = '(p.name LIKE ? OR p.description LIKE ?)';
            $params[] = '%' . $filters['q'] . '%';
            $params[] = '%' . $filters['q'] . '%';
        }
        $sort = match($filters['sort'] ?? '') {
            'price_asc'  => 'p.price ASC',
            'price_desc' => 'p.price DESC',
            'newest'     => 'p.created_at DESC',
            default      => 'p.id DESC',
        };
        $offset = ($page - 1) * $limit;
        $whereSQL = implode(' AND ', $where);

        $sql = "SELECT p.*, c.name AS category_name,
                       (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE $whereSQL
                ORDER BY $sort
                LIMIT $limit OFFSET $offset";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        // fetch all images for each product
        $imgStmt = $this->db->prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id');
        foreach ($products as &$product) {
            $imgStmt->execute([$product['id']]);
            $product['images'] = $imgStmt->fetchAll();
        }

        // total count
        $countSql = "SELECT COUNT(*) FROM products p WHERE $whereSQL";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        return ['data' => $products, 'total' => $total];
    }

    public function createProduct(array $data): int {
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $data['name']), '-'));
        $sql = "INSERT INTO products (name, slug, description, price, category_id, era, material, badge, stock, featured, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        $this->db->prepare($sql)->execute([
            $data['name'], $slug, $data['description'] ?? '', $data['price'],
            $data['category_id'] ?? null, $data['era'] ?? '', $data['material'] ?? '',
            $data['badge'] ?? null, $data['stock'] ?? 1, $data['featured'] ?? 0
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function updateProduct(int $id, array $fields): void {
        $updates = [];
        $params = [];
        foreach (['name','description','price','era','material','category_id','badge','stock','featured'] as $f) {
            if (array_key_exists($f, $fields)) {
                $updates[] = "$f = ?";
                $params[] = $fields[$f];
            }
        }
        if (empty($updates)) return;
        $params[] = $id;
        $sql = "UPDATE products SET " . implode(', ', $updates) . " WHERE id = ?";
        $this->db->prepare($sql)->execute($params);
    }

    public function softDeleteProduct(int $id): void {
        $this->db->prepare("UPDATE products SET stock = 0 WHERE id = ?")->execute([$id]);
    }

    // Product images
    public function addProductImage(int $productId, string $imageUrl, int $isMain, int $sortOrder): void {
        $sql = "INSERT INTO product_images (product_id, image_url, is_main, sort_order) VALUES (?, ?, ?, ?)";
        $this->db->prepare($sql)->execute([$productId, $imageUrl, $isMain, $sortOrder]);
    }

    public function getProductImageById(int $imageId): ?array {
        $stmt = $this->db->prepare("SELECT * FROM product_images WHERE id = ?");
        $stmt->execute([$imageId]);
        return $stmt->fetch() ?: null;
    }

    public function deleteProductImage(int $imageId): void {
        $this->db->prepare("DELETE FROM product_images WHERE id = ?")->execute([$imageId]);
    }

    // ---------- Categories ----------
    public function getAllCategories(): array {
        return $this->db->query("SELECT id, name, slug FROM categories ORDER BY id")->fetchAll();
    }

    public function createCategory(string $name, string $slug): int {
        $sql = "INSERT INTO categories (name, slug) VALUES (?, ?)";
        $this->db->prepare($sql)->execute([$name, $slug]);
        return (int)$this->db->lastInsertId();
    }

    public function updateCategory(int $id, array $fields): void {
        $updates = [];
        $params = [];
        if (isset($fields['name'])) { $updates[] = "name = ?"; $params[] = $fields['name']; }
        if (isset($fields['slug'])) { $updates[] = "slug = ?"; $params[] = $fields['slug']; }
        if (empty($updates)) return;
        $params[] = $id;
        $this->db->prepare("UPDATE categories SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    }

    public function deleteCategory(int $id): void {
        $this->db->prepare("DELETE FROM categories WHERE id = ?")->execute([$id]);
    }

    // ---------- Eras ----------
    public function getAllEras(): array {
        return $this->db->query("SELECT id, name, slug FROM eras ORDER BY id")->fetchAll();
    }

    public function createEra(string $name, string $slug): int {
        $this->db->prepare("INSERT INTO eras (name, slug) VALUES (?, ?)")->execute([$name, $slug]);
        return (int)$this->db->lastInsertId();
    }

    public function updateEra(int $id, array $fields): void {
        $updates = [];
        $params = [];
        if (isset($fields['name'])) { $updates[] = "name = ?"; $params[] = $fields['name']; }
        if (isset($fields['slug'])) { $updates[] = "slug = ?"; $params[] = $fields['slug']; }
        if (empty($updates)) return;
        $params[] = $id;
        $this->db->prepare("UPDATE eras SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    }

    public function deleteEra(int $id): void {
        $this->db->prepare("DELETE FROM eras WHERE id = ?")->execute([$id]);
    }

    // ---------- Orders ----------
    public function getOrders(array $filters, int $page, int $limit): array {
        $where = ['1=1'];
        $params = [];
        if (!empty($filters['status'])) {
            $where[] = 'o.status = ?';
            $params[] = $filters['status'];
        }
        if (!empty($filters['search'])) {
            $where[] = '(o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.order_number LIKE ?)';
            $search = '%' . $filters['search'] . '%';
            $params = array_merge($params, [$search, $search, $search]);
        }
        if (!empty($filters['start_date'])) {
            $where[] = 'DATE(o.created_at) >= ?';
            $params[] = $filters['start_date'];
        }
        if (!empty($filters['end_date'])) {
            $where[] = 'DATE(o.created_at) <= ?';
            $params[] = $filters['end_date'];
        }
        $offset = ($page - 1) * $limit;
        $whereSQL = implode(' AND ', $where);

        $sql = "SELECT o.*, u.name AS user_name
                FROM orders o
                LEFT JOIN users u ON u.id = o.user_id
                WHERE $whereSQL
                ORDER BY o.created_at DESC
                LIMIT $limit OFFSET $offset";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        // count total
        $countSql = "SELECT COUNT(*) FROM orders o WHERE $whereSQL";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // fetch order items with product image
        $itemsStmt = $this->db->prepare("
            SELECT oi.product_id, p.name,
                   (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
        ");
        foreach ($orders as &$order) {
            $itemsStmt->execute([$order['id']]);
            $order['items'] = $itemsStmt->fetchAll();
        }

        return ['data' => $orders, 'total' => $total];
    }

    public function updateOrderStatus(int $orderId, string $status): void {
        $this->db->prepare("UPDATE orders SET status = ? WHERE id = ?")->execute([$status, $orderId]);
    }

    // ---------- Discounts ----------
    public function getAllDiscounts(): array {
        return $this->db->query("SELECT id, code, type, value, valid_from, valid_to, is_active, created_at FROM discount_codes ORDER BY created_at DESC")->fetchAll();
    }

    public function createDiscount(array $data): int {
        $sql = "INSERT INTO discount_codes (code, type, value, valid_from, valid_to, is_active) VALUES (?, ?, ?, ?, ?, 1)";
        $this->db->prepare($sql)->execute([$data['code'], $data['type'], $data['value'], $data['valid_from'], $data['valid_to']]);
        return (int)$this->db->lastInsertId();
    }

    public function deactivateDiscount(int $id): void {
        $this->db->prepare("UPDATE discount_codes SET is_active = 0 WHERE id = ?")->execute([$id]);
    }

    // ---------- Admin Stats ----------
    public function getAdminStats(): array {
        $totalProducts   = $this->db->query('SELECT COUNT(*) FROM products')->fetchColumn();
        $totalCategories = $this->db->query('SELECT COUNT(*) FROM categories')->fetchColumn();
        $totalUsers      = $this->db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $totalOrders     = $this->db->query('SELECT COUNT(*) FROM orders')->fetchColumn();
        $revenue         = $this->db->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status IN ('paid','shipped','delivered')")->fetchColumn();
        $todayOrders     = $this->db->query("SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()")->fetchColumn();
        $pendingOrders   = $this->db->query("SELECT COUNT(*) FROM orders WHERE status='pending'")->fetchColumn();
        $lowStock        = $this->db->query("SELECT COUNT(*) FROM products WHERE stock < 5 AND stock > 0")->fetchColumn();

        return [
            'total_products'   => (int)$totalProducts,
            'total_categories' => (int)$totalCategories,
            'total_users'      => (int)$totalUsers,
            'total_orders'     => (int)$totalOrders,
            'total_revenue'    => (int)$revenue,
            'today_orders'     => (int)$todayOrders,
            'pending_orders'   => (int)$pendingOrders,
            'low_stock_items'  => (int)$lowStock,
        ];
    }

    // ---------- Chart Data ----------
    public function getOrderStatusCounts(): array {
        $statuses = $this->db->query("SELECT status, COUNT(*) as count FROM orders GROUP BY status")->fetchAll();
        $labels = [
            'pending'   => 'در انتظار',
            'paid'      => 'پرداخت شده',
            'shipped'   => 'ارسال شده',
            'delivered' => 'تحویل داده',
            'cancelled' => 'لغو شده',
        ];
        $result = [];
        foreach ($statuses as $row) {
            $label = $labels[$row['status']] ?? $row['status'];
            $result[$label] = (int)$row['count'];
        }
        return $result;
    }

    public function getWeeklyRevenue(): array {
        $weekly = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $stmt = $this->db->prepare("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE DATE(created_at) = ? AND status IN ('paid','shipped','delivered')");
            $stmt->execute([$date]);
            $amount = (int)$stmt->fetchColumn();
            $weekly[] = ['date' => date('m/d', strtotime($date)), 'amount' => $amount];
        }
        return $weekly;
    }

    // ---------- Users ----------
    public function getUserById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT id, name, phone, role, created_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function getUsers(int $page, int $limit): array {
        $offset = ($page - 1) * $limit;
        $stmt = $this->db->prepare("SELECT id, name, phone, role, created_at FROM users ORDER BY id DESC LIMIT $limit OFFSET $offset");
        $stmt->execute();
        $users = $stmt->fetchAll();
        $total = $this->db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        return ['data' => $users, 'total' => (int)$total];
    }

    public function updateUserRole(int $id, string $role): void {
        $this->db->prepare("UPDATE users SET role = ? WHERE id = ?")->execute([$role, $id]);
    }

    public function deleteUser(int $id): void {
        $this->db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
    }

    // ---------- Auth ----------
    public function findUserByPhone(string $phone): ?array {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        return $stmt->fetch() ?: null;
    }

    public function createUser(string $name, string $phone, string $passwordHash): int {
        $sql = "INSERT INTO users (name, phone, password_hash, role) VALUES (?, ?, ?, 'user')";
        $this->db->prepare($sql)->execute([$name, $phone, $passwordHash]);
        return (int)$this->db->lastInsertId();
    }

    public function phoneExists(string $phone): bool {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        return (int)$stmt->fetchColumn() > 0;
    }

    // ---------- Public Products ----------
    public function getPublicProducts(array $filters, int $page, int $limit): array {
        $where = ['p.is_active = 1', 'p.stock > 0'];
        $params = [];

        if (!empty($filters['category'])) {
            $where[] = 'c.slug = ?';
            $params[] = $filters['category'];
        }
        if (!empty($filters['era'])) {
            $where[] = 'e.slug = ?';
            $params[] = $filters['era'];
        }
        if (!empty($filters['q'])) {
            $where[] = '(p.name LIKE ? OR p.description LIKE ?)';
            $params[] = '%' . $filters['q'] . '%';
            $params[] = '%' . $filters['q'] . '%';
        }
        if (!empty($filters['min_price'])) {
            $where[] = 'p.price >= ?';
            $params[] = (int)$filters['min_price'];
        }
        if (!empty($filters['max_price'])) {
            $where[] = 'p.price <= ?';
            $params[] = (int)$filters['max_price'];
        }
        if (!empty($filters['featured'])) {
            $where[] = 'p.featured = 1';
        }

        $sort = match($filters['sort'] ?? '') {
            'price_asc'  => 'p.price ASC',
            'price_desc' => 'p.price DESC',
            'newest'     => 'p.created_at DESC',
            'popular'    => 'p.views DESC',
            default      => 'p.featured DESC, p.created_at DESC',
        };

        $offset = ($page - 1) * $limit;
        $whereSQL = implode(' AND ', $where);

        $sql = "SELECT p.id, p.name, p.slug, p.description, p.price, p.badge,
                       p.stock, p.rating, p.reviews, p.views, p.featured,
                       p.era, p.material, p.created_at,
                       c.name AS category_name, c.slug AS category_slug,
                       e.name AS era_name,
                       (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN eras e ON e.slug = p.era
                WHERE $whereSQL
                ORDER BY $sort
                LIMIT $limit OFFSET $offset";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        $countSql = "SELECT COUNT(*) FROM products p
                     LEFT JOIN categories c ON c.id = p.category_id
                     LEFT JOIN eras e ON e.slug = p.era
                     WHERE $whereSQL";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        return ['data' => $products, 'total' => $total];
    }

    public function getPublicProductBySlug(string $slug): ?array {
        $sql = "SELECT p.*, c.name AS category_name, c.slug AS category_slug
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.slug = ? AND p.is_active = 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$slug]);
        $product = $stmt->fetch();
        if (!$product) return null;

        // images
        $imgStmt = $this->db->prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id");
        $imgStmt->execute([$product['id']]);
        $product['images'] = $imgStmt->fetchAll();

        // options
        $optStmt = $this->db->prepare("SELECT option_type, option_value FROM product_options WHERE product_id = ?");
        $optStmt->execute([$product['id']]);
        $options = [];
        foreach ($optStmt->fetchAll() as $row) {
            $options[$row['option_type']][] = $row['option_value'];
        }
        $product['options'] = $options;

        // increment views
        $this->db->prepare("UPDATE products SET views = views + 1 WHERE id = ?")->execute([$product['id']]);

        return $product;
    }

    // ---------- Cart ----------
    public function getCart(int $userId): array {
        $sql = "SELECT ci.id, ci.product_id, ci.quantity, ci.selected_options,
                       p.name, p.slug, p.price, p.stock,
                       (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
                FROM cart_items ci
                JOIN products p ON p.id = ci.product_id
                WHERE ci.user_id = ? AND p.is_active = 1
                ORDER BY ci.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $items = $stmt->fetchAll();

        $total = array_sum(array_map(fn($i) => $i['price'] * $i['quantity'], $items));
        return ['items' => $items, 'total' => $total, 'count' => count($items)];
    }

    public function cartItemExists(int $userId, int $productId): ?array {
        $stmt = $this->db->prepare("SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$userId, $productId]);
        return $stmt->fetch() ?: null;
    }

    public function addToCart(int $userId, int $productId, int $quantity, ?string $selectedOptions): int {
        $existing = $this->cartItemExists($userId, $productId);
        if ($existing) {
            $newQty = $existing['quantity'] + $quantity;
            $this->db->prepare("UPDATE cart_items SET quantity = ? WHERE id = ?")->execute([$newQty, $existing['id']]);
            return $existing['id'];
        }
        $sql = "INSERT INTO cart_items (user_id, product_id, quantity, selected_options) VALUES (?, ?, ?, ?)";
        $this->db->prepare($sql)->execute([$userId, $productId, $quantity, $selectedOptions]);
        return (int)$this->db->lastInsertId();
    }

    public function updateCartItem(int $itemId, int $userId, int $quantity): bool {
        if ($quantity <= 0) {
            return (bool)$this->db->prepare("DELETE FROM cart_items WHERE id = ? AND user_id = ?")->execute([$itemId, $userId]);
        }
        $stmt = $this->db->prepare("UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$quantity, $itemId, $userId]);
        return $stmt->rowCount() > 0;
    }

    public function removeCartItem(int $itemId, int $userId): bool {
        $stmt = $this->db->prepare("DELETE FROM cart_items WHERE id = ? AND user_id = ?");
        $stmt->execute([$itemId, $userId]);
        return $stmt->rowCount() > 0;
    }

    public function clearCart(int $userId): void {
        $this->db->prepare("DELETE FROM cart_items WHERE user_id = ?")->execute([$userId]);
    }

    // ---------- Addresses ----------
    public function getUserAddresses(int $userId): array {
        $stmt = $this->db->prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY id DESC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function getAddressById(int $id, int $userId): ?array {
        $stmt = $this->db->prepare("SELECT * FROM addresses WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        return $stmt->fetch() ?: null;
    }

    public function createAddress(int $userId, array $data): int {
        $sql = "INSERT INTO addresses (user_id, recipient_name, phone, address, city, state, zip_code) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $this->db->prepare($sql)->execute([
            $userId,
            $data['recipient_name'] ?? '',
            $data['phone'] ?? '',
            $data['address'],
            $data['city'],
            $data['state'] ?? '',
            $data['zip_code']
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function updateAddress(int $id, int $userId, array $data): bool {
        $fields = [];
        $params = [];
        foreach (['recipient_name','phone','address','city','state','zip_code'] as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = ?";
                $params[] = $data[$f];
            }
        }
        if (empty($fields)) return false;
        $params[] = $id;
        $params[] = $userId;
        $stmt = $this->db->prepare("UPDATE addresses SET " . implode(', ', $fields) . " WHERE id = ? AND user_id = ?");
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }

    public function deleteAddress(int $id, int $userId): bool {
        $stmt = $this->db->prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        return $stmt->rowCount() > 0;
    }

    // ---------- Checkout / Orders (user side) ----------
    public function getProductById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE id = ? AND is_active = 1");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function findActiveDiscount(string $code): ?array {
        $sql = "SELECT * FROM discount_codes
                WHERE code = ? AND is_active = 1
                AND valid_from <= NOW() AND valid_to >= NOW()";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$code]);
        return $stmt->fetch() ?: null;
    }

    public function createOrder(array $order, array $items): int {
        $orderNumber = 'GB-' . strtoupper(substr(uniqid(), -6));

        $sql = "INSERT INTO orders (order_number, user_id, customer_name, customer_phone,
                customer_email, shipping_address, total_amount, discount_code_id, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')";
        $this->db->prepare($sql)->execute([
            $orderNumber,
            $order['user_id'],
            $order['customer_name'],
            $order['customer_phone'],
            $order['customer_email'] ?? '',
            $order['shipping_address'],
            $order['total_amount'],
            $order['discount_code_id'] ?? null,
        ]);
        $orderId = (int)$this->db->lastInsertId();

        $itemSql = "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)";
        $itemStmt = $this->db->prepare($itemSql);
        foreach ($items as $item) {
            $itemStmt->execute([$orderId, $item['product_id'], $item['quantity'], $item['price']]);
            // کاهش موجودی
            $this->db->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock > 0")
                     ->execute([$item['quantity'], $item['product_id']]);
        }

        return $orderId;
    }

    public function getUserOrders(int $userId, int $page, int $limit): array {
        $offset = ($page - 1) * $limit;
        $sql = "SELECT id, order_number, customer_name, shipping_address,
                       total_amount, status, created_at, updated_at
                FROM orders WHERE user_id = ?
                ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll();

        $total = (int)$this->db->prepare("SELECT COUNT(*) FROM orders WHERE user_id = ?")
                               ->execute([$userId]) ? $this->db->prepare("SELECT COUNT(*) FROM orders WHERE user_id = ?")->execute([$userId]) : 0;
        // روش صحیح‌تر:
        $cStmt = $this->db->prepare("SELECT COUNT(*) FROM orders WHERE user_id = ?");
        $cStmt->execute([$userId]);
        $total = (int)$cStmt->fetchColumn();

        $itemsStmt = $this->db->prepare("
            SELECT oi.product_id, oi.quantity, oi.price, p.name,
                   (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
            FROM order_items oi JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
        ");
        foreach ($orders as &$order) {
            $itemsStmt->execute([$order['id']]);
            $order['items'] = $itemsStmt->fetchAll();
        }

        return ['data' => $orders, 'total' => $total];
    }

    public function getUserOrderByNumber(string $orderNumber, int $userId): ?array {
        $stmt = $this->db->prepare("SELECT * FROM orders WHERE order_number = ? AND user_id = ?");
        $stmt->execute([$orderNumber, $userId]);
        $order = $stmt->fetch();
        if (!$order) return null;

        $itemsStmt = $this->db->prepare("
            SELECT oi.*, p.name, p.slug,
                   (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
            FROM order_items oi JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
        ");
        $itemsStmt->execute([$order['id']]);
        $order['items'] = $itemsStmt->fetchAll();

        return $order;
    }

    // ---------- Reviews ----------
    public function getProductReviews(int $productId): array {
        $sql = "SELECT r.id, r.rating, r.review, r.created_at, u.name AS user_name
                FROM reviews r
                LEFT JOIN users u ON u.id = r.user_id
                WHERE r.product_id = ? AND r.is_approved = 1
                ORDER BY r.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function createReview(int $productId, int $userId, int $rating, string $review): int {
        $sql = "INSERT INTO reviews (product_id, user_id, rating, review, is_approved) VALUES (?, ?, ?, ?, 0)";
        $this->db->prepare($sql)->execute([$productId, $userId, $rating, $review]);
        $id = (int)$this->db->lastInsertId();
        // آپدیت میانگین rating محصول
        $this->db->prepare("
            UPDATE products SET
                rating = (SELECT AVG(rating) FROM reviews WHERE product_id = ? AND is_approved = 1),
                reviews = (SELECT COUNT(*) FROM reviews WHERE product_id = ? AND is_approved = 1)
            WHERE id = ?
        ")->execute([$productId, $productId, $productId]);
        return $id;
    }

    public function hasUserReviewedProduct(int $userId, int $productId): bool {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM reviews WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$userId, $productId]);
        return (int)$stmt->fetchColumn() > 0;
    }

    public function hasPurchasedProduct(int $userId, int $productId): bool {
        $sql = "SELECT COUNT(*) FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('paid','shipped','delivered')";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $productId]);
        return (int)$stmt->fetchColumn() > 0;
    }

    // Admin: approve / delete reviews
    public function getPendingReviews(): array {
        $sql = "SELECT r.*, p.name AS product_name, u.name AS user_name
                FROM reviews r
                JOIN products p ON p.id = r.product_id
                LEFT JOIN users u ON u.id = r.user_id
                WHERE r.is_approved = 0
                ORDER BY r.created_at DESC";
        return $this->db->query($sql)->fetchAll();
    }

    public function approveReview(int $id): void {
        $this->db->prepare("UPDATE reviews SET is_approved = 1 WHERE id = ?")->execute([$id]);
        // آپدیت rating محصول
        $stmt = $this->db->prepare("SELECT product_id FROM reviews WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            $pid = $row['product_id'];
            $this->db->prepare("
                UPDATE products SET
                    rating = (SELECT AVG(rating) FROM reviews WHERE product_id = ? AND is_approved = 1),
                    reviews = (SELECT COUNT(*) FROM reviews WHERE product_id = ? AND is_approved = 1)
                WHERE id = ?
            ")->execute([$pid, $pid, $pid]);
        }
    }

    public function deleteReview(int $id): void {
        $stmt = $this->db->prepare("SELECT product_id FROM reviews WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        $this->db->prepare("DELETE FROM reviews WHERE id = ?")->execute([$id]);
        if ($row) {
            $pid = $row['product_id'];
            $this->db->prepare("
                UPDATE products SET
                    rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = ? AND is_approved = 1), 0),
                    reviews = (SELECT COUNT(*) FROM reviews WHERE product_id = ? AND is_approved = 1)
                WHERE id = ?
            ")->execute([$pid, $pid, $pid]);
        }
    }
}