<?php

namespace App\Core;

class ImageProcessor
{
    /**
     * @return array{large:string,medium:string,thumb:string,files:array<string,string>}
     */
    public static function generateVariants(string $sourcePath, string $destDir, string $basename, array $preset): array
    {
        if (!extension_loaded('imagick') || !class_exists(\Imagick::class)) {
            throw new \RuntimeException('افزونه Imagick روی سرور فعال نیست.', 500);
        }

        if (!is_file($sourcePath)) {
            throw new \RuntimeException('فایل تصویر معتبر نیست.', 422);
        }

        if (!is_dir($destDir) && !mkdir($destDir, 0755, true)) {
            throw new \RuntimeException('خطا در ایجاد پوشه آپلود.', 500);
        }

        $quality = ImageConfig::webpQuality();
        $urls    = [];
        $files   = [];

        try {
            $source = new \Imagick($sourcePath);
            $source->autoOrient();

            foreach (['large', 'medium', 'thumb'] as $variant) {
                $maxDim   = (int) ($preset[$variant] ?? 800);
                $filename = "{$basename}_{$variant}.webp";
                $path     = $destDir . $filename;

                $image = clone $source;
                self::resizeToMax($image, $maxDim);
                $image->setImageFormat('webp');
                $image->setImageCompressionQuality($quality);
                $image->stripImage();

                if (!$image->writeImage($path)) {
                    $image->destroy();
                    throw new \RuntimeException('خطا در ذخیره تصویر بهینه‌شده.', 500);
                }

                $image->destroy();
                $files[$variant] = $filename;
            }

            $source->destroy();
        } catch (\ImagickException $e) {
            self::cleanupFiles($destDir, $files);
            throw new \RuntimeException('خطا در پردازش تصویر: ' . $e->getMessage(), 500);
        }

        return [
            'large'  => $files['large'],
            'medium' => $files['medium'],
            'thumb'  => $files['thumb'],
            'files'  => $files,
        ];
    }

    private static function resizeToMax(\Imagick $image, int $maxDim): void
    {
        $width  = $image->getImageWidth();
        $height = $image->getImageHeight();

        if ($width <= 0 || $height <= 0) {
            throw new \RuntimeException('ابعاد تصویر معتبر نیست.', 422);
        }

        if ($width <= $maxDim && $height <= $maxDim) {
            return;
        }

        if ($width >= $height) {
            $newWidth  = $maxDim;
            $newHeight = (int) round($height * ($maxDim / $width));
        } else {
            $newHeight = $maxDim;
            $newWidth  = (int) round($width * ($maxDim / $height));
        }

        $image->resizeImage(
            max(1, $newWidth),
            max(1, $newHeight),
            \Imagick::FILTER_LANCZOS,
            1
        );
    }

    /** @param array<string,string> $files */
    private static function cleanupFiles(string $dir, array $files): void
    {
        foreach ($files as $filename) {
            $path = $dir . $filename;
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}
