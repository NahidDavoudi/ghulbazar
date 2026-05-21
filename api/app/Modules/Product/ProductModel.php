<?php
namespace App\Modules\Product;

use App\Core\Database\Model;

class ProductModel extends Model
{
    protected string $table = 'products';
    protected array $fillable = ['name', 'slug', 'description', 'price', 'category_id', 'era', 'material', 'badge', 'stock', 'featured'];

    public function paginateWithFilters(array $filters): array
    {
        $where = ['1=1'];
        $params = [];
        if (!empty($filters['category'])) {
            $where[] = 'category_id = ?';
            $params[] = $filters['category'];
        }
        if (!empty($filters['era'])) {
            $where[] = 'era LIKE ?';
            $params[] = "%{$filters['era']}%";
        }
        if ($filters['featured'] !== null) {
            $where[] = 'featured = ?';
            $params[] = (int)$filters['featured'];
        }
        if (!empty($filters['q'])) {
            $where[] = '(name LIKE ? OR description LIKE ?)';
            $params[] = "%{$filters['q']}%";
            $params[] = "%{$filters['q']}%";
        }
        $sortMap = [
            'price_asc'  => 'price ASC',
            'price_desc' => 'price DESC',
            'newest'     => 'created_at DESC',
            'id_desc'    => 'id DESC',
        ];
        $orderBy = $sortMap[$filters['sort']] ?? 'id DESC';
        $limit = min($filters['limit'], 100);
        $offset = ($filters['page'] - 1) * $limit;

        $sql = "SELECT p.*, (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
                FROM products p WHERE " . implode(' AND ', $where) . " ORDER BY $orderBy LIMIT $limit OFFSET $offset";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        $countSql = "SELECT COUNT(*) FROM products p WHERE " . implode(' AND ', $where);
        $countStmt = $this->pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        return ['data' => $items, 'total' => $total, 'page' => $filters['page'], 'limit' => $limit];
    }

    public function getOptions(int $productId): array
    {
        $stmt = $this->pdo->prepare('SELECT option_type, option_value FROM product_options WHERE product_id = ?');
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getRelated(int $productId): array
    {
        $product = $this->find($productId);
        if (!$product) return [];
        $stmt = $this->pdo->prepare('
            SELECT id, name, slug, price, era, material,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
            FROM products p
            WHERE category_id = ? AND id != ? AND stock > 0 LIMIT 4
        ');
        $stmt->execute([$product['category_id'], $productId]);
        return $stmt->fetchAll();
    }

    public function incrementViews(int $id): void
    {
        $this->pdo->prepare('UPDATE products SET views = views + 1 WHERE id = ?')->execute([$id]);
    }
}