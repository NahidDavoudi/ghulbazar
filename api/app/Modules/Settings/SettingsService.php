<?php

namespace App\Modules\Settings;

class SettingsService
{
    private const PAYMENT_METHODS = ['card_to_card', 'zarinpal', 'both'];
    private const SMS_PROVIDERS = ['kavenegar', 'melipayamak', 'smsir'];

    private const UPLOAD_FIELD_MAP = [
        'logo'    => 'shop_logo',
        'hero'    => 'shop_hero_image',
        'poster'  => 'shop_poster',
        'favicon' => 'shop_favicon',
    ];

    private const ALLOWED_FIELDS = [
        'shop_name',
        'shop_slogan',
        'shop_description',
        'shop_logo',
        'shop_hero_image',
        'shop_poster',
        'shop_favicon',
        'bank_card',
        'bank_owner',
        'payment_method',
        'zarinpal_merchant_id',
        'contact_phone',
        'contact_email',
        'contact_address',
        'social_instagram',
        'social_telegram',
        'social_whatsapp',
        'shipping_standard_cost',
        'shipping_free_from',
        'min_order_amount',
        'sms_enabled',
        'sms_provider',
        'sms_api_key',
        'meta_title',
        'meta_description',
    ];

    private const INT_FIELDS = [
        'shipping_standard_cost',
        'shipping_free_from',
        'min_order_amount',
        'sms_enabled',
    ];

    private const NULLABLE_TEXT_FIELDS = [
        'shop_description',
        'contact_address',
        'zarinpal_merchant_id',
        'sms_api_key',
    ];

    public function __construct(
        private SettingsModel $settingsModel,
    ) {}

    private const SENSITIVE_FIELDS = [
        'sms_api_key',
        'zarinpal_merchant_id',
    ];

    public function getSettings(): array
    {
        $settings = $this->settingsModel->getSingleton();
        if (!$settings) {
            throw new \RuntimeException('تنظیمات فروشگاه یافت نشد.', 404);
        }

        return $settings;
    }

    public function getPublicSettings(): array
    {
        $settings = $this->getSettings();

        foreach (self::SENSITIVE_FIELDS as $field) {
            unset($settings[$field]);
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

            if ($field === 'sms_provider') {
                $provider = trim((string) $data['sms_provider']);
                if ($provider !== '' && !in_array($provider, self::SMS_PROVIDERS, true)) {
                    throw new \RuntimeException('سرویس پیامک معتبر نیست.', 422);
                }
                $payload['sms_provider'] = $provider ?: 'kavenegar';
                continue;
            }

            if (in_array($field, self::INT_FIELDS, true)) {
                $payload[$field] = max(0, (int) $data[$field]);
                continue;
            }

            if (in_array($field, self::NULLABLE_TEXT_FIELDS, true)) {
                $value = $data[$field];
                $payload[$field] = $value === null || $value === ''
                    ? null
                    : trim((string) $value);
                continue;
            }

            if ($field === 'contact_email' && trim((string) $data[$field]) !== '') {
                $email = trim((string) $data[$field]);
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    throw new \RuntimeException('ایمیل تماس معتبر نیست.', 422);
                }
                $payload[$field] = $email;
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

        $smsEnabled = (int) ($payload['sms_enabled'] ?? $current['sms_enabled'] ?? 0);
        $smsApiKey = array_key_exists('sms_api_key', $payload)
            ? $payload['sms_api_key']
            : ($current['sms_api_key'] ?? null);

        if ($smsEnabled && empty($smsApiKey)) {
            throw new \RuntimeException('کلید API پیامک الزامی است.', 422);
        }

        $this->settingsModel->updateSingleton($payload);

        return $this->getSettings();
    }

    public function uploadImage(string $type, string $url): array
    {
        $field = self::UPLOAD_FIELD_MAP[$type] ?? null;
        if (!$field) {
            throw new \RuntimeException('نوع تصویر معتبر نیست.', 422);
        }

        $this->settingsModel->updateSingleton([$field => $url]);

        return $this->getSettings();
    }

    public static function uploadFieldForType(string $type): ?string
    {
        return self::UPLOAD_FIELD_MAP[$type] ?? null;
    }

    public static function allowedUploadTypes(): array
    {
        return array_keys(self::UPLOAD_FIELD_MAP);
    }
}
