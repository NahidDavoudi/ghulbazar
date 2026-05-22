<?php
namespace App\Modules\Category;

use App\Core\Controller;
use App\Core\Http\Request;

class CategoryImageController extends Controller
{
    private CategoryImageService $service;

    public function __construct()
    {
        $this->service = new CategoryImageService();
    }

    // GET /category-images?category_id=123
    public function index(Request $request): void
    {
        $this->requireAdmin();
        $categoryId = $request->query('category_id');
        if ($categoryId) {
            $images = $this->service->getByCategory((int)$categoryId);
        } else {
            $images = $this->service->getAll();
        }
        $this->success($images);
    }

    // POST /category-images
    public function store(Request $request): void
    {
        $this->requireAdmin();
        $categoryId = (int)$request->input('category_id');
        if (!$categoryId) $this->error('category_id الزامی است');
        $file = $_FILES['image'] ?? null;
        if (!$file) $this->error('فایل تصویر ارسال نشده');
        $isMain = (int)$request->input('is_main', 0);
        $sortOrder = (int)$request->input('sort_order', 0);
        $title = $request->input('title');
        $url = $this->service->addImage($categoryId, $file, $isMain, $sortOrder, $title);
        $this->created(['url' => $url]);
    }

    // PUT /category-images/456
    public function update(Request $request, int $id): void
    {
        $this->requireAdmin();
        $data = $request->only(['title', 'is_main', 'sort_order']);
        $this->service->updateImage($id, $data);
        $this->success(null, 'تصویر بروزرسانی شد');
    }

    // DELETE /category-images/456
    public function destroy(int $id): void
    {
        $this->requireAdmin();
        $this->service->deleteImage($id);
        $this->noContent();
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') $this->forbidden();
    }
}