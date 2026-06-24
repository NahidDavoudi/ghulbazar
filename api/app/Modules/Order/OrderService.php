<?php

namespace App\Modules\Order;

use App\Core\Database\Database;
use App\Modules\Cart\CartModel;
use App\Modules\Cart\CartService;
use App\Modules\Discount\DiscountModel;
use App\Modules\Product\ProductModel;
use App\Modules\Variant\VariantService;

class OrderService
{
    public function __construct(
        private OrderModel          $orderModel,
        private OrderItemModel      $itemModel,
        private PaymentReceiptModel $receiptModel,
        private CartModel           $cartModel,
        private CartService         $cartService,
        private ProductModel        $productModel,
        private DiscountModel       $discountModel,
        private VariantService      $variantService,
    ) {}

    // ─── User: place order ────────────────────────────────────────

    /**
     * ثبت سفارش جدید از روی سبد خرید
     *
     * $data keys:
     *   customer_name, customer_email, customer_phone,
     *   shipping_address, payment_method,
     *   discount_code (optional), notes (optional)
     */
    public function placeOrder(int $userId, array $data): array
    {
        $this->validateOrderData($data);

        // اعتبارسنجی سبد و موجودی
        $cart = $this->cartService->validateForCheckout($userId);

        // محاسبه مبلغ نهایی
        $total          = $cart['total'];
        $discountCodeId = null;
        $discountAmount = 0;

        if (!empty($data['discount_code'])) {
            $discount = $this->discountModel->findValidCode($data['discount_code']);
            if (!$discount) {
                throw new \RuntimeException('کد تخفیف معتبر نیست.', 422);
            }
            $discountAmount = $this->discountModel->calculateDiscount($discount, $total);
            $discountCodeId = $discount['id'];
            $total          = max(0, $total - $discountAmount);
        }

        // ثبت سفارش (داخل transaction)
        $pdo = Database::getInstance()->getConnection();

        try {
            $pdo->beginTransaction();

            $orderId = $this->orderModel->create([
                'order_number'    => \App\Modules\Order\OrderModel::generateOrderNumber(),
                'user_id'         => $userId,
                'customer_name'   => trim($data['customer_name']),
                'customer_email'  => trim($data['customer_email'] ?? ''),
                'customer_phone'  => trim($data['customer_phone']),
                'shipping_address'=> trim($data['shipping_address']),
                'total_amount'    => $total,
                'discount_code_id'=> $discountCodeId,
                'payment_method'  => $data['payment_method'] ?? 'cash',
                'status'          => 'pending',
                'notes'           => trim($data['notes'] ?? ''),
            ]);

            // ثبت آیتم‌ها و کاهش موجودی
            $orderItems = [];
            foreach ($cart['items'] as $item) {
                $variantId = (int) ($item['variant_id'] ?? 0);
                $productId = (int) $item['product_id'];

                if (!$variantId && $this->variantService->requiresExplicitVariant($productId)) {
                    throw new \RuntimeException(
                        "برای «{$item['name']}» باید سایز یا رنگ انتخاب شود. لطفاً از سبد حذف و دوباره اضافه کنید.",
                        422
                    );
                }

                $orderItems[] = [
                    'product_id'     => $item['product_id'],
                    'variant_id'     => $variantId ?: null,
                    'variant_title'  => $item['variant_title'] ?? null,
                    'sku'            => $item['sku'] ?? null,
                    'quantity'       => $item['quantity'],
                    'price'          => $item['price'],
                ];
                if ($variantId) {
                    $this->variantService->decrementStock($variantId, $item['quantity']);
                } else {
                    $ok = $this->productModel->decrementStock($item['product_id'], $item['quantity']);
                    if (!$ok) {
                        throw new \RuntimeException("موجودی «{$item['name']}» کافی نیست.", 422);
                    }
                }
            }
            $this->itemModel->createBulk($orderId, $orderItems);

            // خالی کردن سبد
            $cartRecord = $this->cartModel->findByUserId($userId);
            if ($cartRecord) {
                $this->cartModel->clearCart($cartRecord['id']);
            }

            $pdo->commit();

        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return $this->getFullOrder($orderId, $userId);
    }

    // ─── User: view ───────────────────────────────────────────────

    public function getUserOrders(int $userId): array
    {
        $orders = $this->orderModel->getByUser($userId);

        return array_map(function (array $order) {
            $order['items']   = $this->orderModel->getItems($order['id']);
            $order['receipt'] = $this->orderModel->getReceipt($order['id']);
            return $order;
        }, $orders);
    }

    public function getOrderForUser(int $orderId, int $userId): array
    {
        $order = $this->orderModel->getFullOrder($orderId);
        if (!$order || $order['user_id'] !== $userId) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }
        return $order;
    }

