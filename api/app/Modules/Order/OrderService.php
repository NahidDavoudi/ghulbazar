<?php

namespace App\Modules\Order;

use App\Core\Database\Database;
use App\Modules\Cart\CartModel;
use App\Modules\Cart\CartService;
use App\Modules\Discount\DiscountModel;
use App\Modules\Product\ProductModel;

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
                'payment_method'  => $data['payment_method'],
                'status'          => 'pending',
                'notes'           => trim($data['notes'] ?? ''),
            ]);

            // ثبت آیتم‌ها و کاهش موجودی
            $orderItems = [];
            foreach ($cart['items'] as $item) {
                $orderItems[] = [
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                    'price'      => $item['price'],
                ];
                // کاهش موجودی — اگه stock کم بود rollback میشه
                $ok = $this->productModel->decrementStock($item['product_id'], $item['quantity']);
                if (!$ok) {
                    throw new \RuntimeException("موجودی «{$item['name']}» کافی نیست.", 422);
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
        return $this->orderModel->getByUser($userId);
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
        return $this->orderModel->paginateForAdmin($page, $limit, $status);
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

    public function updateStatus(int $orderId, string $status): array
    {
        $order = $this->orderModel->find($orderId);
        if (!$order) {
            throw new \RuntimeException('سفارش یافت نشد.', 404);
        }

        $ok = $this->orderModel->updateStatus($orderId, $status);
        if (!$ok) {
            throw new \RuntimeException('وضعیت ارسالی معتبر نیست.', 422);
        }

        // اگه سفارش لغو شد، موجودی رو برگردون
        if ($status === 'cancelled' && $order['status'] !== 'cancelled') {
            $items = $this->itemModel->getByOrderId($orderId);
            foreach ($items as $item) {
                $this->productModel->incrementStock($item['product_id'], $item['quantity']);
            }
        }

        return $this->getFullOrder($orderId);
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