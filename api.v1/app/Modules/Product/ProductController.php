<?php
namespace App\Modules\Product;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Modules\Product\ProductService;

class ProductController extends Controller
{
    private ProductService $service;

    public function __construct()
    {
        $this->service = new ProductService();
    }

    // GET /products?page=1&limit=20&category=...&era=...&q=...
    public function index(Request $request): void
    {
        $filters = [
            'category' => $request->query('category'),
            'era'      => $request->query('era'),
            'featured' => $request->query('featured'),
            'q'        => $request->query('q'),
            'sort'     => $request->query('sort', 'id_desc'),
            'page'     => (int)$request->query('page', 1),
            'limit'    => (int)$request->query('limit', 20),
        ];
        $result = $this->service->getList($filters);
        $this->success($result);
    }

    // GET /products/123
    public function show(int $id): void
    {
        $product = $this->service->getById($id);
        if (!$product) {
            $this->notFound('محصول یافت نشد');
        }
        $this->success($product);
    }

    // POST /products
    public function store(Request $request): void
    {
        $this->requireAdmin();
        $data = $request->only(['name', 'description', 'price', 'category_id', 'era', 'material', 'badge', 'stock', 'featured']);
        if (empty($data['name']) || empty($data['price'])) {
            $this->error('نام و قیمت الزامی است');
        }
        $id = $this->service->create($data);
        $this->created(['id' => $id]);
    }

    // PUT /products/123
    public function update(Request $request, int $id): void
    {
        $this->requireAdmin();
        $data = $request->only(['name', 'description', 'price', 'era', 'material', 'category_id', 'badge', 'stock', 'featured']);
        if (empty($data)) {
            $this->error('مقداری برای بروزرسانی ارسال نشده');
        }
        $this->service->update($id, $data);
        $this->success(null, 'محصول بروزرسانی شد');
    }

    // DELETE /products/123
    public function destroy(int $id): void
    {
        $this->requireAdmin();
        $this->service->softDelete($id);
        $this->noContent('محصول حذف شد');
    }

    // POST /products/123/image (آپلود تصویر برای محصول)
    public function uploadImage(Request $request, int $id): void
    {
        $this->requireAdmin();
        $file = $_FILES['image'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('تصویر ارسال نشده');
        }
        $isMain = (int)($request->input('is_main', 0));
        $sortOrder = (int)($request->input('sort_order', 0));
        $url = $this->service->addImage($id, $file, $isMain, $sortOrder);
        $this->success(['url' => $url], 'تصویر آپلود شد', 201);
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') {
            $this->forbidden();
        }
    }
}