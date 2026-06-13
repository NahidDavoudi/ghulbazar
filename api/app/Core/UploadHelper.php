<?php

namespace App\Core;

class UploadHelper
{
    /** @return string Public URL path (e.g. /universal/uploads/products/img_xxx.jpg) */
    public static function storeImage(array $file, string $folder): string
    {
        return self::store($file, $folder, [
            'allowed'  => ['image/jpeg', 'image/png', 'image/webp'],
            'max_size' => 3 * 1024 * 1024,
            'prefix'   => 'img_',
        ])['url'];
    }

    /** @return array{file_name: string, file_path: string} */
    public static function storeReceipt(array $file): array
    {
        $result = self::store($file, 'receipts', [
            'allowed'  => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
            'max_size' => 5 * 1024 * 1024,
            'prefix'   => 'receipt_',
        ]);

        return [
            'file_name' => $result['filename'],
            'file_path' => $result['url'],
        ];
    }

    /** @return array{filename: string, url: string, path: string} */
    private static function store(array $file, string $folder, array $options): array
    {
        $allowed = $options['allowed'];
        $maxSize = $options['max_size'];
        $prefix  = $options['prefix'];

        if (!in_array($file['type'], $allowed, true)) {
            throw new \RuntimeException('فرمت فایل مجاز نیست.', 422);
        }

        if ($file['size'] > $maxSize) {
            $mb = (int) ($maxSize / (1024 * 1024));
            throw new \RuntimeException("حجم فایل بیشتر از {$mb} مگابایت است.", 422);
        }

        $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid($prefix, true) . '.' . $ext;
        $dir      = self::uploadDir($folder);

        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            throw new \RuntimeException('خطا در ایجاد پوشه آپلود.', 500);
        }

        if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) {
            throw new \RuntimeException('خطا در آپلود فایل.', 500);
        }

        return [
            'filename' => $filename,
            'url'      => self::publicUrl($folder, $filename),
            'path'     => $dir . $filename,
        ];
    }

    private static function uploadDir(string $folder): string
    {
        $configured = Env::get('UPLOAD_DIR');
        $root       = $configured
            ? rtrim($configured, '/\\')
            : dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'uploads';

        return $root . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR;
    }

    private static function publicUrl(string $folder, string $filename): string
    {
        $base = rtrim(Env::get('APP_BASE_PATH', ''), '/');
        $path = "/uploads/{$folder}/{$filename}";

        return $base ? "{$base}{$path}" : $path;
    }
}
