/**
 * ╔═══════════════════════════════════════════════════════════╗
 *   Ghul Bazar — api.js
 *   لایه ارتباط با بک‌اند. تمام page scriptها فقط از این
 *   فایل استفاده می‌کنند و هیچ‌جا مستقیم fetch نمی‌زنند.
 *
 *   استفاده:
 *     const products = await API.products.list({ category: 2 });
 *     const me       = await API.auth.me();
 *     await API.cart.add(productId, qty, options);
 * ╚═══════════════════════════════════════════════════════════╝
 */

;(function (global) {
  'use strict';

  /* ─── تنظیمات پایه ──────────────────────────────────────── */
  const BASE = 'api.php';          // مسیر نسبی به api.php
  const STORAGE_TOKEN = 'gb_token';
  const STORAGE_USER  = 'gb_user';

  /* ─── هسته: درخواست‌ساز مرکزی ──────────────────────────── */

  /**
   * @param {string} endpoint   نام endpoint بدون پارامتر (مثل 'products')
   * @param {Object} [opts]
   * @param {string}          [opts.method='GET']
   * @param {Object}          [opts.params]   query string params (علاوه بر endpoint)
   * @param {Object|FormData} [opts.body]     body درخواست
   * @param {boolean}         [opts.multipart] اگه true باشه Content-Type حذف میشه (برای FormData)
   * @returns {Promise<any>}
   */
  async function request(endpoint, opts = {}) {
    const {
      method    = 'GET',
      params    = {},
      body      = null,
      multipart = false,
    } = opts;

    // ساخت URL
    const qs = new URLSearchParams({ endpoint, ...params }).toString();
    const url = `${BASE}?${qs}`;

    // هدرها
    const token = localStorage.getItem(STORAGE_TOKEN);
    const headers = {};
    if (!multipart) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // fetch
    const res = await fetch(url, {
      method,
      headers,
      body: body
        ? (multipart ? body : JSON.stringify(body))
        : undefined,
    });

    // خواندن JSON
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`پاسخ نامعتبر از سرور (${res.status})`);
    }

    if (!res.ok) {
      const err = new Error(data?.error || `خطای ${res.status}`);
      err.status = res.status;
      err.data   = data;
      throw err;
    }

    return data;
  }

  /* ─── وضعیت Auth ────────────────────────────────────────── */
  const Auth = {
    /** ذخیره token و user بعد از login/register */
    _save(token, user) {
      localStorage.setItem(STORAGE_TOKEN, token);
      localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    },

    /** پاک کردن session */
    clear() {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
    },

    /** آیا کاربر لاگین است؟ */
    isLoggedIn() {
      return !!(localStorage.getItem(STORAGE_TOKEN) &&
                localStorage.getItem(STORAGE_USER));
    },

    /** کاربر فعلی از localStorage */
    currentUser() {
      return JSON.parse(localStorage.getItem(STORAGE_USER) || 'null');
    },

    /** آیا کاربر ادمین است؟ */
    isAdmin() {
      const u = Auth.currentUser();
      return u?.role === 'admin';
    },

    /**
     * ورود
     * @param {string} phone
     * @param {string} password
     * @returns {Promise<{token:string, user:Object}>}
     */
    async login(phone, password) {
      const data = await request('auth', {
        method: 'POST',
        params: { action: 'login' },
        body:   { phone, password },
      });
      if (data.token && data.user) Auth._save(data.token, data.user);
      return data;
    },

    /**
     * ثبت‌نام
     * @param {{first_name,last_name,phone,password}} payload
     */
    async register(payload) {
      const data = await request('auth', {
        method: 'POST',
        params: { action: 'register' },
        body:   payload,
      });
      if (data.token && data.user) Auth._save(data.token, data.user);
      return data;
    },

    /**
     * اطلاعات کاربر لاگین‌شده از سرور
     * @returns {Promise<Object>}
     */
    async me() {
      return request('auth', { params: { action: 'me' } });
    },

    /** خروج */
    logout() {
      Auth.clear();
      window.location.href = 'login.html';
    },
  };

  /* ─── محصولات ───────────────────────────────────────────── */
  const Products = {
    /**
     * لیست محصولات
     * @param {{category?:number, era?:number, featured?:1,
     *          tag?:string, sort?:string,
     *          limit?:number, page?:number}} [filters]
     */
    list(filters = {}) {
      return request('products', { params: filters });
    },

    /**
     * یک محصول با id
     * @param {number|string} id
     */
    get(id) {
      return request('products', { params: { id } });
    },

    // ─── ادمین ───

    /** ساخت محصول جدید (ادمین) */
    create(payload) {
      return request('products', { method: 'POST', body: payload });
    },

    /** بروزرسانی محصول (ادمین) */
    update(id, payload) {
      return request('products', {
        method: 'PUT',
        params: { id },
        body:   payload,
      });
    },

    /** حذف محصول (ادمین) */
    delete(id) {
      return request('products', { method: 'DELETE', params: { id } });
    },

    /**
     * آپلود تصویر محصول (ادمین)
     * @param {number} id  شناسه محصول
     * @param {File}   file
     * @param {boolean} isMain آیا تصویر اصلی است؟
     * @param {number}  sortOrder
     */
    uploadImage(id, file, isMain = false, sortOrder = 0) {
      const form = new FormData();
      form.append('image',      file);
      form.append('is_main',    isMain ? '1' : '0');
      form.append('sort_order', String(sortOrder));
      return request('products', {
        method:    'POST',
        params:    { action: 'upload-image', id },
        body:      form,
        multipart: true,
      });
    },
  };

  /* ─── دسته‌بندی‌ها ──────────────────────────────────────── */
  const Categories = {
    /** لیست کامل دسته‌بندی‌ها */
    list() {
      return request('categories');
    },

    // ادمین
    create(payload) {
      return request('categories', { method: 'POST', body: payload });
    },
    update(id, payload) {
      return request('categories', { method: 'PUT', params: { id }, body: payload });
    },
    delete(id) {
      return request('categories', { method: 'DELETE', params: { id } });
    },
  };

  /* ─── دوران تاریخی (Eras) ───────────────────────────────── */
  const Eras = {
    list() {
      return request('eras');
    },
    create(payload) {
      return request('eras', { method: 'POST', body: payload });
    },
    update(id, payload) {
      return request('eras', { method: 'PUT', params: { id }, body: payload });
    },
    delete(id) {
      return request('eras', { method: 'DELETE', params: { id } });
    },
  };

  /* ─── سبد خرید ──────────────────────────────────────────── */
  const Cart = {
    /** دریافت سبد فعلی */
    get() {
      return request('cart');
    },

    /**
     * افزودن آیتم
     * @param {number} productId
     * @param {number} [qty=1]
     * @param {Object} [options]  مثل { chain_length: '45cm', size: 'M' }
     */
    add(productId, qty = 1, options = {}) {
      return request('cart', {
        method: 'POST',
        body:   { product_id: productId, quantity: qty, options },
      });
    },

    /**
     * تغییر تعداد آیتم
     * @param {number} itemId  شناسه ردیف سبد
     * @param {number} qty
     */
    update(itemId, qty) {
      return request('cart', {
        method: 'PUT',
        params: { item_id: itemId },
        body:   { quantity: qty },
      });
    },

    /**
     * حذف آیتم از سبد
     * @param {number} itemId
     */
    remove(itemId) {
      return request('cart', {
        method: 'DELETE',
        params: { item_id: itemId },
      });
    },

    /** خالی کردن کل سبد */
    clear() {
      return request('cart', { method: 'DELETE' });
    },
  };

  /* ─── سفارشات ───────────────────────────────────────────── */
  const Orders = {
    /**
     * ثبت سفارش جدید
     * @param {{
     *   customer_name: string,
     *   customer_phone: string,
     *   shipping_address: string,
     *   discount_code?: string
     * }} payload
     */
    create(payload) {
      return request('orders', { method: 'POST', body: payload });
    },

    /**
     * دریافت سفارش با شماره سفارش (بدون نیاز به login)
     * @param {string} orderNumber
     */
    getByNumber(orderNumber) {
      return request('orders', { params: { number: orderNumber } });
    },

    /**
     * دریافت سفارش با id (نیاز به login)
     * @param {number} id
     */
    getById(id) {
      return request('orders', { params: { id } });
    },

    /**
     * لیست سفارشات کاربر لاگین‌شده
     * @param {{ page?:number, limit?:number }} [opts]
     */
    list(opts = {}) {
      return request('orders', { params: opts });
    },

    /**
     * بروزرسانی وضعیت سفارش (ادمین)
     * @param {number} id
     * @param {string} status  'pending'|'paid'|'shipped'|'delivered'|'cancelled'
     */
    updateStatus(id, status) {
      return request('orders', {
        method: 'PUT',
        params: { id },
        body:   { status },
      });
    },
  };

  /* ─── کدهای تخفیف ───────────────────────────────────────── */
  const Discounts = {
    /**
     * اعتبارسنجی کد تخفیف
     * @param {string} code
     * @returns {Promise<{id, code, type:'percent'|'fixed', value:number}>}
     */
    validate(code) {
      return request('discounts', {
        params: { action: 'validate', code },
      });
    },

    // ادمین
    create(payload) {
      return request('discounts', { method: 'POST', body: payload });
    },
    deactivate(id) {
      return request('discounts', { method: 'DELETE', params: { id } });
    },
  };

  /* ─── آپلود رسید پرداخت ─────────────────────────────────── */
  const Payment = {
    /**
     * ارسال تصویر رسید
     * @param {string} orderNumber  شماره سفارش
     * @param {File}   file         تصویر رسید
     * @returns {Promise<{success:boolean, filename:string, message:string}>}
     */
    uploadReceipt(orderNumber, file) {
      const form = new FormData();
      form.append('receipt',      file);
      form.append('order_number', orderNumber);
      return request('upload_receipt', {
        method:    'POST',
        body:      form,
        multipart: true,
      });
    },
  };

  /* ─── پنل ادمین ─────────────────────────────────────────── */
  const Admin = {
    /**
     * آمار داشبورد
     * @returns {Promise<{
     *   total_products, total_categories, total_users, total_orders,
     *   total_revenue, today_orders, pending_orders, low_stock_items
     * }>}
     */
    stats() {
      return request('admin', { params: { action: 'stats' } });
    },
  };

  /* ─── مدیریت کاربران (ادمین) ────────────────────────────── */
  const Users = {
    list(opts = {}) {
      return request('users', { params: opts });
    },
    get(id) {
      return request('users', { params: { id } });
    },
    updateRole(id, role) {
      return request('users', { method: 'PUT', params: { id }, body: { role } });
    },
    delete(id) {
      return request('users', { method: 'DELETE', params: { id } });
    },
  };

  /* ─── ابزارهای کمکی UI ──────────────────────────────────── */
  const Utils = {
    /**
     * قیمت رو به فارسی فرمت می‌کنه
     * @param {number} amount
     * @returns {string}  مثال: "۱۲۵،۰۰۰ تومان"
     */
    formatPrice(amount) {
      return Number(amount).toLocaleString('fa-IR') + ' تومان';
    },

    /**
     * محاسبه قیمت نهایی بعد از اعمال تخفیف
     * @param {number} subtotal
     * @param {{ type:'percent'|'fixed', value:number }|null} discount
     * @returns {{ discountAmount:number, total:number }}
     */
    applyDiscount(subtotal, discount) {
      if (!discount) return { discountAmount: 0, total: subtotal };
      const amount = discount.type === 'percent'
        ? Math.round((subtotal * discount.value) / 100)
        : discount.value;
      const discountAmount = Math.min(amount, subtotal);
      return { discountAmount, total: subtotal - discountAmount };
    },

    /**
     * نمایش toast کوتاه
     * @param {string}  msg
     * @param {'success'|'error'|'info'} [type='success']
     * @param {number}  [duration=3000]
     */
    toast(msg, type = 'success', duration = 3000) {
      const colors = {
        success: 'bg-green-600',
        error:   'bg-red-600',
        info:    'bg-blue-600',
      };
      const el = document.createElement('div');
      el.className = `fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3
                      rounded-xl shadow-xl text-white text-sm font-medium
                      transition-all duration-300 ${colors[type] ?? colors.success}`;
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
      }, duration);
    },

    /**
     * تبدیل تاریخ میلادی به شمسی (ساده، بدون کتابخانه)
     * از Date.toLocaleDateString استفاده می‌کنه
     * @param {string|Date} dateInput
     * @returns {string}
     */
    toJalali(dateInput) {
      try {
        return new Date(dateInput).toLocaleDateString('fa-IR', {
          year: 'numeric', month: 'long', day: 'numeric',
        });
      } catch {
        return String(dateInput);
      }
    },
  };

  /* ─── Export ────────────────────────────────────────────── */
  global.API = {
    auth:       Auth,
    products:   Products,
    categories: Categories,
    eras:       Eras,
    cart:       Cart,
    orders:     Orders,
    discounts:  Discounts,
    payment:    Payment,
    admin:      Admin,
    users:      Users,
    utils:      Utils,

    /** دسترسی مستقیم به request برای موارد خاص */
    _request: request,
  };

})(window);
