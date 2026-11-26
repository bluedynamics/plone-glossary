import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import config from '@plone/volto/registry';
import { ActivationContext, createActivationRegistry } from '../react';
import { getTooltipTerms } from './actions';
import GlossaryTermsLoader from './GlossaryTermsLoader';
import GlossaryText from './GlossaryText';
import { glossaryTooltipTerms, type TooltipTermsState } from './reducers';
import { makeState, makeStore } from './test-utils';

const mockStore = configureStore();

const content = (navroot: string) => ({
  '@components': {
    navroot: { navroot: { '@id': `http://localhost:8080/Plone${navroot}` } },
  },
});

function setup(
  props: { content?: unknown; pathname?: string },
  state: object = { glossaryTooltipTerms: { navroot: null } },
) {
  const store = mockStore(state);
  const ui = (p: typeof props) => (
    <Provider store={store}>
      <GlossaryTermsLoader pathname="/de/page" {...p} />
    </Provider>
  );
  const view = render(ui(props));
  return { store, rerender: (p: typeof props) => view.rerender(ui(p)) };
}

afterEach(() => {
  cleanup();
  delete config.settings.glossary;
});

describe('GlossaryTermsLoader', () => {
  it('loads terms for the navigation root of the content', () => {
    const { store } = setup({ content: content('/de') });
    expect(store.getActions()).toEqual([getTooltipTerms('/de')]);
  });

  it('does not load again for the same navigation root', () => {
    const { store } = setup({ content: content('/de') }, makeState());
    expect(store.getActions()).toEqual([]);
  });

  it('loads terms again when the navigation root changes', () => {
    const { store, rerender } = setup({ content: content('/de') });
    rerender({ content: content('/en') });
    expect(store.getActions()).toEqual([
      getTooltipTerms('/de'),
      getTooltipTerms('/en'),
    ]);
  });

  it('loads from the site root when the content has no navigation root', () => {
    const { store } = setup({ content: {} });
    expect(store.getActions()).toEqual([getTooltipTerms('')]);
  });

  it.each([[null], [undefined]])(
    'does not load while there is no content (%s)',
    (noContent) => {
      const { store } = setup({ content: noContent });
      expect(store.getActions()).toEqual([]);
    },
  );

  it('does not load outside the tooltip routes', () => {
    config.settings.glossary = { tooltipRoutes: ['/documentation'] };
    const { store } = setup({ content: content('/de'), pathname: '/news' });
    expect(store.getActions()).toEqual([]);
  });

  it('does not load on a CMS UI route', () => {
    const { store } = setup({
      content: content('/de'),
      pathname: '/de/page/edit',
    });
    expect(store.getActions()).toEqual([]);
  });

  it('configures the activation registry from the settings', () => {
    config.settings.glossary = {
      matchOnlyFirstOccurrence: true,
      tooltipRootSelector: '#content',
    };
    const registry = createActivationRegistry();
    const configure = vi.spyOn(registry, 'configure');
    render(
      <ActivationContext.Provider value={registry}>
        <Provider store={mockStore(makeState())}>
          <GlossaryTermsLoader pathname="/de/page" content={content('/de')} />
        </Provider>
      </ActivationContext.Provider>,
    );
    expect(configure).toHaveBeenCalledWith({
      firstOnly: true,
      rootSelector: '#content',
    });
  });
});

describe('GlossaryTermsLoader with a real store', () => {
  interface State {
    glossaryTooltipTerms: TooltipTermsState;
    unrelated: number;
  }
  const reducer = (state: State | undefined, action: { type: string }) => ({
    glossaryTooltipTerms: glossaryTooltipTerms(
      state?.glossaryTooltipTerms,
      action,
    ),
    unrelated: (state?.unrelated ?? 0) + (action.type === 'UNRELATED' ? 1 : 0),
  });
  const flush = () => act(() => Promise.resolve());

  function page(store: ReturnType<typeof makeStore>, navroot = '/de') {
    return (
      <Provider store={store as never}>
        <GlossaryTermsLoader pathname="/de/page" content={content(navroot)} />
        <main>
          <p>
            <GlossaryText text="Das Klima" />
          </p>
        </main>
      </Provider>
    );
  }

  /** Renders again and dispatches other actions, as a page does. */
  async function liveOn(
    store: ReturnType<typeof makeStore>,
    rerender: (ui: React.ReactElement) => void,
  ) {
    for (let i = 0; i < 3; i += 1) {
      rerender(page(store));
      act(() => {
        store.dispatch({ type: 'UNRELATED' });
      });
      await flush();
    }
  }

  it('requests once and shows no error when the request fails (B12)', async () => {
    const store = makeStore(reducer, () => ({ error: new Error('500') }));
    const { container, rerender } = render(page(store));
    await flush();
    await liveOn(store, rerender);
    expect(store.requests).toHaveLength(1);
    expect(store.getState().glossaryTooltipTerms).toMatchObject({
      navroot: '/de',
      loaded: true,
    });
    expect(container.textContent).toBe('Das Klima');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('requests once while the request never answers (B12)', async () => {
    const store = makeStore(reducer);
    const { container, rerender } = render(page(store));
    await liveOn(store, rerender);
    expect(store.requests).toHaveLength(1);
    expect(store.getState().glossaryTooltipTerms).toMatchObject({
      loading: true,
    });
    expect(container.textContent).toBe('Das Klima');
  });

  it('ignores a late answer for the previous navigation root (B12)', async () => {
    const store = makeStore(reducer);
    const { rerender } = render(page(store, '/de'));
    rerender(page(store, '/en'));
    expect(store.requests.map((r) => r.navroot)).toEqual(['/de', '/en']);
    act(() => {
      store.answer(0, {
        result: { items: [{ term: 'Klima', definition: ['<p>d</p>'] }] },
      });
    });
    expect(store.getState().glossaryTooltipTerms).toMatchObject({
      navroot: '/en',
      loading: true,
      items: [],
    });
    act(() => {
      store.answer(1, { result: { items: [] } });
    });
    expect(store.getState().glossaryTooltipTerms).toMatchObject({
      navroot: '/en',
      loaded: true,
    });
  });

  it('requests once in StrictMode (C15)', () => {
    const store = makeStore(reducer);
    render(<StrictMode>{page(store)}</StrictMode>);
    expect(store.requests).toHaveLength(1);
  });

  it('requests once when two loaders are installed (C15)', () => {
    const store = makeStore(reducer);
    render(
      <Provider store={store as never}>
        <GlossaryTermsLoader pathname="/de/page" content={content('/de')} />
        <GlossaryTermsLoader pathname="/de/page" content={content('/de')} />
      </Provider>,
    );
    expect(store.requests).toHaveLength(1);
  });
});
