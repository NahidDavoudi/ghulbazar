<?php

namespace App\Modules\Auth;

use App\Core\Auth\Auth as JwtAuth;
use App\Modules\Users\UsersModel;

class AuthService
{
    private UsersModel $userModel;

    public function __construct()
    {
        $this->userModel = new UsersModel();
    }

    // ─── Token Pair (OTP / Login) ─────────────────────────────────

    public function issueTokenPair(array $user): array
    {
        $role = $user['role'] ?? 'user';
        $payload = ['user_id' => (int) $user['id'], 'role' => $role];

        $accessTtl = $role === 'admin' ? 3600 : 900;

        return [
            'token'         => JwtAuth::generateToken($payload, $accessTtl),
            'refresh_token' => JwtAuth::generateRefreshToken((int) $user['id'], $payload),
            'token_type'    => 'Bearer',
            'expires_in'    => $accessTtl,
            'user'          => $user,
        ];
    }

    public function logout(string $refreshToken): void
    {
        if (empty(trim($refreshToken))) {
            throw new \Exception('توکن رفرش الزامی است.', 422);
        }

        JwtAuth::revokeRefreshToken($refreshToken);
    }

    // ─── Register ────────────────────────────────────────────────

    public function register(array $data): array
    {
        if (empty($data['name']) || empty($data['phone']) || empty($data['password'])) {
            throw new \Exception('نام، تلفن و رمز عبور الزامی است.');
        }

        $this->validatePhone($data['phone']);
        $this->validatePassword($data['password']);

        if ($this->userModel->exists('phone', $data['phone'])) {
            throw new \Exception('شماره تلفن قبلاً ثبت شده است.', 409);
        }

        $userId = $this->userModel->create([
            'name'          => trim($data['name']),
            'phone'         => $data['phone'],
            'password'      => $data['password'],   // UserModel هش میکنه
            'role'          => 'user',
            'is_active'     => 1,
        ]);

        $user  = $this->userModel->find($userId);
        unset($user['password_hash']);

        $token = JwtAuth::generateToken(
            ['user_id' => $userId, 'role' => 'user'],
            86400 * 30
        );

        return ['token' => $token, 'user' => $user];
    }

    // ─── Login ────────────────────────────────────────────────────

    public function login(string $phone, string $password): array
    {
        $this->validatePhone($phone);

        $user = $this->userModel->findBy('phone', $phone);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \Exception('شماره تلفن یا رمز عبور اشتباه است.', 401);
        }

        if (!$user['is_active']) {
            throw new \Exception('حساب کاربری شما غیرفعال شده است.', 403);
        }

        unset($user['password_hash']);

        $token = JwtAuth::generateToken(
            ['user_id' => $user['id'], 'role' => $user['role']],
            86400 * 30
        );

        return ['token' => $token, 'user' => $user];
    }

    // ─── Admin Login ──────────────────────────────────────────────

    public function adminLogin(string $phone, string $password): array
    {
        $this->validatePhone($phone);

        $user = $this->userModel->findBy('phone', $phone);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \Exception('اطلاعات ورود نادرست است.', 401);
        }

        if ($user['role'] !== 'admin') {
            throw new \Exception('دسترسی مجاز نیست.', 403);
        }

        if (!$user['is_active']) {
            throw new \Exception('حساب کاربری غیرفعال است.', 403);
        }

        unset($user['password_hash']);

        $token = JwtAuth::generateToken(
            ['user_id' => $user['id'], 'role' => 'admin'],
            86400 * 7    // ادمین توکن کوتاه‌تر
        );

        return ['token' => $token, 'user' => $user];
    }

    // ─── Me ───────────────────────────────────────────────────────

    public function me(int $userId): array
    {
        $user = $this->userModel->find($userId);

        if (!$user) {
            throw new \Exception('کاربر یافت نشد.', 404);
        }

        if (!$user['is_active']) {
            throw new \Exception('حساب کاربری غیرفعال است.', 403);
        }

        unset($user['password_hash']);
        return $user;
    }

    // ─── Refresh Token ────────────────────────────────────────────

    public function refreshToken(int $userId, string $role): array
    {
        $user = $this->userModel->find($userId);

        if (!$user || !$user['is_active']) {
            throw new \Exception('کاربر یافت نشد یا غیرفعال است.', 401);
        }

        $ttl   = $role === 'admin' ? 86400 * 7 : 86400 * 30;
        $token = JwtAuth::generateToken(
            ['user_id' => $userId, 'role' => $role],
            $ttl
        );

        unset($user['password_hash']);

        return ['token' => $token, 'user' => $user];
    }

    // ─── Validation Helpers ───────────────────────────────────────

    protected function validatePhone(string $phone): void
    {
        if (!preg_match('/^(?:\+98|0)?9\d{9}$/', $phone)) {
            throw new \Exception('شماره تلفن وارد شده نامعتبر است.');
        }
    }

    protected function validatePassword(string $password): void
    {
        if (strlen($password) < 8) {
            throw new \Exception('رمز عبور باید حداقل ۸ کاراکتر باشد.');
        }
    }
}