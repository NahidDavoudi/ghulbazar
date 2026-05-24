<?php

namespace App\Modules\Admin;

use App\Core\Controller;
use App\Core\Http\Request;

class AdminController extends Controller
{
    private AdminDashboardService $service;

    public function __construct()
    {
        $this->service = new AdminDashboardService();
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') {
            $this->forbidden();
        }
    }

    // GET /admin-dashboard/index  — همه چیز یکجا
    public function index(): void
    {
        $this->requireAdmin();
        $this->success($this->service->getOverview());
    }

    // GET /admin-dashboard/stats  — فقط اعداد
    public function stats(): void
    {
        $this->requireAdmin();
        $this->success($this->service->getStats());
    }

    // GET /admin-dashboard/recentOrders?limit=10
    public function recentOrders(Request $request): void
    {
        $this->requireAdmin();
        $limit = min((int) $request->query('limit', 10), 50);
        $this->success($this->service->getRecentOrders($limit));
    }

    // GET /admin-dashboard/lowStock?threshold=5
    public function lowStock(Request $request): void
    {
        $this->requireAdmin();
        $threshold = (int) $request->query('threshold', 5);
        $this->success($this->service->getLowStockProducts($threshold));
    }

    // GET /admin-dashboard/revenue?days=7
    public function revenue(Request $request): void
    {
        $this->requireAdmin();
        $days = (int) $request->query('days', 7);
        $this->success($this->service->getRevenueByDay($days));
    }

    // GET /admin-dashboard/topProducts?limit=10
    public function topProducts(Request $request): void
    {
        $this->requireAdmin();
        $limit = min((int) $request->query('limit', 10), 50);
        $this->success($this->service->getTopSellingProducts($limit));
    }

    // GET /admin-dashboard/ordersByStatus
    public function ordersByStatus(): void
    {
        $this->requireAdmin();
        $this->success($this->service->getOrdersByStatus());
    }
}
