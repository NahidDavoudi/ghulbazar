<?php
namespace App\Modules\Order;

use App\Core\Database\Database;
use Exception;
use PDO;

class OrderService
{
    private OrderModel $orderModel;
    private OrderItemModel $itemModel;
    private PaymentReceiptModel $receiptModel;

    public function __construct()
    {
        $this->orderModel = new OrderModel();
        $this->itemModel = new OrderItemModel();
        $this->receiptModel = new PaymentReceiptModel();
    }

    public function createOrder(array $data, ?array $receiptFile, ?int $userId): array
    {
        // validation
        if (empty($data['items'])) throw new Exception('سبد خرید خالی است');
        if (empty($data['customer_name'])) throw new Exception('نام الزامی است');
        if (empty($data['customer_phone'])) throw new Exception('تلفن الزامی است');
        if (empty($data['shipping_address'])) throw new Exception('آدرس الزامی است');

        $total = 0;
        $validItems = [];
        $pdo = Database::getInstance()->getConnection();

        foreach ($data['items'] as $item) {
            $stmt = $pdo->prepare('SELECT id, price, stock FROM products WHERE id = ?');
            $stmt->execute([$item['product_id']]);
            $prod = $stmt->fetch();
            if (!$prod) throw new Exception("محصول {$item['product_id']} یافت نشد");
            if ($prod['stock'] < 1) throw new Exception("محصول {$prod['id']} ناموجود است");
            $qty = max(1, (int)$item['qty']);
            $total += $prod['price'] * $qty;
            $validItems[] = ['product_id' => $prod['id'], 'qty' => $qty, 'price' => $prod['price']];
        }

        // اعمال تخفیف
        $discountId = null;
        if (!empty($data['discount_code'])) {
            $stmt = $pdo->prepare('SELECT id, type, value FROM discount_codes WHERE code = ? AND is_active = 1 AND valid_from <= NOW() AND valid_to >= NOW()');
            $stmt->execute([$data['discount_code']]);
            $disc = $stmt->fetch();
            if ($disc) {
                $discountId = $disc['id'];
                $discountAmount = ($disc['type'] === 'percent') ? $total * ($disc['value'] / 100) : min($total, $disc['value']);
                $total -= $discountAmount;
            }
        }

        $shipping = $total >= 1500000 ? 0 : 50000;
        $total += $shipping;
        $orderNumber = 'GB-' . strtoupper(substr(uniqid(), -6));

        $receiptUrl = null;
        if ($receiptFile && $receiptFile['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../../public/uploads/receipts/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
            $filename = $orderNumber . '_' . time() . '.jpg';
            move_uploaded_file($receiptFile['tmp_name'], $uploadDir . $filename);
            $receiptUrl = '/uploads/receipts/' . $filename;
        }

        $pdo->beginTransaction();
        try {
            $orderId = $this->orderModel->create([
                'order_number'     => $orderNumber,
                'customer_name'    => $data['customer_name'],
                'customer_phone'   => $data['customer_phone'],
                'shipping_address' => $data['shipping_address'],
                'total_amount'     => $total,
                'discount_code_id' => $discountId,
                'status'           => 'pending',
                'user_id'          => $userId,
                'receipt_url'      => $receiptUrl
            ]);
            foreach ($validItems as $item) {
                $this->itemModel->create([
                    'order_id'   => $orderId,
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['qty'],
                    'price'      => $item['price']
                ]);
            }
            // اگر رسید آپلود شده، در جدول payment_receipts هم ذخیره کن
            if ($receiptUrl) {
                $this->receiptModel->create([
                    'order_id'  => $orderId,
                    'file_name' => basename($receiptUrl),
                    'file_path' => $receiptUrl
                ]);
            }
            $pdo->commit();

            // پاک کردن سبد خرید (دسترسی به session - می‌توانید از CartService استفاده کنید)
            if (session_status() === PHP_SESSION_NONE) session_start();
            $_SESSION['cart'] = [];

            return ['id' => $orderId, 'order_number' => $orderNumber, 'total_amount' => $total];
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public function getByNumber(string $number): ?array
    {
        $order = $this->orderModel->findBy('order_number', $number);
        if ($order) {
            $order['items'] = $this->itemModel->getByOrderId($order['id']);
        }
        return $order;
    }

    public function getById(int $id, ?int $userId, bool $isAdmin): ?array
    {
        $order = $this->orderModel->find($id);
        if (!$order) return null;
        if (!$isAdmin && $order['user_id'] != $userId) return null;
        $order['items'] = $this->itemModel->getByOrderId($id);
        return $order;
    }

    public function getAllForAdmin(array $filters): array
    {
        return $this->orderModel->paginateForAdmin($filters);
    }

    public function getUserOrders(int $userId): array
    {
        return $this->orderModel->getByUser($userId);
    }

    public function updateStatus(int $id, string $status): void
    {
        $this->orderModel->update($id, ['status' => $status]);
    }

    public function uploadReceiptForOrder(string $orderNumber, array $file): void
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare('SELECT id FROM orders WHERE order_number = ?');
        $stmt->execute([$orderNumber]);
        $order = $stmt->fetch();

        if (!$order) {
            throw new \Exception('سفارش یافت نشد');
        }

        $orderId = $order['id'];

        $uploadDir = __DIR__ . '/../../../public/uploads/receipts/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $filename = $orderNumber . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.jpg';
        $path = $uploadDir . $filename;
        if (!move_uploaded_file($file['tmp_name'], $path)) {
            throw new \Exception('خطا در ذخیره فایل');
        }
        $url = '/uploads/receipts/' . $filename;

        // ذخیره در جدول payment_receipts
        $this->receiptModel->create([
            'order_id'  => $orderId,
            'file_name' => $filename,
            'file_path' => $url
        ]);
        // به‌روزرسانی وضعیت سفارش به paid
        $this->orderModel->update($orderId, ['status' => 'paid', 'receipt_url' => $url]);
    }
}