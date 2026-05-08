class ApiClient {
    /**
     * param {object} options
     * param {string} options.baseURL - آدرس پایهٔ API (مثلاً "http://localhost/NadStore/index.php?url=")
     * param {string} [options.tenant] - دامنهٔ فروشگاه (فقط زمانی که TenantMiddleware نیاز به هدر X-Tenant دارد)
     * param {boolean} [options.debug=false] - نمایش درخواست‌ها در کنسول
     */
    constructor(options = {}) {
      this.baseURL = options.baseURL || '/index.php?url=';
      this.tenant = options.tenant || null;
      this.debug = options.debug || false;
      this.accessToken = localStorage.getItem('access_token') || null;
      this.refreshToken = localStorage.getItem('refresh_token') || null;
      this.tokenExpiry = null; // می‌توان از decoded payload خواند
    }
  
    // ================== امکانات داخلی ==================
    _log(...args) {
      if (this.debug) console.log('[ApiClient]', ...args);
    }
  
    _getCsrfToken() {
      const name = 'XSRF-TOKEN=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(';');
      for (let c of ca) {
        c = c.trim();
        if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
      }
      return '';
    }
  
    _headers(extraHeaders = {}) {
      const headers = {
        'Accept': 'application/json',
        ...extraHeaders
      };
  
      // CSRF برای همهٔ درخواست‌های تغییردهنده
      const method = (extraHeaders['_method'] || 'GET').toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrf = this._getCsrfToken();
        if (csrf) headers['X-CSRF-TOKEN'] = csrf;
      }
  
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }
      if (this.tenant) {
        headers['X-Tenant'] = this.tenant;
      }
      return headers;
    }
  
    async _request(method, endpoint, body = null, isFormData = false) {
      const url = this.baseURL + endpoint;
      const headers = this._headers({ '_method': method });
      const options = { method, headers };
  
      if (body && !isFormData) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      } else if (body && isFormData) {
        // FormData – خودش content-type رو تنظیم می‌کنه
        options.body = body;
      }
  
      this._log(`${method} ${url}`, body);
      let response = await fetch(url, options);
  
      // تلاش برای تازه‌سازی توکن در صورت 401
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this._attemptRefresh();
        if (refreshed) {
          // بازنویسی هدر با توکن جدید
          options.headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, options);
        } else {
          // رفرش ناموفق – پاک‌سازی و شاید ریدایرکت به لاگین
          this.logout();
          throw new Error('Session expired. Please login again.');
        }
      }
  
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const data = isJson ? await response.json() : await response.text();
  
      if (!response.ok) {
        const error = new Error(data?.error || data?.message || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
      }
  
      // بازگرداندن result مفید (بعضی endpointها data دارند، بعضی مثل paginated)
      return data;
    }
  
    async _attemptRefresh() {
      if (!this.refreshToken) return false;
      try {
        const res = await fetch(this.baseURL + 'auth/refresh', {
          method: 'POST',
          headers: this._headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ refresh_token: this.refreshToken })
        });
        if (res.ok) {
          const data = await res.json();
          this.setTokens(data.access_token, data.refresh_token);
          return true;
        }
      } catch (e) {
        console.error('Token refresh failed', e);
      }
      return false;
    }
  
    setTokens(accessToken, refreshToken) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      localStorage.setItem('access_token', accessToken);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    }
  
    logout() {
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  
    // ================== Resource Endpoints ==================
  
    // --- Auth ---
    auth = {
      login: (phone, password) =>
        this._request('POST', 'auth/login', { phone, password }).then(d => {
          this.setTokens(d.access_token, d.refresh_token);
          return d;
        }),
      register: (data) =>
        this._request('POST', 'auth/register', data).then(d => {
          this.setTokens(d.access_token, d.refresh_token);
          return d;
        }),
      refresh: () =>
        this._request('POST', 'auth/refresh', { refresh_token: this.refreshToken }).then(d => {
          this.setTokens(d.access_token, d.refresh_token);
          return d;
        }),
      logout: () =>
        this._request('POST', 'auth/logout', { refresh_token: this.refreshToken }).then(() => this.logout()),
      me: () =>
        this._request('GET', 'auth/me')
    };
  
    // --- User ---
    user = {
      profile: () =>
        this._request('GET', 'user/profile'),
      updateProfile: (data) =>
        this._request('PUT', 'user/profile', data),
      changePassword: (oldPassword, newPassword) =>
        this._request('PUT', 'user/password', { old_password: oldPassword, new_password: newPassword }),
      changePhone: (newPhone) =>
        this._request('PUT', 'user/phone', { new_phone: newPhone }),
      getAddresses: () =>
        this._request('GET', 'user/addresses'),
      addAddress: (address) =>
        this._request('POST', 'user/addresses', address),
      updateAddress: (id, address) =>
        this._request('PUT', `user/addresses/${id}`, address),
      deleteAddress: (id) =>
        this._request('DELETE', `user/addresses/${id}`)
    };
  
    // --- Products ---
    products = {
      list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return this._request('GET', `products${query ? '&' + query : ''}`); // note: base url already has ?url=
      },
      show: (id) =>
        this._request('GET', `products/${id}`),
      featured: () =>
        this._request('GET', 'products/featured'),
      discounted: () =>
        this._request('GET', 'products/discounted'),
      byCategory: (categoryId) =>
        this._request('GET', `products/${categoryId}/byCategory`),
      create: (data) =>
        this._request('POST', 'products', data),
      update: (id, data) =>
        this._request('PUT', `products/${id}`, data),
      delete: (id) =>
        this._request('DELETE', `products/${id}`),
      addImage: (productId, imageData) =>
        this._request('POST', `products/${productId}/images`, imageData),
      uploadImage: (productId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return this._request('POST', `products/${productId}/upload`, formData, true);
      }
    };
  
    // --- Categories ---
    categories = {
      listMain: () =>
        this._request('GET', 'categories'),
      show: (id) =>
        this._request('GET', `categories/${id}`),
      subcategories: (parentId) =>
        this._request('GET', `categories/${parentId}/subcategories`),
      create: (data) =>
        this._request('POST', 'categories', data),
      update: (id, data) =>
        this._request('PUT', `categories/${id}`, data),
      delete: (id) =>
        this._request('DELETE', `categories/${id}`)
    };
  
    // --- Cart ---
    cart = {
      get: () =>
        this._request('GET', 'cart'),
      addItem: (productId, quantity = 1) =>
        this._request('POST', 'cart/items', { product_id: productId, quantity }),
      updateItem: (itemId, quantity) =>
        this._request('PUT', `cart/items/${itemId}`, { quantity }),
      removeItem: (itemId) =>
        this._request('DELETE', `cart/items/${itemId}`),
      clear: () =>
        this._request('POST', 'cart/clear')
    };
  
    // --- Coupons ---
    coupons = {
      validate: (code, orderTotal) =>
        this._request('POST', 'coupons/validate', { code, order_total: orderTotal }),
      list: () =>
        this._request('GET', 'coupons'),
      create: (data) =>
        this._request('POST', 'coupons', data),
      update: (id, data) =>
        this._request('PUT', `coupons/${id}`, data),
      delete: (id) =>
        this._request('DELETE', `coupons/${id}`)
    };
  
    // --- Orders ---
    orders = {
      place: (addressId, couponCode = null, notes = null) =>
        this._request('POST', 'orders', { address_id: addressId, coupon_code: couponCode, notes }),
      list: () =>
        this._request('GET', 'orders'),
      show: (id) =>
        this._request('GET', `orders/${id}`),
      cancel: (id) =>
        this._request('PUT', `orders/${id}/cancel`),
      updateStatus: (id, status) =>
        this._request('PUT', `orders/${id}/status`, { status })
    };
  
    // --- Admin / Superadmin ---
    tenants = {
      list: () =>
        this._request('GET', 'tenants'),
      show: (id) =>
        this._request('GET', `tenants/${id}`),
      create: (data) =>
        this._request('POST', 'tenants', data),
      update: (id, data) =>
        this._request('PUT', `tenants/${id}`, data),
      delete: (id) =>
        this._request('DELETE', `tenants/${id}`)
    };
  
    // --- Password Reset (public) ---
    passwordReset = {
      forgot: (phoneOrEmail) =>
        this._request('POST', 'password/forgot', phoneOrEmail),
      reset: (token, newPassword) =>
        this._request('POST', 'password/reset', { token, password: newPassword })
    };
  }
  

window.ApiClient = ApiClient;
  window.Error = Error;