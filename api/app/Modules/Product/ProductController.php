<?php

namespace App\Modules\Product;

use App\Core\Controller;
use App\Core\Http\Request;

class ProductController extends Controller
{
    private ProductService $service;

    public function __construct()
    {
        $this->service = new ProductService(
            new ProductModel(),
            new ProductImageModel(),
        );
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') {
            $this->forbidden();
        }
    }

    // GET /product/index?page=1&limit=12&category_id=2&era=...&q=...&sort=newest
    public function index(Request $request): void
    {
        $filters = [
            'category_id' => $request->query('category_id'),   // عدد مستقیم
            'category'    => $request->query('category'),       // slug — فرانت این رو می‌فرسته
            'era'         => $request->query('era'),
            'featured'    => $request->query('featured'),
            'q'           => $request->query('q'),
            'sort'        => $request->query('sort', 'newest'),
            'page'        => (int) $request->query('page', 1),
            'limit'       => (int) $request->query('limit', 12),
        ];

        $this->success($this->service->list($filters));
    }

    // GET /product/featured
    public function featured(Request $request): void
    {
        $limit = (int) $request->query('limit', 8);
        $this->success($this->service->getFeatured($limit));
    }

    // GET /product/show/123
    public function show(int $id): void
    {
        try {
            $this->success($this->service->getById($id));
        } catch (\RuntimeException $e) {
            $this->notFound($e->getMessage());
        }
    }

    // GET /product/slug/product-name
    public function slug(string $slug): void
    {
        try {
            $this->success($this->service->getBySlug($slug));
        } catch (\RuntimeException $e) {
            $this->notFound($e->getMessage());
        }
    }

    // POST /product/store  (ادمین)
    public function store(Request $request): void
    {
        $this->requireAdmin();

        $data = $request->only([
            'name', 'slug', 'description', 'price',
            'category_id', 'era', 'material', 'badge',
            'stock', 'featured', 'is_active',
        ]);

        try {
            $product = $this->service->create($data);
            $this->created($product);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /product/update/123  (ادمین)
    public function update(Request $request, int $id): void
    {
        $this->requireAdmin();

        $data = $request->only([
            'name', 'slug', 'description', 'price',
            'category_id', 'era', 'material', 'badge',
            'stock', 'featured', 'is_active',
        ]);

        try {
            $product = $this->service->update($id, $data);
            $this->success($product, 'محصول بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /product/destroy/123  (ادمین — soft delete از طریق is_active)
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

    // PUT /product/toggle/123  (ادمین — فعال/غیرفعال)
    public function toggle(int $id): void
    {
        $this->requireAdmin();

        try {
            $product = $this->service->toggleActive($id);
            $status  = $product['is_active'] ? 'فعال' : 'غیرفعال';
            $this->success($product, "محصول {$status} شد");
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /product/addImage/123  (ادمین)
    public function addImage(Request $request, int $id): void
    {
        $this->requireAdmin();

        $file = $_FILES['image'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('تصویر ارسال نشده', 422);
        }

        try {
            $url   = $this->handleImageUpload($file, 'products');
            $image = $this->service->addImage($id, [
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

    // PUT /product/setMainImage/123?image_id=456  (ادمین)
    public function setMainImage(Request $request, int $productId): void
    {
        $this->requireAdmin();

        $imageId = (int) $request->query('image_id');
        if (!$imageId) {
            $this->error('image_id الزامی است', 422);
        }

        try {
            $this->service->setMainImage($productId, $imageId);
            $this->success(null, 'تصویر اصلی تنظیم شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /product/deleteImage/123?image_id=456  (ادمین)
    public function deleteImage(Request $request, int $productId): void
    {
        $this->requireAdmin();

        $imageId = (int) $request->query('image_id');
        if (!$imageId) {
            $this->error('image_id الزامی است', 422);
        }

        try {
            $this->service->deleteImage($productId, $imageId);
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