<?php

namespace App\Modules\Settings;

use App\Core\Controller;
use App\Core\Http\Request;

class SettingsController extends Controller
{
    private SettingsService $service;

    public function __construct()
    {
        $this->service = new SettingsService(new SettingsModel());
    }

    // GET /api/v1/settings
    public function index(): void
    {
        try {
            $this->success($this->service->getSettings());
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // GET /api/v1/admin/settings
    public function show(): void
    {
        try {
            $this->success($this->service->getSettings());
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // PATCH /api/v1/admin/settings
    public function update(Request $request): void
    {
        $data = $request->only([
            'shop_name',
            'shop_slogan',
            'shop_logo',
            'shop_poster',
            'bank_card',
            'bank_owner',
            'payment_method',
            'zarinpal_merchant_id',
            'sms_enabled',
        ]);

        try {
            $settings = $this->service->updateSettings($data);
            $this->success($settings, 'تنظیمات بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
