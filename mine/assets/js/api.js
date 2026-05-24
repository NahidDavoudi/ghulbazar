/**
 * api.js — کلاینت کامل بک‌اند
 *
 * استفاده:
 *   <script src="api.js"></script>
 *   <script>
 *     API.BASE_URL = 'https://yoursite.com';
 *     API.auth.login('09...', 'pass').then(res => console.log(res));
 *   </script>
 *
 * تغییرات نسخه جدید:
 *  - export name: Api → API
 *  - endpoint ادمین-لاگین: /auth/adminLogin → /auth/admin-login
 *  - اضافه شد: API.utils (formatPrice, toast)
 *  - اضافه شد: API.auth.currentUser(), API.auth.isAdmin()
 *  - اضافه شد: alias های plural برای سازگاری با کدهای قدیمی
 *    (API.products, API.categories, API.orders, API.users, API.discounts)
 *  - اضافه شد: API.admin (alias روی API.dashboard)
 *  - approveReceipt / rejectReceipt حذف شدن (endpoint در backend وجود ندارد)
 *  - API.users.updateRole حذف شد (از deactivate/activate استفاده کن)
 */

var API = (function () {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────

  var BASE_URL = '/ghulbazar/api';   // قبل از هر چیز ست کن: API.BASE_URL = 'https://...'

  // ─── Token & User Cache ────────────────────────────────────────

  function getToken() {
    return localStorage.getItem('token');
  }

  function setToken(token) {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  /** کاربر جاری رو از localStorage بخون (بعد از login ذخیره میشه) */
  function getCurrentUser() {
    try {
      var raw = localStorage.getItem('current_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function setCurrentUser(user) {
    if (user) localStorage.setItem('current_user', JSON.stringify(user));
    else localStorage.removeItem('current_user');
  }

  // ─── Core ──────────────────────────────────────────────────────

  function buildUrl(path, params) {
    if (!params) return path;
    var clean = {};
    Object.keys(params).forEach(function (k) {
      if (params[k] !== null && params[k] !== undefined && params[k] !== '') {
        clean[k] = params[k];
      }
    });
    var qs = new URLSearchParams(clean).toString();
    return qs ? path + '?' + qs : path;
  }

  function request(path, opts) {
    opts = opts || {};

    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    // FormData: بذار browser خودش Content-Type رو ست کنه
    if (opts.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    Object.assign(headers, opts.headers || {});

    return fetch(BASE_URL + path, {
      method:  opts.method  || 'GET',
      body:    opts.body    || undefined,
      headers: headers,
    }).then(function (res) {
      if (res.status === 204) return {};   // DELETE موفق بدون بدنه
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) {
          var err     = new Error(json.message || ('HTTP ' + res.status));
          err.status  = res.status;
          err.errors  = json.errors  || null;
          err.payload = json;
          throw err;
        }
        // normalize: بک‌اند همیشه { status, message, data } برمی‌گردونه
        // فرانت فقط به data نیاز داره
        if (json && typeof json === 'object' && 'status' in json && 'data' in json) {
          return json.data;
        }
        return json;
      });
    });
  }

  function get(path, params) {
    return request(buildUrl(path, params));
  }

  function post(path, body) {
    return request(path, {
      method: 'POST',
      body:   body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  }

  function put(path, body) {
    return request(path, {
      method: 'PUT',
      body:   body instanceof FormData ? body : JSON.stringify(body || {}),
    });
  }

  function del(path) {
    return request(path, { method: 'DELETE' });
  }

  function upload(path, formData, method) {
    return request(path, { method: method || 'POST', body: formData });
  }

  // ─── Utils ─────────────────────────────────────────────────────

  var utils = {
    /**
     * قیمت رو به فرمت فارسی با واحد تومان برمیگردونه
     * مثال: formatPrice(150000) → "۱۵۰٬۰۰۰ تومان"
     */
    formatPrice: function (amount) {
      var n = Number(amount) || 0;
      return n.toLocaleString('fa-IR') + ' تومان';
    },

    /**
     * نمایش toast پیام
     * @param {string} msg
     * @param {'success'|'error'|'info'} type
     * @param {number} duration میلی‌ثانیه
     */
    toast: function (msg, type, duration) {
      type     = type     || 'success';
      duration = duration || 3000;
      var colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
      var el = document.createElement('div');
      el.style.cssText = [
        'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);',
        'background:' + (colors[type] || colors.success) + ';color:#fff;',
        'padding:12px 24px;border-radius:12px;font-size:14px;',
        'box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:9999;',
        'transition:opacity .3s;white-space:nowrap;',
        'font-family:Vazirmatn,sans-serif;',
      ].join('');
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(function () {
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 300);
      }, duration);
    },
  };

  // ─── Auth ──────────────────────────────────────────────────────

  var auth = {
    register: function (data) {
      return post('/auth/register', data).then(function (res) {
        // بعد از normalize، res مستقیماً data بک‌اند هست
        if (res && res.token) {
          setToken(res.token);
          setCurrentUser(res.user || null);
        }
        return res;
      });
    },

    login: function (phone, password) {
      return post('/auth/login', { phone: phone, password: password }).then(function (res) {
        if (res && res.token) {
          setToken(res.token);
          setCurrentUser(res.user || null);
        }
        return res;
      });
    },

    /** ورود ادمین — endpoint: /auth/admin-login */
    adminLogin: function (phone, password) {
      return post('/auth/admin-login', { phone: phone, password: password }).then(function (res) {
        if (res && res.token) {
          setToken(res.token);
          setCurrentUser(res.user || null);
        }
        return res;
      });
    },

    me: function () {
      return get('/auth/me').then(function (res) {
        // res = data بک‌اند (ممکنه مستقیماً user object باشه)
        var u = res && (res.user || res);
        if (u && u.id) setCurrentUser(u);
        return res;
      });
    },

    refresh: function () {
      return post('/auth/refresh').then(function (res) {
        if (res && res.token) setToken(res.token);
        return res;
      });
    },

    logout: function () {
      setToken(null);
      setCurrentUser(null);
      location.href = 'login.html';
      return Promise.resolve({ status: 'success', message: 'خروج موفق' });
    },

    /** کاربر لاگین کرده؟ */
    isLoggedIn: function () { return !!getToken(); },

    /** کاربر جاری (از cache) */
    currentUser: function () { return getCurrentUser(); },

    /** آیا کاربر جاری ادمین است؟ */
    isAdmin: function () {
      var u = getCurrentUser();
      return !!(u && u.role === 'admin');
    },

    getToken:   getToken,
    setToken:   setToken,
  };

  // ─── Product ───────────────────────────────────────────────────

  var product = {
    list: function (filters) {
      return get('/product/index', filters);
    },

    featured: function (limit) {
      return get('/product/featured', { limit: limit || 8 });
    },

    getById: function (id) {
      return get('/product/show/' + id);
    },

    getBySlug: function (slug) {
      return get('/product/slug/' + slug);
    },

    // Admin
    create: function (data) {
      return post('/product/store', data);
    },

    update: function (id, data) {
      return put('/product/update/' + id, data);
    },

    delete: function (id) {
      return del('/product/destroy/' + id);
    },

    toggle: function (id) {
      return put('/product/toggle/' + id);
    },

    /**
     * افزودن تصویر به محصول
     * @param {number} productId
     * @param {File}   file
     * @param {object} opts — { is_main, alt_text, sort_order }
     */
    addImage: function (productId, file, opts) {
      opts = opts || {};
      var fd = new FormData();
      fd.append('image', file);
      if (opts.is_main    != null) fd.append('is_main',    opts.is_main);
      if (opts.alt_text   != null) fd.append('alt_text',   opts.alt_text);
      if (opts.sort_order != null) fd.append('sort_order', opts.sort_order);
      return upload('/product/addImage/' + productId, fd);
    },

    setMainImage: function (productId, imageId) {
      return put(buildUrl('/product/setMainImage/' + productId, { image_id: imageId }));
    },

    deleteImage: function (productId, imageId) {
      return del(buildUrl('/product/deleteImage/' + productId, { image_id: imageId }));
    },
  };

  // ─── Category ──────────────────────────────────────────────────

  var category = {
    list: function () {
      return get('/category/index');
    },

    getById: function (id) {
      return get('/category/show/' + id);
    },

    getBySlug: function (slug) {
      return get('/category/slug/' + slug);
    },

    // Admin
    create: function (data) {
      return post('/category/store', data);
    },

    update: function (id, data) {
      return put('/category/update/' + id, data);
    },

    delete: function (id) {
      return del('/category/destroy/' + id);
    },

    uploadPoster: function (id, file) {
      var fd = new FormData();
      fd.append('poster', file);
      return upload('/category/uploadPoster/' + id, fd);
    },
  };

  // ─── Category Images ───────────────────────────────────────────

  var categoryImage = {
    list: function (categoryId) {
      return get('/category-image/index', { category_id: categoryId });
    },

    add: function (categoryId, file, opts) {
      opts = opts || {};
      var fd = new FormData();
      fd.append('image', file);
      fd.append('category_id', categoryId);
      if (opts.is_main    != null) fd.append('is_main',    opts.is_main);
      if (opts.alt_text   != null) fd.append('alt_text',   opts.alt_text);
      if (opts.sort_order != null) fd.append('sort_order', opts.sort_order);
      return upload('/category-image/store', fd);
    },

    setMain: function (imageId, categoryId) {
      return put(buildUrl('/category-image/setMain/' + imageId, { category_id: categoryId }));
    },

    delete: function (imageId, categoryId) {
      return del(buildUrl('/category-image/destroy/' + imageId, { category_id: categoryId }));
    },
  };

  // ─── Cart ──────────────────────────────────────────────────────

  var cart = {
    get: function () {
      return get('/cart/index');
    },

    add: function (productId, qty) {
      return post('/cart/add', { product_id: productId, qty: qty || 1 });
    },

    update: function (productId, qty) {
      return put('/cart/update', { product_id: productId, qty: qty });
    },

    remove: function (productId) {
      return del(buildUrl('/cart/remove', { product_id: productId }));
    },

    clear: function () {
      return del('/cart/remove');
    },

    applyDiscount: function (code) {
      return post('/cart/discount', { code: code });
    },
  };

  // ─── Discount ──────────────────────────────────────────────────

  var discount = {
    validate: function (code, total) {
      return get('/discount/validate', { code: code, total: total || 0 });
    },

    // Admin
    list: function () {
      return get('/discount/index');
    },

    active: function () {
      return get('/discount/active');
    },

    create: function (data) {
      return post('/discount/store', data);
    },

    update: function (id, data) {
      return put('/discount/update/' + id, data);
    },

    deactivate: function (id) {
      return put('/discount/deactivate/' + id);
    },

    delete: function (id) {
      return del('/discount/destroy/' + id);
    },
  };

  // ─── Order ─────────────────────────────────────────────────────

  var order = {
    create: function (data) {
      return post('/order/store', data);
    },

    list: function () {
      return get('/order/index');
    },

    getById: function (id) {
      return get('/order/show/' + id);
    },

    getByNumber: function (number) {
      return get('/order/byNumber/' + number);
    },

    cancel: function (id) {
      return post('/order/cancel/' + id);
    },

    uploadReceipt: function (orderId, file) {
      var fd = new FormData();
      fd.append('receipt', file);
      return upload('/order/uploadReceipt/' + orderId, fd);
    },

    // Admin
    adminList: function (params) {
      return get('/order/adminIndex', params);
    },

    updateStatus: function (id, status) {
      return put('/order/updateStatus/' + id, { status: status });
    },
  };

  // ─── User ──────────────────────────────────────────────────────

  var user = {
    profile: function () {
      return get('/user/profile');
    },

    update: function (data) {
      return put('/user/update', data);
    },

    changePassword: function (currentPassword, newPassword) {
      return put('/user/changePassword', {
        current_password: currentPassword,
        new_password:     newPassword,
      });
    },

    // Addresses
    addresses: function () {
      return get('/user/addresses');
    },

    addAddress: function (data) {
      return post('/user/addAddress', data);
    },

    updateAddress: function (id, data) {
      return put('/user/updateAddress/' + id, data);
    },

    deleteAddress: function (id) {
      return del('/user/deleteAddress/' + id);
    },

    // Admin
    list: function (params) {
      return get('/user/index', params);
    },

    deactivate: function (id) {
      return put('/user/deactivate/' + id);
    },

    activate: function (id) {
      return put('/user/activate/' + id);
    },
  };

  // ─── Bank Cards ────────────────────────────────────────────────

  var bankCard = {
    active: function () {
      return get('/admin-bank-card/active');
    },

    // Admin
    list: function () {
      return get('/admin-bank-card/index');
    },

    create: function (data) {
      return post('/admin-bank-card/store', data);
    },

    update: function (id, data) {
      return put('/admin-bank-card/update/' + id, data);
    },

    toggle: function (id) {
      return put('/admin-bank-card/toggle/' + id);
    },

    delete: function (id) {
      return del('/admin-bank-card/destroy/' + id);
    },
  };

  // ─── Dashboard ─────────────────────────────────────────────────

  var dashboard = {
    overview: function () {
      return get('/admin/index');
    },

    stats: function () {
      return get('/admin/stats');
    },

    recentOrders: function (limit) {
      return get('/admin/recentOrders', { limit: limit || 10 });
    },

    lowStock: function (threshold) {
      return get('/admin/lowStock', { threshold: threshold || 5 });
    },

    revenue: function (days) {
      return get('/admin/revenue', { days: days || 7 });
    },

    topProducts: function (limit) {
      return get('/admin/topProducts', { limit: limit || 10 });
    },

    ordersByStatus: function () {
      return get('/admin/ordersByStatus');
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  Compatibility Aliases
  //  برای سازگاری با admin.js و app.js قدیمی
  //  همه alias ها فقط pointer هستن — overhead ندارن
  // ═══════════════════════════════════════════════════════════════

  /**
   * API.products.*
   * تفاوت‌ها نسبت به API.product:
   *   .get(id)         → product.getById(id)
   *   .uploadImage(id, file, isMain, sortOrder) → product.addImage با opts
   */
  var products = {
    list:        function (f)           { return product.list(f); },
    featured:    function (n)           { return product.featured(n); },
    get:         function (id)          { return product.getById(id); },       // alias
    getById:     function (id)          { return product.getById(id); },
    getBySlug:   function (s)           { return product.getBySlug(s); },
    create:      function (d)           { return product.create(d); },
    update:      function (id, d)       { return product.update(id, d); },
    delete:      function (id)          { return product.delete(id); },
    toggle:      function (id)          { return product.toggle(id); },
    addImage:    function (id, f, o)    { return product.addImage(id, f, o); },
    /**
     * signature قدیمی: uploadImage(productId, file, isMain, sortOrder)
     * هنوز کار می‌کنه
     */
    uploadImage: function (id, file, isMain, sortOrder) {
      return product.addImage(id, file, { is_main: isMain ? 1 : 0, sort_order: sortOrder || 0 });
    },
    setMainImage:  function (pid, iid) { return product.setMainImage(pid, iid); },
    deleteImage:   function (pid, iid) { return product.deleteImage(pid, iid); },
  };

  /**
   * API.categories.*
   * تفاوت: .uploadImage(id, file) → category.uploadPoster(id, file)
   */
  var categories = {
    list:        function ()       { return category.list(); },
    getById:     function (id)     { return category.getById(id); },
    getBySlug:   function (s)      { return category.getBySlug(s); },
    create:      function (d)      { return category.create(d); },
    update:      function (id, d)  { return category.update(id, d); },
    delete:      function (id)     { return category.delete(id); },
    uploadPoster: function (id, f) { return category.uploadPoster(id, f); },
    uploadImage:  function (id, f) { return category.uploadPoster(id, f); }, // alias قدیمی
  };

  /** API.orders.* — با adminIndex به جای list ادمین */
  var orders = {
    create:       function (d)      { return order.create(d); },
    list:         function ()       { return order.list(); },           // سفارشات خود کاربر (صفحه orders)
    userList:     function ()       { return order.list(); },
    getById:      function (id)     { return order.getById(id); },
    getByNumber:  function (n)      { return order.getByNumber(n); },
    cancel:       function (id)     { return order.cancel(id); },
    uploadReceipt:function (id, f)  { return order.uploadReceipt(id, f); },
    updateStatus: function (id, s)  { return order.updateStatus(id, s); },
    adminList:    function (p)      { return order.adminList(p); },
  };

  /**
   * API.users.*
   * نکته: updateRole حذف شده — backend این endpoint رو نداره.
   * به جاش از deactivate/activate استفاده کن.
   */
  var users = {
    list:       function (p)      { return user.list(p); },
    profile:    function ()       { return user.profile(); },
    update:     function (d)      { return user.update(d); },
    deactivate: function (id)     { return user.deactivate(id); },
    activate:   function (id)     { return user.activate(id); },
    delete:     function (id)     { return user.deactivate(id); },  // alias — غیرفعال میکنه
    addresses:  function ()       { return user.addresses(); },
    addAddress: function (d)      { return user.addAddress(d); },
    updateAddress: function (i,d) { return user.updateAddress(i, d); },
    deleteAddress: function (id)  { return user.deleteAddress(id); },
  };

  /** API.discounts.* */
  var discounts = {
    validate:   function (c, t)   { return discount.validate(c, t); },
    list:       function ()       { return discount.list(); },
    active:     function ()       { return discount.active(); },
    create:     function (d)      { return discount.create(d); },
    update:     function (id, d)  { return discount.update(id, d); },
    deactivate: function (id)     { return discount.deactivate(id); },
    delete:     function (id)     { return discount.delete(id); },
  };

  /**
   * API.admin.*
   * alias روی dashboard — برای سازگاری با admin.js قدیمی
   * قبلاً: API.admin.stats() — الان: API.dashboard.stats()
   */
  var admin = {
    stats:         function ()    { return dashboard.stats(); },
    overview:      function ()    { return dashboard.overview(); },
    recentOrders:  function (n)   { return dashboard.recentOrders(n); },
    lowStock:      function (t)   { return dashboard.lowStock(t); },
    revenue:       function (d)   { return dashboard.revenue(d); },
    topProducts:   function (n)   { return dashboard.topProducts(n); },
    ordersByStatus:function ()    { return dashboard.ordersByStatus(); },
  };

  // ─── Public API ────────────────────────────────────────────────

  return {
    get BASE_URL()    { return BASE_URL; },
    set BASE_URL(url) { BASE_URL = url.replace(/\/$/, ''); },

    // ── core namespaces (singular — استانداردِ جدید) ──
    auth:          auth,
    product:       product,
    category:      category,
    categoryImage: categoryImage,
    cart:          cart,
    discount:      discount,
    order:         order,
    user:          user,
    bankCard:      bankCard,
    dashboard:     dashboard,

    // ── utils ──
    utils:         utils,

    // ── compatibility aliases (plural — سازگاری با کدهای قدیمی) ──
    products:      products,
    categories:    categories,
    orders:        orders,
    users:         users,
    discounts:     discounts,
    admin:         admin,
  };

})();