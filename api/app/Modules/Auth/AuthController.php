<?php
namespace App\Modules\Auth;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\Auth\Auth;

class AuthController extends Controller
{
    private AuthService $service;

    public function __construct()
    {
        $this->service = new AuthService();
    }

    // POST /auth/register
    public function register(Request $request): void
    {
        $data = $request->only(['name', 'phone', 'password']);
        try {
            $result = $this->service->register($data);
            $this->created($result);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /auth/login
    public function login(Request $request): void
    {
        $phone = $request->input('phone');
        $password = $request->input('password');
        if (!$phone || !$password) {
            $this->error('تلفن و رمز عبور الزامی است');
        }
        try {
            $result = $this->service->login($phone, $password);
            $this->success($result);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 401);
        }
    }

    // GET /auth/me
    public function me(): void
    {
        $userId = $this->userId();
        if (!$userId) {
            $this->unauthorized();
        }
        $user = $this->service->me($userId);
        if (!$user) {
            $this->notFound();
        }
        $this->success($user);
    }
}