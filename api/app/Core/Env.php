<?php
// app/Core/Env.php

namespace App\Core;

use RuntimeException;

class Env
{
    private static array $data = [];
    private static bool $loaded = false;
    public static function load($path = null)
    {
   
    if (self::$loaded) {
            return;
        }
        $path = $path ?? dirname(__DIR__, 2) . '/.env';
        if (!file_exists($path)) {
            throw new RuntimeException(".env file not found at: {$path}");
        }
        self::$data = parse_ini_file($path);
        foreach (self::$data as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
        }
        self::$loaded = true;
    }
    public static function get(string $key, mixed $default = null)
    {
        return self::$data[$key] ?? $_ENV[$key] ?? getenv($key) ?: $default;
    }
}