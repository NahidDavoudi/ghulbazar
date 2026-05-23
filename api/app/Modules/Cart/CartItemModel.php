<?php

namespace App\Modules\Cart;

use App\Core\Database\Model;

class CartItemModel extends Model
{
    protected string $table = 'cart_items';
    protected bool $timestamps = true;
    protected array $fillable = [
        'cart_id',
        'product_id',
        'quantity',
    ];

    public function findByCartAndProduct(int $cartId, int $productId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table}
            WHERE cart_id = ? AND product_id = ?
            LIMIT 1
        ");
        $stmt->execute([$cartId, $productId]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    // اضافه کردن آیتم — اگه قبلاً هست تعداد رو اضافه می‌کنه
    public function addOrIncrement(int $cartId, int $productId, int $qty = 1): int
    {
        $existing = $this->findByCartAndProduct($cartId, $productId);

        if ($existing) {
            $newQty = $existing['quantity'] + $qty;
            parent::update($existing['id'], ['quantity' => $newQty]);
            return $existing['id'];
        }

        return $this->create([
            'cart_id'    => $cartId,
            'product_id' => $productId,
            'quantity'   => $qty,
        ]);
    }

    public function updateQuantity(int $cartId, int $productId, int $qty): bool
    {
        $item = $this->findByCartAndProduct($cartId, $productId);
        if (!$item) return false;

        if ($qty <= 0) {
            return $this->delete($item['id']);
        }

        return parent::update($item['id'], ['quantity' => $qty]);
    }

    public function removeItem(int $cartId, int $productId): bool
    {
        $stmt = $this->pdo->prepare("
            DELETE FROM {$this->table} WHERE cart_id = ? AND product_id = ?
        ");
        return $stmt->execute([$cartId, $productId]);
    }

    public function getByCartId(int $cartId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table} WHERE cart_id = ? ORDER BY created_at ASC
        ");
        $stmt->execute([$cartId]);
        return $stmt->fetchAll();
    }
}
