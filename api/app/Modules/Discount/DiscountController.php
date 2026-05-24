<?php

namespace App\Modules\Discount;

use App\Core\Controller;
use App\Core\Http\Request;

class DiscountController extends Controller
{
    private DiscountService $service;

    public function __construct()
    {
        $this->service = new DiscountService(new DiscountModel());
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') {
            $this->forbidden();
        }
    }

    // GET /discount/validate?code=X&total=500000
    public function validate(Request $request): void
    {
        $code  = trim($request->query('code', ''));
        $total = (int) $request->query('total', 0);

        if (!$code) {
            $this->error('کد تخفیف ارسال نشده', 422);
        }

        try {
            $result = $this->service->validate($code, $total);
            $this->success($result);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 422);
        }
    }

    // GET /discount/index  (ادمین — همه کدها)
    public function index(): void
    {
        $this->requireAdmin();
        $this->success($this->service->getAll());
    }

    // GET /discount/active  (ادمین — فقط فعال‌ها)
    public function active(): void
    {
        $this->requireAdmin();
        $this->success($this->service->getActive());
    }

    // POST /discount/store  (ادمین)
    public function store(Request $request): void
    {
        $this->requireAdmin();

        $data = $request->only(['code', 'type', 'value', 'valid_from', 'valid_to', 'is_active']);

        try {
            $discount = $this->service->create($data);
            $this->created($discount);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /discount/update/123  (ادمین)
    public function update(Request $request, int $id): void
    {
        $this->requireAdmin();

        $data = $request->only(['code', 'type', 'value', 'valid_from', 'valid_to', 'is_active']);

        try {
            $discount = $this->service->update($id, $data);
            $this->success($discount, 'کد تخفیف بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /discount/deactivate/123  (ادمین)
    public function deactivate(int $id): void
    {
        $this->requireAdmin();

        try {
            $this->service->deactivate($id);
            $this->success(null, 'کد تخفیف غیرفعال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /discount/destroy/123  (ادمین)
    public function destroy(int $id): void
    {
        $this->requireAdmin();

        try {
            $this->service->delete($id);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
