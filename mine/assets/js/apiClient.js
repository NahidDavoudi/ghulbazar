/**
 * apiClient.js
 * Client for Ghul Bazar REST API (api.php)
 * Uses JWT Bearer token for authenticated requests.
 */

class ApiClient {
    constructor(baseURL = '') {
      this.baseURL = baseURL;
      this.token = null;
    }
  
    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------
    setToken(token) {
      this.token = token;
      if (token) {
        localStorage.setItem('jwt_token', token);
      } else {
        localStorage.removeItem('jwt_token');
      }
    }
  
    getToken() {
      if (this.token) return this.token;
      const stored = localStorage.getItem('jwt_token');
      if (stored) this.token = stored;
      return this.token;
    }
  
    clearToken() {
      this.token = null;
      localStorage.removeItem('jwt_token');
    }
  
    // Build query string from object
    buildQuery(params) {
      if (!params) return '';
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          search.append(key, value);
        }
      }
      const qs = search.toString();
      return qs ? '?' + qs : '';
    }
  
    // Core request method
    async request(method, endpoint, data = null, isFormData = false, extraParams = {}) {
      let url = this.baseURL + endpoint;
      const queryString = this.buildQuery(extraParams);
      if (queryString) url += queryString;
  
      const headers = {};
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
  
      const options = {
        method,
        headers,
        credentials: 'include', // for session-based cart/orders
      };
      if (data !== null) {
        options.body = isFormData ? data : JSON.stringify(data);
      }
  
      const response = await fetch(url, options);
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { error: 'Invalid JSON response from server' };
      }
  
      if (!response.ok) {
        const errorMsg = responseData.error || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }
      return responseData;
    }
  
    // Shortcuts for common methods
    get(endpoint, params = {}) {
      return this.request('GET', endpoint, null, false, params);
    }
    post(endpoint, data, isFormData = false, params = {}) {
      return this.request('POST', endpoint, data, isFormData, params);
    }
    put(endpoint, data, isFormData = false, params = {}) {
      return this.request('PUT', endpoint, data, isFormData, params);
    }
    delete(endpoint, params = {}) {
      return this.request('DELETE', endpoint, null, false, params);
    }
  
    // ------------------------------------------------------------------
    // AUTH
    // ------------------------------------------------------------------
    async register(name, phone, password) {
      const data = await this.post('?endpoint=auth&action=register', { name, phone, password });
      if (data.token) this.setToken(data.token);
      return data;
    }
  
    async login(phone, password) {
      const data = await this.post('?endpoint=auth&action=login', { phone, password });
      if (data.token) this.setToken(data.token);
      return data;
    }
  
    async getMe() {
      return this.get('?endpoint=auth&action=me');
    }
  
    logout() {
      this.clearToken();
    }
  
    // ------------------------------------------------------------------
    // PRODUCTS
    // ------------------------------------------------------------------
    getProducts(params = {}) {
      return this.get('?endpoint=products', params);
    }
  
    getProduct(id) {
      return this.get('?endpoint=products', { id });
    }
  
    getFeaturedProducts() {
      return this.get('?endpoint=products', { featured: 1 });
    }
  
    createProduct(productData) {
      return this.post('?endpoint=products', productData);
    }
  
    updateProduct(id, productData) {
      return this.put('?endpoint=products', productData, false, { id });
    }
  
    deleteProduct(id) {
      return this.delete('?endpoint=products', { id });
    }
  
    // Upload product image (admin)
    async uploadProductImage(productId, file, isMain = 0, sortOrder = 0) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('is_main', isMain);
      formData.append('sort_order', sortOrder);
      return this.post('?endpoint=products&action=upload-image', formData, true, { id: productId });
    }
  
    // ------------------------------------------------------------------
    // CATEGORIES
    // ------------------------------------------------------------------
    getCategories() {
      return this.get('?endpoint=categories');
    }
  
    createCategory(data) {
      return this.post('?endpoint=categories', data);
    }
  
    updateCategory(id, data) {
      return this.put('?endpoint=categories', data, false, { id });
    }
  
    deleteCategory(id) {
      return this.delete('?endpoint=categories', { id });
    }
  
    // ------------------------------------------------------------------
    // ERAS
    // ------------------------------------------------------------------
    getEras() {
      return this.get('?endpoint=eras');
    }
  
    createEra(data) {
      return this.post('?endpoint=eras', data);
    }
  
    updateEra(id, data) {
      return this.put('?endpoint=eras', data, false, { id });
    }
  
    deleteEra(id) {
      return this.delete('?endpoint=eras', { id });
    }
  
    // ------------------------------------------------------------------
    // CART (session‑based, no auth required)
    // ------------------------------------------------------------------
    getCart() {
      return this.get('?endpoint=cart');
    }
  
    addToCart(productId, qty = 1) {
      return this.post('?endpoint=cart', { product_id: productId, qty });
    }
  
    updateCartItem(productId, qty) {
      return this.put('?endpoint=cart', { product_id: productId, qty });
    }
  
    removeCartItem(productId) {
      return this.delete('?endpoint=cart', { product_id: productId });
    }
  
    clearCart() {
      return this.delete('?endpoint=cart');
    }
  
    // ------------------------------------------------------------------
    // ORDERS
    // ------------------------------------------------------------------
    createOrder(orderData) {
      // orderData: { items, customer_name, customer_phone, shipping_address, discount_code? }
      return this.post('?endpoint=orders', orderData);
    }
  
    getOrderByNumber(orderNumber) {
      return this.get('?endpoint=orders', { number: orderNumber });
    }
  
    getOrderById(id) {
      return this.get('?endpoint=orders', { id });
    }
  
    getOrders(params = {}) {
      // For admin: status, search, start_date, end_date, page, limit
      return this.get('?endpoint=orders', params);
    }
  
    updateOrderStatus(id, status) {
      return this.put('?endpoint=orders', { status }, false, { id });
    }
  
    // Upload payment receipt (multipart/form-data)
    async uploadReceipt(orderNumber, file) {
      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('order_number', orderNumber);
      return this.post('?endpoint=upload_receipt', formData, true);
    }
  
    // ------------------------------------------------------------------
    // DISCOUNTS
    // ------------------------------------------------------------------
    validateDiscountCode(code) {
      return this.get('?endpoint=discounts&action=validate', { code });
    }
  
    createDiscountCode(data) {
      // data: { code, type, value, valid_from, valid_to }
      return this.post('?endpoint=discounts', data);
    }
  
    deactivateDiscountCode(id) {
      return this.delete('?endpoint=discounts', { id });
    }
  
    // ------------------------------------------------------------------
    // ADMIN (dashboard stats)
    // ------------------------------------------------------------------
    getAdminStats() {
      return this.get('?endpoint=admin&action=stats');
    }
  
    // ------------------------------------------------------------------
    // USERS (admin only)
    // ------------------------------------------------------------------
    getUsers(params = {}) {
      return this.get('?endpoint=users', params);
    }
  
    getUserById(id) {
      return this.get('?endpoint=users', { id });
    }
  
    updateUserRole(id, role) {
      return this.put('?endpoint=users', { role }, false, { id });
    }
  
    deleteUser(id) {
      return this.delete('?endpoint=users', { id });
    }
  }
  
  // Create and export a singleton instance with relative base URL (change if needed)
  const apiClient = new ApiClient('');
  
  export default apiClient;