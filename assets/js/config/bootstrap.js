import appConfig from './app.config.js';
import defaultStoreConfig from './store.config.js';

/** Runtime config — mutated after /settings fetch */
export const storeConfig = typeof structuredClone === 'function'
  ? structuredClone(defaultStoreConfig)
  : JSON.parse(JSON.stringify(defaultStoreConfig));

function syncWindowConfig() {
  if (window.AppConfig) {
    window.AppConfig.app = { ...window.AppConfig.app, name: storeConfig.name };
  }
  window.StoreConfig = storeConfig;
}

export function initConfig() {
  window.AppConfig = {
    ...appConfig,
    app: { ...appConfig.app, name: storeConfig.name },
    api: { ...appConfig.api, ...storeConfig.api },
  };
  window.StoreConfig = storeConfig;
}

/**
 * Merge remote /settings into runtime storeConfig (backend wins when value present)
 * @param {Object|null} remote — API data: shop_name, shop_logo, shop_poster, ...
 */
export function mergeStoreSettings(remote) {
  if (!remote || typeof remote !== 'object') return storeConfig;

  if (remote.shop_name) {
    storeConfig.name = remote.shop_name;
    storeConfig.hero.title = remote.shop_name;
  }

  if (remote.shop_slogan) {
    storeConfig.hero.subtitle = remote.shop_slogan;
    storeConfig.texts.footer.tagline = remote.shop_slogan;
  }

  if (remote.shop_logo) {
    storeConfig.logo = remote.shop_logo;
    storeConfig.favicon = remote.shop_logo;
  }

  if (remote.shop_poster) {
    storeConfig.feature.image = remote.shop_poster;
  }

  if (remote.bank_card) storeConfig.payment.cardNumber = remote.bank_card;
  if (remote.bank_owner) storeConfig.payment.cardOwner = remote.bank_owner;
  if (remote.payment_method) storeConfig.payment.method = remote.payment_method;
  if (remote.zarinpal_merchant_id) {
    storeConfig.payment.zarinpalMerchantId = remote.zarinpal_merchant_id;
  }

  if (remote.shipping_free_from != null) {
    storeConfig.shipping.freeFrom = Number(remote.shipping_free_from);
  }
  if (remote.shipping_standard_cost != null) {
    storeConfig.shipping.standardCost = Number(remote.shipping_standard_cost);
  }

  syncWindowConfig();
  return storeConfig;
}
