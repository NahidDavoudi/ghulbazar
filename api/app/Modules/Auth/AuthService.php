<?php
namespace App\Modules\Auth;

use App\Core\Auth\Auth as JwtAuth;
use App\Core\Database\Database;
use App\Modules\User\UserModel;
use Exception;

class AuthService
{
    private UserModel $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    public function register(array $data): array
    {
        if (empty($data['name']) || empty($data['phone']) || empty($data['password'])) {
            throw new Exception('نام، تلفن و رمز عبور الزامی است');
        }
        // چک تکراری بودن تلفن
        if ($this->userModel->exists('phone', $data['phone'])) {
            throw new Exception('شماره تلفن قبلاً ثبت شده است', 409);
        }
        $hashed = password_hash($data['password'], PASSWORD_BCRYPT);
        $userId = $this->userModel->create([
            'name'          => $data['name'],
            'phone'         => $data['phone'],
            'password_hash' => $hashed,
            'role'          => 'user'
        ]);
        $user = $this->userModel->find($userId);
        unset($user['password_hash']);
        $token = JwtAuth::generateToken(['user_id' => $userId, 'role' => 'user'], 86400 * 30);
        return ['token' => $token, 'user' => $user];
    }

    public function login(string $phone, string $password): array
    {
        $user = $this->userModel->findBy('phone', $phone);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new Exception('اطلاعات ورود نادرست است', 401);
        }
        unset($user['password_hash']);
        $token = JwtAuth::generateToken(['user_id' => $user['id'], 'role' => $user['role']], 86400 * 30);
        return ['token' => $token, 'user' => $user];
    }

    public function me(int $userId): ?array
    {
        $user = $this->userModel->find($userId);
        if ($user) unset($user['password_hash']);
        return $user;
    }
}