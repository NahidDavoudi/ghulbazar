/**
 * core/cartStore.js — guest localStorage + authenticated API cart
 */
import * as auth from './auth.js';
import * as guestCart from '../utils/guestCart.js';

export function normalizeCartItem(item) {
  const productId = Number(item.product_id ?? item.id);
  const qty = Math.max(1, Number(item.qty ?? item.quantity) || 1);
  const price = Number(item.price) || 0;

  return {
    id: productId,
    product_id: productId,
    qty,
    quantity: qty,
    name: item.name || '',
    price,
    image: item.image || item.main_image || '',
    stock: item.stock != null ? Number(item.stock) : null,
    is_active: item.is_active !== 0 && item.is_active !== false,
    subtotal: price * qty,
  };
}

function normalizeCart(data) {
  const items = (data?.items || []).map(normalizeCartItem);
  const total = data?.total ?? items.reduce((sum, i) => sum + i.subtotal, 0);
  return { ...data, items, total };
}

async function enrichGuestItems(rawItems, fetchProduct) {
  const results = await Promise.all(
    rawItems.map(async (entry) => {
      try {
        const product = await fetchProduct(entry.product_id);
        if (!product || product.is_active === 0 || product.is_active === false) {
          return null;
        }
        const qty = Math.min(entry.qty, Math.max(1, Number(product.stock) || entry.qty));
        return normalizeCartItem({
          product_id: entry.product_id,
          qty,
          name: product.name,
          price: product.price,
          image: product.main_image || product.images?.[0]?.image_url || '',
          stock: product.stock,
          is_active: product.is_active,
        });
      } catch {
        return null;
      }
    }),
  );

  const items = results.filter(Boolean);
  const staleIds = new Set(
    rawItems
      .filter((entry) => !items.some((i) => i.product_id === entry.product_id))
      .map((entry) => entry.product_id),
  );

  if (staleIds.size) {
    guestCart.setItems(
      rawItems.filter((entry) => !staleIds.has(entry.product_id)),
    );
  }

  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  return { items, total };
}

export function createCartStore(http) {
  const { get, post, patch, del, withFallback, fetchProduct } = http;

  async function getGuestCart() {
    const raw = guestCart.getItems();
    if (!raw.length) {
      return { items: [], total: 0 };
    }
    return enrichGuestItems(raw, fetchProduct);
  }

  async function mergeGuestIfNeeded() {
    if (!auth.isLoggedIn()) return null;

    const raw = guestCart.getItems();
    if (!raw.length) return null;

    try {
      const merged = await post('/cart/merge', { items: raw });
      guestCart.clear();
      return normalizeCart(merged);
    } catch (err) {
      throw err;
    }
  }

  return {
    mergeGuestIfNeeded,

    get: async () => {
      if (auth.isLoggedIn()) {
        const data = await withFallback(get('/cart'), { items: [], total: 0 });
        return normalizeCart(data);
      }
      return getGuestCart();
    },

    add: async (productId, qty = 1) => {
      if (auth.isLoggedIn()) {
        const data = await post('/cart/items', { product_id: productId, qty });
        return normalizeCart(data);
      }

      const product = await fetchProduct(productId);
      if (!product || product.is_active === 0 || product.is_active === false) {
        throw new Error('محصول یافت نشد.');
      }

      const items = guestCart.getItems();
      const current = items.find((i) => i.product_id === Number(productId));
      const nextQty = (current?.qty || 0) + Math.max(1, Number(qty) || 1);
      const stock = Number(product.stock) || 0;

      if (stock < nextQty) {
        throw new Error(`موجودی کافی نیست. فقط ${stock.toLocaleString('fa-IR')} عدد در انبار موجود است.`);
      }

      guestCart.addItem(productId, qty);
      return getGuestCart();
    },

    update: async (productId, qty) => {
      if (auth.isLoggedIn()) {
        const data = await patch(`/cart/items/${productId}`, { qty });
        return normalizeCart(data);
      }

      const amount = Number(qty);
      if (amount <= 0) {
        guestCart.removeItem(productId);
        return getGuestCart();
      }

      const product = await fetchProduct(productId);
      if (!product || product.is_active === 0 || product.is_active === false) {
        guestCart.removeItem(productId);
        throw new Error('محصول یافت نشد.');
      }

      const stock = Number(product.stock) || 0;
      if (amount > stock) {
        throw new Error(`موجودی کافی نیست. فقط ${stock.toLocaleString('fa-IR')} عدد در انبار موجود است.`);
      }

      guestCart.updateItem(productId, amount);
      return getGuestCart();
    },

    remove: async (productId) => {
      if (auth.isLoggedIn()) {
        const data = await del(`/cart/items/${productId}`);
        return normalizeCart(data);
      }

      guestCart.removeItem(productId);
      return getGuestCart();
    },

    clear: async () => {
      if (auth.isLoggedIn()) {
        await del('/cart');
        return { items: [], total: 0 };
      }

      guestCart.clear();
      return { items: [], total: 0 };
    },

    applyDiscount: (code) => post('/cart/discount', { code }),
  };
}

export default createCartStore;