    public function getOrderByNumber(string $orderNumber, int $userId): array
    {
        $order = $this->orderModel->findByOrderNumber($orderNumber);
        if (!$order || $order['user_id'] !== $userId) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }
        return $this->orderModel->getFullOrder($order['id']);
    }

    // ─── Payment Receipt ──────────────────────────────────────────

    /**
     * آپلود رسید پرداخت توسط کاربر
     * $fileData: ['file_name' => '...', 'file_path' => '...']
     */
    public function uploadReceipt(int $orderId, int $userId, array $fileData): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order || $order['user_id'] !== $userId) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }

        if ($order['status'] !== 'pending') {
            throw new \RuntimeException('تنها سفارش‌های در انتظار پرداخت قابل ثبت رسید هستند.', 422);
        }

        if ($this->receiptModel->hasReceipt($orderId)) {
            throw new \RuntimeException('رسید قبلاً برای این سفارش ثبت شده است.', 422);
        }

        if (empty($fileData['file_name']) || empty($fileData['file_path'])) {
            throw new \RuntimeException('اطلاعات فایل ناقص است.', 422);
        }

        $id = $this->receiptModel->create([
            'order_id'  => $orderId,
            'file_name' => $fileData['file_name'],
            'file_path' => $fileData['file_path'],
        ]);

        return $this->receiptModel->find($id);
    }

    // ─── Admin ────────────────────────────────────────────────────

    public function paginateForAdmin(int $page = 1, int $limit = 20, ?string $status = null): array
    {
        $result = $this->orderModel->paginateForAdmin($page, $limit, $status);
        $result['data'] = array_map(function (array $order) {
            $order['receipt'] = $this->orderModel->getReceipt($order['id']);
            return $order;
        }, $result['data']);

        return $result;
    }

    public function getFullOrder(int $orderId, ?int $userId = null): array
    {
        $order = $this->orderModel->getFullOrder($orderId);
        if (!$order) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }
        if ($userId !== null && $order['user_id'] !== $userId) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }
        return $order;
    }

    public function updateStatus(int $orderId, string $status, ?string $cancelReason = null): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }

        $ok = $this->orderModel->updateStatus($orderId, $status, $cancelReason);
        if (!$ok) {
            throw new \RuntimeException('وضعیت ارسالی معتبر نیست.', 422);
        }

        // اگه سفارش لغو شد، موجودی رو برگردون
        if ($status === 'cancelled' && $order['status'] !== 'cancelled') {
            $items = $this->itemModel->getByOrderId($orderId);
            foreach ($items as $item) {
                if (!empty($item['variant_id'])) {
                    $this->variantService->incrementStock((int) $item['variant_id'], $item['quantity']);
                } else {
                    $this->productModel->incrementStock($item['product_id'], $item['quantity']);
                }
            }
        }

        return $this->getFullOrder($orderId);
    }

    /**
     * تایید رسید — وضعیت به paid (رسید حذف نمی‌شود)
     */
    public function approveReceipt(int $orderId): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }

        if ($order['status'] !== 'pending') {
            throw new \RuntimeException('فقط سفارش‌های در انتظار پرداخت قابل تایید رسید هستند.', 422);
        }

        if (!$this->receiptModel->hasReceipt($orderId)) {
            throw new \RuntimeException('رسیدی برای این سفارش ثبت نشده است.', 422);
        }

        return $this->updateStatus($orderId, 'paid');
    }

    /**
     * رد رسید — وضعیت به cancelled + ذخیره دلیل (رسید حذف نمی‌شود)
     */
    public function rejectReceipt(int $orderId, string $reason): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }

        if ($order['status'] !== 'pending') {
            throw new \RuntimeException('فقط سفارش‌های در انتظار پرداخت قابل رد رسید هستند.', 422);
        }

        if (!$this->receiptModel->hasReceipt($orderId)) {
            throw new \RuntimeException('رسیدی برای این سفارش ثبت نشده است.', 422);
        }

        $reason = trim($reason);
        if ($reason === '') {
            throw new \RuntimeException('دلیل رد رسید الزامی است.', 422);
        }

        if (mb_strlen($reason) > 500) {
            throw new \RuntimeException('دلیل رد رسید حداکثر ۵۰۰ کاراکتر باشد.', 422);
        }

        return $this->updateStatus($orderId, 'cancelled', $reason);
    }

    public function cancelOrder(int $orderId, int $userId): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order || $order['user_id'] !== $userId) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }

        if (!in_array($order['status'], ['pending'])) {
            throw new \RuntimeException('فقط سفارش‌های در انتظار پرداخت قابل لغو هستند.', 422);
        }

        return $this->updateStatus($orderId, 'cancelled');
    }

    // ─── Private ─────────────────────────────────────────────────

    private function validateOrderData(array $data): void
    {
        $required = ['customer_name', 'customer_phone', 'shipping_address', 'payment_method'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \RuntimeException("فیلد {$field} الزامی است.", 422);
            }
        }

        $validMethods = ['card', 'transfer', 'cash'];
        if (!in_array($data['payment_method'], $validMethods)) {
            throw new \RuntimeException('روش پرداخت معتبر نیست.', 422);
        }
    }
}