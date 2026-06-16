<?php

namespace App\Core\Sms\Providers;

use App\Core\Env;
use App\Core\Sms\Contracts\SmsProviderInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * Melipayamak Console REST API (token-based)
 * @see https://console.melipayamak.com
 */
class MelipayamakSmsProvider implements SmsProviderInterface
{
    private const CONSOLE_URL = 'https://console.melipayamak.com/api/send/simple';
    private const LEGACY_URL  = 'https://rest.payamak-panel.com/api/SendSMS/SendSMS';

    private Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client([
            'timeout' => (int) Env::get('SMS_API_TIMEOUT', 15),
            'verify'  => true,
        ]);
    }

    public function getName(): string
    {
        return 'melipayamak';
    }

    public function send(string $phone, string $message): bool
    {
        $apiKey = $this->apiKey();
        $sender = $this->sender();

        if ($apiKey === '') {
            throw new \RuntimeException('کلید API ملی‌پیامک در .env تنظیم نشده است.', 500);
        }

        if ($sender === '') {
            throw new \RuntimeException('شماره خط ارسال ملی‌پیامک در .env تنظیم نشده است.', 500);
        }

        if ($this->useLegacyApi()) {
            return $this->sendLegacy($phone, $message, $apiKey, $sender);
        }

        return $this->sendConsole($phone, $message, $apiKey, $sender);
    }

    private function sendConsole(string $phone, string $message, string $apiKey, string $sender): bool
    {
        $url = trim((string) Env::get('MELIPAYAMAK_CONSOLE_URL', self::CONSOLE_URL));
        if ($url === '') {
            $url = self::CONSOLE_URL;
        }

        try {
            $response = $this->client->post($url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Accept'        => 'application/json',
                ],
                'form_params' => [
                    'from' => $sender,
                    'to'   => $this->normalizePhone($phone),
                    'text' => $message,
                ],
            ]);
        } catch (GuzzleException $e) {
            throw new \RuntimeException('ارسال پیامک ملی‌پیامک با خطا مواجه شد: ' . $e->getMessage(), 502);
        }

        return $this->assertSuccess($response->getStatusCode(), (string) $response->getBody());
    }

    private function sendLegacy(string $phone, string $message, string $apiKey, string $sender): bool
    {
        $username = trim((string) Env::get('MELIPAYAMAK_USERNAME', ''));

        if ($username === '') {
            throw new \RuntimeException('نام کاربری پنل ملی‌پیامک (MELIPAYAMAK_USERNAME) در .env تنظیم نشده است.', 500);
        }

        try {
            $response = $this->client->post(self::LEGACY_URL, [
                'form_params' => [
                    'username' => $username,
                    'password' => $apiKey,
                    'from'     => $sender,
                    'to'       => $this->normalizePhone($phone),
                    'text'     => $message,
                    'isFlash'  => 'false',
                ],
            ]);
        } catch (GuzzleException $e) {
            throw new \RuntimeException('ارسال پیامک ملی‌پیامک با خطا مواجه شد: ' . $e->getMessage(), 502);
        }

        return $this->assertSuccess($response->getStatusCode(), (string) $response->getBody());
    }

    private function assertSuccess(int $status, string $body): bool
    {
        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException('پاسخ ناموفق از ملی‌پیامک (HTTP ' . $status . ').', 502);
        }

        $decoded = json_decode($body, true);

        if (!is_array($decoded)) {
            if (is_numeric(trim($body)) && (int) trim($body) > 0) {
                return true;
            }

            return true;
        }

        if (isset($decoded['status']) && is_string($decoded['status']) && strtolower($decoded['status']) === 'success') {
            return true;
        }

        if (isset($decoded['Value']) && is_numeric($decoded['Value']) && (int) $decoded['Value'] > 0) {
            return true;
        }

        if (isset($decoded['recId']) && (int) $decoded['recId'] > 0) {
            return true;
        }

        if (isset($decoded['RetStatus']) && (int) $decoded['RetStatus'] === 1) {
            return true;
        }

        $code = $decoded['Value'] ?? $decoded['code'] ?? $decoded['status'] ?? null;
        if (is_numeric($code) && (int) $code <= 0) {
            throw new \RuntimeException('ارسال پیامک ملی‌پیامک ناموفق بود (کد: ' . $code . ').', 502);
        }

        return true;
    }

    private function apiKey(): string
    {
        foreach ([
            'MELIPAYAMAK_API_KEY',
            'MELLI_PAYAMAK_API',
            'MELLI_PAYMAK_API',
        ] as $key) {
            $value = trim((string) Env::get($key, ''));
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function sender(): string
    {
        foreach ([
            'MELIPAYAMAK_SENDER',
            'MELLI_PAYAMK_PHONE',
        ] as $key) {
            $value = trim((string) Env::get($key, ''));
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function useLegacyApi(): bool
    {
        return strtolower((string) Env::get('MELIPAYAMAK_MODE', 'console')) === 'legacy';
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            return '0' . substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '0' . $digits;
        }

        return $digits;
    }
}
