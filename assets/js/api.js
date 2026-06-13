/**
 * api.js — NadCore Universal API Client
 * پل اتصال فرانت به بک‌اند PHP
 *
 * وابستگی: config.js (window.AppConfig)
 * خروجی: window.Api
 *
 * پاسخ بک‌اند: { success, message, data, errors?, meta? }
 */
const Api = (() => {

  // ─── Config ────────────────────────────────────────────────────────────────

  const CFG   = () => window.AppConfig || {};
  const API   = () => CFG().api || {};
  const STORE = () => CFG().storage || {};
  const MSG   = () => CFG().messages || {};
  const HOOKS = () => CFG().hooks || {};

  const BASE_URL = () => API().baseUrl || '/api/v1';
  const TOKEN_KEY = () => STORE().token || 'gb_token';
  const REFRESH_KEY = () => STORE().refreshToken || 'gb_refresh';
  const ROLE_KEY = () => STORE().role || 'gb_role';


  // ─── ApiError ──────────────────────────────────────────────────────────────

  class ApiError extends Error {
    /**
     * @param {string} message
     * @param {number} status
     * @param {Object} options
     */
    constructor(message, status = 0, options = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.errors = options.errors ?? null;
      this.raw = options.raw ?? null;
      this.isNetwork = !!options.isNetwork;
      this.isTimeout = !!options.isTimeout;
      this.isParse = !!options.isParse;
    }

    get isValidation() { return this.status === 422; }
    get isAuth()       { return this.status === 401; }
    get isForbidden()  { return this.status === 403; }
    get isNotFound()   { return this.status === 404; }
    get isRateLimit()  { return this.status === 429; }
    get isServer()     { return this.status >= 500; }

    /** اولین پیام خطای فیلد — مناسب toast */
    firstFieldError() {
      if (!this.errors || typeof this.errors !== 'object') return null;
      const first = Object.values(this.errors).flat()[0];
      return first ?? null;
    }

    /** پیام مناسب نمایش به کاربر */
    displayMessage() {
      return this.firstFieldError() || this.message || MSG().unknown;
    }
  }


  // ─── Token Helpers ─────────────────────────────────────────────────────────

  const token = {
    get:    () => localStorage.getItem(TOKEN_KEY()),
    set:    (t) => localStorage.setItem(TOKEN_KEY(), t),
    remove: () => localStorage.removeItem(TOKEN_KEY()),
  };

  const refreshToken = {
    get:    () => localStorage.getItem(REFRESH_KEY()),
    set:    (t) => localStorage.setItem(REFRESH_KEY(), t),
    remove: () => localStorage.removeItem(REFRESH_KEY()),
  };

  const role = {
    get:     () => localStorage.getItem(ROLE_KEY()),
    set:     (r) => localStorage.setItem(ROLE_KEY(), r),
    remove:  () => localStorage.removeItem(ROLE_KEY()),
    isAdmin: () => localStorage.getItem(ROLE_KEY()) === 'admin',
  };


  // ─── Response Mapping ──────────────────────────────────────────────────────

  /**
   * نرمال‌سازی envelope بک‌اند
   * @returns {{ ok: boolean, data: *, message: string, errors: *, meta: *, status: number }}
   */
  function mapResponse(json, status) {
    if (json && typeof json === 'object' && 'success' in json) {
      return {
        ok:      !!json.success,
        data:    json.data ?? null,
        message: json.message ?? '',
        errors:  json.errors ?? null,
        meta:    json.meta ?? null,
        status,
      };
    }

    return {
      ok:      status >= 200 && status < 300,
      data:    json ?? null,
      message: '',
      errors:  null,
      meta:    null,
      status,
    };
  }

  /**
   * استخراج meta صفحه‌بندی از data یا meta
   */
  function mapPagination(mapped) {
    const src = mapped.meta || mapped.data;
    if (!src || typeof src !== 'object') return null;

    if ('total' in src && ('page' in src || 'current_page' in src)) {
      return {
        items:    src.data ?? src.items ?? mapped.data,
        total:    src.total ?? 0,
        page:     src.page ?? src.current_page ?? 1,
        perPage:  src.per_page ?? src.limit ?? 15,
        lastPage: src.last_page ?? 1,
      };
    }

    return null;
  }

  /**
   * ذخیره session بعد از login / OTP verify
   */
  function persistSession(data) {
    if (!data || typeof data !== 'object') return data;

    const access  = data.token ?? data.access_token;
    const refresh = data.refresh_token;
    const user    = data.user;
    const userRole = user?.role ?? data.role ?? 'user';

    if (access)  token.set(access);
    if (refresh) refreshToken.set(refresh);
    role.set(userRole);

    return data;
  }

  function clearSession() {
    token.remove();
    refreshToken.remove();
    role.remove();
  }

  function defaultMessage(status) {
    const m = MSG();
    if (status === 401) return m.unauthorized;
    if (status === 403) return m.forbidden;
    if (status === 404) return m.notFound;
    if (status === 422) return m.validation;
    if (status === 429) return m.rateLimit;
    if (status >= 500)  return m.server;
    return m.unknown;
  }

  function emitError(err) {
    if (typeof HOOKS().onError === 'function') {
      try { HOOKS().onError(err); } catch (_) { /* noop */ }
    }
  }

  function emitUnauthorized() {
    if (typeof HOOKS().onUnauthorized === 'function') {
      try { HOOKS().onUnauthorized(); } catch (_) { /* noop */ }
    }
  }


  // ─── HTTP Core ─────────────────────────────────────────────────────────────

  function buildUrl(path, queryParams = {}) {
    const base = BASE_URL().replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(base + cleanPath, window.location.origin);

    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') {
        url.searchParams.set(k, v);
      }
    });

    return url.toString();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function parseJsonSafe(res) {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError(MSG().parse || 'پاسخ سرور قابل پردازش نیست.', res.status, { isParse: true });
    }
  }

  async function _tryRefresh() {
    const t = token.get();
    if (!t) return false;

    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });

      if (!res.ok) return false;

      const json = await parseJsonSafe(res);
      const mapped = mapResponse(json, res.status);
      if (!mapped.ok) return false;

      persistSession(mapped.data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * @param {string} method
   * @param {string} path
   * @param {Object|FormData|null} body
   * @param {Object} queryParams
   * @param {Object} options — { full?: boolean, skipRefresh?: boolean, retries?: number }
   */
  async function request(method, path, body = null, queryParams = {}, options = {}) {
    const retries = options.retries ?? API().retries ?? 0;
    const timeout = API().timeout ?? 30000;
    let attempt = 0;

    while (true) {
      try {
        return await _requestOnce(method, path, body, queryParams, options, timeout);
      } catch (err) {
        const retryable = err instanceof ApiError && (err.isNetwork || err.isServer || err.isTimeout);
        if (!retryable || attempt >= retries) throw err;
        attempt++;
        await sleep(API().retryDelay ?? 600);
      }
    }
  }

  async function _requestOnce(method, path, body, queryParams, options, timeout) {
    const url = buildUrl(path, queryParams);
    const headers = {};
    const t = token.get();
    if (t) headers.Authorization = `Bearer ${t}`;

    const isFormData = body instanceof FormData;
    if (body && !isFormData) headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const fetchOptions = {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : null,
      signal: controller.signal,
    };

    let res;
    try {
      res = await fetch(url, fetchOptions);
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const e = new ApiError(MSG().timeout || 'زمان درخواست به پایان رسید.', 0, { isTimeout: true });
        emitError(e);
        throw e;
      }
      const e = new ApiError(MSG().network || 'خطا در اتصال به سرور.', 0, { isNetwork: true });
      emitError(e);
      throw e;
    } finally {
      clearTimeout(timer);
    }

    // Auto-refresh on 401
    if (
      res.status === 401 &&
      t &&
      API().autoRefresh !== false &&
      !options.skipRefresh &&
      !path.includes('/auth/login') &&
      !path.includes('/auth/otp/')
    ) {
      const refreshed = await _tryRefresh();
      if (refreshed) {
        return _requestOnce(method, path, body, queryParams, { ...options, skipRefresh: true }, timeout);
      }
      clearSession();
      emitUnauthorized();
    }

    if (res.status === 204) {
      const empty = mapResponse(null, 204);
      return options.full ? empty : null;
    }

    const json = await parseJsonSafe(res);
    const mapped = mapResponse(json, res.status);

    if (!res.ok || !mapped.ok) {
      const err = new ApiError(
        mapped.message || defaultMessage(res.status),
        res.status,
        { errors: mapped.errors, raw: json }
      );
      emitError(err);
      throw err;
    }

    return options.full ? mapped : mapped.data;
  }

  /** اجرای امن با fallback — برای داده‌های غیرحیاتی */
  async function withFallback(promise, fallback) {
    try {
      return await promise;
    } catch (err) {
      if (err instanceof ApiError && (err.isNetwork || err.isServer || err.isTimeout || err.isNotFound)) {
        return fallback;
      }
      throw err;
    }
  }

  const get    = (path, q, opts)    => request('GET',    path, null, q, opts);
  const post   = (path, body, opts) => request('POST',   path, body, {}, opts);
  const put    = (path, body, opts) => request('PUT',    path, body, {}, opts);
  const patch  = (path, body, opts) => request('PATCH',  path, body, {}, opts);
  const del    = (path, opts)       => request('DELETE', path, null, {}, opts);
  const upload = (path, form, opts) => request('POST',   path, form, {}, opts);


  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════════

  const auth = {

    register: (data) => post('/auth/register', data),

    login: async (phone, password) => {
      const data = await post('/auth/login', { phone, password });
      return persistSession(data);
    },

    adminLogin: async (phone, password) => {
      const data = await post('/auth/admin-login', { phone, password });
      persistSession(data);
      role.set('admin');
      return data;
    },

    /** درخواست OTP — { phone, purpose? } */
    otpRequest: (phone, purpose = 'login') =>
      post('/auth/otp/request', { phone, purpose }),

    /** تایید OTP — { phone, code, purpose?, name? } */
    otpVerify: async (phone, code, purpose = 'login', name = null) => {
      const body = { phone, code, purpose };
      if (name) body.name = name;
      const data = await post('/auth/otp/verify', body);
      return persistSession(data);
    },

    me: () => get('/auth/me'),

    refresh: async () => {
      const data = await post('/auth/refresh');
      return persistSession(data);
    },

    logout: async () => {
      try {
        const rt = refreshToken.get();
        if (rt) await post('/auth/logout', { refresh_token: rt }, { skipRefresh: true });
      } catch (_) { /* حتی اگر API fail شد local پاک شود */ }
      clearSession();
    },

    isLoggedIn: () => !!token.get(),
    isAdmin:    () => role.isAdmin(),
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  const settings = {
    /** تنظیمات عمومی فروشگاه */
    get: () => withFallback(
      get('/settings'),
      CFG().fallback?.settings ?? null
    ),

    adminGet:    () => get('/admin/settings'),
    adminUpdate: (data) => patch('/admin/settings', data),

    /** اطلاعات پرداخت کارت‌به‌کارت از settings */
    paymentInfo: async () => {
      const s = await settings.get();
      if (!s) return null;
      return {
        bankCard:  s.bank_card ?? '',
        bankOwner: s.bank_owner ?? '',
        method:    s.payment_method ?? 'card_to_card',
      };
    },
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════════════

  const users = {

    getProfile:    () => get('/users/me'),
    updateProfile: (data) => patch('/users/me', data),
    changePassword: (currentPassword, newPassword) =>
      put('/users/me/password', { current_password: currentPassword, new_password: newPassword }),

    getAddresses:  () => get('/users/me/addresses'),
    addAddress:    (data) => post('/users/me/addresses', data),
    updateAddress: (id, data) => patch(`/users/me/addresses/${id}`, data),
    deleteAddress: (id) => del(`/users/me/addresses/${id}`),

    all:        () => get('/admin/users'),
    activate:   (id) => patch(`/admin/users/${id}/activate`),
    deactivate: (id) => patch(`/admin/users/${id}/deactivate`),
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════

  const products = {

    list: (filters = {}, opts = {}) => withFallback(
      get('/products', filters, opts),
      CFG().fallback?.products ?? []
    ),

    featured: (limit = 8) => withFallback(
      get('/products/featured', { limit }),
      CFG().fallback?.products ?? []
    ),

    get: (id) => get(`/products/${id}`),

    create: (data) => post('/admin/products', data),
    update: (id, data) => put(`/admin/products/${id}`, data),
    delete: (id) => del(`/admin/products/${id}`),
    toggle: (id) => patch(`/admin/products/${id}/toggle`),

    addImage: (id, file, meta = {}) => {
      const form = new FormData();
      form.append('image', file);
      if (meta.alt_text   !== undefined) form.append('alt_text',   meta.alt_text);
      if (meta.is_main    !== undefined) form.append('is_main',    meta.is_main);
      if (meta.sort_order !== undefined) form.append('sort_order', meta.sort_order);
      return upload(`/admin/products/${id}/images`, form);
    },

    setMainImage: (id, imageId) => patch(`/admin/products/${id}/images/${imageId}`),
    deleteImage:  (id, imageId) => del(`/admin/products/${id}/images/${imageId}`),
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  const categories = {

    list: () => withFallback(
      get('/categories'),
      CFG().fallback?.categories ?? []
    ),

    get:    (id) => get(`/categories/${id}`),
    bySlug: (slug) => get(`/categories/slug/${slug}`),

    create: (data) => post('/admin/categories', data),
    update: (id, data) => put(`/admin/categories/${id}`, data),
    delete: (id) => del(`/admin/categories/${id}`),

    uploadPoster: (id, file) => {
      const form = new FormData();
      form.append('poster', file);
      return upload(`/admin/categories/${id}/poster`, form);
    },

    getImages:  (id) => get(`/admin/categories/${id}/images`),
    addImage:   (id, file, meta = {}) => {
      const form = new FormData();
      form.append('image', file);
      if (meta.alt_text   !== undefined) form.append('alt_text',   meta.alt_text);
      if (meta.is_main    !== undefined) form.append('is_main',    meta.is_main);
      if (meta.sort_order !== undefined) form.append('sort_order', meta.sort_order);
      return upload(`/admin/categories/${id}/images`, form);
    },

    setMainImage: (id, imageId) => patch(`/admin/categories/${id}/images/${imageId}`),
    deleteImage:  (id, imageId) => del(`/admin/categories/${id}/images/${imageId}`),
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // CART
  // ═══════════════════════════════════════════════════════════════════════════

  const cart = {

    get:    () => withFallback(get('/cart'), CFG().fallback?.cart ?? { items: [], total: 0 }),
    add:    (productId, qty = 1) => post('/cart/items', { product_id: productId, qty }),
    update: (productId, qty) => patch(`/cart/items/${productId}`, { qty }),
    remove: (productId) => del(`/cart/items/${productId}`),
    clear:  () => del('/cart'),
    applyDiscount: (code) => post('/cart/discount', { code }),
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  const orders = {

    place:    (data) => post('/orders', data),
    list:     () => get('/orders'),
    get:      (id) => get(`/orders/${id}`),
    byNumber: (number) => get(`/orders/number/${number}`),
    cancel:   (id) => patch(`/orders/${id}/cancel`),

    uploadReceipt: (id, file) => {
      const form = new FormData();
      form.append('receipt', file);
      return upload(`/orders/${id}/receipt`, form);
    },

    adminList: (params = {}) => get('/admin/orders', params),
    updateStatus: (id, status) => patch(`/admin/orders/${id}/status`, { status }),
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // DISCOUNTS
  // ═══════════════════════════════════════════════════════════════════════════

  const discounts = {

    validate: (code, total) => get('/discounts/validate', { code, total }),

    list:       () => get('/admin/discounts'),
    active:     () => get('/admin/discounts/active'),
    create:     (data) => post('/admin/discounts', data),
    update:     (id, data) => put(`/admin/discounts/${id}`, data),
    deactivate: (id) => patch(`/admin/discounts/${id}/deactivate`),
    delete:     (id) => del(`/admin/discounts/${id}`),
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  const dashboard = {

    overview:       () => get('/admin/dashboard'),
    stats:          () => get('/admin/dashboard/stats'),
    recentOrders:   (limit = 10) => get('/admin/dashboard/orders/recent', { limit }),
    ordersByStatus: () => get('/admin/dashboard/orders/by-status'),
    lowStock:       (threshold = 5) => get('/admin/dashboard/products/low-stock', { threshold }),
    topProducts:    (limit = 10) => get('/admin/dashboard/products/top', { limit }),
    revenue:        (days = 7) => get('/admin/dashboard/revenue', { days }),
  };


  // ─── Public API ────────────────────────────────────────────────────────────

  return {
    // ماژول‌ها
    auth,
    settings,
    users,
    products,
    categories,
    cart,
    orders,
    discounts,
    dashboard,

    // توکن
    token,
    refreshToken,
    role,

    // ابزارهای سطح پایین
    request,
    get,
    post,
    put,
    patch,
    del,
    upload,

    // مپ و خطا
    ApiError,
    mapResponse,
    mapPagination,
    mapError: (err) => {
      if (err instanceof ApiError) return err;
      return new ApiError(err?.message || MSG().unknown, err?.status || 0, { isNetwork: true });
    },
    withFallback,
    persistSession,
    clearSession,
  };

})();

window.Api = Api;
