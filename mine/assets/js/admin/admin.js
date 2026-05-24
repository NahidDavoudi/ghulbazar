/**
 * admin/admin.js — Bootstrap پنل ادمین
 *
 * وظیفه این فایل فقط:
 *   1. چک Auth
 *   2. Sidebar و page switching
 *   3. Boot (لود صفحه اول)
 *
 * وابستگی‌ها (ترتیب load در admin.html):
 *   1. api.js
 *   2. admin/utils/helpers.js
 *   3. admin/utils/priceFormatter.js
 *   4. admin/pages/dashboard.js
 *   5. admin/pages/products.js
 *   6. admin/pages/categories.js
 *   7. admin/pages/orders.js
 *   8. admin/pages/users.js
 *   9. admin/pages/discounts.js
 *  10. admin/admin.js           ← این فایل، آخر از همه
 */

;(function () {
  'use strict';

  /* ── 1. Auth guard ─────────────────────────────────────────── */
  if (!API.auth.isLoggedIn() || !API.auth.isAdmin()) {
    location.replace('login.html');
    return;
  }

  const _user = API.auth.currentUser();
  const _el   = document.getElementById('sidebarUsername');
  if (_el) _el.textContent = _user?.name || _user?.phone || 'ادمین';

  /* ── 2. Page switching ─────────────────────────────────────── */
  const PAGE_LOADERS = {
    dashboard:  window.loadDashboard,
    products:   window.loadProducts,
    categories: window.loadCategories,
    orders:     window.loadOrders,
    users:      window.loadUsers,
    discounts:  window.loadDiscounts,
    settings:   () => {},
  };

  window.switchPage = function (name, linkEl) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`page-${name}`)?.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(a =>
      a.classList.remove('bg-red-50', 'text-red-800', 'font-semibold'));
    if (linkEl) linkEl.classList.add('bg-red-50', 'text-red-800', 'font-semibold');

    window.closeSidebar();
    PAGE_LOADERS[name]?.();
  };

  /* ── 3. Sidebar (mobile) ───────────────────────────────────── */
  window.toggleSidebar = () => {
    document.getElementById('sidebar')?.classList.toggle('translate-x-full');
    document.getElementById('mobileOverlay')?.classList.toggle('hidden');
  };

  window.closeSidebar = () => {
    document.getElementById('sidebar')?.classList.add('translate-x-full');
    document.getElementById('mobileOverlay')?.classList.add('hidden');
  };

  /* ── 4. Logout ─────────────────────────────────────────────── */
  window.handleLogout = () => API.auth.logout();

  /* ── 5. Boot ───────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (window.lucide) lucide.createIcons();
    attachPriceFormatter('productPrice');
    window.loadDashboard();
  });

})();
