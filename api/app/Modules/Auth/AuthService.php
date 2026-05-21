<?php
namespace App\Modules\Auth;
use App\Modules\User\UserModel;
use App\Core\Http\Response;

class AuthService
{
    protected UserModel $userModel;
    public function __construct()
    {
        $this->userModel = new UserModel();
    }
    public function register($data)
    {
        $user = $this->userModel->findByPhone($data['phone']);
        if ($user) {
            Response::error('User with this phone already exists', 422);
        }
        $userData = [
            'phone' => $data['phone'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
            'full_name' => $data['full_name'],
            'role' => 'costumer'
        ];
        try {
            $userId = $this->userModel->create($userData);
            $result = [
                'user_id' => $userId,
                'message' => 'Registration completed successfully.'
            ];
            Response::success($result, 200);
        } catch (\Exception $e) {
            $result = [
                'user_id' => null,
                'message' => $e->getMessage()
            ];
            Response::error($result);
        }
    }

    public function login($data)
    {
        $user = $this->userModel->findByPhone($data['phone']);
        if (!$user) {
            Response::error('User not found', 404);
        }
        if (!password_verify($data['password'], $user['password'])) {
            Response::error('Invalid password', 401);
        }
        $result = [
            'user_id' => $user['id'],
            'message' => 'Login successful.'
        ];
        Response::success($result, 200);
    }
}