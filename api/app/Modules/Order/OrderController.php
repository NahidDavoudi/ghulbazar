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

    // POST /api/v1/orders
    public function store(Request $request): void
    {
        $data = $request->only([
            'customer_name', 'customer_email', 'customer_phone',
            'shipping_address', 'payment_method',
            'discount_code', 'notes',
        ]);

        try {
            $order = $this->service->placeOrder($request->userId(), $data);
            $this->created($order, 'سفارش با موفقیت ثبت شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // GET /api/v1/orders
    public function index(Request $request): void
    {
        $orders = $this->service->getUserOrders($request->userId());
        $this->success($orders);
    }

    // GET /api/v1/orders/{id}
    public function show(Request $request, int $id): void
    {
        try {
            $isAdmin = $request->user()->role === 'admin';
            $userId  = $isAdmin ? null : $request->userId();
            $order   = $this->service->getFullOrder($id, $userId);
            $this->success($order);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // GET /api/v1/orders/number/{number}
    public function byNumber(Request $request, string $number): void
    {
        try {
            $order = $this->service->getOrderByNumber($number, $request->userId());
            $this->success($order);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // PATCH /api/v1/orders/{id}/cancel
    public function cancel(Request $request, int $id): void
    {
        try {
            $order = $this->service->cancelOrder($id, $request->userId());
            $this->success($order, 'سفارش لغو شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/orders/{id}/receipt
    public function uploadReceipt(Request $request, int $id): void
    {
        $file = $_FILES['receipt'] ?? null;

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل رسید ارسال نشده', 422);
        }

        try {
            $fileData = $this->handleReceiptUpload($file);
            $receipt  = $this->service->uploadReceipt($id, $request->userId(), $fileData);
            $this->created($receipt, 'رسید پرداخت با موفقیت ثبت شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Admin ────────────────────────────────────────────────────

    // GET /api/v1/admin/orders?page=1&status=pending
    public function adminIndex(Request $request): void
    {
        $page   = (int) $request->query('page', 1);
        $limit  = (int) $request->query('limit', 20);
        $status = $request->query('status');

        $result = $this->service->paginateForAdmin($page, $limit, $status ?: null);
        $this->success($result);
    }

    // PATCH /api/v1/admin/orders/{id}/status
    public function updateStatus(Request $request, int $id): void
    {
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
        $maxSize = 5 * 1024 * 1024;

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