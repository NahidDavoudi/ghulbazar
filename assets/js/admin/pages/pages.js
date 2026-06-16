/**
 * admin/pages/pages.js — مدیریت محتوای صفحات استاتیک
 */
import { storeConfig, mergeStoreSettings } from '../../config/bootstrap.js';
import { deepMerge } from '../../utils/deepMerge.js';

;(function () {
  'use strict';

  const TABS = ['about', 'contact', 'terms', 'privacy', 'refund', 'faq'];
  const PREVIEW_HASH = {
    about: '#/about',
    contact: '#/contact',
    terms: '#/terms',
    privacy: '#/privacy',
    refund: '#/refund',
    faq: '#/faq',
  };

  const INPUT = 'w-full bg-card border border-border rounded-xl px-4 py-3 text-body focus:border-accent outline-none';
  const TEXTAREA = `${INPUT} resize-y`;
  const LABEL = 'block text-muted mb-2 text-sm';

  let _legal = null;
  let _activeTab = 'about';
  let _bound = false;

  function _t(path, fallback) {
    return window.getAdminText?.(`pages.${path}`, fallback) ?? fallback;
  }

  function _val(id) {
    return $(id)?.value?.trim() ?? '';
  }

  function _lines(id) {
    return _val(id).split('\n').map((l) => l.trim()).filter(Boolean);
  }

  function _field(label, html) {
    return `<div><label class="${LABEL}">${label}</label>${html}</div>`;
  }

  function _input(id, value = '') {
    return `<input type="text" id="${id}" value="${_esc(value)}" class="${INPUT}">`;
  }

  function _textarea(id, value = '', rows = 3) {
    return `<textarea id="${id}" rows="${rows}" class="${TEXTAREA}">${_esc(value)}</textarea>`;
  }

  function _esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _joinLines(arr) {
    return Array.isArray(arr) ? arr.join('\n') : '';
  }

  function _getDefaultLegal() {
    const legal = storeConfig.texts?.legal || {};
    return JSON.parse(JSON.stringify({
      lastUpdated: legal.lastUpdated || '',
      about: legal.about || {},
      contact: legal.contact || {},
      terms: legal.terms || {},
      privacy: legal.privacy || {},
      refund: legal.refund || {},
      faq: legal.faq || {},
    }));
  }

  function _mergeLegal(remote) {
    const base = _getDefaultLegal();
    if (remote && typeof remote === 'object') {
      deepMerge(base, remote);
    }
    return base;
  }

  function _switchTab(tab) {
    if (!TABS.includes(tab)) return;
    _activeTab = tab;

    document.querySelectorAll('[data-pages-tab]').forEach((btn) => {
      const active = btn.dataset.pagesTab === tab;
      btn.classList.toggle('bg-accent', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('text-muted', !active);
      btn.classList.toggle('hover:bg-surface', !active);
    });

    document.querySelectorAll('[data-pages-panel]').forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.pagesPanel !== tab);
    });

    _renderActivePanel();
    if (window.lucide) lucide.createIcons();
  }

  function _renderPageHeaderFields(prefix, page) {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        ${_field(_t('fields.title', 'عنوان'), _input(`${prefix}Title`, page.title))}
        ${_field(_t('fields.subtitle', 'زیرعنوان'), _input(`${prefix}Subtitle`, page.subtitle))}
      </div>
      ${_field(_t('fields.meta', 'سئو'), _textarea(`${prefix}Meta`, page.meta, 2))}`;
  }

  function _renderContactField(prefix, key, data = {}) {
    const id = `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    return `
      <div class="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <p class="font-medium text-body text-sm">${_t(`fields.${key === 'phone' ? 'value' : key}`, key)}</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${_field(_t('fields.label', 'برچسب'), _input(`${id}Label`, data.label))}
          ${_field(_t('fields.value', 'مقدار'), _input(`${id}Value`, data.value))}
          ${_field(_t('fields.note', 'توضیح'), _input(`${id}Note`, data.note))}
        </div>
      </div>`;
  }

  function _renderSectionCard(index, section = {}) {
    return `
      <div class="bg-surface border border-border rounded-2xl p-5 space-y-4" data-section-index="${index}">
        <div class="flex items-center justify-between gap-3">
          <p class="font-medium text-body text-sm">${_t('fields.sectionTitle', 'بخش')} ${index + 1}</p>
          <button type="button" data-remove-section="${index}"
            class="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm transition-all">${_t('remove', 'حذف')}</button>
        </div>
        ${_field(_t('fields.sectionTitle', 'عنوان بخش'), _input(`sectionTitle_${index}`, section.title))}
        ${_field(_t('fields.paragraphs', 'پاراگراف‌ها'), _textarea(`sectionContent_${index}`, _joinLines(section.content), 4))}
        ${_field(_t('fields.bullets', 'لیست'), _textarea(`sectionItems_${index}`, _joinLines(section.items), 4))}
      </div>`;
  }

  function _renderSectionsEditor(prefix, sections = []) {
    const cards = sections.map((s, i) => _renderSectionCard(i, s)).join('');
    return `
      <div id="${prefix}SectionsList" class="space-y-4">${cards}</div>
      <button type="button" id="${prefix}AddSection"
        class="mt-4 px-4 py-2 rounded-xl border border-border text-sm text-body hover:bg-surface transition-all">
        + ${_t('addSection', 'افزودن بخش')}
      </button>`;
  }

  function _renderWhyCard(index, item = {}) {
    return `
      <div class="bg-surface border border-border rounded-2xl p-5 space-y-4" data-why-index="${index}">
        <div class="flex items-center justify-between gap-3">
          <p class="font-medium text-body text-sm">${index + 1}</p>
          <button type="button" data-remove-why="${index}"
            class="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm transition-all">${_t('remove', 'حذف')}</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${_field(_t('fields.icon', 'آیکون'), _input(`whyIcon_${index}`, item.icon))}
          ${_field(_t('fields.title', 'عنوان'), _input(`whyTitle_${index}`, item.title))}
          ${_field(_t('fields.desc', 'توضیح'), _textarea(`whyDesc_${index}`, item.desc, 2))}
        </div>
      </div>`;
  }

  function _renderStatCard(index, item = {}) {
    return `
      <div class="bg-surface border border-border rounded-2xl p-5" data-stat-index="${index}">
        <div class="flex items-center justify-between gap-3 mb-4">
          <p class="font-medium text-body text-sm">${index + 1}</p>
          <button type="button" data-remove-stat="${index}"
            class="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm transition-all">${_t('remove', 'حذف')}</button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          ${_field(_t('fields.value', 'مقدار'), _input(`statValue_${index}`, item.value))}
          ${_field(_t('fields.label', 'برچسب'), _input(`statLabel_${index}`, item.label))}
        </div>
      </div>`;
  }

  function _renderTeamCard(index, item = {}) {
    return `
      <div class="bg-surface border border-border rounded-2xl p-5" data-team-index="${index}">
        <div class="flex items-center justify-between gap-3 mb-4">
          <p class="font-medium text-body text-sm">${index + 1}</p>
          <button type="button" data-remove-team="${index}"
            class="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm transition-all">${_t('remove', 'حذف')}</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-+2 gap-4">
          ${_field(_t('fields.name', 'نام'), _input(`teamName_${index}`, item.name))}
          ${_field(_t('fields.role', 'نقش'), _input(`teamRole_${index}`, item.role))}
        </div>
      </div>`;
  }

  function _renderFaqCard(index, item = {}) {
    return `
      <div class="bg-surface border border-border rounded-2xl p-5 space-y-4" data-faq-index="${index}">
        <div class="flex items-center justify-between gap-3">
          <p class="font-medium text-body text-sm">${_t('fields.question', 'سوال')} ${index + 1}</p>
          <button type="button" data-remove-faq="${index}"
            class="text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg text-sm transition-all">${_t('remove', 'حذف')}</button>
        </div>
        ${_field(_t('fields.question', 'سوال'), _input(`faqQuestion_${index}`, item.question))}
        ${_field(_t('fields.answer', 'پاسخ'), _textarea(`faqAnswer_${index}`, item.answer, 3))}
      </div>`;
  }

  function _renderAboutPanel(about) {
    const st = about.sectionTitles || {};
    const why = about.whyChooseUs || [];
    const stats = about.stats || [];
    const team = about.team || [];

    return `
      ${_renderPageHeaderFields('about', about)}
      ${_field(_t('fields.intro', 'معرفی'), _textarea('aboutIntro', about.intro, 5))}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        ${_field(_t('fields.mission', 'مأموریت'), _textarea('aboutMission', about.mission, 3))}
        ${_field(_t('fields.vision', 'چشم‌انداز'), _textarea('aboutVision', about.vision, 3))}
      </div>
      <div class="border-t border-border pt-6 space-y-4">
        <p class="font-bold text-body">${_t('sectionTitles.intro', 'عناوین بخش‌ها')}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${_field(_t('sectionTitles.intro', 'معرفی'), _input('stIntro', st.intro))}
          ${_field(_t('sectionTitles.mission', 'مأموریت'), _input('stMission', st.mission))}
          ${_field(_t('sectionTitles.vision', 'چشم‌انداز'), _input('stVision', st.vision))}
          ${_field(_t('sectionTitles.whyChooseUs', 'مزایا'), _input('stWhy', st.whyChooseUs))}
          ${_field(_t('sectionTitles.stats', 'آمار'), _input('stStats', st.stats))}
          ${_field(_t('sectionTitles.team', 'تیم'), _input('stTeam', st.team))}
        </div>
      </div>
      <div class="border-t border-border pt-6 space-y-4">
        <p class="font-bold text-body">${_t('tabs.about', 'مزایا')}</p>
        <div id="whyList" class="space-y-4">${why.map((w, i) => _renderWhyCard(i, w)).join('')}</div>
        <button type="button" id="addWhy" class="px-4 py-2 rounded-xl border border-border text-sm hover:bg-surface">+ ${_t('addWhy', 'افزودن')}</button>
      </div>
      <div class="border-t border-border pt-6 space-y-4">
        <p class="font-bold text-body">${_t('addStat', 'آمار')}</p>
        <div id="statsList" class="grid grid-cols-1 md:grid-cols-2 gap-4">${stats.map((s, i) => _renderStatCard(i, s)).join('')}</div>
        <button type="button" id="addStat" class="px-4 py-2 rounded-xl border border-border text-sm hover:bg-surface">+ ${_t('addStat', 'افزودن آمار')}</button>
      </div>
      <div class="border-t border-border pt-6 space-y-4">
        <p class="font-bold text-body">${_t('addTeam', 'تیم')}</p>
        <div id="teamList" class="grid grid-cols-1 md:grid-cols-2 gap-4">${team.map((m, i) => _renderTeamCard(i, m)).join('')}</div>
        <button type="button" id="addTeam" class="px-4 py-2 rounded-xl border border-border text-sm hover:bg-surface">+ ${_t('addTeam', 'افزودن عضو')}</button>
      </div>`;
  }

  function _renderContactPanel(contact) {
    return `
      ${_renderPageHeaderFields('contact', contact)}
      ${_renderContactField('contact', 'phone', contact.phone)}
      ${_renderContactField('contact', 'email', contact.email)}
      ${_renderContactField('contact', 'address', contact.address)}
      ${_renderContactField('contact', 'hours', contact.hours)}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        ${_field(_t('fields.formSectionTitle', 'عنوان بخش فرم'), _input('contactFormSectionTitle', contact.formSectionTitle))}
        ${_field(_t('fields.mapPlaceholder', 'متن نقشه'), _input('contactMapPlaceholder', contact.mapPlaceholder))}
      </div>
      ${_field(_t('fields.formUnavailable', 'متن جایگزین فرم'), _textarea('contactFormUnavailable', contact.formUnavailable, 3))}`;
  }

  function _renderLegalPanel(key, page) {
    return `
      ${_renderPageHeaderFields(key, page)}
      ${_renderSectionsEditor(key, page.sections || [])}`;
  }

  function _renderFaqPanel(faq) {
    const items = faq.items || [];
    return `
      ${_renderPageHeaderFields('faq', faq)}
      <div id="faqList" class="space-y-4">${items.map((item, i) => _renderFaqCard(i, item)).join('')}</div>
      <button type="button" id="addFaq" class="mt-4 px-4 py-2 rounded-xl border border-border text-sm hover:bg-surface">+ ${_t('addFaq', 'افزودن سوال')}</button>`;
  }

  function _renderActivePanel() {
    const panel = $(`pagesPanel${_activeTab.charAt(0).toUpperCase()}${_activeTab.slice(1)}`);
    if (!panel || !_legal) return;

    const data = _legal[_activeTab] || {};
    let html = '';

    if (_activeTab === 'about') html = _renderAboutPanel(data);
    else if (_activeTab === 'contact') html = _renderContactPanel(data);
    else if (_activeTab === 'faq') html = _renderFaqPanel(data);
    else html = _renderLegalPanel(_activeTab, data);

    panel.innerHTML = html;
    _bindPanelEvents();
    if (window.lucide) lucide.createIcons();
  }

  function _renderAllPanels() {
    TABS.forEach((tab) => {
      const wasActive = _activeTab === tab;
      _activeTab = tab;
      _renderActivePanel();
      if (!wasActive) {
        document.querySelector(`[data-pages-panel="${tab}"]`)?.classList.add('hidden');
      }
    });
    _activeTab = 'about';
    document.querySelector('[data-pages-panel="about"]')?.classList.remove('hidden');
  }

  function _countSections(prefix) {
    return document.querySelectorAll(`#${prefix}SectionsList [data-section-index]`).length;
  }

  function _collectSections(prefix) {
    const sections = [];
    document.querySelectorAll(`#${prefix}SectionsList [data-section-index]`).forEach((el) => {
      const i = el.dataset.sectionIndex;
      const title = _val(`sectionTitle_${i}`);
      const content = _lines(`sectionContent_${i}`);
      const items = _lines(`sectionItems_${i}`);
      if (!title) return;
      const section = { title };
      if (content.length) section.content = content;
      if (items.length) section.items = items;
      if (section.content || section.items) sections.push(section);
    });
    return sections;
  }

  function _collectWhy() {
    const items = [];
    document.querySelectorAll('#whyList [data-why-index]').forEach((el) => {
      const i = el.dataset.whyIndex;
      const title = _val(`whyTitle_${i}`);
      if (!title) return;
      items.push({
        icon: _val(`whyIcon_${i}`) || 'check',
        title,
        desc: _val(`whyDesc_${i}`),
      });
    });
    return items;
  }

  function _collectStats() {
    const items = [];
    document.querySelectorAll('#statsList [data-stat-index]').forEach((el) => {
      const i = el.dataset.statIndex;
      const value = _val(`statValue_${i}`);
      if (!value) return;
      items.push({ value, label: _val(`statLabel_${i}`) });
    });
    return items;
  }

  function _collectTeam() {
    const items = [];
    document.querySelectorAll('#teamList [data-team-index]').forEach((el) => {
      const i = el.dataset.teamIndex;
      const name = _val(`teamName_${i}`);
      if (!name) return;
      items.push({ name, role: _val(`teamRole_${i}`), avatar: '' });
    });
    return items;
  }

  function _collectFaq() {
    const items = [];
    document.querySelectorAll('#faqList [data-faq-index]').forEach((el) => {
      const i = el.dataset.faqIndex;
      const question = _val(`faqQuestion_${i}`);
      const answer = _val(`faqAnswer_${i}`);
      if (!question || !answer) return;
      items.push({ question, answer });
    });
    return items;
  }

  function _collectContactField(key) {
    const cap = key.charAt(0).toUpperCase() + key.slice(1);
    return {
      label: _val(`contact${cap}Label`),
      value: _val(`contact${cap}Value`),
      note: _val(`contact${cap}Note`),
    };
  }

  function _collectLegalContent() {
    const about = {
      title: _val('aboutTitle'),
      subtitle: _val('aboutSubtitle'),
      meta: _val('aboutMeta'),
      intro: _val('aboutIntro'),
      mission: _val('aboutMission'),
      vision: _val('aboutVision'),
      sectionTitles: {
        intro: _val('stIntro'),
        mission: _val('stMission'),
        vision: _val('stVision'),
        whyChooseUs: _val('stWhy'),
        stats: _val('stStats'),
        team: _val('stTeam'),
      },
      whyChooseUs: _collectWhy(),
      stats: _collectStats(),
      team: _collectTeam(),
    };

    const contact = {
      title: _val('contactTitle'),
      subtitle: _val('contactSubtitle'),
      meta: _val('contactMeta'),
      phone: _collectContactField('phone'),
      email: _collectContactField('email'),
      address: _collectContactField('address'),
      hours: _collectContactField('hours'),
      formSectionTitle: _val('contactFormSectionTitle'),
      formUnavailable: _val('contactFormUnavailable'),
      mapPlaceholder: _val('contactMapPlaceholder'),
    };

    const terms = {
      title: _val('termsTitle'),
      subtitle: _val('termsSubtitle'),
      meta: _val('termsMeta'),
      sections: _collectSections('terms'),
    };

    const privacy = {
      title: _val('privacyTitle'),
      subtitle: _val('privacySubtitle'),
      meta: _val('privacyMeta'),
      sections: _collectSections('privacy'),
    };

    const refund = {
      title: _val('refundTitle'),
      subtitle: _val('refundSubtitle'),
      meta: _val('refundMeta'),
      sections: _collectSections('refund'),
    };

    const faq = {
      title: _val('faqTitle'),
      subtitle: _val('faqSubtitle'),
      meta: _val('faqMeta'),
      items: _collectFaq(),
    };

    return {
      lastUpdated: _val('pagesLastUpdated'),
      about,
      contact,
      terms,
      privacy,
      refund,
      faq,
    };
  }

  function _reindexSections(listId, prefix) {
    const list = $(listId);
    if (!list) return;
    list.querySelectorAll('[data-section-index]').forEach((el, idx) => {
      el.dataset.sectionIndex = idx;
      const old = el.querySelector('[data-remove-section]')?.dataset.removeSection;
      if (old !== undefined) {
        el.querySelector('[data-remove-section]').dataset.removeSection = idx;
      }
      ['Title', 'Content', 'Items'].forEach((suffix) => {
        const field = el.querySelector(`[id^="section${suffix}_"]`);
        if (field) field.id = `section${suffix}_${idx}`;
      });
    });
  }

  function _addSection(prefix) {
    const list = $(`${prefix}SectionsList`);
    if (!list) return;
    const index = list.querySelectorAll('[data-section-index]').length;
    list.insertAdjacentHTML('beforeend', _renderSectionCard(index, {}));
    _bindPanelEvents();
  }

  function _bindPanelEvents() {
    const panel = document.querySelector(`[data-pages-panel="${_activeTab}"]`);
    if (!panel) return;

    panel.querySelectorAll('[data-remove-section]').forEach((btn) => {
      btn.onclick = () => {
        btn.closest('[data-section-index]')?.remove();
        _reindexSections(`${_activeTab}SectionsList`, _activeTab);
        _bindPanelEvents();
      };
    });

    ['terms', 'privacy', 'refund'].forEach((key) => {
      $(`${key}AddSection`)?.addEventListener('click', () => _addSection(key), { once: true });
    });

    $('addWhy')?.addEventListener('click', () => {
      const list = $('whyList');
      const i = list.querySelectorAll('[data-why-index]').length;
      list.insertAdjacentHTML('beforeend', _renderWhyCard(i, {}));
      _bindPanelEvents();
    }, { once: true });

    $('addStat')?.addEventListener('click', () => {
      const list = $('statsList');
      const i = list.querySelectorAll('[data-stat-index]').length;
      list.insertAdjacentHTML('beforeend', _renderStatCard(i, {}));
      _bindPanelEvents();
    }, { once: true });

    $('addTeam')?.addEventListener('click', () => {
      const list = $('teamList');
      const i = list.querySelectorAll('[data-team-index]').length;
      list.insertAdjacentHTML('beforeend', _renderTeamCard(i, {}));
      _bindPanelEvents();
    }, { once: true });

    $('addFaq')?.addEventListener('click', () => {
      const list = $('faqList');
      const i = list.querySelectorAll('[data-faq-index]').length;
      list.insertAdjacentHTML('beforeend', _renderFaqCard(i, {}));
      _bindPanelEvents();
    }, { once: true });

    panel.querySelectorAll('[data-remove-why]').forEach((btn) => {
      btn.onclick = () => { btn.closest('[data-why-index]')?.remove(); _bindPanelEvents(); };
    });
    panel.querySelectorAll('[data-remove-stat]').forEach((btn) => {
      btn.onclick = () => { btn.closest('[data-stat-index]')?.remove(); _bindPanelEvents(); };
    });
    panel.querySelectorAll('[data-remove-team]').forEach((btn) => {
      btn.onclick = () => { btn.closest('[data-team-index]')?.remove(); _bindPanelEvents(); };
    });
    panel.querySelectorAll('[data-remove-faq]').forEach((btn) => {
      btn.onclick = () => { btn.closest('[data-faq-index]')?.remove(); _bindPanelEvents(); };
    });
  }

  async function _savePages() {
    const btn = $('pagesSaveBtn');
    if (!btn) return;

    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = _t('saving', 'در حال ذخیره...');

    try {
      const legal_content = _collectLegalContent();
      const data = await API.settings.adminUpdate({ legal_content });
      _legal = _mergeLegal(data.legal_content);
      mergeStoreSettings(data);
      $('pagesLastUpdated') && (_val('pagesLastUpdated') || ($('pagesLastUpdated').value = _legal.lastUpdated || ''));
      toast(_t('saved', 'محتوا ذخیره شد'));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
      if (window.lucide) lucide.createIcons();
    }
  }

  function _bindEvents() {
    if (_bound) return;
    _bound = true;

    document.querySelectorAll('[data-pages-tab]').forEach((btn) => {
      btn.addEventListener('click', () => _switchTab(btn.dataset.pagesTab));
    });

    $('pagesSaveBtn')?.addEventListener('click', _savePages);

    document.querySelectorAll('[data-pages-preview]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.pagesPreview;
        const hash = PREVIEW_HASH[tab] || '#/';
        window.open(`index.html${hash}`, '_blank');
      });
    });
  }

  function _populateLastUpdated() {
    const el = $('pagesLastUpdated');
    if (el && _legal) el.value = _legal.lastUpdated || '';
  }

  window.loadPages = async function () {
    const container = $('pagesContainer');
    if (!container) return;

    _bindEvents();
    _switchTab(_activeTab);

    if (!_legal) {
      container.classList.add('opacity-50', 'pointer-events-none');
      try {
        const data = await API.settings.adminGet();
        _legal = _mergeLegal(data.legal_content);
        _populateLastUpdated();
        _renderAllPanels();
        _switchTab(_activeTab);
      } catch (e) {
        _legal = _getDefaultLegal();
        _populateLastUpdated();
        _renderAllPanels();
        _switchTab(_activeTab);
        if (e.message) toast(e.message, 'error');
      } finally {
        container.classList.remove('opacity-50', 'pointer-events-none');
      }
    } else {
      _populateLastUpdated();
      _renderActivePanel();
    }

    if (window.lucide) lucide.createIcons();
  };
})();
