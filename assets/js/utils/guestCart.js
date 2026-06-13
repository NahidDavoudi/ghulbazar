/**
 * utils/guestCart.js — guest cart persistence (pure localStorage)
 */

function storageKey() {
  return window.AppConfig?.storage?.guestCart || 'gb_guest_cart';
}

function readRaw() {
  try {
    const raw = localStorage.getItem(storageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items) {
  localStorage.setItem(storageKey(), JSON.stringify(items));
}

export function getItems() {
  return readRaw()
    .map((item) => ({
      product_id: Number(item.product_id),
      qty: Math.max(1, Number(item.qty) || 1),
    }))
    .filter((item) => item.product_id > 0);
}

export function setItems(items) {
  writeRaw(items);
}

export function addItem(productId, qty = 1) {
  const id = Number(productId);
  const amount = Math.max(1, Number(qty) || 1);
  const items = getItems();
  const existing = items.find((i) => i.product_id === id);

  if (existing) {
    existing.qty += amount;
  } else {
    items.push({ product_id: id, qty: amount });
  }

  writeRaw(items);
  return items;
}

export function updateItem(productId, qty) {
  const id = Number(productId);
  const amount = Number(qty);

  if (amount <= 0) {
    return removeItem(id);
  }

  const items = getItems();
  const existing = items.find((i) => i.product_id === id);
  if (existing) {
    existing.qty = amount;
  } else {
    items.push({ product_id: id, qty: amount });
  }

  writeRaw(items);
  return items;
}

export function removeItem(productId) {
  const id = Number(productId);
  const items = getItems().filter((i) => i.product_id !== id);
  writeRaw(items);
  return items;
}

export function clear() {
  localStorage.removeItem(storageKey());
}

export function totalQty(items = getItems()) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export default {
  getItems,
  setItems,
  addItem,
  updateItem,
  removeItem,
  clear,
  totalQty,
};
