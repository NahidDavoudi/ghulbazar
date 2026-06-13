import { storeConfig } from '../config/bootstrap.js';

const Footer = {
  render() {
    const { footer } = storeConfig.texts;
    const navLinks = storeConfig.texts.nav;

    return `
      <footer class="border-t border-border bg-body mt-20">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6 py-12">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div class="text-right flex flex-col items-start">
              <div class="flex items-center gap-2 justify-end mb-4">
                <span class="font-display text-lg text-body">${storeConfig.name}</span>
                <img src="${storeConfig.logo}" alt="" class="w-8 h-8 object-contain">
              </div>
              <p class="text-sm text-muted leading-relaxed">${footer.tagline}</p>
            </div>
            <div class="text-right">
              <h3 class="text-sm font-bold text-body mb-4">دسترسی سریع</h3>
              <ul class="space-y-2">
                ${navLinks.map((l) => `
                  <li><a href="${l.href}" data-link class="text-sm text-muted hover:text-body transition-colors">${l.label}</a></li>`).join('')}
              </ul>
            </div>
            <div class="text-right">
              <h3 class="text-sm font-bold text-body mb-4">تماس با ما</h3>
              <p class="text-sm text-muted mb-2">${footer.support}</p>
              <p class="text-sm text-body" dir="ltr">${footer.social}</p>
            </div>
          </div>
          <div class="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted/60">
            <p>${footer.copyright}</p>
            <div class="flex gap-4">
              <a href="#" class="hover:text-body transition-colors">قوانین</a>
              <a href="#" class="hover:text-body transition-colors">حریم خصوصی</a>
            </div>
          </div>
        </div>
      </footer>`;
  },

  bind() { /* no events */ },
};

export default Footer;
