<?php
namespace App\Modules\Discount;

use App\Core\Controller;
use App\Core\Http\Request;

class DiscountController extends Controller
{
    private DiscountService $service;

    public function __construct()
    {
        $this->service = new DiscountService();
    }

    // GET /discount/validate?code=X
    public function validate(Request $request): void
    {
        $code = $request->query('code', '');
        if (!$code) {
            $this->error('کد تخفیف ارسال نشده');
        }
        $discount = $this->service->validateCode($code);
        if (!$discount) {
            $this->error('کد تخفیف نامعتبر یا منقضی شده', 404);
        }
        $this->success($discount);
    }

    // POST /discount/store (ادمین)
    public function store(Request $request): void
    {
        $this->requireAdmin();
        $data = $request->only(['code', 'type', 'value', 'valid_from', 'valid_to']);
        if (empty($data['code']) || empty($data['type']) || !isset($data['value'])) {
            $this->error('code, type, value الزامی است');
        }
        $id = $this->service->create($data);
        $this->created(['id' => $id]);
    }

    // DELETE /discount/destroy/123 (ادمین)
    public function destroy(int $id): void
    {
        $this->requireAdmin();
        $this->service->deactivate($id);
        $this->noContent('کد تخفیف غیرفعال شد');
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') {
            $this->forbidden();
        }
    }
}