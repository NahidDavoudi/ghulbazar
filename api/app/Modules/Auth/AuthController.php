<?php

namespace App\Modules\Auth;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Core\Sms\SmsService;
use App\Modules\Users\UsersModel;

class AuthController extends Controller
{
    private LoginRateLimiter $loginRateLimiter;

    public function __construct()
    {
        $this->service = new AuthService();
        $this->otpService = new OtpService(
            new OtpModel(),
            $this->service,
            new SmsService(),
            new UsersModel(),
        );
        $this->loginRateLimiter = new LoginRateLimiter();
    }

    private AuthService $service;
    private OtpService $otpService;

    // POST /api/v1/auth/otp/request
    public function otpRequest(Request $request): void
    {
        $phone   = $request->input('phone');
        $purpose = $request->input('purpose', 'login');

        if (!$phone) {
            $this->error('شماره موبایل الزامی است', 422);
        }

        try {
            $result = $this->otpService->request($phone, $purpose);
            $this->success($result, 'کد تایید ارسال شد');
        } catch (\RuntimeException $e) {
            $code = $e->getCode() ?: 400;
            if ($code === 429) {
                $this->tooManyRequests($e->getMessage());
            }
            $this->error($e->getMessage(), $code);
        }
    }

    // POST /api/v1/auth/otp/verify
    public function otpVerify(Request $request): void
    {
        $phone    = $request->input('phone');
        $code     = $request->input('code');
        $purpose  = $request->input('purpose', 'login');
        $name     = $request->input('name');
        $password = $request->input('password');

        if (!$phone || !$code) {
            $this->error('شماره موبایل و کد تایید الزامی است', 422);
        }

        try {
            $result = $this->otpService->verify($phone, $code, $purpose, $name, $password);
            $this->success($result, 'ورود موفق');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 422);
        }
    }

    // POST /api/v1/auth/register
    public function register(Request $request): void
    {
        $data = $request->only(['name', 'phone', 'password']);

        try {
            $result = $this->service->register($data);
            $this->created($result, 'ثبت‌نام با موفقیت انجام شد');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/auth/login
    public function login(Request $request): void
    {
        $phone    = $request->input('phone');
        $password = $request->input('password');

        if (!$phone || !$password) {
            $this->error('شماره تلفن و رمز عبور الزامی است', 422);
        }

        try {
            if ($this->loginRateLimiter->tooManyAttempts('login', $phone)) {
                $this->tooManyRequests('تعداد تلاش‌های ورود بیش از حد مجاز است. ۱۵ دقیقه دیگر تلاش کنید.');
            }

            $result = $this->service->login($phone, $password);
            $this->loginRateLimiter->clear('login', $phone);
            $this->success($result, 'ورود موفق');
        } catch (\PDOException $e) {
            $this->error('خطا در سرویس ورود. لطفاً با پشتیبانی تماس بگیرید.', 503);
        } catch (\Exception $e) {
            try {
                $this->loginRateLimiter->hit('login', $phone);
            } catch (\PDOException) {
                /* rate limit storage unavailable */
            }
            $this->error($e->getMessage(), $e->getCode() ?: 401);
        }
    }

    // POST /api/v1/auth/admin-login
    public function adminLogin(Request $request): void
    {
        $phone    = $request->input('phone');
        $password = $request->input('password');

        if (!$phone || !$password) {
            $this->error('شماره تلفن و رمز عبور الزامی است', 422);
        }

        if ($this->loginRateLimiter->tooManyAttempts('admin-login', $phone)) {
            $this->tooManyRequests('تعداد تلاش‌های ورود بیش از حد مجاز است. ۱۵ دقیقه دیگر تلاش کنید.');
        }

        try {
            $result = $this->service->adminLogin($phone, $password);
            $this->loginRateLimiter->clear('admin-login', $phone);
            $this->success($result, 'ورود ادمین موفق');
        } catch (\Exception $e) {
            $this->loginRateLimiter->hit('admin-login', $phone);
            $this->error($e->getMessage(), $e->getCode() ?: 401);
        }
    }

    // POST /api/v1/auth/logout
    public function logout(Request $request): void
    {
        $refreshToken = $request->input('refresh_token');

        try {
            $this->service->logout($refreshToken ?? '');
            $this->success(null, 'خروج موفق');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // GET /api/v1/auth/me
    public function me(Request $request): void
    {
        try {
            $user = $this->service->me($request->userId());
            $this->success($user);
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/auth/refresh
    public function refresh(Request $request): void
    {
        try {
            $result = $this->service->refreshToken(
                $request->userId(),
                $request->user()->role ?? 'user'
            );
            $this->success($result, 'توکن تمدید شد');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 401);
        }
    }
}