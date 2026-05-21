<?php
namespace App\Core;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use UnexpectedValueException;

class Auth {

    private static string $algorithm = 'HS256';
    public static function generateToken(array $payload, int $expireInSeconds = 86400): string {
        $issuedAt = time();

        $tokenPayload = [
            'iat' => $issuedAt,
            'exp' => $issuedAt + $expireInSeconds,
            'data' => $payload
        ];

        return JWT::encode($tokenPayload, self::getSecretKey(), self::$algorithm);
    }

    public static function verifyToken(?string $token): ?object {
        if (empty($token)) {
            return null;
        }

        try {
            $decoded = JWT::decode($token, new Key(self::getSecretKey(), self::$algorithm));
            return $decoded;
        } catch (ExpiredException $e) {
            // Token expired
            return null;
        } catch (SignatureInvalidException $e) {
            // Token signature invalid
            return null;
        } catch (UnexpectedValueException $e) {
            // Token is invalid
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }
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
    public static function generateRefreshToken(array $payload): string {
        return self::generateToken($payload, 2592000); // 30 days
    }
    public static function refreshToken(?string $refreshToken): ?string {
        $decoded = self::verifyToken($refreshToken);

        if (!$decoded) {
            return null;
        }
        return self::generateToken((array)$decoded->data);
    }
    private static function getSecretKey(): string {
        return Env::get('JWT_SECRET', 'your-default-secret-key');
    }
    public static function getAlgorithm(): string {
        return self::$algorithm;
    }
}