<?php

namespace App\Modules\Product;

class ProductService
{
    public function __construct(
        private ProductModel      $productModel,
        private ProductImageModel $imageModel,
    ) {}

    // ─── Public Listing ─────────────────────────────────────────

    public function list(array $filters = []): array
    {
        $filters = $this->normalizeFilters($filters);
        return $this->productModel->paginateWithFilters($filters);
    }

    public function getFeatured(int $limit = 8): array
    {
        return $this->productModel->getFeatured($limit);
    }

    public function getBySlug(string $slug): array
    {
        $product = $this->productModel->findBySlug($slug);
        if (!$product || !$product['is_active']) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $this->productModel->incrementViews($product['id']);

        $product['images']   = $this->imageModel->getByProductId($product['id']);
        $product['options']  = $this->productModel->getOptions($product['id']);
        $product['related']  = $this->productModel->getRelated($product['id']);

        return $product;
    }

    public function getById(int $id): array
    {
        $product = $this->productModel->find($id);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $product['images']  = $this->imageModel->getByProductId($id);
        $product['options'] = $this->productModel->getOptions($id);

        return $product;
    }

    // ─── Admin CRUD ─────────────────────────────────────────────

    public function create(array $data): array
    {
        $this->validateProductData($data);

        $slug = $this->resolveSlug($data['slug'] ?? '', $data['name']);

        $id = $this->productModel->create([
            'name'        => trim($data['name']),
            'slug'        => $slug,
            'description' => trim($data['description'] ?? ''),
            'price'       => (int) $data['price'],
            'category_id' => (int) ($data['category_id'] ?? 0) ?: null,
            'era'         => trim($data['era'] ?? ''),
            'material'    => trim($data['material'] ?? ''),
            'badge'       => trim($data['badge'] ?? ''),
            'stock'       => (int) ($data['stock'] ?? 0),
            'featured'    => (int) ($data['featured'] ?? 0),
            'is_active'   => (int) ($data['is_active'] ?? 1),
        ]);

        return $this->getById($id);
    }

    public function update(int $id, array $data): array
    {
        $product = $this->productModel->find($id);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $payload = [];

        if (isset($data['name'])) {
            $payload['name'] = trim($data['name']);
        }
        if (isset($data['slug'])) {
            $slug = $this->resolveSlug($data['slug'], $data['name'] ?? $product['name'], $id);
            $payload['slug'] = $slug;
        }
        if (isset($data['description'])) {
            $payload['description'] = trim($data['description']);
        }
        if (isset($data['price'])) {
            if ((int) $data['price'] < 0) throw new \RuntimeException('قیمت نمی‌تواند منفی باشد.', 422);
            $payload['price'] = (int) $data['price'];
        }
        if (isset($data['stock'])) {
            if ((int) $data['stock'] < 0) throw new \RuntimeException('موجودی نمی‌تواند منفی باشد.', 422);
            $payload['stock'] = (int) $data['stock'];
        }

        $simpleFields = ['category_id', 'era', 'material', 'badge', 'featured', 'is_active'];
        foreach ($simpleFields as $field) {
            if (isset($data[$field])) {
                $payload[$field] = $data[$field];
            }
        }

        if (empty($payload)) {
            throw new \RuntimeException('هیچ فیلدی برای بروزرسانی ارسال نشد.', 422);
        }

        $this->productModel->update($id, $payload);

        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        $product = $this->productModel->find($id);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $this->imageModel->deleteAllForProduct($id);
        $this->productModel->delete($id);
    }

    public function toggleActive(int $id): array
    {
        $product = $this->productModel->find($id);
        if (!$product) {
            throw new \RuntimeException('محصول یافت نشد.', 404);
        }

        $this->productModel->update($id, ['is_active' => $product['is_active'] ? 0 : 1]);

        return $this->getById($id);
    }

    // ─── Image Management ────────────────────────────────────────

    public function addImage(int $productId, array $imageData): array
    {
        $this->productModel->find($productId) or throw new \RuntimeException('محصول یافت نشد.', 404);

        if (empty($imageData['image_url'])) {
            throw new \RuntimeException('آدرس تصویر الزامی است.', 422);
        }

        // اگر اولین تصویره، به عنوان اصلی ثبت میشه
        $existing = $this->imageModel->getByProductId($productId);
        $isMain   = empty($existing) ? 1 : (int) ($imageData['is_main'] ?? 0);

        if ($isMain) {
            $this->imageModel->unsetMain($productId);
        }

        $id = $this->imageModel->create([
            'product_id' => $productId,
            'image_url'  => trim($imageData['image_url']),
            'alt_text'   => trim($imageData['alt_text'] ?? ''),
            'is_main'    => $isMain,
            'sort_order' => (int) ($imageData['sort_order'] ?? count($existing)),
        ]);

        return $this->imageModel->find($id);
    }

    public function setMainImage(int $productId, int $imageId): void
    {
        $this->productModel->find($productId) or throw new \RuntimeException('محصول یافت نشد.', 404);
        $this->imageModel->setMain($imageId, $productId);
    }

    public function deleteImage(int $productId, int $imageId): void
    {
        $this->productModel->find($productId) or throw new \RuntimeException('محصول یافت نشد.', 404);

        $image = $this->imageModel->find($imageId);
        if (!$image || $image['product_id'] !== $productId) {
            throw new \RuntimeException('تصویر یافت نشد.', 404);
        }

        $this->imageModel->delete($imageId);

        // اگه تصویر اصلی حذف شد، اولین تصویر باقیمانده رو اصلی میکنه
        if ($image['is_main']) {
            $remaining = $this->imageModel->getByProductId($productId);
            if (!empty($remaining)) {
                $this->imageModel->setMain($remaining[0]['id'], $productId);
            }
        }
    }

    // ─── Stock ───────────────────────────────────────────────────

    public function decrementStock(int $productId, int $qty): void
    {
        $success = $this->productModel->decrementStock($productId, $qty);
        if (!$success) {
            throw new \RuntimeException('موجودی کافی نیست.', 422);
        }
    }

    public function incrementStock(int $productId, int $qty): void
    {
        $this->productModel->incrementStock($productId, $qty);
    }

    // ─── Helpers ────────────────────────────────────────────────

    private function validateProductData(array $data): void
    {
        if (empty($data['name'])) {
            throw new \RuntimeException('نام محصول الزامی است.', 422);
        }
        if (!isset($data['price']) || (int) $data['price'] < 0) {
            throw new \RuntimeException('قیمت معتبر الزامی است.', 422);
        }
    }

    private function resolveSlug(string $rawSlug, string $fallbackName, ?int $excludeId = null): string
    {
        $slug = $rawSlug ?: $this->slugify($fallbackName);

        if ($this->productModel->slugExists($slug, $excludeId)) {
            $slug = $slug . '-' . time();
        }

        return $slug;
    }

    private function slugify(string $text): string
    {
        $text = mb_strtolower(trim($text));
        $text = preg_replace('/\s+/', '-', $text);
        $text = preg_replace('/[^\p{L}\p{N}\-]/u', '', $text);
        return $text ?: 'product-' . time();
    }

    private function normalizeFilters(array $filters): array
    {
        return array_merge([
            'page'        => 1,
            'limit'       => 12,
            'sort'        => 'newest',
            'category_id' => null,
            'era'         => null,
            'featured'    => null,
            'q'           => null,
        ], $filters);
    }
}