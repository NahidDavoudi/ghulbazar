<?php
namespace App\Modules\Cart;

use App\Core\Controller;
use App\Core\Http\Request;

class CartController extends Controller
{
    private CartService $service;

    public function __construct()
    {
        $this->service = new CartService();
    }

    // GET /cart/index
    public function index(): void
    {
        $this->success($this->service->getItems());
    }

    // POST /cart/add
    public function add(Request $request): void
    {
        $productId = (int)$request->input('product_id');
        $qty = max(1, (int)$request->input('qty', 1));
        if (!$productId) {
            $this->error('product_id الزامی است');
        }
        try {
            $this->service->addItem($productId, $qty);
            $this->success(['count' => $this->service->getItems()['count']], 'به سبد خرید اضافه شد');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    // PUT /cart/update
    public function update(Request $request): void
    {
        $productId = (int)$request->input('product_id');
        $qty = (int)$request->input('qty', 0);
        if (!$productId) {
            $this->error('product_id الزامی است');
        }
        $this->service->updateItem($productId, $qty);
        $this->success(['count' => $this->service->getItems()['count']], 'سبد خرید بروزرسانی شد');
    }

    // DELETE /cart/remove?product_id=123
    public function remove(Request $request): void
    {
        $productId = (int)$request->query('product_id');
        if ($productId) {
            $this->service->removeItem($productId);
        } else {
            $this->service->clear();
        }
        $this->success(['count' => $this->service->getItems()['count']], 'سبد خرید بروزرسانی شد');
    }
}