<?php

namespace App\Modules\Cart;

use App\Core\Database\Model;

class CartModel extends Model
{
    protected string $table = 'carts';
    protected bool $timestamps = true;
    protected array $fillable = ['user_id'];

    public function getOrCreateForUser(int $userId): array
    {
        $cart = $this->findBy('user_id', $userId);
        if ($cart) return $cart;

        $id = $this->create(['user_id' => $userId]);
        return $this->find($id);
    }

    public function findByUserId(int $userId): ?array
    {
        return $this->findBy('user_id', $userId);
    }

    public function getCartWithItems(int $userId): ?array
    {
        $cart = $this->findByUserId($userId);
        if (!$cart) return null;

        $stmt = $this->pdo->prepare("
            SELECT ci.*,
                   p.name, p.price AS product_price, p.stock AS product_stock,
                   p.is_active, p.slug AS product_slug,
                   pv.sku, pv.title AS variant_title,
                   pv.price AS variant_price, pv.sale_price AS variant_sale_price,
                   COALESCE(ii.quantity, 0) AS variant_stock,
                   (SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = ci.product_id AND pi.is_main = 1
                    LIMIT 1) AS image
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            LEFT JOIN product_variants pv ON pv.id = ci.variant_id
            LEFT JOIN inventory_items ii ON ii.variant_id = ci.variant_id
            WHERE ci.cart_id = ?
            ORDER BY ci.created_at ASC
        ");
        $stmt->execute([$cart['id']]);
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $item['price'] = $item['variant_sale_price'] ?? $item['variant_price'] ?? $item['product_price'];
            $item['stock'] = (int) ($item['variant_stock'] ?? $item['product_stock']);
            $item['name']  = $item['variant_title'] && $item['variant_title'] !== 'Default'
                ? $item['name'] . ' — ' . $item['variant_title']
                : $item['name'];
        }
        unset($item);

        $cart['items'] = $items;
        $cart['total'] = array_reduce($items, fn($carry, $item) => $carry + ($item['price'] * $item['quantity']), 0);

        return $cart;
    }

    public function clearCart(int $cartId): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM cart_items WHERE cart_id = ?");
        return $stmt->execute([$cartId]);
    }
}
