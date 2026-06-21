/**
 * Ghul Bazar — Customer API Client (cookie-based auth)
 * @version 2.1.0
 */

class CustomerError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'CustomerError';
    this.status = status;
    this.data = data;
  }
}

class CustomerApiClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'api.php?endpoint=';
    this.debug   = options.debug   || false;
    this.user    = JSON.parse(localStorage.getItem('gb_user') || 'null');
  }

  _log(...a) { if (this.debug) console.log('[API]', ...a); }

  _headers(method = 'GET', extra = {}) {
    const h = { Accept: 'application/json', ...extra };
    if (['POST','PUT','PATCH','DELETE'].includes(method.toUpperCase())) {
      const csrf = this._csrf();
      if (csrf) h['X-CSRF-TOKEN'] = csrf;
    }
    return h;
  }

  _csrf() {
    const match = document.cookie.split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('XSRF-TOKEN='));
    return match ? decodeURIComponent(match.split('=')[1]) : '';
  }

  async _req(method, endpoint, body = null, isForm = false) {
    const url  = this.baseURL + endpoint;
    const hdrs = this._headers(method);
    const opts = { method, headers: hdrs, credentials: 'include' };

    if (body && !isForm) {
      hdrs['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (body && isForm) {
      opts.body = body;
    }

    this._log(method, url, body);

    let res = await fetch(url, opts);

    if (res.status === 401) {
      const ok = await this._refresh();
      if (ok) {
        res = await fetch(url, opts);
      } else {
        this._clearSession();
        throw new CustomerError('نشست منقضی شده. لطفاً دوباره وارد شوید.', 401);
      }
    }

    const ct   = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      throw new CustomerError(
        data?.error || data?.message || `خطای ${res.status}`,
        res.status,
        data
      );
    }
    return data;
  }

  async _refresh() {
    try {
      const res = await fetch(this.baseURL + 'auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const d = await res.json();
        if (d.user || d.data?.user) this._saveUser(d.user || d.data.user);
        return true;
      }
    } catch {}
    return false;
  }

  _saveUser(user) {
    this.user = user;
    localStorage.setItem('gb_user', JSON.stringify(user));
  }

  _clearSession() {
    this.user = null;
    localStorage.removeItem('gb_user');
    localStorage.removeItem('gb_token');
    localStorage.removeItem('gb_refresh');
  }

  isAuth() { return !!this.user; }
  getUser() { return this.user; }

  auth = {
    login: async (phone, password) => {
      const d = await this._req('POST', 'auth/login', { phone, password });
      if (d.user || d.data?.user) this._saveUser(d.user || d.data.user);
      return d;
    },
    register: async (data) => {
      const d = await this._req('POST', 'auth/register', data);
      if (d.user || d.data?.user) this._saveUser(d.user || d.data.user);
      return d;
    },
    sendOtp:   (phone)        => this._req('POST', 'auth/sendLoginOtp',   { phone }),
    verifyOtp: (phone, code)  => this._req('POST', 'auth/verifyLoginOtp', { phone, code })
      .then(d => {
        if (d.user || d.data?.user) this._saveUser(d.user || d.data.user);
        return d;
      }),
    forgotPassword: (phone) => this._req('POST', 'password/forgot', { phone }),
    resetPassword:  (token, password) => this._req('POST', 'password/reset', { token, password }),
    logout: async () => {
      try { await this._req('POST', 'auth/logout', {}); } finally {
        this._clearSession();
      }
    },
  };

  products = {
    list:       (params = {}) => this._req('GET', 'products&' + new URLSearchParams(params)),
    show:       (id)          => this._req('GET', `products&id=${id}`),
    featured:   ()            => this._req('GET', 'products&featured=1'),
    discounted: ()            => this._req('GET', 'products&discounted=1'),
    byCategory: (slug)        => this._req('GET', `products&category=${encodeURIComponent(slug)}`),
    byEra:      (era)         => this._req('GET', `products&era=${encodeURIComponent(era)}`),
    search:     (q)           => this._req('GET', `products&q=${encodeURIComponent(q)}`),
  };

  categories = {
    list: () => this._req('GET', 'categories'),
    show: (id) => this._req('GET', `categories&id=${id}`),
  };
  eras = {
    list: () => this._req('GET', 'eras'),
  };

  cart = {
    get:    ()                   => this._req('GET',    'cart'),
    add:    (productId, qty = 1) => this._req('POST',   'cart', { product_id: productId, qty }),
    update: (productId, qty)     => this._req('PUT',    'cart', { product_id: productId, qty }),
    remove: (productId)          => this._req('DELETE', `cart&product_id=${productId}`),
    clear:  ()                   => this._req('DELETE', 'cart'),
  };

  discounts = {
    validate: (code) => this._req('GET', `discounts&action=validate&code=${encodeURIComponent(code)}`),
  };

  orders = {
    place:   (data)  => this._req('POST', 'orders', data),
    list:    ()      => this._req('GET',  'orders'),
    show:    (id)    => this._req('GET',  `orders&id=${id}`),
    cancel:  (id)    => this._req('PUT',  `orders&id=${id}&action=cancel`),
  };

  payment = {
    uploadReceipt: (orderNumber, file) => {
      const fd = new FormData();
      fd.append('order_number', orderNumber);
      fd.append('receipt', file);
      return this._req('POST', 'upload_receipt', fd, true);
    },
    status: (orderId) => this._req('GET', `payment-receipts&order_id=${orderId}`),
  };

  profile = {
    get:            ()          => this._req('GET', 'user/profile'),
    update:         (data)      => this._req('PUT', 'user/profile', data),
    changePassword: (old_, new_)=> this._req('PUT', 'user/password', { old_password: old_, new_password: new_ }),
  };

  addresses = {
    list:   ()         => this._req('GET',    'user/addresses'),
    add:    (addr)     => this._req('POST',   'user/addresses', addr),
    update: (id, addr) => this._req('PUT',    `user/addresses&id=${id}`, addr),
    delete: (id)       => this._req('DELETE', `user/addresses&id=${id}`),
  };
}

const api = new CustomerApiClient({ debug: false });
export default api;
