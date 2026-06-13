import appConfig from './app.config.js';
import storeConfig from './store.config.js';

export { storeConfig };

export function initConfig() {
  window.AppConfig = {
    ...appConfig,
    app: { ...appConfig.app, name: storeConfig.name },
    api: { ...appConfig.api, ...storeConfig.api },
  };
  window.StoreConfig = storeConfig;
}
