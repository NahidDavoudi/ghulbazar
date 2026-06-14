/**
 * pages/contact.js
 */
import { storeConfig } from '../config/bootstrap.js';
import api from '../core/api.js';
import Router from '../core/router.js';
import PageHeader from '../components/PageHeader.js';

function renderContactInfoCard({ icon, label, value, note }) {
  return `
    <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 ${storeConfig.ui.cardHover}">
      <div class="flex items-center gap-3 flex-row-reverse justify-end mb-3">
        <h3 class="font-bold text-body">${label}</h3>
        <div class="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
          <i data-lucide="${icon}" class="w-4 h-4 text-muted"></i>
        </div>
      </div>
      <p class="text-sm md:text-base text-body text-right mb-1">${value}</p>
      <p class="text-xs text-muted text-right">${note}</p>
    </div>`;
}

function renderContactForm(form) {
  const subjectOptions = form.subjects.map((s) => `<option value="${s}">${s}</option>`).join('');
  return `
    <form id="contact-form" class="space-y-4" novalidate>
      <div>
        <label class="block text-sm text-accent text-right mb-1">${form.nameLabel} *</label>
        <input type="text" id="contact-name" required
               class="w-full bg-body border border-border rounded-xl px-4 py-3 text-body text-right placeholder:text-muted/50 focus:outline-none focus:border-accent"
               placeholder="${form.namePlaceholder}">
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-accent text-right mb-1">${form.emailLabel}</label>
          <input type="email" id="contact-email" dir="ltr"
                 class="w-full bg-body border border-border rounded-xl px-4 py-3 text-body text-left placeholder:text-muted/50 focus:outline-none focus:border-accent"
                 placeholder="${form.emailPlaceholder}">
        </div>
        <div>
          <label class="block text-sm text-accent text-right mb-1">${form.phoneLabel} *</label>
          <input type="tel" id="contact-phone" required dir="ltr"
                 class="w-full bg-body border border-border rounded-xl px-4 py-3 text-body text-left placeholder:text-muted/50 focus:outline-none focus:border-accent"
                 placeholder="${form.phonePlaceholder}">
        </div>
      </div>
      <div>
        <label class="block text-sm text-accent text-right mb-1">${form.subjectLabel}</label>
        <select id="contact-subject"
                class="w-full bg-body border border-border rounded-xl px-4 py-3 text-body text-right focus:outline-none focus:border-accent">
          <option value="">${form.subjectPlaceholder}</option>
          ${subjectOptions}
        </select>
      </div>
      <div>
        <label class="block text-sm text-accent text-right mb-1">${form.messageLabel} *</label>
        <textarea id="contact-message" required rows="5"
                  class="w-full bg-body border border-border rounded-xl px-4 py-3 text-body text-right placeholder:text-muted/50 focus:outline-none focus:border-accent resize-none"
                  placeholder="${form.messagePlaceholder}"></textarea>
      </div>
      <button type="submit" class="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-colors">
        ${form.submit}
      </button>
    </form>`;
}

function renderContactPage() {
  const { contact } = storeConfig.texts.legal;
  const { form } = contact;

  return `
    ${PageHeader.render({ title: contact.title, subtitle: contact.subtitle, icon: contact.icon })}
    <div class="max-w-[1280px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div class="lg:col-span-2 space-y-4">
          ${renderContactInfoCard({ icon: 'phone', ...contact.phone })}
          ${renderContactInfoCard({ icon: 'mail', ...contact.email })}
          ${renderContactInfoCard({ icon: 'map-pin', ...contact.address })}
          ${renderContactInfoCard({ icon: 'clock', ...contact.hours })}
        </div>
        <div class="lg:col-span-3">
          <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} p-6 md:p-8">
            <h2 class="text-lg font-bold text-body mb-6 text-right">فرم تماس</h2>
            ${renderContactForm(form)}
          </div>
        </div>
      </div>
      <div class="mt-10">
        <div class="${storeConfig.ui.cardBase} ${storeConfig.ui.cardRadius} overflow-hidden">
          <div class="h-64 md:h-80 bg-surface flex flex-col items-center justify-center text-muted border-b border-border">
            <i data-lucide="map" class="w-12 h-12 mb-3 opacity-40"></i>
            <p class="text-sm">${contact.mapPlaceholder}</p>
            <p class="text-xs mt-1 opacity-60">${contact.address.value}</p>
          </div>
        </div>
      </div>
    </div>`;
}

function bindContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('contact-name')?.value.trim();
    const phone = document.getElementById('contact-phone')?.value.trim();
    const message = document.getElementById('contact-message')?.value.trim();

    if (!name || !phone || !message) {
      api.utils.toast('لطفاً فیلدهای الزامی را تکمیل کنید.', 'error');
      return;
    }

    form.reset();
    api.utils.toast(storeConfig.texts.legal.contact.form.success, 'success', 4000);
  });
}

Router.onEnter('contact', function () {
  const root = document.getElementById('contact-root');
  if (!root) return;
  root.innerHTML = renderContactPage();
  bindContactForm();
  if (window.lucide) lucide.createIcons();
});
