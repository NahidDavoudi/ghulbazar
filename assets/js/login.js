/**
 * login.js — صفحه ورود (ES module entry)
 */
import { initConfig, storeConfig } from './config/bootstrap.js';
import { initTheme, pageTitle } from './core/theme.js';
import loadStoreSettings from './core/storeSettings.js';
import api from './core/api.js';

initConfig();

window.API = api;
window.Api = api;

function applyLoginBranding() {
  document.querySelectorAll('[data-store-logo]').forEach((el) => {
    if (storeConfig.logo) {
      el.src = storeConfig.logo;
      el.alt = storeConfig.name;
    }
  });
  document.querySelectorAll('[data-store-name]').forEach((el) => {
    el.textContent = storeConfig.name;
  });
  const copyrightEl = document.getElementById('login-copyright');
  if (copyrightEl) {
    copyrightEl.textContent = storeConfig.texts?.footer?.copyright || `© ${storeConfig.name}`;
  }
}

async function boot() {
  await loadStoreSettings(api);
  initTheme();
  pageTitle('ورود و ثبت‌نام');
  applyLoginBranding();

  if (api.auth.isLoggedIn()) {
    const redirect = new URLSearchParams(location.search).get('redirect') || 'index.html#/';
    location.replace(redirect);
    return;
  }

  bindEvents();
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  const base = ' flex-1 py-4 text-sm font-bold tracking-wide transition-colors';
  document.getElementById('tab-login').className = (isLogin ? 'tab-active' : 'tab-inactive') + base;
  document.getElementById('tab-register').className = (!isLogin ? 'tab-active' : 'tab-inactive') + base;
  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);
}

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'نمایش' : 'پنهان';
}

function showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(elId) {
  document.getElementById(elId)?.classList.add('hidden');
}

function setLoading(btnId, textId, label, loading) {
  const btn = document.getElementById(btnId);
  const span = document.getElementById(textId);
  if (btn) btn.disabled = loading;
  if (span) span.textContent = label;
}

async function doLogin() {
  hideError('login-error');
  const phone = document.getElementById('login-phone')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  if (!phone || !password) {
    showError('login-error', 'شماره همراه و رمز عبور را وارد کنید');
    return;
  }
  setLoading('login-btn', 'login-btn-text', 'در حال ورود...', true);
  try {
    const data = await api.auth.login(phone, password);
    const redirect = new URLSearchParams(location.search).get('redirect');
    if (redirect) location.href = redirect;
    else if (data.user?.role === 'admin') location.href = 'admin.html';
    else location.href = 'index.html#/';
  } catch (e) {
    showError('login-error', e.message);
    setLoading('login-btn', 'login-btn-text', 'ورود به حساب', false);
  }
}

async function doRegister() {
  hideError('register-error');
  const fname = document.getElementById('reg-fname')?.value.trim();
  const lname = document.getElementById('reg-lname')?.value.trim();
  const phone = document.getElementById('reg-phone')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const confirm = document.getElementById('reg-confirm')?.value;
  const terms = document.getElementById('terms')?.checked;

  if (!fname) { showError('register-error', 'نام را وارد کنید'); return; }
  if (!phone) { showError('register-error', 'شماره همراه را وارد کنید'); return; }
  if (password.length < 8) { showError('register-error', 'رمز عبور حداقل ۸ کاراکتر باشد'); return; }
  if (password !== confirm) { showError('register-error', 'رمز عبور و تکرار آن یکسان نیستند'); return; }
  if (!terms) { showError('register-error', 'قوانین را تأیید کنید'); return; }

  setLoading('register-btn', 'register-btn-text', 'در حال ثبت...', true);
  try {
    await api.auth.register({ name: `${fname} ${lname}`.trim(), phone, password });
    location.href = 'index.html#/';
  } catch (e) {
    showError('register-error', e.message);
    setLoading('register-btn', 'register-btn-text', 'ساخت حساب', false);
  }
}

function bindEvents() {
  document.getElementById('tab-login')?.addEventListener('click', () => switchTab('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => switchTab('register'));
  document.getElementById('goto-register')?.addEventListener('click', () => switchTab('register'));
  document.getElementById('goto-login')?.addEventListener('click', () => switchTab('login'));
  if (location.hash === '#register') switchTab('register');
  document.getElementById('toggle-login-password')?.addEventListener('click', function () { togglePass('login-password', this); });
  document.getElementById('toggle-reg-password')?.addEventListener('click', function () { togglePass('reg-password', this); });
  document.getElementById('login-btn')?.addEventListener('click', doLogin);
  document.getElementById('register-btn')?.addEventListener('click', doRegister);
  ['login-phone', 'login-password'].forEach((id) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  });
  ['reg-fname', 'reg-lname', 'reg-phone', 'reg-password', 'reg-confirm'].forEach((id) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doRegister(); });
  });
}

document.addEventListener('DOMContentLoaded', boot);
