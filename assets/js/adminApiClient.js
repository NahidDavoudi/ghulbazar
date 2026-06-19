class ApiClient {
    constructor(options = {}) {
        this.baseURL = options.baseURL || (window.location.origin + '/index.php?url=');
        this.tenant = options.tenant || null;
        this.debug = options.debug || false;
        this.accessToken = localStorage.getItem('access_token') || null;
        this.refreshToken = localStorage.getItem('refresh_token') || null;
        this.tokenExpiry = null;
        this._isRefreshing = false;
        this._refreshPromise = null;
    }

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
        let url = this.baseURL + endpoint;
        const headers = this._headers({ '_method': method });
        const options = { method, headers };

        if (body && !isFormData) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        } else if (body && isFormData) {
            options.body = body;
        }

        this._log(`${method} ${url}`, body);
        let response = await fetch(url, options);

        if (response.status === 401 && this.refreshToken && !this._isRefreshing) {
            const refreshed = await this._attemptRefresh();
            if (refreshed) {
                options.headers['Authorization'] = `Bearer ${this.accessToken}`;
                response = await fetch(url, options);
            } else {
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

        return data;
    }

    async _attemptRefresh() {
        if (!this.refreshToken || this._isRefreshing) return false;
        this._isRefreshing = true;
        try {
            const res = await fetch(this.baseURL + 'auth/refresh', {
                method: 'POST',
                headers: this._headers({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ refresh_token: this.refreshToken })
            });
            if (res.ok) {
                const data = await res.json();
                this.setTokens(data.access_token, data.refresh_token);
                this._isRefreshing = false;
                return true;
            }
        } catch (e) {
            console.error('Token refresh failed', e);
        }
        this._isRefreshing = false;
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
        localStorage.removeItem('admin_user');
    }

    // ==================== AUTH ENDPOINTS ====================
    auth = {
        login: (phone, password) =>
            this._request('POST', 'auth/login', { phone, password }).then(d => {
                this.setTokens(d.access_token, d.refresh_token);
                if (d.user) localStorage.setItem('admin_user', JSON.stringify(d.user));
                return d;
            }),

        register: (data) =>
            this._request('POST', 'auth/register', data).then(d => {
                if (d.access_token) this.setTokens(d.access_token, d.refresh_token);
                return d;
            }),

        verifyPhone: (phone, code) =>
            this._request('POST', 'auth/verifyPhone', { phone, code }).then(d => {
                if (d.access_token) this.setTokens(d.access_token, d.refresh_token);
                if (d.user) localStorage.setItem('admin_user', JSON.stringify(d.user));
                return d;
            }),

        sendLoginOtp: (phone) =>
            this._request('POST', 'auth/sendLoginOtp', { phone }),

        verifyLoginOtp: (phone, code) =>
            this._request('POST', 'auth/verifyLoginOtp', { phone, code }).then(d => {
                if (d.access_token) this.setTokens(d.access_token, d.refresh_token);
                if (d.user) localStorage.setItem('admin_user', JSON.stringify(d.user));
                return d;
            }),

        refresh: () =>
            this._request('POST', 'auth/refresh', { refresh_token: this.refreshToken }).then(d => {
                this.setTokens(d.access_token, d.refresh_token);
                return d;
            }),

        logout: () =>
            this._request('POST', 'auth/logout', { refresh_token: this.refreshToken }).then(() => {
                this.logout();
            }),

        me: () =>
            this._request('GET', 'auth/me'),

        registerShop: (data) =>
            this._request('POST', 'auth/registerShop', data)
    };

    // ==================== USER ENDPOINTS ====================
    user = {
        list: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return this._request('GET', `users${query ? '?' + query : ''}`);
        },

        profile: () =>
            this._request('GET', 'users/profile'),

        updateProfile: (data) =>
            this._request('PUT', 'users/profile', data),

        changePassword: (oldPassword, newPassword) =>
            this._request('PUT', 'users/changePassword', { old_password: oldPassword, new_password: newPassword }),

        changePhone: (newPhone) =>
            this._request('PUT', 'users/changePhone', { new_phone: newPhone }),

        changeRole: (userId, role) =>
            this._request('PUT', `users/changeRole/${userId}`, { role }),

        toggleStatus: (userId, isActive) =>
            this._request('PUT', `users/toggleStatus/${userId}`, { is_active: isActive }),

        getAddresses: () =>
            this._request('GET', 'users/getAddresses'),

        addAddress: (address) =>
            this._request('POST', 'users/addAddress', address),

        updateAddress: (id, address) =>
            this._request('PUT', `users/updateAddress/${id}`, address),

        deleteAddress: (id) =>
            this._request('DELETE', `users/deleteAddress/${id}`)
    };

    // ==================== PRODUCTS ENDPOINTS ====================
    products = {
        list: (page = 1, perPage = 15) =>
            this._request('GET', `products?page=${page}&per_page=${perPage}`),

        show: (id) =>
            this._request('GET', `products/${id}`),

        featured: () =>
            this._request('GET', 'products/featured'),

        discounted: () =>
            this._request('GET', 'products/discounted'),

        byCategory: (categoryId) =>
            this._request('GET', `products/byCategory/${categoryId}`),

        create: (data) =>
            this._request('POST', 'products', data),

        update: (id, data) =>
            this._request('PUT', `products/update/${id}`, data),

        delete: (id) =>
            this._request('DELETE', `products/destroy/${id}`),

        uploadImage: (productId, file, alt = '', sortOrder = 0) => {
            const formData = new FormData();
            formData.append('image', file);
            if (productId) formData.append('product_id', productId);
            if (alt) formData.append('alt', alt);
            if (sortOrder) formData.append('sort_order', sortOrder);
            const endpoint = productId ? `products/${productId}/uploadImage` : 'products/uploadImage';
            return this._request('POST', endpoint, formData, true);
        }
    };

    // ==================== CATEGORIES ENDPOINTS ====================
    categories = {
        listMain: () =>
            this._request('GET', 'categories'),

        show: (id) =>
            this._request('GET', `categories/${id}`),

        subcategories: (parentId) =>
            this._request('GET', `categories/subcategories/${parentId}`),

        create: (data) =>
            this._request('POST', 'categories', data),

        update: (id, data) =>
            this._request('PUT', `categories/update/${id}`, data),

        delete: (id) =>
            this._request('DELETE', `categories/destroy/${id}`)
    };

    // ==================== CART ENDPOINTS ====================
    cart = {
        get: () =>
            this._request('GET', 'cart'),

        addItem: (productId, quantity = 1) =>
            this._request('POST', 'cart/addItem', { product_id: productId, quantity }),

        updateItem: (itemId, quantity) =>
            this._request('PUT', `cart/updateItem/${itemId}`, { quantity }),

        removeItem: (itemId) =>
            this._request('DELETE', `cart/removeItem/${itemId}`),

        clear: () =>
            this._request('POST', 'cart/clear')
    };

    // ==================== COUPONS ENDPOINTS ====================
    coupons = {
        validate: (code, orderTotal) =>
            this._request('POST', 'coupons/validate', { code, order_total: orderTotal }),

        list: () =>
            this._request('GET', 'coupons'),

        create: (data) =>
            this._request('POST', 'coupons', data),

        update: (id, data) =>
            this._request('PUT', `coupons/update/${id}`, data),

        delete: (id) =>
            this._request('DELETE', `coupons/destroy/${id}`)
    };

    // ==================== ORDERS ENDPOINTS ====================
    orders = {
        place: (addressId, couponCode = null, notes = null) =>
            this._request('POST', 'orders', { address_id: addressId, coupon_code: couponCode, notes }),

        list: () =>
            this._request('GET', 'orders'),

        show: (id) =>
            this._request('GET', `orders/${id}`),

        cancel: (id) =>
            this._request('PUT', `orders/cancel/${id}`),

        updateStatus: (id, status) =>
            this._request('PUT', `orders/updateStatus/${id}`, { status })
    };

    // ==================== TENANTS ENDPOINTS (SUPERADMIN) ====================
    tenants = {
        list: () =>
            this._request('GET', 'tenants'),

        show: (id) =>
            this._request('GET', `tenants/${id}`),

        create: (data) =>
            this._request('POST', 'tenants', data),

        update: (id, data) =>
            this._request('PUT', `tenants/update/${id}`, data),

        delete: (id) =>
            this._request('DELETE', `tenants/destroy/${id}`)
    };

    // ==================== SYSTEM ENDPOINTS (SUPERADMIN) ====================
    system = {
        dashboard: () =>
            this._request('GET', 'system/dashboard'),

        logs: (type = 'error', limit = 100) =>
            this._request('GET', `system/logs?type=${type}&limit=${limit}`),

        clearLogs: (type = 'error') =>
            this._request('DELETE', `system/clearLogs?type=${type}`),

        health: () =>
            this._request('GET', 'system/health')
    };

    // ==================== PASSWORD RESET ENDPOINTS ====================
    passwordReset = {
        forgot: (phone, email = null) => {
            const body = {};
            if (phone) body.phone = phone;
            if (email) body.email = email;
            return this._request('POST', 'password/forgot', body);
        },

        reset: (token, newPassword) =>
            this._request('POST', 'password/reset', { token, password: newPassword })
    };

    // ==================== PAYMENT ENDPOINTS ====================
    payment = {
        verify: (authority, orderId) =>
            this._request('GET', `payment/verify?authority=${authority}&order_id=${orderId}`)
    };
}

window.ApiClient = ApiClient;