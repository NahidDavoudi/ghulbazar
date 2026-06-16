/**
 * admin/pages/orders.js
 * مدیریت سفارش‌ها: لیست، فیلتر، تغییر وضعیت، تایید/رد رسید
 * وابستگی: helpers.js, api.js
 */

;(function () {
  'use strict';

  function _t(path, fallback) {
    return window.getAdminText?.(path, fallback) ?? fallback;
  }

  let _orders = [];

  function _normalizeOrdersList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return data?.orders ?? [];
  }

  /* ── Public loader ─────────────────────────────────────────── */
  window.loadOrders = async function () {
    try {
      setLoading(true);
      const data = await API.orders.adminList({ limit: 200 });
      setLoading(false);
      _orders = _normalizeOrdersList(data);
      _renderOrders(_orders);
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  };

  /* ── Render table ──────────────────────────────────────────── */
  function _renderOrders(list) {
    const tbody = $('ordersTableBody');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-dim">${_t('orders.empty', 'سفارشی یافت نشد')}</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(o => {
      const date        = o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—';
      const receiptUrl  = o.receipt_path || o.receipt_file || o.receipt?.file_path || '';
      const receiptHtml = receiptUrl ? `
        <div class="flex flex-wrap gap-1 mt-1.5">
          <a href="${receiptUrl}" target="_blank"
             class="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
            ${_t('orders.viewReceipt', 'مشاهده رسید')}
          </a>
          ${o.status === 'pending' ? `
          <button onclick="approveReceipt(${o.id})"
                  class="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            ${_t('orders.approve', 'تایید')}
          </button>
          <button onclick="rejectReceipt(${o.id})"
                  class="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-md hover:bg-accent/20 transition-colors">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
            ${_t('orders.reject', 'رد')}
          </button>` : ''}
        </div>` : '';

      return `<tr class="hover:bg-row transition-colors">
        <td class="px-4 py-3">
          <p class="font-mono text-sm text-body">#${o.order_number}</p>
          ${receiptHtml}
        </td>
        <td class="px-4 py-3">
          <p class="text-sm font-medium text-body">${window.escapeHtml(o.customer_name || '—')}</p>
          <p class="text-xs text-dim" dir="ltr">${window.escapeHtml(o.customer_phone || '')}</p>
        </td>
        <td class="px-4 py-3 text-sm font-medium">${API.utils.formatPrice(o.total_amount || 0)}</td>
        <td class="px-4 py-3 text-xs text-dim">${date}</td>
        <td class="px-4 py-3">${statusBadge(o.status)}</td>
        <td class="px-4 py-3">
          <select onchange="changeOrderStatus(${o.id},this.value)"
                  class="text-xs bg-card border border-border rounded-lg px-2 py-1.5 text-body focus:outline-none focus:border-accent">
            ${Object.entries(STATUS_MAP).map(([k, v]) =>
              `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v.label}</option>`
            ).join('')}
          </select>
        </td>
      </tr>`;
    }).join('');
  }

  /* ── Receipt actions ───────────────────────────────────────── */
  window.approveReceipt = async function (id) {
    if (!confirm('رسید تایید و سفارش پرداخت‌شده علامت‌گذاری شود؟')) return;
    try {
      await API.orders.approveReceipt(id);
      toast('رسید تایید شد');
      window.loadOrders();
    } catch (e) { toast(e.message, 'error'); }
  };

  window.rejectReceipt = async function (id) {
    if (!confirm('رسید رد و از سیستم حذف شود؟')) return;
    try {
      await API.orders.rejectReceipt(id);
      toast('رسید رد شد');
      window.loadOrders();
    } catch (e) { toast(e.message, 'error'); }
  };

  /* ── Change status ─────────────────────────────────────────── */
  window.changeOrderStatus = async function (id, status) {
    try {
      await API.orders.updateStatus(id, status);
      toast('وضعیت سفارش بروزرسانی شد');
      const o = _orders.find(x => x.id === id);
      if (o) o.status = status;
      _renderOrders(_orders);
    } catch (e) { toast(e.message, 'error'); }
  };

  /* ── Filters ───────────────────────────────────────────────── */
  $('orderStatusFilter')?.addEventListener('change', function () {
    _renderOrders(this.value ? _orders.filter(o => o.status === this.value) : _orders);
  });

  $('orderSearch')?.addEventListener('input', function () {
    const q = this.value.toLowerCase();
    _renderOrders(_orders.filter(o =>
      (o.order_number   || '').toLowerCase().includes(q) ||
      (o.customer_name  || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q)
    ));
  });

})();
