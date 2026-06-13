/**
 * api.js — Legacy shim (prefer ESM entry: app.js / login.js / admin/admin.js)
 */
import { initConfig } from './config/bootstrap.js';
import api from './core/api.js';

initConfig();
window.Api = api;
window.API = api;

export default api;
