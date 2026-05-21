<?php
namespace App\Modules\Product;

use App\Core\Database\Model;

class ProductImageModel extends Model
{
    protected string $table = 'product_images';
    protected array $fillable = ['product_id', 'image_url', 'is_main', 'sort_order'];

    public function getByProductId(int $productId): array
    {
        $stmt = $this->pdo->prepare('SELECT image_url AS url, is_main, sort_order FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC');
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function unsetMain(int $productId): void
    {
        $this->pdo->prepare('UPDATE product_images SET is_main = 0 WHERE product_id = ?')->execute([$productId]);
    }
}