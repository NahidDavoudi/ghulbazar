<?php

namespace App\Modules\Users;

use App\Core\Controller;
use App\Core\Http\Request;

class UsersController extends Controller
{
    private UsersService $service;

    public function __construct()
    {
        $this->service = new UsersService(
            new UsersModel(),
            new UsersAddressModel(),
        );
    }

    // ─── Profile ─────────────────────────────────────────────────

    // GET /user/profile
    public function profile(): void
    {
        try {
            $this->success($this->service->getProfile($this->userId()));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /user/update
    public function update(Request $request): void
    {
        $data = $request->only(['name', 'email']);

        try {
            $user = $this->service->updateProfile($this->userId(), $data);
            $this->success($user, 'پروفایل بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /user/changePassword
    public function Password(Request $request): void
    {
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
        $this->success($this->service->getAddresses($this->userId()));
    }

    // POST /user/addAddress
    public function addAddress(Request $request): void
    {
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
        $this->success($this->service->getAllUsers());
    }

    // PUT /user/deactivate/123  (ادمین)
    public function deactivate(int $userId): void
    {
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
        try {
            $this->service->activateUser($userId);
            $this->success(null, 'کاربر فعال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
