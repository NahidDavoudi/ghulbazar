<?php

namespace App\Modules\User;

class UserService
{
    protected UserModel $userModel;
    protected UserAddressModel $addressModel;
    public function __construct() {
        $this->userModel = new UserModel();
        $this->addressModel = new UserAddressModel();
    }

    // ─── Profile ────────────────────────────────────────────────

    public function getProfile(int $userId): array{
        $user = $this->userModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }

        unset($user['password_hash']);
        $user['addresses'] = $this->addressModel->getByUserId($userId);

        return $user;
    }

    public function updateProfile(int $userId, array $data): array{
        $user = $this->userModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }

        $allowed = ['name', 'email'];
        $payload = array_intersect_key($data, array_flip($allowed));

        if (isset($payload['email']) && $payload['email'] !== $user['email']) {
            if ($this->userModel->emailExists($payload['email'], $userId)) {
                throw new \RuntimeException('این ایمیل قبلاً ثبت شده است.', 422);
            }
        }

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلد معتبری برای بروزرسانی ارسال نشد.', 422);
        }

        $this->userModel->update($userId, $payload);

        return $this->getProfile($userId);
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword): void{
        $user = $this->userModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }

        if (!password_verify($currentPassword, $user['password_hash'])) {
            throw new \RuntimeException('رمز عبور فعلی اشتباه است.', 422);
        }

        if (strlen($newPassword) < 8) {
            throw new \RuntimeException('رمز عبور جدید باید حداقل ۸ کاراکتر باشد.', 422);
        }

        $this->userModel->update($userId, ['password' => $newPassword]);
    }

    // ─── Addresses ──────────────────────────────────────────────

    public function getAddresses(int $userId): array
    {
        return $this->addressModel->getByUserId($userId);
    }

    public function addAddress(int $userId, array $data): array
    {
        $required = ['address', 'city', 'state'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \RuntimeException("فیلد {$field} الزامی است.", 422);
            }
        }

        $id = $this->addressModel->create([
            'user_id'  => $userId,
            'address'  => trim($data['address']),
            'city'     => trim($data['city']),
            'state'    => trim($data['state']),
            'zip_code' => trim($data['zip_code'] ?? ''),
        ]);

        return $this->addressModel->find($id);
    }

    public function updateAddress(int $userId, int $addressId, array $data): array
    {
        if (!$this->addressModel->belongsToUser($addressId, $userId)) {
            throw new \RuntimeException('آدرس یافت نشد.', 404);
        }

        $allowed = ['address', 'city', 'state', 'zip_code'];
        $payload = array_filter(
            array_intersect_key($data, array_flip($allowed)),
            fn($v) => $v !== null && $v !== ''
        );

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلد معتبری ارسال نشد.', 422);
        }

        $this->addressModel->update($addressId, $payload);

        return $this->addressModel->find($addressId);
    }

    public function deleteAddress(int $userId, int $addressId): void
    {
        if (!$this->addressModel->belongsToUser($addressId, $userId)) {
            throw new \RuntimeException('آدرس یافت نشد.', 404);
        }

        $this->addressModel->delete($addressId);
    }

    // ─── Admin ──────────────────────────────────────────────────

    public function getAllUsers(): array
    {
        return array_map(function ($user) {
            unset($user['password_hash']);
            return $user;
        }, $this->userModel->getActiveUsers());
    }

    public function getAdminList(): array
    {
        return array_map(function ($user) {
            unset($user['password_hash']);
            return $user;
        }, $this->userModel->getAdmins());
    }

    public function deactivateUser(int $userId): void
    {
        $user = $this->userModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }
        $this->userModel->deactivate($userId);
    }

    public function activateUser(int $userId): void
    {
        $user = $this->userModel->find($userId);
        if (!$user) {
            throw new \RuntimeException('کاربر یافت نشد.', 404);
        }
        $this->userModel->activate($userId);
    }
}