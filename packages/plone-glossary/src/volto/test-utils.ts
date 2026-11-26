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

interface RequestAction {
  type: string;
  request?: { op: string; path: string };
  [key: string]: unknown;
}

/**
 * A real store for a reducer, with a stand-in for Volto's API middleware: an
 * action with a `request` is recorded, `_PENDING` is dispatched at once, and
 * `respond` decides what follows. It returns a result (dispatched as
 * `_SUCCESS` in a microtask), an error (as `_FAIL`), or nothing (the request
 * never answers). `answer(index, outcome)` answers a recorded request later.
 */
export function makeStore<S>(
  reducer: (state: S | undefined, action: RequestAction) => S,
  respond: (
    action: RequestAction,
  ) => { result: unknown } | { error: unknown } | undefined = () => undefined,
) {
  let state = reducer(undefined, { type: '@@INIT' });
  const listeners = new Set<() => void>();
  const requests: RequestAction[] = [];
  const settle = (
    action: RequestAction,
    outcome: { result: unknown } | { error: unknown },
  ) => {
    const { request, type, ...rest } = action;
    store.dispatch(
      'result' in outcome
        ? { ...rest, type: `${type}_SUCCESS`, result: outcome.result }
        : { ...rest, type: `${type}_FAIL`, error: outcome.error },
    );
  };
  const store = {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(action: RequestAction) {
      if (action.request) {
        requests.push(action);
        const { request, ...rest } = action;
        store.dispatch({ ...rest, type: `${action.type}_PENDING` });
        const outcome = respond(action);
        if (outcome) {
          return Promise.resolve().then(() => settle(action, outcome));
        }
        return new Promise(() => {});
      }
      state = reducer(state, action);
      listeners.forEach((listener) => listener());
      return action;
    },
    requests,
    answer(index: number, outcome: { result: unknown } | { error: unknown }) {
      settle(requests[index], outcome);
    },
  };
  return store;
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
      items,
      loading: !loaded,
      loaded,
      error: null,
    },
  };
}
