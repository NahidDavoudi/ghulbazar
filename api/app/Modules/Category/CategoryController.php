<?php

namespace App\Modules\Category;

use App\Core\Controller;
use App\Core\Http\Request;

class CategoryController extends Controller
{
    private CategoryService $service;

    public function __construct()
    {
        $this->service = new CategoryService(
            new CategoryModel(),
            new CategoryImageModel(),
        );
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') {
            $this->forbidden();
        }
    }

    // GET /category/index
    public function index(): void
    {
        $this->success($this->service->getAll());
    }

    // GET /category/show/123
    public function show(int $id): void
    {
        try {
            $this->success($this->service->getById($id));
        } catch (\RuntimeException $e) {
            $this->notFound($e->getMessage());
        }
    }

    // GET /category/slug/my-slug
    public function slug(string $slug): void
    {
        try {
            $this->success($this->service->getBySlug($slug));
        } catch (\RuntimeException $e) {
            $this->notFound($e->getMessage());
        }
    }

    // POST /category/store
    public function store(Request $request): void
    {
        $this->requireAdmin();

        $data = $request->only(['name', 'slug', 'description', 'poster_image']);

        try {
            $category = $this->service->create($data);
            $this->created($category);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /category/update/123
    public function update(Request $request, int $id): void
    {
        $this->requireAdmin();

        $data = $request->only(['name', 'slug', 'description', 'poster_image']);

        try {
            $category = $this->service->update($id, $data);
            $this->success($category, 'دسته‌بندی بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /category/destroy/123
    public function destroy(int $id): void
    {
        $this->requireAdmin();

        try {
            $this->service->delete($id);
            $this->noContent();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /category/uploadPoster/123
    public function uploadPoster(Request $request, int $id): void
    {
        $this->requireAdmin();

        $file = $_FILES['poster'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('فایل پوستر ارسال نشده یا خطا داشته', 422);
        }

        try {
            $url = $this->handleImageUpload($file, 'categories');
            $category = $this->service->update($id, ['poster_image' => $url]);
            $this->success(['url' => $url, 'category' => $category], 'پوستر آپلود شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ─── Upload Helper ────────────────────────────────────────────

    private function handleImageUpload(array $file, string $folder): string
    {
        $allowed    = ['image/jpeg', 'image/png', 'image/webp'];
        $maxSize    = 3 * 1024 * 1024; // 3MB

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
