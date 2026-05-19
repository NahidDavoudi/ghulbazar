// /assets/js/pages/auth.js
import { api } from '../core/api.js';
import { setSession, isLoggedIn, redirectTo } from '../core/auth.js';

/**
 * راه‌اندازی صفحهٔ ورود/ثبت‌نام
 */
export function initAuthPage() {
  // اگر کاربر لاگین هست، بفرستش به صفحهٔ اصلی
  if (isLoggedIn()) {
    redirectTo('index.html');
    return;
  }

  // تنظیم تب بر اساس hash
  if (location.hash === '#register') {
    switchTab('register');
  }

  bindEvents();
}

function switchTab(tab) {
  const isLogin = tab === 'login';

  // استایل تب‌ها
  document.getElementById('tab-login').className = (isLogin ? 'tab-active' : 'tab-inactive') + ' flex-1 py-4 text-sm font-bold tracking-wide transition-colors';
  document.getElementById('tab-register').className = (!isLogin ? 'tab-active' : 'tab-inactive') + ' flex-1 py-4 text-sm font-bold tracking-wide transition-colors';

  // نمایش/مخفی‌سازی فرم‌ها
  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);
}

function togglePass(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'نمایش' : 'پنهان';
}

async function doLogin() {
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  const phone = document.getElementById('login-phone').value.trim();
  const password = document.getElementById('login-password').value;

  if (!phone || !password) {
    showError('login-error', 'شماره همراه و رمز عبور را وارد کنید');
    return;
  }

  setButtonLoading('login-btn', 'login-btn-text', 'در حال ورود...', true);

  try {
    const data = await api('auth&action=login', {
      method: 'POST',
      body: { phone, password }
    });

    setSession(data.token, data.user);

    const redirect = new URLSearchParams(location.search).get('redirect') || 'index.html';
    redirectTo(redirect);
  } catch (e) {
    showError('login-error', e.message);
    setButtonLoading('login-btn', 'login-btn-text', 'ورود به حساب', false);
  }
}

async function doRegister() {
  const errEl = document.getElementById('register-error');
  errEl.classList.add('hidden');

  const fname = document.getElementById('reg-fname').value.trim();
  const lname = document.getElementById('reg-lname').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;

  if (!fname) { showError('register-error', 'نام را وارد کنید'); return; }
  if (!phone) { showError('register-error', 'شماره همراه را وارد کنید'); return; }
  if (password.length < 8) { showError('register-error', 'رمز عبور حداقل ۸ کاراکتر باشد'); return; }
  if (password !== confirm) { showError('register-error', 'رمز عبور و تکرار آن یکسان نیستند'); return; }
  if (!document.getElementById('terms').checked) { showError('register-error', 'قوانین را تأیید کنید'); return; }

  const name = `${fname} ${lname}`.trim();

  setButtonLoading('register-btn', 'register-btn-text', 'در حال ثبت...', true);

  try {
    const data = await api('auth&action=register', {
      method: 'POST',
      body: { name, phone, password }
    });

    setSession(data.token, data.user);
    redirectTo('index.html');
  } catch (e) {
    showError('register-error', e.message);
    setButtonLoading('register-btn', 'register-btn-text', 'ساخت حساب', false);
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setButtonLoading(btnId, textId, text, disabled) {
  const btn = document.getElementById(btnId);
  const textEl = document.getElementById(textId);
  if (textEl) textEl.textContent = text;
  if (btn) btn.disabled = disabled;
}

function bindEvents() {
  // ورود با Enter
  ['login-phone', 'login-password'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  });

  // ثبت‌نام با Enter
  ['reg-fname', 'reg-lname', 'reg-phone', 'reg-password', 'reg-confirm'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doRegister();
    });
  });

  // دکمه‌های اصلی
  document.getElementById('login-btn')?.addEventListener('click', doLogin);
  document.getElementById('register-btn')?.addEventListener('click', doRegister);

  // دکمه‌های نمایش رمز (اگر تو HTML اینجوری داری که onclick توش togglePass رو صدا می‌زنه، 
  // می‌تونی اینجا هم با addEventListener جایگزین کنی، ولی فعلاً فرض می‌کنیم inline داری)
  // اگر نداری، می‌تونی مثل زیر بنویسی:
  // document.getElementById('toggle-login-pass')?.addEventListener('click', () => togglePass('login-password', this));
  // اما چون this توی arrow function درست نیست، باید المان رو بگیری و متنش رو آپدیت کنی.
  // پیشنهاد می‌کنم فعلاً همون onclick در HTML نگه دار، و ماژول togglePass رو از فایل قبلی پاک کن.
  // اما برای تمیزی کامل می‌تونیم اینطوری bind کنیم:
  // (کد جایگزین inline در بخش نکات توضیح داده میشه)
}

// نکته: togglePass می‌تونه از طریق event listener مستقیماً صدا بشه.