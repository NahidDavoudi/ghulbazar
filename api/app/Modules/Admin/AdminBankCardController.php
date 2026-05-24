<?php

namespace App\Modules\Admin;

use App\Core\Controller;
use App\Core\Http\Request;

class AdminBankCardController extends Controller
{
    private AdminBankCardService $service;

    public function __construct()
    {
        $this->service = new AdminBankCardService();
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') {
            $this->forbidden();
        }
    }

    // GET /admin-bank-card/index
    public function index(): void
    {
        $this->requireAdmin();
        $this->success($this->service->getAll());
    }

    // GET /admin-bank-card/active  (عمومی — نمایش به مشتری)
    public function active(): void
    {
        $this->success($this->service->getActive());
    }

    // POST /admin-bank-card/store
    public function store(Request $request): void
    {
        $this->requireAdmin();

        // نام فیلد: account_holder (نه account_holder_name که در controller قدیمی بود)
        $data = $request->only(['bank_name', 'card_number', 'account_holder', 'sheba', 'is_active']);

        try {
            $card = $this->service->create($data);
            $this->created($card);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /admin-bank-card/update/123
    public function update(Request $request, int $id): void
    {
        $this->requireAdmin();

        $data = $request->only(['bank_name', 'card_number', 'account_holder', 'sheba', 'is_active']);

        try {
            $card = $this->service->update($id, $data);
            $this->success($card, 'کارت بانکی بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /admin-bank-card/toggle/123
    public function toggle(int $id): void
    {
        $this->requireAdmin();

        try {
            $card   = $this->service->toggleActive($id);
            $status = $card['is_active'] ? 'فعال' : 'غیرفعال';
            $this->success($card, "کارت {$status} شد");
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /admin-bank-card/destroy/123
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
