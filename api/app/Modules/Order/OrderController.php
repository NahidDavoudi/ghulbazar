<?php

namespace App\Modules\Order;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\UploadHelper;
use App\Modules\Cart\CartModel;
use App\Modules\Cart\CartService;
use App\Modules\Cart\CartItemModel;
use App\Modules\Discount\DiscountModel;
use App\Modules\Product\ProductModel;
use App\Modules\Variant\VariantService;
use App\Modules\Variant\ProductVariantModel;
use App\Modules\Variant\InventoryModel;
use App\Modules\Attribute\AttributeValueModel;

class OrderController extends Controller
{
    private OrderService $service;

    public function __construct()
    {
        $variantService = new VariantService(
            new ProductVariantModel(),
            new InventoryModel(),
            new ProductModel(),
            new AttributeValueModel(),
        );

        $cartService = new CartService(
            new CartModel(),
            new CartItemModel(),
            new ProductModel(),
            new DiscountModel(),
            $variantService,
            new InventoryModel(),
        );

        $this->service = new OrderService(
            new OrderModel(),
            new OrderItemModel(),
            new PaymentReceiptModel(),
            new CartModel(),
            $cartService,
            new ProductModel(),
            new DiscountModel(),
            $variantService,
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
            $fileData = UploadHelper::storeReceipt($file);
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

    // GET /api/v1/admin/orders/{id}
    public function adminShow(Request $request, int $id): void
    {
        try {
            $order = $this->service->getFullOrder($id);
            $this->success($order);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // PATCH /api/v1/admin/orders/{id}/status
    public function updateStatus(Request $request, int $id): void
    {
        $status = $request->input('status');
        $cancelReason = $request->input('cancel_reason');

        if (!$status) {
            $this->error('status الزامی است', 422);
        }

        try {
            $reason = ($status === 'cancelled') ? $cancelReason : null;
            $order = $this->service->updateStatus($id, $status, $reason);
            $this->success($order, 'وضعیت سفارش بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PATCH /api/v1/admin/orders/{id}/approve-receipt
    public function approveReceipt(Request $request, int $id): void
    {
        try {
            $order = $this->service->approveReceipt($id);
            $this->success($order, 'رسید تایید و سفارش پرداخت‌شده علامت‌گذاری شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PATCH /api/v1/admin/orders/{id}/reject-receipt
    public function rejectReceipt(Request $request, int $id): void
    {
        $reason = trim((string) $request->input('reason', ''));

        try {
            $order = $this->service->rejectReceipt($id, $reason);
            $this->success($order, 'رسید رد شد و سفارش لغو شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}