/**
 * utils/helpers.js — shared UI helpers (toast, DOM shortcuts)
 */

export function toast(msg, type = 'success', duration = 3000) {
  const colors = {
    success: 'var(--color-accent, #4b6b8a)',
    error: '#dc2626',
    info: '#2563eb',
  };
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);',
    `background:${colors[type] || colors.success};color:#fff;`,
    'padding:12px 24px;border-radius:12px;font-size:14px;',
    'box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:9999;',
    'transition:opacity .3s;white-space:nowrap;',
    'font-family:var(--font-vazir, Vazirmatn, sans-serif);',
  ].join('');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fa-IR');
}

/** Admin DOM shortcuts — exposed on window for admin pages */
export function installAdminHelpers() {
  window.$ = (id) => document.getElementById(id);
  window.show = (id) => window.$(id)?.classList.remove('hidden');
  window.hide = (id) => window.$(id)?.classList.add('hidden');
  window.setText = (id, v) => { const e = window.$(id); if (e) e.textContent = v; };
  window.getVal = (id) => window.$(id)?.value.trim() ?? '';
  window.toEnDigit = (s) => String(s)
    .replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 1776)
    .replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632);
  window.setLoading = (on) => (on ? window.show('loadingOverlay') : window.hide('loadingOverlay'));
  window.toast = toast;
  window.showModal = (id) => window.$(id)?.classList.remove('hidden');
  window.hideModal = (id) => window.$(id)?.classList.add('hidden');

  window.STATUS_MAP = {
    pending:   { label: 'در انتظار',       cls: 'bg-yellow-100 text-yellow-800' },
    paid:      { label: 'پرداخت شده',      cls: 'bg-blue-100 text-blue-800' },
    shipped:   { label: 'ارسال شده',       cls: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'تحویل داده شده', cls: 'bg-green-100 text-green-800' },
    cancelled: { label: 'لغو شده',         cls: 'bg-stone-100 text-stone-500' },
  };

  window.statusBadge = function (s) {
    const m = window.STATUS_MAP[s] || { label: s, cls: 'bg-stone-100 text-stone-500' };
    return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${m.cls}">${m.label}</span>`;
  };
}
