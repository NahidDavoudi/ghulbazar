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
}