<?php

namespace App\Modules\Category;

use App\Core\Controller;
use App\Core\Http\Request;

class CategoryController extends Controller
{
    private CategoryService      $service;
    private CategoryImageService $imageService;

    public function __construct()
    {
        $this->service = new CategoryService(
            new CategoryModel(),
            new CategoryImageModel(),
        );

        $this->imageService = new CategoryImageService(
            new CategoryImageModel(),
            new CategoryModel(),
        );
    }

    // ─── Category CRUD ────────────────────────────────────────────

    // GET /api/v1/categories
    public function index(): void
    {
        $this->success($this->service->getAll());
    }

    // GET /api/v1/categories/{id}
    public function show(Request $request, int $id): void
    {
        try {
            $this->success($this->service->getById($id));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // GET /api/v1/categories/slug/{slug}
    public function slug(Request $request, string $slug): void
    {
        try {
            $this->success($this->service->getBySlug($slug));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    // POST /api/v1/admin/categories
    public function store(Request $request): void
    {
        $data = $request->only(['name', 'slug', 'description', 'poster_image']);

        try {
            $this->created($this->service->create($data));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /api/v1/admin/categories/{id}
    public function update(Request $request, int $id): void
    {
        $data = $request->only(['name', 'slug', 'description', 'poster_image']);

        try {
            $this->success($this->service->update($id, $data), 'دسته‌بندی بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /api/v1/admin/categories/{id}
    public function destroy(Request $request, int $id): void
    {
        try {
            $this->service->delete($id);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/admin/categories/{id}/poster
    public function uploadPoster(Request $request, int $id): void
    {
        $file = $_FILES['poster'] ?? null;

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل پوستر ارسال نشده یا خطا داشته', 422);
        }

        try {
            $url      = $this->handleImageUpload($file, 'categories');
            $category = $this->service->update($id, ['poster_image' => $url]);
            $this->success(['url' => $url, 'category' => $category], 'پوستر آپلود شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Category Images ──────────────────────────────────────────

    // GET /api/v1/admin/categories/{id}/images
    public function images(Request $request, int $id): void
    {
        try {
            $this->success($this->imageService->getImages($id));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /api/v1/admin/categories/{id}/images
    public function addImage(Request $request, int $id): void
    {
        $file = $_FILES['image'] ?? null;

        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل تصویر ارسال نشده', 422);
        }

        try {
            $url   = $this->handleImageUpload($file, 'categories');
            $image = $this->imageService->addImage($id, [
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

    // PATCH /api/v1/admin/categories/{id}/images/{imageId}
    public function setMainImage(Request $request, int $id, int $imageId): void
    {
        try {
            $this->imageService->setMain($id, $imageId);
            $this->success(null, 'تصویر اصلی تنظیم شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /api/v1/admin/categories/{id}/images/{imageId}
    public function destroyImage(Request $request, int $id, int $imageId): void
    {
        try {
            $this->imageService->delete($id, $imageId);
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