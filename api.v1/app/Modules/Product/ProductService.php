<?php
namespace App\Modules\Product;

use App\Core\Database\Database;
use PDO;

class ProductService
{
    private ProductModel $model;
    private ProductImageModel $imageModel;

    public function __construct()
    {
        $this->model = new ProductModel();
        $this->imageModel = new ProductImageModel();
    }

    public function getList(array $filters): array
    {
        return $this->model->paginateWithFilters($filters);
    }

    public function getById(int $id): ?array
    {
        $product = $this->model->find($id);
        if ($product) {
            $product['images'] = $this->imageModel->getByProductId($id);
            $product['options'] = $this->model->getOptions($id);
            $product['related'] = $this->model->getRelated($id);
            // افزایش بازدید
            $this->model->incrementViews($id);
        }
        return $product;
    }

    public function create(array $data): int
    {
        $slug = $this->makeSlug($data['name']);
        $data['slug'] = $slug;
        return $this->model->create($data);
    }

    public function update(int $id, array $data): void
    {
        $this->model->update($id, $data);
    }

    public function softDelete(int $id): void
    {
        $this->model->update($id, ['stock' => 0]);
    }

    public function addImage(int $productId, array $file, int $isMain, int $sortOrder): string
    {
        $uploadDir = __DIR__ . '/../../../public/uploads/products/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = 'prod_' . $productId . '_' . time() . '.' . $ext;
        move_uploaded_file($file['tmp_name'], $uploadDir . $filename);
        $url = '/uploads/products/' . $filename;

        if ($isMain) {
            $this->imageModel->unsetMain($productId);
        }
        $this->imageModel->create([
            'product_id' => $productId,
            'image_url'  => $url,
            'is_main'    => $isMain,
            'sort_order' => $sortOrder
        ]);
        return $url;
    }

    private function makeSlug(string $name): string
    {
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $name), '-'));
        // جلوگیری از تکراری شدن (می‌توانید با دیتابیس چک کنید)
        return $slug;
    }
}