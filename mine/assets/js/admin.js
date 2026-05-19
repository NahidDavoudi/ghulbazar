/**
 * ╔═══════════════════════════════════════════════════════════╗
 *   Ghul Bazar — admin.js
 *   منطق کامل پنل ادمین. جایگزین adminApiClient.js و adminApp.js
 *   وابستگی: api.js باید قبل از این فایل لود شده باشه
 * ╚═══════════════════════════════════════════════════════════╝
 */
;(function () {
    'use strict';
  
    /* ══════════════════════════════════════════════════════════
       AUTH CHECK
    ══════════════════════════════════════════════════════════ */
    if (!API.auth.isLoggedIn() || !API.auth.isAdmin()) {
      location.replace('../login.html');
      return;
    }
  
    const user = API.auth.currentUser();
    const usernameEl = document.getElementById('sidebarUsername');
    if (usernameEl) usernameEl.textContent = user?.name || user?.phone || 'ادمین';
  
    /* ══════════════════════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════════════════════ */
    function show(id)    { document.getElementById(id)?.classList.remove('hidden'); }
    function hide(id)    { document.getElementById(id)?.classList.add('hidden'); }
    function text(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }
    function val(id)     { return document.getElementById(id)?.value.trim() ?? ''; }
  
    function loading(show) {
      document.getElementById('loadingOverlay')?.classList.toggle('hidden', !show);
    }
  
    function toast(msg, type = 'success') {
      API.utils.toast(msg, type);
    }
  
    function showModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
    function hideModal(id)  { document.getElementById(id)?.classList.add('hidden'); }
    window.hideModal = hideModal;
  
    const STATUS_MAP = {
      pending:   { label: 'در انتظار',       cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
      paid:      { label: 'پرداخت شده',      cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      shipped:   { label: 'ارسال شده',       cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      delivered: { label: 'تحویل داده شده',  cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      cancelled: { label: 'لغو شده',         cls: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400' },
    };
  
    function statusBadge(status) {
      const s = STATUS_MAP[status] || { label: status, cls: 'bg-stone-100 text-stone-500' };
      return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}">${s.label}</span>`;
    }
  
    /* ══════════════════════════════════════════════════════════
       SIDEBAR / PAGE SWITCHING
    ══════════════════════════════════════════════════════════ */
    const pages = ['dashboard', 'products', 'orders', 'users'];
  
    window.switchPage = function (pageName, linkEl) {
      // مخفی کردن همه صفحات
      pages.forEach(p => {
        document.getElementById(`page-${p}`)?.classList.add('hidden');
      });
  
      // نمایش صفحه انتخاب‌شده
      document.getElementById(`page-${pageName}`)?.classList.remove('hidden');
  
      // آپدیت nav link‌ها
      document.querySelectorAll('.nav-link').forEach(a => {
        a.classList.remove('active-link', 'bg-red-50', 'dark:bg-red-900/20', 'text-red-800', 'dark:text-red-300');
      });
      if (linkEl) {
        linkEl.classList.add('active-link', 'bg-red-50', 'dark:bg-red-900/20', 'text-red-800', 'dark:text-red-300');
      }
  
      // بستن sidebar موبایل
      closeSidebar();
  
      // لود داده صفحه
      const loaders = {
        dashboard: loadDashboard,
        products:  loadProducts,
        orders:    loadOrders,
        users:     loadUsers,
      };
      loaders[pageName]?.();
    };
  
    /* ── sidebar موبایل ── */
    window.toggleSidebar = function () {
      const s = document.getElementById('sidebar');
      const o = document.getElementById('mobileOverlay');
      s?.classList.toggle('translate-x-full');
      o?.classList.toggle('hidden');
    };
    window.closeSidebar = function () {
      document.getElementById('sidebar')?.classList.add('translate-x-full');
      document.getElementById('mobileOverlay')?.classList.add('hidden');
    };
  
    /* ── تم ── */
    window.toggleTheme = function () {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('gb_admin_theme', isDark ? 'dark' : 'light');
      _updateThemeIcons(isDark);
    };
    function _updateThemeIcons(isDark) {
      ['sidebarThemeIcon', 'mobileThemeIcon'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
      });
      text('sidebarThemeLabel', isDark ? 'حالت روشن' : 'حالت تاریک');
      if (window.lucide) lucide.createIcons();
    }
    // اعمال تم ذخیره‌شده
    const savedTheme = localStorage.getItem('gb_admin_theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      _updateThemeIcons(false);
    } else {
      _updateThemeIcons(true);
    }
  
    /* ── logout ── */
    window.handleLogout = function () {
      API.auth.logout();
    };
  
    /* ══════════════════════════════════════════════════════════
       DASHBOARD
    ══════════════════════════════════════════════════════════ */
    async function loadDashboard() {
      try {
        loading(true);
        const s = await API.admin.stats();
        loading(false);
  
        text('stat-products',  s.total_products?.toLocaleString('fa-IR')  ?? '۰');
        text('stat-total-orders',    s.total_orders?.toLocaleString('fa-IR')    ?? '۰');
        text('stat-total-revenue',   API.utils.formatPrice(s.total_revenue      ?? 0));
        text('stat-pending',  s.pending_orders?.toLocaleString('fa-IR')  ?? '۰');
        text('stat-orders-today',    s.today_orders?.toLocaleString('fa-IR')    ?? '۰');
        text('stat-low-stock',       s.low_stock_items?.toLocaleString('fa-IR') ?? '۰');
        text('stat-total-users',     s.total_users?.toLocaleString('fa-IR')     ?? '۰');
      } catch (e) {
        loading(false);
        toast(e.message, 'error');
      }
    }
  
    /* ══════════════════════════════════════════════════════════
       PRODUCTS
    ══════════════════════════════════════════════════════════ */
    let _products = [];
    let _categories = [];
    let _editingProductId = null;
  
    async function loadProducts() {
      try {
        loading(true);
        const [data, cats] = await Promise.all([
          API.products.list({ limit: 100 }),
          API.categories.list(),
        ]);
        loading(false);
        _products   = data.data || [];
        _categories = cats || [];
        renderProductsTable(_products);
        _populateCategorySelect();
      } catch (e) {
        loading(false);
        toast(e.message, 'error');
      }
    }
  
    function renderProductsTable(products) {
      const tbody = document.getElementById('productsTableBody');
      if (!tbody) return;
  
      if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-stone-400">محصولی یافت نشد</td></tr>`;
        return;
      }
  
      tbody.innerHTML = products.map(p => {
        const img = p.images?.find(i => i.is_main)?.url || p.images?.[0]?.url || p.image || '';
        const stockCls = p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-yellow-500' : 'text-green-600 dark:text-green-400';
        return `
          <tr class="border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <img src="${img}" alt="${p.name}"
                     class="w-12 h-12 rounded-xl object-cover bg-stone-100 dark:bg-stone-800"
                     onerror="this.src='../assets/images/placeholder.png'">
                <div>
                  <p class="font-medium text-stone-800 dark:text-white text-sm">${p.name}</p>
                  <p class="text-xs text-stone-400">${p.category_name || '—'}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-stone-600 dark:text-stone-300">${API.utils.formatPrice(p.price)}</td>
            <td class="px-4 py-3 text-sm font-medium ${stockCls}">${p.stock}</td>
            <td class="px-4 py-3">
              <span class="px-2.5 py-1 rounded-full text-xs font-medium ${p.is_featured ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'}">
                ${p.is_featured ? 'ویژه' : 'عادی'}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-stone-400">${p.views || 0}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <button onclick="editProduct(${p.id})"
                        class="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors" title="ویرایش">
                  <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')"
                        class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors" title="حذف">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');
  
      if (window.lucide) lucide.createIcons();
      text('products-count', `${products.length} محصول`);
    }
  
    function _populateCategorySelect() {
      const sel = document.getElementById('productCategory');
      if (!sel) return;
      sel.innerHTML = `<option value="">انتخاب دسته‌بندی</option>` +
        _categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  
    // جستجو
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        const q = this.value.toLowerCase();
        renderProductsTable(_products.filter(p =>
          p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q)
        ));
      });
    }
  
    // باز کردن مودال محصول جدید
    window.showProductModal = function () {
      _editingProductId = null;
      document.getElementById('productForm')?.reset();
      document.getElementById('productImagesGrid').innerHTML = '';
      text('productModalTitle', 'محصول جدید');
      text('productSubmitText', 'ذخیره محصول');
      _populateCategorySelect();
      showModal('productModal');
    };
  
    // ویرایش محصول
    window.editProduct = async function (id) {
      try {
        loading(true);
        const p = await API.products.get(id);
        loading(false);
        _editingProductId = id;
  
        // پر کردن فرم
        document.getElementById('productId').value       = p.id;
        document.getElementById('productName').value     = p.name;
        document.getElementById('productPrice').value    = p.price;
        document.getElementById('productStock').value    = p.stock;
        document.getElementById('productDesc').value     = p.description || '';
        document.getElementById('productBadge').value    = p.badge || '';
        document.getElementById('productEra').value      = p.era || '';
        document.getElementById('productFeatured').checked = !!p.is_featured;
        _populateCategorySelect();
        document.getElementById('productCategory').value = p.category_id || '';
  
        // تصاویر
        const grid = document.getElementById('productImagesGrid');
        if (grid) {
          grid.innerHTML = (p.images || []).map(img => `
            <div class="relative aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
              <img src="${img.url}" class="w-full h-full object-cover">
              ${img.is_main ? '<span class="absolute top-1 right-1 bg-red-700 text-white text-[10px] px-1.5 py-0.5 rounded-full">اصلی</span>' : ''}
            </div>`).join('');
        }
  
        text('productModalTitle', 'ویرایش محصول');
        text('productSubmitText', 'بروزرسانی');
        showModal('productModal');
      } catch (e) {
        loading(false);
        toast(e.message, 'error');
      }
    };
  
    // حذف محصول
    window.deleteProduct = async function (id, name) {
      if (!confirm(`آیا از حذف "${name}" مطمئن هستید؟`)) return;
      try {
        loading(true);
        await API.products.delete(id);
        loading(false);
        toast('محصول حذف شد');
        loadProducts();
      } catch (e) {
        loading(false);
        toast(e.message, 'error');
      }
    };
  
    // ذخیره محصول (create / update)
    const productForm = document.getElementById('productForm');
    if (productForm) {
      productForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const payload = {
          name:        val('productName'),
          price:       Number(val('productPrice')),
          stock:       Number(val('productStock')),
          description: val('productDesc'),
          badge:       val('productBadge'),
          era:         val('productEra'),
          category_id: val('productCategory') || null,
          is_featured: document.getElementById('productFeatured')?.checked ? 1 : 0,
        };
  
        try {
          loading(true);
          if (_editingProductId) {
            await API.products.update(_editingProductId, payload);
            toast('محصول بروزرسانی شد');
          } else {
            await API.products.create(payload);
            toast('محصول ایجاد شد');
          }
          loading(false);
          hideModal('productModal');
          loadProducts();
        } catch (e) {
          loading(false);
          toast(e.message, 'error');
        }
      });
    }
  
    // آپلود تصویر
    window.uploadProductImage = async function (input) {
      if (!_editingProductId) {
        toast('ابتدا محصول را ذخیره کنید، سپس تصویر اضافه کنید', 'error');
        return;
      }
      const files = Array.from(input.files);
      for (const file of files) {
        try {
          loading(true);
          await API.products.uploadImage(_editingProductId, file, false, 0);
          loading(false);
          toast('تصویر آپلود شد');
          editProduct(_editingProductId); // refresh
        } catch (e) {
          loading(false);
          toast(e.message, 'error');
        }
      }
      input.value = '';
    };
  
    /* ══════════════════════════════════════════════════════════
       ORDERS
    ══════════════════════════════════════════════════════════ */
    let _orders = [];
  
    async function loadOrders() {
      try {
        loading(true);
        const data = await API.orders.list({ limit: 100 });
        loading(false);
        _orders = Array.isArray(data) ? data : (data.data || data.orders || []);
        renderOrdersTable(_orders);
      } catch (e) {
        loading(false);
        toast(e.message, 'error');
      }
    }
  
    function renderOrdersTable(orders) {
      const tbody = document.getElementById('ordersTableBody');
      if (!tbody) return;
  
      if (!orders.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-stone-400">سفارشی یافت نشد</td></tr>`;
        return;
      }
  
      tbody.innerHTML = orders.map(o => {
        const date = o.created_at
          ? new Date(o.created_at).toLocaleDateString('fa-IR')
          : '—';
        return `
          <tr class="border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
            <td class="px-4 py-3 font-mono text-sm text-stone-700 dark:text-stone-300">#${o.order_number}</td>
            <td class="px-4 py-3">
              <p class="text-sm font-medium text-stone-800 dark:text-white">${o.customer_name || '—'}</p>
              <p class="text-xs text-stone-400" dir="ltr">${o.customer_phone || ''}</p>
            </td>
            <td class="px-4 py-3 text-sm text-stone-600 dark:text-stone-300">${API.utils.formatPrice(o.total_amount || 0)}</td>
            <td class="px-4 py-3 text-xs text-stone-400">${date}</td>
            <td class="px-4 py-3">${statusBadge(o.status)}</td>
            <td class="px-4 py-3">
              <select onchange="changeOrderStatus(${o.id}, this.value)"
                      class="text-xs bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700
                             rounded-lg px-2 py-1.5 text-stone-700 dark:text-stone-300 focus:outline-none focus:border-red-700">
                ${Object.entries(STATUS_MAP).map(([k, v]) =>
                  `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v.label}</option>`
                ).join('')}
              </select>
            </td>
          </tr>`;
      }).join('');
  
      text('orders-count', `${orders.length} سفارش`);
    }
  
    window.changeOrderStatus = async function (id, status) {
      try {
        await API.orders.updateStatus(id, status);
        toast('وضعیت سفارش بروزرسانی شد');
        // آپدیت badge بدون reload کامل
        const order = _orders.find(o => o.id === id);
        if (order) order.status = status;
        renderOrdersTable(_orders);
      } catch (e) {
        toast(e.message, 'error');
      }
    };
  
    // فیلتر وضعیت سفارش
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    if (orderStatusFilter) {
      orderStatusFilter.addEventListener('change', function () {
        const filtered = this.value
          ? _orders.filter(o => o.status === this.value)
          : _orders;
        renderOrdersTable(filtered);
      });
    }
  
    // جستجو در سفارشات
    const ordersSearch = document.getElementById('ordersSearch');
    if (ordersSearch) {
      ordersSearch.addEventListener('input', function () {
        const q = this.value.toLowerCase();
        renderOrdersTable(_orders.filter(o =>
          (o.order_number || '').toLowerCase().includes(q) ||
          (o.customer_name || '').toLowerCase().includes(q) ||
          (o.customer_phone || '').toLowerCase().includes(q)
        ));
      });
    }
  
    /* ══════════════════════════════════════════════════════════
       USERS
    ══════════════════════════════════════════════════════════ */
    let _users = [];
  
    async function loadUsers() {
      try {
        loading(true);
        const data = await API.users.list({ limit: 100 });
        loading(false);
        _users = data.data || [];
        renderUsersTable(_users);
      } catch (e) {
        loading(false);
        toast(e.message, 'error');
      }
    }
  
    function renderUsersTable(users) {
      const tbody = document.getElementById('usersTableBody');
      if (!tbody) return;
  
      if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-stone-400">کاربری یافت نشد</td></tr>`;
        return;
      }
  
      tbody.innerHTML = users.map(u => {
        const date = u.created_at
          ? new Date(u.created_at).toLocaleDateString('fa-IR')
          : '—';
        const isAdmin = u.role === 'admin';
        return `
          <tr class="border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-700 dark:text-red-400 font-bold text-sm">
                  ${(u.name || u.phone || '؟')[0]}
                </div>
                <div>
                  <p class="text-sm font-medium text-stone-800 dark:text-white">${u.name || '—'}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-sm text-stone-500 dark:text-stone-400" dir="ltr">${u.phone || '—'}</td>
            <td class="px-4 py-3">
              <span class="px-2.5 py-1 rounded-full text-xs font-medium ${isAdmin ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}">
                ${isAdmin ? 'ادمین' : 'کاربر'}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-stone-400">${date}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <button onclick="toggleUserRole(${u.id}, '${u.role}')"
                        class="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400 transition-colors"
                        title="${isAdmin ? 'تبدیل به کاربر' : 'تبدیل به ادمین'}">
                  <i data-lucide="${isAdmin ? 'shield-off' : 'shield'}" class="w-4 h-4"></i>
                </button>
                <button onclick="deleteUser(${u.id}, '${(u.name || u.phone || '').replace(/'/g, "\\'")}')"
                        class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors" title="حذف">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');
  
      if (window.lucide) lucide.createIcons();
      text('users-count', `${users.length} کاربر`);
    }
  
    window.toggleUserRole = async function (id, currentRole) {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      if (!confirm(`تغییر نقش به "${newRole === 'admin' ? 'ادمین' : 'کاربر'}"؟`)) return;
      try {
        await API.users.updateRole(id, newRole);
        toast('نقش کاربر تغییر کرد');
        loadUsers();
      } catch (e) { toast(e.message, 'error'); }
    };
  
    window.deleteUser = async function (id, name) {
      if (!confirm(`حذف کاربر "${name}"؟`)) return;
      try {
        await API.users.delete(id);
        toast('کاربر حذف شد');
        loadUsers();
      } catch (e) { toast(e.message, 'error'); }
    };
  
    // جستجو در کاربران
    const usersSearch = document.getElementById('usersSearch');
    if (usersSearch) {
      usersSearch.addEventListener('input', function () {
        const q = this.value.toLowerCase();
        renderUsersTable(_users.filter(u =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q)
        ));
      });
    }
  
    /* ══════════════════════════════════════════════════════════
       BOOT
    ══════════════════════════════════════════════════════════ */
  
    // alias برای دکمه HTML
    window.loadDashboardStats = loadDashboard;
    window.loadProducts = loadProducts;
    window.loadOrders = loadOrders;
    window.loadUsers = loadUsers;
    document.addEventListener('DOMContentLoaded', function () {
      if (window.lucide) lucide.createIcons();
      // لود داشبورد به عنوان صفحه اول
      loadDashboard();
    });
  
  })();