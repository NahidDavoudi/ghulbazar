<?php

namespace App\Modules\Cart;

use App\Core\Database\Model;

class CartModel extends Model
{
    protected string $table = 'carts';
    protected bool $timestamps = true;
    protected array $fillable = ['user_id'];

    // سبد فعال کاربر — اگه نداشت می‌سازه
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

    // سبد کامل با آیتم‌ها و اطلاعات محصول
    public function getCartWithItems(int $userId): ?array
    {
        $cart = $this->findByUserId($userId);
        if (!$cart) return null;

        $stmt = $this->pdo->prepare("
            SELECT ci.*,
                   p.name, p.price, p.stock, p.era, p.material,
                   p.is_active,
                   (SELECT pi.image_url FROM product_images pi
                    WHERE pi.product_id = ci.product_id AND pi.is_main = 1
                    LIMIT 1) AS image
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.cart_id = ?
            ORDER BY ci.created_at ASC
        ");
        $stmt->execute([$cart['id']]);
        $cart['items'] = $stmt->fetchAll();

        $cart['total'] = array_reduce($cart['items'], function ($carry, $item) {
            return $carry + ($item['price'] * $item['quantity']);
        }, 0);

        return $cart;
    }

    public function clearCart(int $cartId): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM cart_items WHERE cart_id = ?");
        return $stmt->execute([$cartId]);
    }
}
