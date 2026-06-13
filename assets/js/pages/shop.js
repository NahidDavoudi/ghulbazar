/**
 * pages/shop.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import ProductCard from '../components/ProductCard.js';
import DOM from '../utils/dom.js';

const { show, hide, text, hashHref, reclone } = DOM;

Router.onEnter('shop', async function (params) {
  const { era = '', category = '', sort = '', q = '', featured = '' } = params;

  document.getElementById('clear-filters')?.classList.toggle('hidden', !(era || category || q));

  const title = era || category || (q ? `جستجو: ${q}` : 'همه محصولات');
  text('desktop-title', title);
  text('page-title', title);

  try {
    const cats = await api.categories.list();
    const catFilters = document.getElementById('cat-filters');
    if (catFilters) {
      catFilters.innerHTML = cats.map((c) => {
        const slug = c.slug || c.name;
        const active = category === slug;
        return `<li><a href="${hashHref('shop', { category: slug })}" data-link
          class="block text-right text-sm py-1 transition-colors ${active ? 'text-accent font-bold' : 'text-muted hover:text-body'}">${c.name}</a></li>`;
      }).join('');
    }
  } catch { /* noop */ }

  const filters = { limit: 24 };
  if (era) filters.era = era;
  if (category) filters.category = category;
  if (sort) filters.sort = sort;
  if (q) filters.q = q;
  if (featured) filters.featured = featured;

  show('shop-loading');
  try {
    const data = await api.products.list(filters);
    hide('shop-loading');
    text('product-count', `${data.total || 0} محصول`);

    const grid = document.getElementById('products-grid');
    if (!data.data?.length) {
      show('shop-empty');
      if (grid) grid.innerHTML = '';
    } else {
      hide('shop-empty');
      if (grid) {
        grid.innerHTML = data.data.map((p) => ProductCard.render(p)).join('');
        grid.querySelectorAll(':scope > a').forEach((el) => {
          ProductCard.bind(el, {
            onAddToCart: async (id) => {
              await api.cart.add(id, 1);
              window.loadCartCount?.();
              api.utils.toast('به سبد اضافه شد', 'success', 2000);
            },
          });
        });
      }
    }
  } catch (e) {
    const loadEl = document.getElementById('shop-loading');
    if (loadEl) loadEl.innerHTML = `<p class="text-accent text-center">${e.message}</p>`;
  }

  const newSort = reclone('sort-select');
  if (newSort) {
    newSort.value = sort;
    newSort.addEventListener('change', function () {
      Router.go('/shop', { ...params, sort: this.value });
    });
  }

  function closeSidebar() {
    document.getElementById('shop-sidebar')?.classList.remove('sidebar-open');
    document.getElementById('sidebar-backdrop')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  const newToggle = reclone('filter-toggle');
  if (newToggle) {
    newToggle.addEventListener('click', () => {
      document.getElementById('shop-sidebar')?.classList.add('sidebar-open');
      document.getElementById('sidebar-backdrop')?.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebar-close')?.addEventListener('click', closeSidebar);
  document.getElementById('cat-filters')?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => { if (window.innerWidth < 768) closeSidebar(); });
  });

  if (window.lucide) lucide.createIcons();
});
