// ==================== INIT API CLIENT ====================
const api = new ApiClient({
    baseURL: '/nadstore/index.php?url=',
    debug: false
  });
  
  // ==================== INIT ====================
  (function() {
    if (api.accessToken) {
      window.location = 'index.html';
      return;
    }
    if (location.hash === '#register') switchTab('register');
  })();
  
  // ==================== UI FUNCTIONS ====================
  function switchTab(t) {
    const login = t === 'login';
    document.getElementById('tab-login').className    = (login  ? 'tab-active' : 'tab-inactive') + ' flex-1 py-4 text-sm font-bold tracking-wide transition-colors';
    document.getElementById('tab-register').className = (!login ? 'tab-active' : 'tab-inactive') + ' flex-1 py-4 text-sm font-bold tracking-wide transition-colors';
    document.getElementById('form-login').classList.toggle('hidden', !login);
    document.getElementById('form-register').classList.toggle('hidden', login);
  }
  
  function togglePass(id, btn) {
    const inp = document.getElementById(id);
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? 'نمایش' : 'پنهان';
  }
  
  function showErr(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  
  // ==================== ACTIONS ====================
  async function doLogin() {
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!phone || !password) {
      showErr('login-error', 'شماره همراه و رمز عبور را وارد کنید');
      return;
    }
    
    const btnText = document.getElementById('login-btn-text');
    const btn = document.getElementById('login-btn');
    btnText.textContent = 'در حال ورود...';
    btn.disabled = true;
    
    try {
      await api.auth.login(phone, password);
      window.location = 'index.html';
    } catch (e) {
      showErr('login-error', e.message || 'خطا در ورود');
      btnText.textContent = 'ورود به حساب';
      btn.disabled = false;
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
  
    if (!fname) { showErr('register-error', 'نام را وارد کنید'); return; }
    if (!phone) { showErr('register-error', 'شماره همراه را وارد کنید'); return; }
    if (password.length < 8) { showErr('register-error', 'رمز عبور حداقل ۸ کاراکتر باشد'); return; }
    if (password !== confirm) { showErr('register-error', 'رمز عبور و تکرار آن یکسان نیستند'); return; }
    if (!document.getElementById('terms').checked) { showErr('register-error', 'قوانین را تأیید کنید'); return; }
  
    const btnText = document.getElementById('register-btn-text');
    const btn = document.getElementById('register-btn');
    btnText.textContent = 'در حال ثبت...';
    btn.disabled = true;
  
    try {
      await api.auth.register({
        full_name: `${fname} ${lname}`.trim(),
        phone,
        password
      });
      window.location = 'index.html';
    } catch (e) {
      showErr('register-error', e.message || 'خطا در ثبت‌نام');
      btnText.textContent = 'ساخت حساب';
      btn.disabled = false;
    }
  }
  
  // ==================== EVENT LISTENERS ====================
  ['login-phone', 'login-password'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  });
  
  ['reg-fname', 'reg-lname', 'reg-phone', 'reg-password', 'reg-confirm'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doRegister();
    });
  });