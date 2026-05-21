<?php
namespace App\Modules\Order;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\Auth\Auth;

class OrderController extends Controller
{
    private OrderService $service;

    public function __construct()
    {
        $this->service = new OrderService();
    }

    // POST /orders
    public function store(Request $request): void
    {
        $data = $request->only(['items', 'customer_name', 'customer_phone', 'shipping_address', 'discount_code']);
        $receiptFile = $_FILES['receipt'] ?? null;
        $result = $this->service->createOrder($data, $receiptFile, Auth::id());
        $this->created($result);
    }

    // GET /orders?number=GB-XXXX (مهمان) یا GET /orders (لیست کاربر)
    public function index(Request $request): void
    {
        $orderNumber = $request->query('number');
        if ($orderNumber) {
            $order = $this->service->getByNumber($orderNumber);
            $this->success($order);
        } elseif ($this->isAuthenticated()) {
            if (Auth::role() === 'admin') {
                $filters = [
                    'status'     => $request->query('status'),
                    'search'     => $request->query('search'),
                    'start_date' => $request->query('start_date'),
                    'end_date'   => $request->query('end_date'),
                    'page'       => (int)$request->query('page', 1),
                    'limit'      => (int)$request->query('limit', 20),
                ];
                $this->success($this->service->getAllForAdmin($filters));
            } else {
                $orders = $this->service->getUserOrders(Auth::id());
                $this->success($orders);
            }
        } else {
            $this->unauthorized('برای مشاهده سفارشات وارد شوید');
        }
    }

    // GET /orders/123
    public function show(int $id): void
    {
        $order = $this->service->getById($id, Auth::id(), Auth::role() === 'admin');
        if (!$order) $this->notFound();
        $this->success($order);
    }

    // PUT /orders/123/status (ادمین)
    public function updateStatus(Request $request, int $id): void
    {
        $this->requireAdmin();
        $status = $request->input('status');
        $this->service->updateStatus($id, $status);
        $this->success(null, 'وضعیت سفارش تغییر کرد');
    }

    // POST /order/upload-receipt
    public function uploadReceipt(Request $request): void
    {
        $orderNumber = $request->input('order_number');
        if (!$orderNumber) {
            $this->error('شماره سفارش الزامی است');
        }

        $file = $_FILES['receipt'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل رسید ارسال نشده');
        }

        try {
            $this->service->uploadReceiptForOrder($orderNumber, $file);
            $this->success(null, 'رسید با موفقیت آپلود شد و سفارش به حالت پرداخت شده تغییر یافت');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || Auth::role() !== 'admin') $this->forbidden();
    }
}