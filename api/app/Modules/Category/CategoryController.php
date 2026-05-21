<?php
namespace App\Modules\Category;

use App\Core\Controller;
use App\Core\Http\Request;

class CategoryController extends Controller
{
    private CategoryService $service;

    public function __construct()
    {
        $this->service = new CategoryService();
    }

    // GET /categories
    public function index(): void
    {
        $this->success($this->service->getAll());
    }

    // POST /categories
    public function store(Request $request): void
    {
        $this->requireAdmin();
        $data = $request->only(['name', 'slug']);
        if (empty($data['name'])) $this->error('نام دسته‌بندی الزامی است');
        $id = $this->service->create($data);
        $this->created(['id' => $id]);
    }

    // PUT /categories/123
    public function update(Request $request, int $id): void
    {
        $this->requireAdmin();
        $data = $request->only(['name', 'slug', 'poster_image']);
        if (empty($data)) $this->error('مقداری برای بروزرسانی ارسال نشده');
        $this->service->update($id, $data);
        $this->success(null, 'بروزرسانی شد');
    }

    // DELETE /categories/123
    public function destroy(int $id): void
    {
        $this->requireAdmin();
        $this->service->delete($id);
        $this->noContent();
    }

    // POST /categories/123/poster (آپلود پوستر)
    public function uploadPoster(Request $request, int $id): void
    {
        $this->requireAdmin();
        $file = $_FILES['poster'] ?? null;
        if (!$file) $this->error('فایل پوستر ارسال نشده');
        $url = $this->service->uploadPoster($id, $file);
        $this->success(['url' => $url], 'پوستر آپلود شد');
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') $this->forbidden();
    }
}