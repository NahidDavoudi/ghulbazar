<?php

namespace App\Modules\User;

use App\Core\Controller;
use App\Core\Http\Request;

class UserController extends Controller
{
    private UserService $service;

    public function __construct()
    {
        $this->service = new UserService(
            new UserModel(),
            new UserAddressModel(),
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

    // ─── Profile ─────────────────────────────────────────────────

    // GET /user/profile
    public function profile(): void
    {
        $this->requireAuth();

        try {
            $this->success($this->service->getProfile($this->userId()));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /user/update
    public function update(Request $request): void
    {
        $this->requireAuth();

        $data = $request->only(['name', 'email']);

        try {
            $user = $this->service->updateProfile($this->userId(), $data);
            $this->success($user, 'پروفایل بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /user/changePassword
    public function changePassword(Request $request): void
    {
        $this->requireAuth();

        $current = $request->input('current_password');
        $new     = $request->input('new_password');

        if (!$current || !$new) {
            $this->error('رمز عبور فعلی و جدید الزامی است', 422);
        }

        try {
            $this->service->changePassword($this->userId(), $current, $new);
            $this->success(null, 'رمز عبور تغییر کرد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Addresses ────────────────────────────────────────────────

    // GET /user/addresses
    public function addresses(): void
    {
        $this->requireAuth();
        $this->success($this->service->getAddresses($this->userId()));
    }

    // POST /user/addAddress
    public function addAddress(Request $request): void
    {
        $this->requireAuth();

        $data = $request->only(['address', 'city', 'state', 'zip_code']);

        try {
            $address = $this->service->addAddress($this->userId(), $data);
            $this->created($address, 'آدرس اضافه شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /user/updateAddress/123
    public function updateAddress(Request $request, int $addressId): void
    {
        $this->requireAuth();

        $data = $request->only(['address', 'city', 'state', 'zip_code']);

        try {
            $address = $this->service->updateAddress($this->userId(), $addressId, $data);
            $this->success($address, 'آدرس بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /user/deleteAddress/123
    public function deleteAddress(int $addressId): void
    {
        $this->requireAuth();

        try {
            $this->service->deleteAddress($this->userId(), $addressId);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Admin ────────────────────────────────────────────────────

    // GET /user/index  (ادمین)
    public function index(): void
    {
        $this->requireAdmin();
        $this->success($this->service->getAllUsers());
    }

    // PUT /user/deactivate/123  (ادمین)
    public function deactivate(int $userId): void
    {
        $this->requireAdmin();

        try {
            $this->service->deactivateUser($userId);
            $this->success(null, 'کاربر غیرفعال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /user/activate/123  (ادمین)
    public function activate(int $userId): void
    {
        $this->requireAdmin();

        try {
            $this->service->activateUser($userId);
            $this->success(null, 'کاربر فعال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
