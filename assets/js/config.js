/**
 * config.js — Legacy shim (use config/app.config.js + config/store.config.js)
 */
import { initConfig, storeConfig } from './config/bootstrap.js';
import appConfig from './config/app.config.js';

initConfig();
window.AppConfig = window.AppConfig || appConfig;
window.StoreConfig = storeConfig;

export { appConfig as default, storeConfig };
