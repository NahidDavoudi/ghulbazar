<?php
namespace App\Modules\Cart;

use App\Core\Database\Model;
use PDO;

class CartModel extends Model
{
    protected string $table = 'products';
    protected string $primaryKey = 'id';

    /**
     * Retrieve product details by ID
     */
    public function getProduct(int $productId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.id, p.name, p.slug, p.price, p.stock,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
             FROM products p WHERE p.id = ?'
        );
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        return $product ?: null;
    }

    /**
     * Get stock for a given product
     */
    public function getStock(int $productId): ?int
    {
        $stmt = $this->pdo->prepare('SELECT stock FROM products WHERE id = ?');
        $stmt->execute([$productId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? (int)$result['stock'] : null;
    }

    /**
     * Fetch cart items data from a list of product IDs with quantity
     * @param array $cartAssoc Array of [productId => qty]
     * @return array ['items' => [...], 'total' => ..., 'count' => ...]
     */
    public function getCartItemsWithDetails(array $cartAssoc): array
    {
        $items = [];
        $total = 0;
        if (empty($cartAssoc)) {
            return ['items' => [], 'total' => 0, 'count' => 0];
        }

        $ids = array_keys($cartAssoc);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $stmt = $this->pdo->prepare(
            "SELECT p.id, p.name, p.slug, p.price, p.stock,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
            FROM products p
            WHERE p.id IN ($placeholders)"
        );
        $stmt->execute($ids);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($products as $product) {
            $pid = $product['id'];
            $qty = $cartAssoc[$pid] ?? 0;
            $product['qty'] = $qty;
            $product['subtotal'] = $product['price'] * $qty;
            $total += $product['subtotal'];
            $items[] = $product;
        }
        return ['items' => $items, 'total' => $total, 'count' => array_sum($cartAssoc)];
    }

    /**
     * Utility: Add more cart/product-specific DB functions here as needed
     */
}