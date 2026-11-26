import type { ComponentType } from 'react';
import { vi } from 'vitest';

/**
 * A Volto-like config object for tests that run `applyConfig` or install
 * parts of it without touching the global registry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeConfig(settings: Record<string, unknown> = {}): any {
  const components: Record<string, { component: ComponentType<never> }> = {};
  return {
    settings: {
      slate: { leafs: {} },
      appExtras: [],
      asyncPropsExtenders: [],
      ...settings,
    },
    blocks: {
      blocksConfig: {
        title: { view: () => null },
        description: { view: () => null },
      },
    },
    views: { contentTypesViews: {} },
    addonReducers: {},
    registerComponent: vi.fn(
      ({
        name,
        component,
      }: {
        name: string;
        component: ComponentType<never>;
      }) => {
        components[name] = { component };
      },
    ),
    getComponent: vi.fn((name: string) => components[name] ?? {}),
  };
}

/** A redux state for the components that read the glossary terms. */
export function makeState(
  overrides: {
    pathname?: string;
    navroot?: string;
    contentNavroot?: string;
    locale?: string;
    items?: { term: string; definition: string[] }[];
    loaded?: boolean;
  } = {},
) {
  const {
    pathname = '/de/page',
    navroot = '/de',
    contentNavroot = '/de',
    locale = 'de',
    items = [{ term: 'Klima', definition: ['<p>Wetter über Jahre</p>'] }],
    loaded = true,
  } = overrides;
  return {
    router: { location: { pathname } },
    intl: { locale, messages: {} },
    content: {
      data: {
        '@components': {
          navroot: {
            navroot: { '@id': `http://localhost:8080/Plone${contentNavroot}` },
          },
        },
      },
    },
    glossaryTooltipTerms: {
      navroot,
      items: loaded ? items : [],
      loading: !loaded,
      loaded,
      error: null,
    },
  };
}
