<?php

use App\Core\Middleware\AuthMiddleware;
use App\Core\Middleware\AdminMiddleware;
use App\Core\Middleware\LogMiddleware;
use App\Modules\Auth\AuthController;
use App\Modules\Users\UsersController;
use App\Modules\Product\ProductController;
use App\Modules\Category\CategoryController;
use App\Modules\Order\OrderController;
use App\Modules\Cart\CartController;
use App\Modules\Discount\DiscountController;
use App\Modules\Admin\AdminController;
use App\Modules\Settings\SettingsController;

$router->group([
    'middleware' => [LogMiddleware::class],
], function ($router) {

    // ═══════════════════════════════════════════════════════════════════════
    // عمومی (بدون احراز هویت)
    // ═══════════════════════════════════════════════════════════════════════

    // Auth
    $router->post('/api/v1/auth/register',    [AuthController::class, 'register']);
    $router->post('/api/v1/auth/login',       [AuthController::class, 'login']);
    $router->post('/api/v1/auth/admin-login', [AuthController::class, 'adminLogin']);
    $router->post('/api/v1/auth/otp/request', [AuthController::class, 'otpRequest']);
    $router->post('/api/v1/auth/otp/verify',  [AuthController::class, 'otpVerify']);

    // Products
    $router->get('/api/v1/products',          [ProductController::class, 'index']);
    $router->get('/api/v1/products/featured', [ProductController::class, 'featured']);
    $router->get('/api/v1/products/{id}',     [ProductController::class, 'show']);

    // Categories
    $router->get('/api/v1/categories',             [CategoryController::class, 'index']);
    $router->get('/api/v1/categories/{id}',        [CategoryController::class, 'show']);
    $router->get('/api/v1/categories/slug/{slug}', [CategoryController::class, 'slug']);

    // Discounts
    $router->get('/api/v1/discounts/validate', [DiscountController::class, 'validate']);

    // Settings
    $router->get('/api/v1/settings', [SettingsController::class, 'index']);

    // ═══════════════════════════════════════════════════════════════════════
    // نیاز به توکن
    // ═══════════════════════════════════════════════════════════════════════

    $router->group([
        'prefix'     => '/api/v1',
        'middleware' => [AuthMiddleware::class],
    ], function ($router) {

        // Auth
        $router->get('/auth/me',       [AuthController::class, 'me']);
        $router->post('/auth/refresh', [AuthController::class, 'refresh']);
        $router->post('/auth/logout',  [AuthController::class, 'logout']);

        // Profile
        $router->get('/users/me',          [UsersController::class, 'profile']);
        $router->patch('/users/me',        [UsersController::class, 'update']);
        $router->put('/users/me/password', [UsersController::class, 'changePassword']);

        // Addresses
        $router->get('/users/me/addresses',         [UsersController::class, 'addresses']);
        $router->post('/users/me/addresses',        [UsersController::class, 'addAddress']);
        $router->patch('/users/me/addresses/{id}',  [UsersController::class, 'updateAddress']);
        $router->delete('/users/me/addresses/{id}', [UsersController::class, 'deleteAddress']);

        // Orders
        $router->post('/orders',                [OrderController::class, 'store']);
        $router->get('/orders',                 [OrderController::class, 'index']);
        $router->get('/orders/{id}',            [OrderController::class, 'show']);
        $router->get('/orders/number/{number}', [OrderController::class, 'byNumber']);
        $router->patch('/orders/{id}/cancel',   [OrderController::class, 'cancel']);
        $router->post('/orders/{id}/receipt',   [OrderController::class, 'uploadReceipt']);

        // Cart
        $router->get('/cart',                      [CartController::class, 'index']);
        $router->delete('/cart',                   [CartController::class, 'clear']);
        $router->post('/cart/merge',               [CartController::class, 'merge']);
        $router->post('/cart/items',               [CartController::class, 'add']);
        $router->patch('/cart/items/{productId}',  [CartController::class, 'update']);
        $router->delete('/cart/items/{productId}', [CartController::class, 'remove']);
        $router->post('/cart/discount',            [CartController::class, 'discount']);

    });

    // ═══════════════════════════════════════════════════════════════════════
    // ادمین
    // ═══════════════════════════════════════════════════════════════════════

    $router->group([
        'prefix'     => '/api/v1/admin',
        'middleware' => [AuthMiddleware::class, AdminMiddleware::class],
    ], function ($router) {

        // Dashboard
        $router->get('/dashboard',                    [AdminController::class, 'index']);
        $router->get('/dashboard/stats',              [AdminController::class, 'stats']);
        $router->get('/dashboard/orders/recent',      [AdminController::class, 'recentOrders']);
        $router->get('/dashboard/orders/by-status',   [AdminController::class, 'ordersByStatus']);
        $router->get('/dashboard/products/low-stock', [AdminController::class, 'lowStock']);
        $router->get('/dashboard/products/top',       [AdminController::class, 'topProducts']);
        $router->get('/dashboard/revenue',            [AdminController::class, 'revenue']);

        // Users
        $router->get('/users',                   [UsersController::class, 'index']);
        $router->patch('/users/{id}/role',       [UsersController::class, 'updateRole']);
        $router->patch('/users/{id}/activate',   [UsersController::class, 'activate']);
        $router->patch('/users/{id}/deactivate', [UsersController::class, 'deactivate']);

        // Products
        $router->post('/products',                         [ProductController::class, 'store']);
        $router->put('/products/{id}',                     [ProductController::class, 'update']);
        $router->delete('/products/{id}',                  [ProductController::class, 'destroy']);
        $router->patch('/products/{id}/toggle',            [ProductController::class, 'toggle']);
        $router->post('/products/{id}/images',             [ProductController::class, 'addImage']);
        $router->patch('/products/{id}/images/{imageId}',  [ProductController::class, 'setMainImage']);
        $router->delete('/products/{id}/images/{imageId}', [ProductController::class, 'deleteImage']);

        // Categories
        $router->post('/categories',                         [CategoryController::class, 'store']);
        $router->put('/categories/{id}',                     [CategoryController::class, 'update']);
        $router->delete('/categories/{id}',                  [CategoryController::class, 'destroy']);
        $router->post('/categories/{id}/poster',             [CategoryController::class, 'uploadPoster']);
        $router->get('/categories/{id}/images',              [CategoryController::class, 'images']);
        $router->post('/categories/{id}/images',             [CategoryController::class, 'addImage']);
        $router->patch('/categories/{id}/images/{imageId}',  [CategoryController::class, 'setMainImage']);
        $router->delete('/categories/{id}/images/{imageId}', [CategoryController::class, 'destroyImage']);

        // Orders
        $router->get('/orders',               [OrderController::class, 'adminIndex']);
        $router->patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);

        // Settings
        $router->get('/settings',                    [SettingsController::class, 'show']);
        $router->patch('/settings',                  [SettingsController::class, 'update']);
        $router->post('/settings/upload/{type}',     [SettingsController::class, 'uploadImage']);

        // Discounts
        $router->get('/discounts',                   [DiscountController::class, 'index']);
        $router->get('/discounts/active',            [DiscountController::class, 'active']);
        $router->post('/discounts',                  [DiscountController::class, 'store']);
        $router->put('/discounts/{id}',              [DiscountController::class, 'update']);
        $router->patch('/discounts/{id}/deactivate', [DiscountController::class, 'deactivate']);
        $router->delete('/discounts/{id}',           [DiscountController::class, 'destroy']);

    });

});