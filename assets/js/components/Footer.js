import { storeConfig } from '../config/bootstrap.js';
import { escapeAttr } from '../utils/htmlEscape.js';
import { pickVariantSet } from '../utils/imageUrl.js';

const Footer = {
  render() {
    const { footer } = storeConfig.texts;
    const navLinks = storeConfig.texts.nav;
    const legalLinks = storeConfig.texts.legal?.footerLinks || [];
    const logoSrc = pickVariantSet(storeConfig.logoVariants, 'thumb') || storeConfig.logo;
    const enamad = footer.enamad;

    return `
      <footer class="border-t border-border bg-body mt-20">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6 py-12">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            <div class="text-right flex flex-col items-start">
              <div class="flex items-center gap-2 justify-end mb-4">
                <span class="font-display text-lg text-body">${storeConfig.name}</span>
                <img src="${escapeAttr(logoSrc)}" alt="" class="w-8 h-8 object-contain">
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
              <h3 class="text-sm font-bold text-body mb-4">قوانین و اعتماد</h3>
              <ul class="space-y-2">
                ${legalLinks.map((l) => `
                  <li><a href="${l.href}" data-link class="text-sm text-muted hover:text-body transition-colors">${l.label}</a></li>`).join('')}
              </ul>
            </div>
            <div class="text-right">
              <h3 class="text-sm font-bold text-body mb-4">تماس با ما</h3>
              <p class="text-sm text-muted mb-2">${footer.support}</p>
              ${storeConfig.texts.legal?.contact?.phone?.value
                ? `<p class="text-sm text-body mb-1" dir="ltr">${storeConfig.texts.legal.contact.phone.value}</p>`
                : ''}
              ${storeConfig.texts.legal?.contact?.email?.value
                ? `<p class="text-sm text-body mb-2" dir="ltr">${storeConfig.texts.legal.contact.email.value}</p>`
                : ''}
              <p class="text-sm text-body" dir="ltr">${footer.social}</p>
            </div>
          </div>
          <div class="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted/60">
            <p>${footer.copyright}</p>
            ${enamad?.href && enamad?.logoUrl ? `
              <a
                href="${escapeAttr(enamad.href)}"
                target="_blank"
                rel="noopener noreferrer"
                referrerpolicy="origin"
                class="inline-block shrink-0"
              >
                <img
                  src="${escapeAttr(enamad.logoUrl)}"
                  alt="نماد اعتماد الکترونیکی"
                  referrerpolicy="origin"
                  ${enamad.code ? `code="${escapeAttr(enamad.code)}"` : ''}
                  class="cursor-pointer h-16 w-auto object-contain"
                >
              </a>` : ''}
          </div>
        </div>
      </footer>`;
  },

  bind() { /* no events */ },
};

export default Footer;
