/**
 * pages/orders.js
 * صفحه سفارش‌ها — #/orders
 *
 * وابستگی‌ها:
 *   api.js → window.API
 *   router.js → window.Router
 *   utils/dom.js → window.DOM
 */

;(function () {
  'use strict';

  const { show, hide, text, hashHref } = DOM;

  const ORDERS_PER_PAGE = 8;
  let _allOrders  = [];
  let _ordersPage = 1;

  const ORDER_STATUS = {
    pending:   { label: 'در انتظار تأیید',    cls: 'border-yellow-700/50 text-yellow-300 bg-yellow-900/20' },
    paid:      { label: 'تأیید پرداخت',       cls: 'border-blue-700/50 text-blue-300 bg-blue-900/20' },
    shipped:   { label: 'ارسال شده',           cls: 'border-[#cf1736]/50 text-[#cf1736] bg-[#cf1736]/10' },
    delivered: { label: 'تحویل داده شده',     cls: 'border-green-700/50 text-green-300 bg-green-900/20' },
    cancelled: { label: 'لغو شده',            cls: 'border-[#47242a] text-[rgba(255,255,255,0.6)] bg-[#3a1f24]/50' },
  };

  function _orderBadge(status) {
    const s = ORDER_STATUS[status] || { label: status, cls: 'border-[#47242a] text-[rgba(255,255,255,0.6)] bg-[#3a1f24]/50' };
    return `<span class="badge border ${s.cls}">${s.label}</span>`;
  }

  function _renderOrdersTable() {
    const start = (_ordersPage - 1) * ORDERS_PER_PAGE;
    const page  = _allOrders.slice(start, start + ORDERS_PER_PAGE);

    const tbody = document.getElementById('orders-table');
    if (!tbody) return;

    tbody.innerHTML = page.map(o => {
      const dim  = ['delivered', 'cancelled'].includes(o.status) ? 'opacity-60' : '';
      const imgs = (o.items || []).slice(0, 3).map(i =>
        `<img src="${i.image || ''}" alt="${i.name || ''}"
              class="inline-block w-8 h-8 rounded-lg object-cover ring-2 ring-[#221114] ${dim}"
              onerror="this.src=''">`
      ).join('');
      const date = o.created_at
        ? new Date(o.created_at).toLocaleDateString('fa-IR')
        : '—';

      return `
        <tr class="hover:bg-[#3a1f24]/30 transition-colors">
          <td class="py-4 px-5 font-mono text-sm ${dim || 'text-white'} whitespace-nowrap">#${o.order_number}</td>
          <td class="py-4 px-5 text-sm text-[rgba(255,255,255,0.6)] whitespace-nowrap">${date}</td>
          <td class="py-4 px-5 hidden sm:table-cell">
            <div class="flex -space-x-2 space-x-reverse">${imgs || '—'}</div>
          </td>
          <td class="py-4 px-5 font-bold text-sm ${dim || 'text-white'} whitespace-nowrap">
            ${Number(o.total_amount || 0).toLocaleString('fa-IR')} تومان
          </td>
          <td class="py-4 px-5 whitespace-nowrap">${_orderBadge(o.status)}</td>
          <td class="py-4 px-5">
            <a href="${hashHref('product', { id: o.id })}" data-link
               class="text-xs text-[#c8939c] hover:text-[#cf1736] transition-colors font-medium">
              جزئیات ←
            </a>
          </td>
        </tr>`;
    }).join('');

    // Pagination info
    const total  = _allOrders.length;
    const pages  = Math.ceil(total / ORDERS_PER_PAGE);
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
      infoEl.textContent = `نمایش ${(start + 1).toLocaleString('fa-IR')} تا ${Math.min(start + ORDERS_PER_PAGE, total).toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')}`;
    }

    const navEl = document.getElementById('pagination-nav');
    if (navEl) {
      let nav = `<button data-page="${_ordersPage - 1}" ${_ordersPage === 1 ? 'disabled' : ''}
                         class="w-7 h-7 rounded-lg border border-[#47242a] text-[rgba(255,255,255,0.6)]
                                hover:border-[#cf1736]/40 disabled:opacity-30 text-xs transition-colors">‹</button>`;
      for (let p = 1; p <= pages; p++) {
        nav += `<button data-page="${p}"
                        class="w-7 h-7 rounded-lg border text-xs transition-colors
                               ${p === _ordersPage
                                 ? 'border-[#cf1736] bg-[#cf1736]/20 text-white'
                                 : 'border-[#47242a] text-[rgba(255,255,255,0.6)] hover:border-[#cf1736]/40'}">
                  ${p.toLocaleString('fa-IR')}
                </button>`;
      }
      nav += `<button data-page="${_ordersPage + 1}" ${_ordersPage === pages ? 'disabled' : ''}
                      class="w-7 h-7 rounded-lg border border-[#47242a] text-[rgba(255,255,255,0.6)]
                             hover:border-[#cf1736]/40 disabled:opacity-30 text-xs transition-colors">›</button>`;
      navEl.innerHTML = nav;

      navEl.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p   = parseInt(btn.dataset.page);
          const max = Math.ceil(_allOrders.length / ORDERS_PER_PAGE);
          _ordersPage = Math.max(1, Math.min(p, max));
          _renderOrdersTable();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }
  }

  /* ── Router ── */
  Router.onEnter('orders', async function () {
    _ordersPage = 1;

    show('orders-loading');
    hide('need-login');
    hide('empty-orders');
    hide('orders-content');

    if (!API.auth.isLoggedIn()) {
      hide('orders-loading');
      show('need-login');
      return;
    }

    try {
      const data   = await API.orders.list();
      hide('orders-loading');
      const orders = Array.isArray(data) ? data : (data.data || data.orders || []);

      if (!orders.length) { show('empty-orders'); return; }

      _allOrders = orders;
      show('orders-content');

      const active   = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
      const totalAmt = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      text('stat-active', active.toLocaleString('fa-IR'));
      text('stat-total',  orders.length.toLocaleString('fa-IR'));
      text('stat-amount', totalAmt.toLocaleString('fa-IR') + ' تومان');

      _renderOrdersTable();
    } catch (e) {
      const el = document.getElementById('orders-loading');
      if (el) el.innerHTML = `<p class="text-red-400 text-center">${e.message}</p>`;
    }
  });

})();
