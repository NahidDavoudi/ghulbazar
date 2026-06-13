/**
 * core/theme.js — inject store theme into CSS variables & document meta
 */
import { storeConfig } from '../config/bootstrap.js';

const VAR_MAP = {
  primary: '--color-accent',
  primaryHover: '--color-accent-hover',
  background: '--color-dark',
  surface: '--color-dark-2',
  card: '--color-dark-3',
  border: '--color-border',
  muted: '--color-muted',
  textDim: '--color-text-dim',
};

export function initTheme() {
  const root = document.documentElement;
  const { theme, fonts } = storeConfig;

  Object.entries(VAR_MAP).forEach(([key, cssVar]) => {
    if (theme[key]) root.style.setProperty(cssVar, theme[key]);
  });

  if (fonts?.body) root.style.setProperty('--font-vazir', `'${fonts.body}', sans-serif`);
  if (fonts?.display) root.style.setProperty('--font-display', `'${fonts.display}', sans-serif`);
  if (fonts?.felipa) root.style.setProperty('--font-felipa', `'${fonts.felipa}', sans-serif`);

  if (storeConfig.favicon) {
    let link = document.querySelector('link[rel="shortcut icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    link.href = storeConfig.favicon;
  }

  document.title = storeConfig.name;
}

export function pageTitle(suffix) {
  document.title = suffix ? `${suffix} | ${storeConfig.name}` : storeConfig.name;
}

export default { initTheme, pageTitle };
