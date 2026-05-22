<?php
namespace App\Modules\Cart;

use App\Core\Database\Database;

class CartService
{
    private function getCart(): array
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        return $_SESSION['cart'] ?? [];
    }

    private function saveCart(array $cart): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['cart'] = $cart;
    }

    public function getItems(): array
    {
        $cart = $this->getCart();
        $items = [];
        $total = 0;
        $pdo = Database::getInstance()->getConnection();

        foreach ($cart as $productId => $qty) {
            $stmt = $pdo->prepare('
                SELECT p.id, p.name, p.slug, p.price, p.stock,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS image
                FROM products p WHERE p.id = ?
            ');
            $stmt->execute([$productId]);
            $product = $stmt->fetch();
            if ($product) {
                $product['qty'] = $qty;
                $product['subtotal'] = $product['price'] * $qty;
                $total += $product['subtotal'];
                $items[] = $product;
            }
        }
        return ['items' => $items, 'total' => $total, 'count' => array_sum($cart)];
    }

    public function addItem(int $productId, int $qty = 1): void
    {
        // بررسی موجودی محصول
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare('SELECT stock FROM products WHERE id = ?');
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        if (!$product || $product['stock'] < 1) {
            throw new \Exception('محصول یافت نشد یا موجودی کافی نیست');
        }
        $cart = $this->getCart();
        $cart[$productId] = ($cart[$productId] ?? 0) + $qty;
        $this->saveCart($cart);
    }

    public function updateItem(int $productId, int $qty): void
    {
        $cart = $this->getCart();
        if ($qty <= 0) {
            unset($cart[$productId]);
        } else {
            $cart[$productId] = $qty;
        }
        $this->saveCart($cart);
    }

    public function removeItem(int $productId): void
    {
        $cart = $this->getCart();
        unset($cart[$productId]);
        $this->saveCart($cart);
    }

    public function clear(): void
    {
        $this->saveCart([]);
    }
}