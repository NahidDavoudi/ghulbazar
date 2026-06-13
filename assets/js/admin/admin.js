/**
 * admin/admin.js — Admin panel entry (ES module)
 */
import { initConfig } from '../config/bootstrap.js';
import { initTheme } from '../core/theme.js';
import loadStoreSettings from '../core/storeSettings.js';
import api from '../core/api.js';
import { installAdminHelpers } from '../utils/helpers.js';
import { attachPriceFormatter } from '../utils/priceFormatter.js';

initConfig();
installAdminHelpers();

window.API = api;
window.Api = api;
window.attachPriceFormatter = attachPriceFormatter;

window.toggleSidebar = () => {
  document.getElementById('sidebar')?.classList.toggle('translate-x-full');
  document.getElementById('mobileOverlay')?.classList.toggle('hidden');
};

window.closeSidebar = () => {
  document.getElementById('sidebar')?.classList.add('translate-x-full');
  document.getElementById('mobileOverlay')?.classList.add('hidden');
};

if (!api.auth.isLoggedIn() || !api.auth.isAdmin()) {
  location.replace('login.html');
}

await Promise.all([
  import('./pages/dashboard.js'),
  import('./pages/products.js'),
  import('./pages/categories.js'),
  import('./pages/orders.js'),
  import('./pages/users.js'),
  import('./pages/discounts.js'),
]);

const _user = api.auth.currentUser();
const _el = document.getElementById('sidebarUsername');
if (_el) _el.textContent = _user?.name || _user?.phone || 'ادمین';

const PAGE_LOADERS = {
  dashboard: window.loadDashboard,
  products: window.loadProducts,
  categories: window.loadCategories,
  orders: window.loadOrders,
  users: window.loadUsers,
  discounts: window.loadDiscounts,
  settings: () => {},
};

window.switchPage = function (name, linkEl) {
  document.querySelectorAll('.page-section').forEach((s) => s.classList.add('hidden'));
  document.getElementById(`page-${name}`)?.classList.remove('hidden');

  document.querySelectorAll('.nav-link').forEach((a) =>
    a.classList.remove('bg-red-50', 'text-red-800', 'font-semibold'));
  if (linkEl) linkEl.classList.add('bg-red-50', 'text-red-800', 'font-semibold');

  window.closeSidebar();
  PAGE_LOADERS[name]?.();
  location.hash = name;
};

window.handleLogout = () => api.auth.logout();

async function bootAdmin() {
  await loadStoreSettings(api);
  initTheme();
  if (window.lucide) lucide.createIcons();
  attachPriceFormatter('productPrice');
  const page = location.hash.replace('#', '') || 'dashboard';
  const navLink = document.querySelector(`.nav-link[onclick*="${page}"]`);
  window.switchPage(page, navLink);
}

bootAdmin();
