<?php

namespace App\Modules\Product;

use App\Core\Database\Model;

class ProductModel extends Model
{
    protected string $table = 'products';
    protected array $fillable = [
        'name',
        'description',
        'price',
        'category_id',
        'era',
        'material',
        'badge',
        'stock',
        'featured',
        'is_active',
    ];
    protected bool $timestamps = true;

    // لیست محصولات با فیلتر، مرتب‌سازی و صفحه‌بندی
    public function paginateWithFilters(array $filters): array
    {
        $where  = ['p.is_active = 1'];
        $params = [];

        if (!empty($filters['category_id'])) {
            $where[]  = 'p.category_id = ?';
            $params[] = (int) $filters['category_id'];
        } elseif (!empty($filters['category'])) {
            // فرانت slug می‌فرسته — join به categories برای تطبیق
            // $where[]  = 'c.slug = ?';
            $params[] = $filters['category'];
        }
        if (!empty($filters['era'])) {
            $where[]  = 'p.era LIKE ?';
            $params[] = "%{$filters['era']}%";
        }
        if (isset($filters['featured']) && $filters['featured'] !== null) {
            $where[]  = 'p.featured = ?';
            $params[] = (int) $filters['featured'];
        }
        if (!empty($filters['q'])) {
            $where[]  = '(p.name LIKE ? OR p.description LIKE ?)';
            $params[] = "%{$filters['q']}%";
            $params[] = "%{$filters['q']}%";
        }

        $sortMap = [
            'price_asc'  => 'p.price ASC',
            'price_desc' => 'p.price DESC',
            'newest'     => 'p.created_at DESC',
            'popular'    => 'p.views DESC',
        ];
        $orderBy = $sortMap[$filters['sort'] ?? ''] ?? 'p.id DESC';

        $limit  = min((int)($filters['limit'] ?? 12), 100);
        $page   = max((int)($filters['page'] ?? 1), 1);
        $offset = ($page - 1) * $limit;

        $whereStr = implode(' AND ', $where);

        $sql = "
            SELECT p.*,
                   (SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = 1
                    LIMIT 1) AS main_image,
                   c.name AS category_name
            FROM {$this->table} p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE {$whereStr}
            ORDER BY {$orderBy}
            LIMIT {$limit} OFFSET {$offset}
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        $countSql  = "SELECT COUNT(*) FROM {$this->table} p LEFT JOIN categories c ON c.id = p.category_id WHERE {$whereStr}";
        $countStmt = $this->pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        return [
            'data'       => $items,
            'total'      => $total,
            'page'       => $page,
            'limit'      => $limit,
            'last_page'  => (int) ceil($total / $limit),
        ];
    }

    // محصول کامل با تصاویر و آپشن‌ها
    public function getFullProduct(int $id): ?array
    {
        $product = $this->find($id);
        if (!$product) return null;

        $product['images']  = $this->getImages($id);
        $product['options'] = $this->getOptions($id);

        return $product;
    }

    public function getImages(int $productId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM product_images
            WHERE product_id = ?
            ORDER BY is_main DESC, sort_order ASC
        ");
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getOptions(int $productId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT option_type, option_value FROM product_options WHERE product_id = ?'
        );
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getRelated(int $productId, int $limit = 4): array
    {
        $product = $this->find($productId);
        if (!$product || !$product['category_id']) return [];

        $stmt = $this->pdo->prepare("
            SELECT p.*,
                   (SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = 1
                    LIMIT 1) AS main_image
            FROM {$this->table} p
            WHERE p.category_id = ?
              AND p.id != ?
              AND p.stock > 0
              AND p.is_active = 1
            ORDER BY p.featured DESC, p.views DESC
            LIMIT ?
        ");
        $stmt->execute([$product['category_id'], $productId, $limit]);
        return $stmt->fetchAll();
    }

    public function getFeatured(int $limit = 8): array
    {
        $stmt = $this->pdo->prepare("
            SELECT p.*,
                   (SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_main = 1
                    LIMIT 1) AS main_image
            FROM {$this->table} p
            WHERE p.featured = 1 AND p.is_active = 1 AND p.stock > 0
            ORDER BY p.created_at DESC
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public function incrementViews(int $id): void
    {
        $this->pdo->prepare(
            "UPDATE {$this->table} SET views = views + 1 WHERE id = ?"
        )->execute([$id]);
    }

    public function decrementStock(int $id, int $qty = 1): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE {$this->table}
            SET stock = stock - ?
            WHERE id = ? AND stock >= ?
        ");
        $stmt->execute([$qty, $id, $qty]);
        return $stmt->rowCount() > 0;
    }

    public function incrementStock(int $id, int $qty = 1): void
    {
        $this->pdo->prepare("
            UPDATE {$this->table} SET stock = stock + ? WHERE id = ?
        ")->execute([$qty, $id]);
    }
}