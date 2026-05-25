<?php

namespace App\Modules\Admin;

use App\Core\Database\Database;

class AdminDashboardService
{
    private \PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    // ─── Main Dashboard ───────────────────────────────────────────

    public function getOverview(): array
    {
        return [
            'stats'          => $this->getStats(),
            'recent_orders'  => $this->getRecentOrders(8),
            'low_stock'      => $this->getLowStockProducts(5),
            'revenue_chart'  => $this->getRevenueByDay(7),
        ];
    }

    // ─── Counts & Totals ──────────────────────────────────────────

    public function getStats(): array
    {
        return [
            'total_users'        => $this->count('users', "is_active = 1"),
            'total_products'     => $this->count('products', "is_active = 1"),
            'total_orders'       => $this->count('orders'),
            'pending_orders'     => $this->count('orders', "status = 'pending'"),
            'total_revenue'      => $this->getTotalRevenue(),
            'revenue_this_month' => $this->getRevenueThisMonth(),
            'new_users_today'    => $this->count('users', "DATE(created_at) = CURDATE()"),
            'orders_today'       => $this->count('orders', "DATE(created_at) = CURDATE()"),
            // داده‌های مورد نیاز داشبورد فرانت
            'low_stock_items'    => $this->count('products', "stock <= 5 AND is_active = 1"),
            'weekly_revenue'     => $this->getRevenueByDay(7),
            'order_status'       => $this->getOrderStatusMap(),
        ];
    }

    // ─── Recent Orders ────────────────────────────────────────────

    public function getRecentOrders(int $limit = 10): array
    {
        $stmt = $this->pdo->prepare("
            SELECT o.id, o.order_number, o.status, o.total_amount,
                   o.payment_method, o.created_at,
                   u.name AS user_name, u.phone AS user_phone
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    // ─── Low Stock ────────────────────────────────────────────────

    public function getLowStockProducts(int $threshold = 5, int $limit = 20): array
    {
        $stmt = $this->pdo->prepare("
            SELECT p.id, p.name, p.slug, p.stock, p.price,
                   c.name AS category_name,
                   (SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = 1
                    LIMIT 1) AS main_image
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.stock <= ? AND p.is_active = 1
            ORDER BY p.stock ASC
            LIMIT ?
        ");
        $stmt->execute([$threshold, $limit]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    // ─── Revenue Charts ───────────────────────────────────────────

    public function getRevenueByDay(int $days = 7): array
    {
        $stmt = $this->pdo->prepare("
            SELECT DATE(created_at) AS date,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS revenue
            FROM orders
            WHERE status != 'cancelled'
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
        $stmt->execute([$days]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getRevenueByMonth(int $months = 6): array
    {
        $stmt = $this->pdo->prepare("
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS revenue
            FROM orders
            WHERE status != 'cancelled'
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ");
        $stmt->execute([$months]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    // ─── Orders by Status ─────────────────────────────────────────

    public function getOrdersByStatus(): array
    {
        $stmt = $this->pdo->query("
            SELECT status, COUNT(*) AS count, SUM(total_amount) AS total
            FROM orders
            GROUP BY status
        ");
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    // ─── Top Products ─────────────────────────────────────────────

    public function getTopSellingProducts(int $limit = 10): array
    {
        $stmt = $this->pdo->prepare("
            SELECT p.id, p.name, p.slug, p.price,
                   SUM(oi.quantity) AS total_sold,
                   SUM(oi.quantity * oi.price) AS total_revenue,
                   (SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = 1
                    LIMIT 1) AS main_image
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status != 'cancelled'
            GROUP BY p.id
            ORDER BY total_sold DESC
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    // ─── Private Helpers ──────────────────────────────────────────

    private function getOrderStatusMap(): array
    {
        $rows = $this->pdo->query("
            SELECT status, COUNT(*) AS count
            FROM orders
            GROUP BY status
        ")->fetchAll(\PDO::FETCH_ASSOC);

        $map = [];
        foreach ($rows as $row) {
            $map[$row['status']] = (int) $row['count'];
        }
        return $map;
    }

    private function count(string $table, string $where = ''): int
    {
        $sql  = "SELECT COUNT(*) FROM {$table}";
        $sql .= $where ? " WHERE {$where}" : '';
        return (int) $this->pdo->query($sql)->fetchColumn();
    }

    private function getTotalRevenue(): int
    {
        return (int) $this->pdo->query("
            SELECT COALESCE(SUM(total_amount), 0)
            FROM orders
            WHERE status != 'cancelled'
        ")->fetchColumn();
    }

    private function getRevenueThisMonth(): int
    {
        return (int) $this->pdo->query("
            SELECT COALESCE(SUM(total_amount), 0)
            FROM orders
            WHERE status != 'cancelled'
              AND MONTH(created_at) = MONTH(CURDATE())
              AND YEAR(created_at) = YEAR(CURDATE())
        ")->fetchColumn();
    }
}