/**
 * utils/priceFormatter.js — pure price formatting helpers
 */

export function toEnDigit(s) {
  return String(s)
    .replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 1776)
    .replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632);
}

export function formatPrice(amount, suffix = ' تومان') {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('fa-IR') + suffix;
}

export function attachPriceFormatter(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp || inp.dataset.priceBound === '1') return;
  inp.dataset.priceBound = '1';

  inp.addEventListener('input', function () {
    const raw = toEnDigit(this.value).replace(/[^0-9]/g, '');
    if (!raw) { this.value = ''; return; }
    this.value = Number(raw).toLocaleString('fa-IR');
  });

  inp.addEventListener('focus', function () {
    const raw = toEnDigit(this.value).replace(/[^0-9]/g, '');
    this.value = raw;
  });
}
