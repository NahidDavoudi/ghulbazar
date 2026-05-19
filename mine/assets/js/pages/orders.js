const PER_PAGE = 8;
let allOrders = [];
let currentPage = 1;

const STATUS = {
  pending:   { label:'در انتظار تأیید',   cls:'border-yellow-700/50 text-yellow-300 bg-yellow-900/20' },
  paid:      { label:'تأیید پرداخت',       cls:'border-blue-700/50   text-blue-300   bg-blue-900/20' },
  shipped:   { label:'ارسال شده',          cls:'border-accent/50     text-accent     bg-accent/10' },
  delivered: { label:'تحویل داده شده',     cls:'border-green-700/50  text-green-300  bg-green-900/20' },
  cancelled: { label:'لغو شده',            cls:'border-border        text-text-dim   bg-dark-3/50' },
};

function badge(status) {
  const s = STATUS[status] || { label:status, cls:'border-border text-text-dim bg-dark-3/50' };
  return `<span class="badge border ${s.cls}">${s.label}</span>`;
}

function renderTable() {
  const start = (currentPage - 1) * PER_PAGE;
  const page  = allOrders.slice(start, start + PER_PAGE);
  const ph    = 'localhost/ghul/products/img10.png';

  document.getElementById('orders-table').innerHTML = page.map(o => {
    const dim = ['delivered','cancelled'].includes(o.status) ? 'opacity-60' : '';
    const imgs = (o.items||[]).slice(0,3).map(i =>
      `<img src="${i.image||ph}" alt="${i.name||''}" class="inline-block w-8 h-8 rounded-lg object-cover ring-2 ring-dark ${dim}"
           onerror="this.src='${ph}'">`
    ).join('');
    const date = o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—';
    return `
      <tr class="hover:bg-dark-3/30 transition-colors">
        <td class="py-4 px-5 font-mono text-sm ${dim||'text-white'} whitespace-nowrap">#${o.order_number}</td>
        <td class="py-4 px-5 text-sm text-text-dim whitespace-nowrap">${date}</td>
        <td class="py-4 px-5 hidden sm:table-cell"><div class="flex -space-x-2 space-x-reverse">${imgs||'—'}</div></td>
        <td class="py-4 px-5 font-bold text-sm ${dim||'text-white'} whitespace-nowrap">${Number(o.total_amount||0).toLocaleString('fa-IR')} تومان</td>
        <td class="py-4 px-5 whitespace-nowrap">${badge(o.status)}</td>
        <td class="py-4 px-5">
          <a href="order-detail.html?id=${o.id}" class="text-xs text-muted hover:text-accent transition-colors font-medium">
            جزئیات ←
          </a>
        </td>
      </tr>`;
  }).join('');

  const total = allOrders.length;
  const pages = Math.ceil(total / PER_PAGE);
  document.getElementById('pagination-info').textContent =
    `نمایش ${(start+1).toLocaleString('fa-IR')} تا ${Math.min(start+PER_PAGE,total).toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')}`;

  let nav = '';
  nav += `<button onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''} class="w-7 h-7 rounded-lg border border-border text-text-dim hover:border-accent/40 disabled:opacity-30 text-xs transition-colors">‹</button>`;
  for (let p = 1; p <= pages; p++) {
    nav += `<button onclick="goPage(${p})" class="w-7 h-7 rounded-lg border text-xs transition-colors ${p===currentPage?'border-accent bg-accent/20 text-white':'border-border text-text-dim hover:border-accent/40'}">${p.toLocaleString('fa-IR')}</button>`;
  }
  nav += `<button onclick="goPage(${currentPage+1})" ${currentPage===pages?'disabled':''} class="w-7 h-7 rounded-lg border border-border text-text-dim hover:border-accent/40 disabled:opacity-30 text-xs transition-colors">›</button>`;
  document.getElementById('pagination-nav').innerHTML = nav;
}

function goPage(p) {
  const max = Math.ceil(allOrders.length / PER_PAGE);
  currentPage = Math.max(1, Math.min(p, max));
  renderTable();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function init() {
  injectHeader(); injectFooter(); loadCartCount();
  const user = JSON.parse(localStorage.getItem('gb_user') || 'null');
  if (!user) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('need-login').classList.remove('hidden');
    return;
  }
  try {
    const data = await apiFetch('orders');
    document.getElementById('loading').classList.add('hidden');
    const orders = Array.isArray(data) ? data : (data.data || data.orders || []);
    if (!orders.length) { document.getElementById('empty-orders').classList.remove('hidden'); return; }
    allOrders = orders;
    document.getElementById('orders-content').classList.remove('hidden');

    const active = orders.filter(o => !['delivered','cancelled'].includes(o.status)).length;
    const totalAmt = orders.reduce((s,o) => s + Number(o.total_amount||0), 0);
    document.getElementById('stat-active').textContent = active.toLocaleString('fa-IR');
    document.getElementById('stat-total').textContent  = orders.length.toLocaleString('fa-IR');
    document.getElementById('stat-amount').textContent = totalAmt.toLocaleString('fa-IR') + ' تومان';
    renderTable();
  } catch(e) {
    document.getElementById('loading').innerHTML = `<p class="text-red-400 text-center">${e.message}</p>`;
  }
}
init();
