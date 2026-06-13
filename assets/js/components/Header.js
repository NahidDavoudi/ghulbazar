import { storeConfig } from '../config/bootstrap.js';
import auth from '../core/auth.js';

const Header = {
  render() {
    const user = auth.getCurrentUser();
    const loggedIn = auth.isLoggedIn();
    const navLinks = storeConfig.texts.nav;

    const navItems = navLinks.map((l) => `
      <a href="${l.href}" data-link
         class="text-sm text-dim hover:text-body transition-colors px-1 py-0.5 rounded hover:bg-black/5 header-nav-link">
        ${l.label}
      </a>`).join('');

    const userArea = loggedIn
      ? `<div class="flex items-center gap-3">
           <span class="text-xs text-muted hidden sm:inline">${user?.name || user?.phone || ''}</span>
           <button id="header-logout-btn" class="text-xs text-muted hover:text-accent transition-colors">خروج</button>
         </div>`
      : `<a href="login.html" class="text-xs px-4 py-2 border border-border rounded-lg text-muted hover:border-accent hover:text-body transition-all">ورود</a>`;

    return `
      <header class="sticky top-0 z-50 bg-body/90 backdrop-blur-md border-b border-border">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#/" data-link class="flex items-center gap-2 shrink-0">
            <img src="${storeConfig.logo}" alt="${storeConfig.name}"
                 class="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(75,107,138,0.5)]">
            <span class="font-display text-lg text-body tracking-wider hidden sm:inline">${storeConfig.name}</span>
          </a>
          <nav class="hidden md:flex items-center gap-1">${navItems}</nav>
          <div class="flex items-center gap-3">
            <a href="#/cart" data-link class="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors group">
              <svg width="20" height="20" viewBox="0 0 16 20" fill="none" class="text-muted group-hover:text-body transition-colors">
                <path d="M3 1L1 5V17C1 18.1 1.9 19 3 19H13C14.1 19 15 18.1 15 17V5L13 1H3Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M1 5H15" stroke="currentColor" stroke-width="1.5"/>
                <path d="M11 9C11 10.7 9.7 12 8 12C6.3 12 5 10.7 5 9" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span id="cart-badge" class="hidden absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">0</span>
            </a>
            ${userArea}
            <button id="mobile-menu-btn" class="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors">
              <svg width="18" height="14" fill="none" viewBox="0 0 18 14">
                <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" class="text-muted" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div id="mobile-menu" class="hidden md:hidden bg-surface border-t border-border px-4 py-3">
          <nav class="flex flex-col gap-1">
            ${navLinks.map((l) => `
              <a href="${l.href}" data-link class="py-2 px-3 rounded-lg text-sm text-dim hover:bg-black/5 hover:text-body transition-colors">${l.label}</a>`).join('')}
          </nav>
        </div>
      </header>`;
  },

  bind(container, callbacks = {}) {
    function highlightNav() {
      const hash = location.hash.split('?')[0];
      container.querySelectorAll('.header-nav-link').forEach((a) => {
        const href = a.getAttribute('href');
        a.classList.toggle('text-accent', href === hash || (hash === '#/' && href === '#/'));
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
