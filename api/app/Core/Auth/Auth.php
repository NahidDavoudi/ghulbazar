<?php
namespace App\Core\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use UnexpectedValueException;
use App\Core\Http\Request;
use App\Core\Env;

class Auth {
    private static string $algorithm = 'HS256';

    // کلید جداگانه برای رفرش توکن (از .env بخوان)
    private static function getRefreshSecretKey(): string {
        return Env::get('REFRESH_SECRET');
    }
    private static function getSecretKey(): string
    {
        return Env::get('JWT_SECRET');
    }

    public static function generateToken(array $payload, int $expireInSeconds = 86400): string {
        $issuedAt = time();
        $tokenPayload = [
            'iat'  => $issuedAt,
            'exp'  => $issuedAt + $expireInSeconds,
            'data' => $payload
        ];
        return JWT::encode($tokenPayload, self::getSecretKey(), self::$algorithm);
    }

    public static function verifyToken(?string $token, bool $isRefresh = false): ?object {
        if (empty($token)) {
            die('❌ Token is empty');
        }
        $secret = $isRefresh ? self::getRefreshSecretKey() : self::getSecretKey();
        // var_dump($secret); exit;
        return JWT::decode($token, new Key($secret, self::$algorithm));
    }

    // تولید رفرش توکن با jti و ذخیره‌ی هش آن
    public static function generateRefreshToken(int $userId, array $payload): string {
        $jti = bin2hex(random_bytes(32));
        $issuedAt = time();
        $expiresAt = $issuedAt + 2592000;
    
        $tokenPayload = [
            'iat'  => $issuedAt,
            'exp'  => $expiresAt,
            'data' => $payload,
            'jti'  => $jti,
            'sub'  => $userId
        ];
    
        $refreshToken = JWT::encode($tokenPayload, self::getRefreshSecretKey(), self::$algorithm);
    
        $db = \App\Core\Database\Database::getInstance()->getConnection();
        $stmt = $db->prepare("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([
            $userId,
            hash('sha256', $jti),
            date('Y-m-d H:i:s', $expiresAt)
        ]);
    
        return $refreshToken;
    }

    // چرخش رفرش توکن: توکن قدیمی را باطل و یک جفت جدید صادر کن
    public static function rotateRefreshToken(string $refreshToken): ?array {
        $decoded = self::verifyToken($refreshToken, true);
        if (!$decoded) return null;
    
        $userId = $decoded->sub ?? null;
        $jti    = $decoded->jti ?? null;
        if (!$userId || !$jti) return null;
    
        $db = \App\Core\Database\Database::getInstance()->getConnection();
    
        // چک کن توکن قبلاً باطل نشده باشد
        $stmt = $db->prepare("SELECT id FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW()");
        $stmt->execute([hash('sha256', $jti)]);
        $existing = $stmt->fetch();
    
        if (!$existing) {
            // احتمال حمله: همه رفرش توکن‌های این کاربر را باطل کن
            $db->prepare("DELETE FROM refresh_tokens WHERE user_id = ?")->execute([$userId]);
            return null;
        }
    
        // باطل کردن توکن قدیمی
        $db->prepare("DELETE FROM refresh_tokens WHERE id = ?")->execute([$existing['id']]);
    
        // تولید Access Token جدید
        $accessToken = self::generateToken((array)$decoded->data, 3600);
    
        // تولید Refresh Token جدید
        $newRefreshToken = self::generateRefreshToken($userId, (array)$decoded->data);
    
        return [
            'token'         => $accessToken,
            'refresh_token' => $newRefreshToken,
            'token_type'    => 'Bearer',
            'expires_in'    => 3600
        ];
    }

    // متدهای helper قبلی بدون تغییر
    public static function user(): ?object {
        $request = new Request();
        $token = $request->bearerToken();
        $decoded = self::verifyToken($token);
        return $decoded?->data ?? null;
    }

    public static function id(): ?int {
        $user = self::user();
        return $user->user_id ?? null;
    }

    public static function role(): ?string {
        $user = self::user();
        return $user->role ?? null;
    }

    public static function check(): bool {
        return self::user() !== null;
    }

    public static function hasRole(string|array $roles): bool {
        $user = self::user();
        if (!$user || !isset($user->role)) {
            return false;
        }

        if (is_string($roles)) {
            return $user->role === $roles;
        }

        return in_array($user->role, $roles);
    }
    // خروج از دستگاه فعلی (با دادن refresh token)
    public static function revokeRefreshToken(string $refreshToken): void {
        $decoded = self::verifyToken($refreshToken, true);
        if ($decoded && isset($decoded->jti)) {
            $db = \App\Core\Database\Database::getInstance()->getConnection();
            $stmt = $db->prepare("DELETE FROM refresh_tokens WHERE token_hash = ?");
            $stmt->execute([hash('sha256', $decoded->jti)]);
        }
    }

    // خروج از همه دستگاه‌ها
    public static function revokeAllUserTokens(int $userId): void {
        $db = \App\Core\Database\Database::getInstance()->getConnection();
        $db->prepare("DELETE FROM refresh_tokens WHERE user_id = ?")->execute([$userId]);
    }
}