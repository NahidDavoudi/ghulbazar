<?php
namespace App\Modules\Admin;

use App\Core\Controller;

class AdminDashboardController extends Controller
{
    private AdminDashboardService $service;

    public function __construct()
    {
        $this->service = new AdminDashboardService();
    }

    // GET /admin-dashboard/stats
    public function stats(): void
    {
        $this->requireAdmin();
        $stats = $this->service->getStats();
        $this->success($stats);
    }

    private function requireAdmin(): void
    {
        if (!$this->isAuthenticated() || $this->user()->role !== 'admin') $this->forbidden();
    }
}