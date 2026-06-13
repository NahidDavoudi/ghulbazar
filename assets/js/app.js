/**
 * app.js — SPA entry point
 */
import { initConfig } from './config/bootstrap.js';
import { initTheme } from './core/theme.js';
import api from './core/api.js';
import Router from './core/router.js';
import state from './core/state.js';
import events from './core/events.js';
import DOM from './utils/dom.js';
import Header from './components/Header.js';
import Footer from './components/Footer.js';
import ProductCard from './components/ProductCard.js';

import './pages/home.js';
import './pages/shop.js';
import './pages/product.js';
import './pages/categories.js';
import './pages/cart.js';
import './pages/checkout.js';
import './pages/payment.js';
import './pages/orders.js';

initConfig();
initTheme();

window.Api = api;
window.API = api;
window.Router = Router;
window.state = state;
window.events = events;
window.DOM = DOM;

window.renderStars = (rating) => {
  const full = Math.round(rating || 0);
  return Array.from({ length: 5 }, (_, i) => `
    <svg width="13" height="13" viewBox="0 0 24 24"
         fill="${i < full ? 'var(--color-accent)' : 'none'}"
         stroke="var(--color-accent)" stroke-width="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>`).join('');
};

window.productCard = (p) => ProductCard.render(p);

window.loadCartCount = async function () {
  try {
    const data = await api.cart.get();
    const count = data?.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0;
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '۹۹+' : count.toLocaleString('fa-IR');
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    state.set('cartCount', count);
    events.emit('cart:updated', { count });
  } catch {
    document.getElementById('cart-badge')?.classList.add('hidden');
  }
};

function mountShell() {
  const headerEl = document.getElementById('app-header');
  if (headerEl) {
    headerEl.innerHTML = Header.render();
    Header.bind(headerEl, {
      onLogout: async () => {
        await api.auth.logout();
        window.location.reload();
      },
    });
  }

  const footerEl = document.getElementById('app-footer');
  if (footerEl) {
    footerEl.innerHTML = Footer.render();
    Footer.bind(footerEl);
  }
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.add-to-cart-quick');
  if (!btn || btn.disabled) return;
  e.preventDefault();
  e.stopPropagation();
  const id = btn.dataset.productId;
  if (!id) return;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = '✓';
  btn.classList.add('bg-accent', 'border-accent', 'text-white');
  try {
    await api.cart.add(id, 1);
    window.loadCartCount();
    api.utils.toast('به سبد اضافه شد', 'success', 2000);
  } catch (err) {
    api.utils.toast(err.message, 'error');
  }
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = orig;
    btn.classList.remove('bg-accent', 'border-accent', 'text-white');
  }, 1800);
});

document.addEventListener('DOMContentLoaded', () => {
  mountShell();
  loadCartCount();
  Router.init();
});
