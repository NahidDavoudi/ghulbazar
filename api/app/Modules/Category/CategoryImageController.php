<?php

namespace App\Modules\Category;

use App\Core\Controller;
use App\Core\Http\Request;

class CategoryImageController extends Controller
{
    private CategoryImageService $service;

    public function __construct()
    {
        $this->service = new CategoryImageService(
            new CategoryImageModel(),
            new CategoryModel(),
        );
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') {
            $this->forbidden();
        }
    }

    // GET /category-image/index?category_id=123
    public function index(Request $request): void
    {
        $this->requireAdmin();

        $categoryId = (int) $request->query('category_id');
        if (!$categoryId) {
            $this->error('category_id الزامی است', 422);
        }

        try {
            $images = $this->service->getImages($categoryId);
            $this->success($images);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /category-image/store
    public function store(Request $request): void
    {
        $this->requireAdmin();

        $categoryId = (int) $request->input('category_id');
        if (!$categoryId) {
            $this->error('category_id الزامی است', 422);
        }

        $file = $_FILES['image'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل تصویر ارسال نشده', 422);
        }

        try {
            $url   = $this->handleImageUpload($file, 'categories');
            $image = $this->service->addImage($categoryId, [
                'image_url'  => $url,
                'alt_text'   => $request->input('alt_text', ''),
                'is_main'    => (int) $request->input('is_main', 0),
                'sort_order' => (int) $request->input('sort_order', 0),
            ]);
            $this->created($image, 'تصویر اضافه شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /category-image/setMain/456?category_id=123
    public function setMain(Request $request, int $imageId): void
    {
        $this->requireAdmin();

        $categoryId = (int) $request->query('category_id');
        if (!$categoryId) {
            $this->error('category_id الزامی است', 422);
        }

        try {
            $this->service->setMain($categoryId, $imageId);
            $this->success(null, 'تصویر اصلی تنظیم شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /category-image/destroy/456?category_id=123
    public function destroy(Request $request, int $imageId): void
    {
        $this->requireAdmin();

        $categoryId = (int) $request->query('category_id');
        if (!$categoryId) {
            $this->error('category_id الزامی است', 422);
        }

        try {
            $this->service->delete($categoryId, $imageId);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Upload Helper ────────────────────────────────────────────

    private function handleImageUpload(array $file, string $folder): string
    {
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        $maxSize = 3 * 1024 * 1024;

        if (!in_array($file['type'], $allowed)) {
            throw new \RuntimeException('فرمت فایل مجاز نیست. فقط JPG، PNG و WebP قابل قبول است.', 422);
        }
        if ($file['size'] > $maxSize) {
            throw new \RuntimeException('حجم فایل بیشتر از ۳ مگابایت است.', 422);
        }

        $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid('img_', true) . '.' . $ext;
        $dir      = __DIR__ . "/../../../public/uploads/{$folder}/";

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) {
            throw new \RuntimeException('خطا در آپلود فایل.', 500);
        }

        return "/uploads/{$folder}/{$filename}";
    }
}
