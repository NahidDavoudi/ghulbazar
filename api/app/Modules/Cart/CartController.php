<?php

namespace App\Modules\Cart;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Modules\Product\ProductModel;
use App\Modules\Discount\DiscountModel;

class CartController extends Controller
{
    private CartService $service;

    public function __construct()
    {
        $this->service = new CartService(
            new CartModel(),
            new CartItemModel(),
            new ProductModel(),
            new DiscountModel(),
        );
    }

    private function requireAuth(): void
    {
        if (!$this->isAuthenticated()) {
            $this->unauthorized();
        }
    }

    // GET /cart/index
    public function index(): void
    {
        $this->requireAuth();

        $cart = $this->service->getCart($this->userId());
        $this->success($cart);
    }

    // POST /cart/add
    public function add(Request $request): void
    {
        $this->requireAuth();

        $productId = (int) $request->input('product_id');
        $qty       = max(1, (int) $request->input('qty', 1));

        if (!$productId) {
            $this->error('product_id الزامی است', 422);
        }

        try {
            $cart = $this->service->addItem($this->userId(), $productId, $qty);
            $this->success($cart, 'محصول به سبد خرید اضافه شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // PUT /cart/update
    public function update(Request $request): void
    {
        $this->requireAuth();

        $productId = (int) $request->input('product_id');
        $qty       = (int) $request->input('qty', 0);

        if (!$productId) {
            $this->error('product_id الزامی است', 422);
        }

        try {
            $cart = $this->service->updateItem($this->userId(), $productId, $qty);
            $this->success($cart, 'سبد خرید بروزرسانی شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // DELETE /cart/remove?product_id=123
    public function remove(Request $request): void
    {
        $this->requireAuth();

        $productId = (int) $request->query('product_id');

        try {
            if ($productId) {
                $cart = $this->service->removeItem($this->userId(), $productId);
                $this->success($cart, 'محصول از سبد خرید حذف شد');
            } else {
                $this->service->clearCart($this->userId());
                $this->success(null, 'سبد خرید خالی شد');
            }
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // POST /cart/discount
    public function discount(Request $request): void
    {
        $this->requireAuth();

        $code = trim($request->input('code', ''));
        if (!$code) {
            $this->error('کد تخفیف الزامی است', 422);
        }

        try {
            $result = $this->service->applyDiscount($this->userId(), $code);
            $this->success($result, 'کد تخفیف اعمال شد');
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}
