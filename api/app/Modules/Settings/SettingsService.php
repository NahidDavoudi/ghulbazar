<?php

namespace App\Modules\Settings;

class SettingsService
{
    private const PAYMENT_METHODS = ['card_to_card', 'zarinpal', 'both'];

    private const ALLOWED_FIELDS = [
        'shop_name',
        'shop_slogan',
        'shop_logo',
        'shop_poster',
        'bank_card',
        'bank_owner',
        'payment_method',
        'zarinpal_merchant_id',
        'sms_enabled',
    ];

    public function __construct(
        private SettingsModel $settingsModel,
    ) {}

    public function getSettings(): array
    {
        $settings = $this->settingsModel->getSingleton();
        if (!$settings) {
            throw new \RuntimeException('تنظیمات فروشگاه یافت نشد.', 404);
        }

        return $settings;
    }

    public function updateSettings(array $data): array
    {
        $current = $this->getSettings();
        $payload = [];

        foreach (self::ALLOWED_FIELDS as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            if ($field === 'payment_method') {
                if (!in_array($data['payment_method'], self::PAYMENT_METHODS, true)) {
                    throw new \RuntimeException('روش پرداخت باید card_to_card، zarinpal یا both باشد.', 422);
                }
                $payload['payment_method'] = $data['payment_method'];
                continue;
            }

            if ($field === 'sms_enabled') {
                $payload['sms_enabled'] = (int) $data['sms_enabled'];
                continue;
            }

            if ($field === 'zarinpal_merchant_id') {
                $payload['zarinpal_merchant_id'] = $data['zarinpal_merchant_id'] !== null
                    ? trim((string) $data['zarinpal_merchant_id'])
                    : null;
                continue;
            }

            $payload[$field] = trim((string) $data[$field]);
        }

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلدی برای بروزرسانی ارسال نشد.', 422);
        }

        $paymentMethod = $payload['payment_method'] ?? $current['payment_method'];
        $merchantId = array_key_exists('zarinpal_merchant_id', $payload)
            ? $payload['zarinpal_merchant_id']
            : $current['zarinpal_merchant_id'];

        if (in_array($paymentMethod, ['zarinpal', 'both'], true) && empty($merchantId)) {
            throw new \RuntimeException('شناسه پذیرنده زرین‌پال الزامی است.', 422);
        }

        $this->settingsModel->updateSingleton($payload);

        return $this->getSettings();
    }
}
