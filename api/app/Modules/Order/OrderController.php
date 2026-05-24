<?php

namespace App\Modules\Order;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Modules\Cart\CartModel;
use App\Modules\Cart\CartService;
use App\Modules\Cart\CartItemModel;
use App\Modules\Discount\DiscountModel;
use App\Modules\Product\ProductModel;

class OrderController extends Controller
{
    private OrderService $service;

    public function __construct()
    {
        $cartService = new CartService(
            new CartModel(),
            new CartItemModel(),
            new ProductModel(),
            new DiscountModel(),
        );

        $this->service = new OrderService(
            new OrderModel(),
            new OrderItemModel(),
            new PaymentReceiptModel(),
            new CartModel(),
            $cartService,
            new ProductModel(),
            new DiscountModel(),
        );
    }

    private function requireAuth(): void
    {
        if (!$this->isAuthenticated()) {
            $this->unauthorized();
        }
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') {
            $this->forbidden();
        }
    }

    // POST /order/store  — ثبت سفارش جدید
    public function store(Request $request): void
    {
        $this->requireAuth();

        $data = $request->only([
            'customer_name', 'customer_email', 'customer_phone',
            'shipping_address', 'payment_method',
            'discount_code', 'notes',
        ]);

        try {
            $order = $this->service->placeOrder($this->userId(), $data);
            $this->created($order, 'سفارش با موفقیت ثبت شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // GET /order/index  — لیست سفارشات کاربر جاری
    public function index(): void
    {
        $this->requireAuth();

        $orders = $this->service->getUserOrders($this->userId());
        $this->success($orders);
    }

    // GET /order/show/123  — جزئیات یک سفارش
    public function show(int $id): void
    {
        $this->requireAuth();

        try {
            $isAdmin = $this->user()->role === 'admin';
            $userId  = $isAdmin ? null : $this->userId();
            $order   = $this->service->getFullOrder($id, $userId);
            $this->success($order);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // GET /order/byNumber/GB-XXXXXX
    public function byNumber(string $number): void
    {
        $this->requireAuth();

        try {
            $order = $this->service->getOrderByNumber($number, $this->userId());
            $this->success($order);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // POST /order/cancel/123  — لغو سفارش توسط کاربر
    public function cancel(int $id): void
    {
        $this->requireAuth();

        try {
            $order = $this->service->cancelOrder($id, $this->userId());
            $this->success($order, 'سفارش لغو شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /order/uploadReceipt/123  — آپلود رسید پرداخت
    public function uploadReceipt(int $orderId): void
    {
        $this->requireAuth();

        $file = $_FILES['receipt'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل رسید ارسال نشده', 422);
        }

        try {
            $fileData = $this->handleReceiptUpload($file);
            $receipt  = $this->service->uploadReceipt($orderId, $this->userId(), $fileData);
            $this->created($receipt, 'رسید پرداخت با موفقیت ثبت شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Admin endpoints ──────────────────────────────────────────

    // GET /order/adminIndex?page=1&status=pending
    public function adminIndex(Request $request): void
    {
        $this->requireAdmin();

        $page   = (int) $request->query('page', 1);
        $limit  = (int) $request->query('limit', 20);
        $status = $request->query('status');

        $result = $this->service->paginateForAdmin($page, $limit, $status ?: null);
        $this->success($result);
    }

    // PUT /order/updateStatus/123
    public function updateStatus(Request $request, int $id): void
    {
        $this->requireAdmin();

        $status = $request->input('status');
        if (!$status) {
            $this->error('status الزامی است', 422);
        }

        try {
            $order = $this->service->updateStatus($id, $status);
            $this->success($order, 'وضعیت سفارش بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Upload Helper ────────────────────────────────────────────

    private function handleReceiptUpload(array $file): array
    {
        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        $maxSize = 5 * 1024 * 1024; // 5MB

        if (!in_array($file['type'], $allowed)) {
            throw new \RuntimeException('فرمت فایل مجاز نیست. فقط JPG، PNG، WebP و PDF قابل قبول است.', 422);
        }
        if ($file['size'] > $maxSize) {
            throw new \RuntimeException('حجم فایل بیشتر از ۵ مگابایت است.', 422);
        }

        $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid('receipt_', true) . '.' . $ext;
        $dir      = __DIR__ . '/../../../public/uploads/receipts/';

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) {
            throw new \RuntimeException('خطا در آپلود فایل.', 500);
        }

        return [
            'file_name' => $filename,
            'file_path' => "/uploads/receipts/{$filename}",
        ];
    }
}
