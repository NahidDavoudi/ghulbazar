/**
 * pages/orders.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import OrderRow from '../components/OrderRow.js';
import Pagination from '../components/Pagination.js';
import DOM from '../utils/dom.js';

const { show, hide, text, hashHref } = DOM;

const ORDERS_PER_PAGE = 8;
let _allOrders = [];
let _ordersPage = 1;

function _renderOrdersTable() {
  const start = (_ordersPage - 1) * ORDERS_PER_PAGE;
  const page = _allOrders.slice(start, start + ORDERS_PER_PAGE);

  const tbody = document.getElementById('orders-table');
  if (!tbody) return;

  tbody.innerHTML = page.map((o) => OrderRow.render(o, { hashHref })).join('');

  const total = _allOrders.length;
  const pages = Math.ceil(total / ORDERS_PER_PAGE);
  const pag = Pagination.render({ page: _ordersPage, totalPages: pages, total, perPage: ORDERS_PER_PAGE });

  const infoEl = document.getElementById('pagination-info');
  if (infoEl && pag) infoEl.textContent = pag.info;

  const navEl = document.getElementById('pagination-nav');
  if (navEl && pag) {
    navEl.innerHTML = pag.nav;
    Pagination.bind(navEl, {
      onPageChange: (p) => {
        _ordersPage = Math.max(1, Math.min(p, pages));
        _renderOrdersTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }
}

Router.onEnter('orders', async function () {
  _ordersPage = 1;
  show('orders-loading');
  hide('need-login');
  hide('empty-orders');
  hide('orders-content');

  if (!api.auth.isLoggedIn()) {
    hide('orders-loading');
    show('need-login');
    return;
  }

  try {
    const data = await api.orders.list();
    hide('orders-loading');
    const orders = Array.isArray(data) ? data : (data.data || data.orders || []);

    if (!orders.length) { show('empty-orders'); return; }

    _allOrders = orders;
    show('orders-content');

    const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
    const totalAmt = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    text('stat-active', active.toLocaleString('fa-IR'));
    text('stat-total', orders.length.toLocaleString('fa-IR'));
    text('stat-amount', totalAmt.toLocaleString('fa-IR') + ' تومان');

    _renderOrdersTable();
  } catch (e) {
    const el = document.getElementById('orders-loading');
    if (el) el.innerHTML = `<p class="text-red-500 text-center">${e.message}</p>`;
  }
});
