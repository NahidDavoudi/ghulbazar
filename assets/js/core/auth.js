/**
 * core/auth.js — JWT token & user session storage
 */

function keys() {
  const s = window.AppConfig?.storage || {};
  return {
    token: s.token || 'gb_token',
    refresh: s.refreshToken || 'gb_refresh',
    role: s.role || 'gb_role',
    user: s.user || 'gb_user',
  };
}

export const token = {
  get: () => localStorage.getItem(keys().token),
  set: (t) => localStorage.setItem(keys().token, t),
  remove: () => localStorage.removeItem(keys().token),
};

export const refreshToken = {
  get: () => localStorage.getItem(keys().refresh),
  set: (t) => localStorage.setItem(keys().refresh, t),
  remove: () => localStorage.removeItem(keys().refresh),
};

export const role = {
  get: () => localStorage.getItem(keys().role),
  set: (r) => localStorage.setItem(keys().role, r),
  remove: () => localStorage.removeItem(keys().role),
  isAdmin: () => localStorage.getItem(keys().role) === 'admin',
};

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(keys().user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(keys().user, JSON.stringify(user));
  } else {
    localStorage.removeItem(keys().user);
  }
}

export function isLoggedIn() {
  return !!token.get();
}

export function persistSession(data) {
  if (!data || typeof data !== 'object') return data;

  const access = data.token ?? data.access_token;
  const refresh = data.refresh_token;
  const user = data.user;
  const userRole = user?.role ?? data.role ?? 'user';

  if (access) token.set(access);
  if (refresh) refreshToken.set(refresh);
  role.set(userRole);
  if (user) setCurrentUser(user);

  return data;
}

export function clearSession() {
  token.remove();
  refreshToken.remove();
  role.remove();
  setCurrentUser(null);
}

export default {
  token,
  refreshToken,
  role,
  getCurrentUser,
  setCurrentUser,
  isLoggedIn,
  persistSession,
  clearSession,
};
