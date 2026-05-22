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

    // GET /admin-bank-cards
    public function index(): void
    {
        $this->requireAdmin();
        $this->success($this->service->getAll());
    }

    // POST /admin-bank-cards
    public function store(Request $request): void
    {
        $this->requireAdmin();
        $data = $request->only(['card_number', 'account_holder_name', 'bank_name', 'is_active']);
        if (empty($data['card_number']) || empty($data['account_holder_name'])) {
            $this->error('شماره کارت و نام حساب الزامی است');
        }
        $id = $this->service->create($data);
        $this->created(['id' => $id]);
    }

    // PUT /admin-bank-cards/123
    public function update(Request $request, int $id): void
    {
        $this->requireAdmin();
        $data = $request->only(['card_number', 'account_holder_name', 'bank_name', 'is_active']);
        $this->service->update($id, $data);
        $this->success(null, 'کارت بروزرسانی شد');
    }

    // DELETE /admin-bank-cards/123
    public function destroy(int $id): void
    {
        $this->requireAdmin();
        $this->service->delete($id);
        $this->noContent();
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') $this->forbidden();
    }
}