<?php

namespace App\Core\Middleware;

use App\Core\Http\MiddlewareInterface;
use App\Core\Http\Request;
use App\Core\Http\Response;

class AdminMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): void
    {
        $user = $request->user();

        if (!$user || ($user->role ?? '') !== 'admin') {
            Response::forbidden('دسترسی فقط برای ادمین مجاز است');
        }

        $next($request);
    }
}