<?php

namespace App\Modules\Cart;

use App\Modules\Product\ProductModel;
use App\Modules\Discount\DiscountModel;

class CartService
{
    public function __construct(
        private CartModel     $cartModel,
        private CartItemModel $itemModel,
        private ProductModel  $productModel,
        private DiscountModel $discountModel,
    ) {}

    // ─── View ────────────────────────────────────────────────────

    public function getCart(int $userId): array
    {
        $cart = $this->cartModel->getCartWithItems($userId);

        if (!$cart) {
            // سبد هنوز وجود نداشته — یکی خالی برمی‌گردونه
            $this->cartModel->getOrCreateForUser($userId);
            return $this->emptyCart();
        }

        return $cart;
    }

    // ─── Add / Update ────────────────────────────────────────────

    public function addItem(int $userId, int $productId, int $qty = 1): array
    {
        if ($qty < 1) {
            throw new \RuntimeException('تعداد باید حداقل ۱ باشد.', 422);
        }

        $product = $this->productModel->find($productId);
        if (!$product || !$product['is_active']) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        // بررسی موجودی کافی
        $cart        = $this->cartModel->getOrCreateForUser($userId);
        $existing    = $this->itemModel->findByCartAndProduct($cart['id'], $productId);
        $currentQty  = $existing ? $existing['quantity'] : 0;
        $totalNeeded = $currentQty + $qty;

        if ($product['stock'] < $totalNeeded) {
            throw new \RuntimeException(
                "موجودی کافی نیست. فقط {$product['stock']} عدد در انبار موجود است.",
                422
            );
        }

        $this->itemModel->addOrIncrement($cart['id'], $productId, $qty);

        return $this->getCart($userId);
    }

    public function updateItem(int $userId, int $productId, int $qty): array
    {
        $product = $this->productModel->find($productId);
        if (!$product || !$product['is_active']) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        if ($qty > $product['stock']) {
            throw new \RuntimeException(
                "موجودی کافی نیست. فقط {$product['stock']} عدد در انبار موجود است.",
                422
            );
        }

        $cart = $this->cartModel->findByUserId($userId);
        if (!$cart) {
            throw new \RuntimeException('سبد خرید یافت نشد.', 404);
        }

        // qty <= 0 باعث حذف آیتم میشه (داخل model هندل شده)
        $this->itemModel->updateQuantity($cart['id'], $productId, $qty);

        return $this->getCart($userId);
    }

    public function removeItem(int $userId, int $productId): array
    {
        $cart = $this->cartModel->findByUserId($userId);
        if (!$cart) {
            throw new \RuntimeException('سبد خرید یافت نشد.', 404);
        }

        $this->itemModel->removeItem($cart['id'], $productId);

        return $this->getCart($userId);
    }

    public function clearCart(int $userId): void
    {
        $cart = $this->cartModel->findByUserId($userId);
        if ($cart) {
            $this->cartModel->clearCart($cart['id']);
        }
    }

    /**
     * ادغام سبد مهمان (localStorage) با سبد کاربر بعد از ورود
     *
     * @param array<int, array{product_id?: int, qty?: int, quantity?: int}> $items
     */
    public function mergeGuestItems(int $userId, array $items): array
    {
        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $qty       = max(1, (int) ($item['qty'] ?? $item['quantity'] ?? 1));

            if (!$productId) {
                continue;
            }

            try {
                $this->addItem($userId, $productId, $qty);
            } catch (\RuntimeException) {
                continue;
            }
        }

        return $this->getCart($userId);
    }

    // ─── Discount ────────────────────────────────────────────────

    public function applyDiscount(int $userId, string $code): array
    {
        $cart = $this->getCart($userId);

        if (empty($cart['items'])) {
            throw new \RuntimeException('سبد خرید خالی است.', 422);
        }

        $discount = $this->discountModel->findValidCode($code);
        if (!$discount) {
            throw new \RuntimeException('کد تخفیف معتبر نیست یا منقضی شده.', 422);
        }

        $discountAmount = $this->discountModel->calculateDiscount($discount, $cart['total']);

        return [
            'cart'            => $cart,
            'discount_code'   => $discount,
            'discount_amount' => $discountAmount,
            'final_total'     => max(0, $cart['total'] - $discountAmount),
        ];
    }

    // ─── Checkout helper ─────────────────────────────────────────

    /**
     * قبل از ثبت سفارش فراخوانی میشه — موجودی همه آیتم‌ها رو چک میکنه
     */
    public function validateForCheckout(int $userId): array
    {
        $cart = $this->getCart($userId);

        if (empty($cart['items'])) {
            throw new \RuntimeException('سبد خرید خالی است.', 422);
        }

        $errors = [];
        foreach ($cart['items'] as $item) {
            if (!$item['is_active']) {
                $errors[] = "محصول «{$item['name']}» دیگر فعال نیست.";
                continue;
            }
            if ($item['stock'] < $item['quantity']) {
                $errors[] = "موجودی «{$item['name']}» کافی نیست (موجود: {$item['stock']}).";
            }
        }

        if (!empty($errors)) {
            throw new \RuntimeException(implode(' | ', $errors), 422);
        }

        return $cart;
    }

    // ─── Private ─────────────────────────────────────────────────

    private function emptyCart(): array
    {
        return ['items' => [], 'total' => 0];
    }
}