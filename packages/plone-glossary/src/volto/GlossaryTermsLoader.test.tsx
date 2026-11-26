import { cleanup, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import config from '@plone/volto/registry';
import { ActivationContext, createActivationRegistry } from '../react';
import { getTooltipTerms } from './actions';
import GlossaryTermsLoader from './GlossaryTermsLoader';
import { makeState } from './test-utils';

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
