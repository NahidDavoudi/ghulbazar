import { storeConfig } from '../config/bootstrap.js';
import auth from '../core/auth.js';

const Header = {
  render() {
    const user = auth.getCurrentUser();
    const loggedIn = auth.isLoggedIn();
    const navLinks = storeConfig.texts.nav;

    const navItems = navLinks.map((l) => `
      <a href="${l.href}" data-link
         class="text-sm text-dim hover:text-body transition-colors px-2 py-1 rounded-full hover:bg-black/5 header-nav-link">
        ${l.label}
      </a>`).join('');

    const userArea = loggedIn
      ? `<div class="flex items-center gap-3">
           <span class="text-xs text-muted hidden sm:inline">${user?.name || user?.phone || ''}</span>
           <button id="header-logout-btn" class="text-xs text-muted hover:text-body transition-colors">خروج</button>
         </div>`
      : `<a href="login.html" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors" title="ورود">
           <i data-lucide="user" class="w-[18px] h-[18px] text-muted"></i>
         </a>`;

    return `
      <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#/" data-link class="shrink-0">
            <span class="font-display text-xl md:text-2xl text-body tracking-[0.15em] font-bold" dir="ltr">${storeConfig.name}</span>
          </a>
          <nav class="hidden md:flex items-center gap-1">${navItems}</nav>
          <div class="flex items-center gap-2">
            <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors" title="جستجو">
              <i data-lucide="search" class="w-[18px] h-[18px] text-muted"></i>
            </button>
            <a href="#/cart" data-link class="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors group">
              <i data-lucide="shopping-bag" class="w-[18px] h-[18px] text-muted group-hover:text-body transition-colors"></i>
              <span id="cart-badge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">0</span>
            </a>
            ${userArea}
            <button id="mobile-menu-btn" class="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
              <i data-lucide="menu" class="w-[18px] h-[18px] text-muted"></i>
            </button>
          </div>
        </div>
        <div id="mobile-menu" class="hidden md:hidden bg-white/95 backdrop-blur-xl border-t border-black/5 px-4 py-3">
          <nav class="flex flex-col gap-1">
            ${navLinks.map((l) => `
              <a href="${l.href}" data-link class="py-2.5 px-3 rounded-xl text-sm text-dim hover:bg-black/5 hover:text-body transition-colors">${l.label}</a>`).join('')}
          </nav>
        </div>
      </header>`;
  },

  bind(container, callbacks = {}) {
    function highlightNav() {
      const hash = location.hash.split('?')[0];
      container.querySelectorAll('.header-nav-link').forEach((a) => {
        const href = a.getAttribute('href');
        a.classList.toggle('text-body', href === hash || (hash === '#/' && href === '#/'));
        a.classList.toggle('font-bold', href === hash || (hash === '#/' && href === '#/'));
      });
    }

    highlightNav();
    window.addEventListener('hashchange', highlightNav);

    container.querySelector('#header-logout-btn')?.addEventListener('click', async () => {
      await callbacks.onLogout?.();
    });

    container.querySelector('#mobile-menu-btn')?.addEventListener('click', () => {
      container.querySelector('#mobile-menu')?.classList.toggle('hidden');
    });

    container.querySelectorAll('#mobile-menu a[data-link]').forEach((a) => {
      a.addEventListener('click', () => container.querySelector('#mobile-menu')?.classList.add('hidden'));
    });
  },
};

export default Header;
