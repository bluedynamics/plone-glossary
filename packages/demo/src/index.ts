import type { ConfigType } from '@plone/registry';
import DemoCard from './DemoCard';

declare global {
  interface Window {
    __PLONE_GLOSSARY_SETTINGS__?: unknown;
  }
}

function applyConfig(config: ConfigType) {
  config.blocks.blocksConfig.demoCard = {
    id: 'demoCard',
    title: 'Demo card',
    icon: config.blocks.blocksConfig.title.icon,
    group: 'common',
    view: DemoCard,
    // The simplest edit component: show the view.
    edit: DemoCard,
    restricted: false,
    mostUsed: false,
    sidebarTab: 0,
  } as never;

  // Test hook: the object the package reads at render time.
  if (typeof window !== 'undefined') {
    window.__PLONE_GLOSSARY_SETTINGS__ = config.settings.glossary;
  }
  return config;
}

export default applyConfig;
