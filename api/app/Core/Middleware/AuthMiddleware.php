<?php

namespace App\Core\Middleware;

use App\Core\Http\MiddlewareInterface;
use App\Core\Http\Request;
use App\Core\Http\Response;
use App\Core\Auth\Auth;

/**
 * Middleware احراز هویت
 *
 * اگه توکن وجود نداشت یا نامعتبر بود → 401 برمی‌گردونه
 * اگه معتبر بود → user رو داخل Request ست می‌کنه و ادامه میده
 */
class AuthMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return Response::unauthorized('توکن احراز هویت ارسال نشده است');
        }

        try {
            $decoded = Auth::verifyToken($token);
            $user = $decoded->data ?? null;

            $request->setUser($user);       // برای $request->user() توی Controller
            if ($user) {
                Auth::setCurrentUser($user); // برای Auth::user() توی Service
            }
        } catch (\Firebase\JWT\ExpiredException $e) {
            return Response::unauthorized('توکن منقضی شده است');
        } catch (\Exception $e) {
            return Response::unauthorized('توکن نامعتبر است');
        }

        return $next($request);
    }
}