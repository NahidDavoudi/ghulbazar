const ORDER_STATUS = {
  pending:   { label: 'در انتظار تأیید', cls: 'border-yellow-600/50 text-yellow-700 bg-yellow-100/80' },
  paid:      { label: 'تأیید پرداخت',    cls: 'border-blue-600/50 text-blue-700 bg-blue-100/80' },
  shipped:   { label: 'ارسال شده',       cls: 'border-accent/50 text-accent bg-accent/10' },
  delivered: { label: 'تحویل داده شده', cls: 'border-green-600/50 text-green-700 bg-green-100/80' },
  cancelled: { label: 'لغو شده',         cls: 'border-border text-muted bg-surface' },
};

const OrderRow = {
  render(o, { hashHref }) {
    const s = ORDER_STATUS[o.status] || { label: o.status, cls: 'border-border text-muted bg-surface' };
    const dim = ['delivered', 'cancelled'].includes(o.status) ? 'opacity-60' : '';
    const imgs = (o.items || []).slice(0, 3).map((i) =>
      `<img src="${i.image || ''}" alt="${i.name || ''}" class="inline-block w-8 h-8 rounded-lg object-cover ring-2 ring-card ${dim}" onerror="this.src=''">`,
    ).join('');
    const date = o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—';

    return `
      <tr class="hover:bg-surface/50 transition-colors">
        <td class="py-4 px-5 font-mono text-sm ${dim || 'text-body'} whitespace-nowrap">#${o.order_number}</td>
        <td class="py-4 px-5 text-sm text-muted whitespace-nowrap">${date}</td>
        <td class="py-4 px-5 hidden sm:table-cell"><div class="flex -space-x-2 space-x-reverse">${imgs || '—'}</div></td>
        <td class="py-4 px-5 font-bold text-sm ${dim || 'text-body'} whitespace-nowrap">${Number(o.total_amount || 0).toLocaleString('fa-IR')} تومان</td>
        <td class="py-4 px-5 whitespace-nowrap"><span class="badge border px-2 py-0.5 rounded-full text-xs ${s.cls}">${s.label}</span></td>
        <td class="py-4 px-5">
          <a href="${hashHref('product', { id: o.id })}" data-link class="text-xs text-muted hover:text-accent transition-colors font-medium">جزئیات ←</a>
        </td>
      </tr>`;
  },

  bind() { /* no row-level events */ },
};

export default OrderRow;
