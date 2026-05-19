/**
 * ╔═══════════════════════════════════════════════════════════╗
 *   Ghul Bazar — login.js
 *   مخصوص login.html (صفحه جداگانه از SPA)
 *   وابستگی: api.js باید قبل از این فایل لود شده باشه
 * ╚═══════════════════════════════════════════════════════════╝
 */

;(function () {
  'use strict';

  /* ── اگه لاگین هست، برگرد به SPA ── */
  if (API.auth.isLoggedIn()) {
    const redirect = new URLSearchParams(location.search).get('redirect') || 'app.html#/';
    location.replace(redirect);
    return;
  }

  /* ── تب‌ها ── */
  function switchTab(tab) {
    const isLogin = tab === 'login';
    const base    = ' flex-1 py-4 text-sm font-bold tracking-wide transition-colors';
    document.getElementById('tab-login').className    = (isLogin  ? 'tab-active' : 'tab-inactive') + base;
    document.getElementById('tab-register').className = (!isLogin ? 'tab-active' : 'tab-inactive') + base;
    document.getElementById('form-login').classList.toggle('hidden',    !isLogin);
    document.getElementById('form-register').classList.toggle('hidden',  isLogin);
  }

  /* ── نمایش/مخفی رمز ── */
  function togglePass(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.type       = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? 'نمایش' : 'پنهان';
  }

  /* ── نمایش خطا ── */
  function showError(elId, msg) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function hideError(elId) {
    document.getElementById(elId)?.classList.add('hidden');
  }

  /* ── حالت loading دکمه ── */
  function setLoading(btnId, textId, label, loading) {
    const btn  = document.getElementById(btnId);
    const span = document.getElementById(textId);
    if (btn)  btn.disabled = loading;
    if (span) span.textContent = label;
  }

  /* ── ورود ── */
  async function doLogin() {
    hideError('login-error');

    const phone    = document.getElementById('login-phone')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    if (!phone || !password) {
      showError('login-error', 'شماره همراه و رمز عبور را وارد کنید');
      return;
    }

    setLoading('login-btn', 'login-btn-text', 'در حال ورود...', true);

    try {
      const data = await API.auth.login(phone, password);
      // ریدایرکت بر اساس نقش کاربر
      const redirect = new URLSearchParams(location.search).get('redirect');
      if (redirect) {
        location.href = redirect;
      } else if (data.user?.role === 'admin') {
        location.href = 'admin/index.html';
      } else {
        location.href = 'app.html#/';
      }
    } catch (e) {
      showError('login-error', e.message);
      setLoading('login-btn', 'login-btn-text', 'ورود به حساب', false);
    }
  }

  /* ── ثبت‌نام ── */
  async function doRegister() {
    hideError('register-error');

    const fname    = document.getElementById('reg-fname')?.value.trim();
    const lname    = document.getElementById('reg-lname')?.value.trim();
    const phone    = document.getElementById('reg-phone')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const confirm  = document.getElementById('reg-confirm')?.value;
    const terms    = document.getElementById('terms')?.checked;

    if (!fname)              { showError('register-error', 'نام را وارد کنید'); return; }
    if (!phone)              { showError('register-error', 'شماره همراه را وارد کنید'); return; }
    if (password.length < 8) { showError('register-error', 'رمز عبور حداقل ۸ کاراکتر باشد'); return; }
    if (password !== confirm) { showError('register-error', 'رمز عبور و تکرار آن یکسان نیستند'); return; }
    if (!terms)              { showError('register-error', 'قوانین را تأیید کنید'); return; }

    setLoading('register-btn', 'register-btn-text', 'در حال ثبت...', true);

    try {
      await API.auth.register({
        name:     `${fname} ${lname}`.trim(),
        phone,
        password,
      });
      location.href = 'app.html#/';
    } catch (e) {
      showError('register-error', e.message);
      setLoading('register-btn', 'register-btn-text', 'ساخت حساب', false);
    }
  }

  /* ── bind همه event‌ها بعد از لود DOM ── */
  document.addEventListener('DOMContentLoaded', function () {

    // تب‌ها
    document.getElementById('tab-login')?.addEventListener('click',    () => switchTab('login'));
    document.getElementById('tab-register')?.addEventListener('click', () => switchTab('register'));
    document.getElementById('goto-register')?.addEventListener('click', () => switchTab('register'));
    document.getElementById('goto-login')?.addEventListener('click',   () => switchTab('login'));

    // اگه hash باشه #register
    if (location.hash === '#register') switchTab('register');

    // نمایش رمز
    document.getElementById('toggle-login-password')?.addEventListener('click', function () {
      togglePass('login-password', this);
    });
    document.getElementById('toggle-reg-password')?.addEventListener('click', function () {
      togglePass('reg-password', this);
    });

    // دکمه‌های submit
    document.getElementById('login-btn')?.addEventListener('click', doLogin);
    document.getElementById('register-btn')?.addEventListener('click', doRegister);

    // Enter در فیلدها
    ['login-phone', 'login-password'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
      });
    });
    ['reg-fname', 'reg-lname', 'reg-phone', 'reg-password', 'reg-confirm'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') doRegister();
      });
    });
  });

})();