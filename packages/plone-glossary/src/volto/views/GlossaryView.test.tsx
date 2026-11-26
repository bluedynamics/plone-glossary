import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import config from '@plone/volto/registry';
import { expectNoA11yViolations } from '../../react/test-utils';
import { getGlossaryTerms } from '../actions';
import GlossaryView from './GlossaryView';

const mockStore = configureStore();

const klima = {
  '@id': 'http://localhost:3000/en/glossary/klima',
  id: 'klima',
  title: 'Klima',
  terms: ['Climate', 'Klimata'],
  definition: '<p>Wetter <strong>über</strong> Jahre</p>',
  description: '',
};

const stateWith = (glossaryTerms: object) => ({ glossaryTerms });
const loaded = (items: object, path = '/en/glossary') =>
  stateWith({ path, items, loading: false, loaded: true, error: null });

const defaultContent: { '@id'?: string; title: string; description: string } = {
  title: 'Glossary',
  description: 'All terms',
};

function ui(
  state: object,
  store = mockStore(state),
  content = defaultContent,
  pathname = '/en/glossary',
) {
  return (
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        <MemoryRouter>
          <GlossaryView content={content} location={{ pathname }} />
        </MemoryRouter>
      </IntlProvider>
    </Provider>
  );
}

function setup(state: object) {
  const store = mockStore(state);
  return { store, ...render(ui(state, store)) };
}

// Every test starts without a hash; replaceState fires no hashchange.
beforeEach(() => window.history.replaceState(null, '', '/en/glossary'));

afterEach(() => {
  cleanup();
  delete config.settings.glossary;
});

/** Resolves once the window has seen the next hashchange. */
function nextHashChange() {
  return new Promise<void>((resolve) =>
    window.addEventListener('hashchange', () => resolve(), { once: true }),
  );
}

describe('GlossaryView', () => {
  it('renders the term list on the server (F15)', () => {
    // react-redux warns about useLayoutEffect because jsdom provides a window.
    const messages: string[] = [];
    const error = vi.spyOn(console, 'error').mockImplementation((...args) => {
      messages.push(String(args[0]));
    });
    let html: string;
    try {
      html = renderToString(ui(loaded({ K: [klima] })));
    } finally {
      error.mockRestore();
    }
    expect(messages.filter((m) => !m.includes('useLayoutEffect'))).toEqual([]);
    expect(html).toContain('Klima');
    expect(html).toContain('id="glossary-letter-K"');
  });

  it('does not load again when the terms for this path are in the store', () => {
    const { store } = setup(loaded({ K: [klima] }));
    expect(store.getActions()).toEqual([]);
  });

  it('does not load again while the terms for this path are loading', () => {
    const { store } = setup(
      stateWith({
        path: '/en/glossary',
        items: {},
        loading: true,
        loaded: false,
        error: null,
      }),
    );
    expect(store.getActions()).toEqual([]);
  });

  it('loads the terms when they are missing', () => {
    const { store } = setup(stateWith(undefined));
    expect(store.getActions()).toEqual([getGlossaryTerms('/en/glossary')]);
  });

  it('loads the terms when they belong to another path, and shows none of them', () => {
    const { store } = setup(loaded({ K: [klima] }, '/de/glossar'));
    expect(store.getActions()).toEqual([getGlossaryTerms('/en/glossary')]);
    expect(screen.queryByText('Klima')).toBeNull();
  });

  it('shows variants and the definition of each entry', () => {
    const { container } = setup(loaded({ K: [klima] }));
    expect(
      screen.getByRole('link', { name: 'Klima' }).getAttribute('href'),
    ).toBe('/en/glossary/klima');
    expect(container.querySelector('.variants')!.textContent).toContain(
      'Climate, Klimata',
    );
    const definition = container.querySelector('article.term div.definition')!;
    expect(definition.innerHTML).toBe(
      '<p>Wetter <strong>über</strong> Jahre</p>',
    );
    expect(container.querySelector('p > p')).toBeNull();
  });

  it('uses the headings h1, h2 per letter and h3 per term', () => {
    setup(loaded({ K: [klima] }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Glossary',
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('K');
    expect(screen.getByRole('heading', { level: 3 }).textContent).toContain(
      'Klima',
    );
  });

  it('labels the alphabet navigation', () => {
    setup(loaded({ K: [klima] }));
    expect(
      screen.getByRole('navigation', { name: 'Glossary index' }),
    ).toBeTruthy();
  });

  it('links only letters that have entries', () => {
    setup(loaded({ K: [klima] }));
    const nav = screen.getByRole('navigation', { name: 'Glossary index' });
    const k = screen.getByRole('link', { name: 'K' });
    expect(nav.contains(k)).toBe(true);
    expect(k.getAttribute('href')).toBe('#glossary-letter-K');
    expect(screen.queryByRole('link', { name: 'A' })).toBeNull();
    const a = nav.querySelector('span.unmatched')!;
    expect(a.textContent).toBe('A');
    expect(nav.querySelectorAll('a')).toHaveLength(1);
  });

  it('moves focus to the letter heading when a letter is activated', async () => {
    setup(loaded({ K: [klima] }));
    const heading = document.getElementById('glossary-letter-K')!;
    expect(heading.getAttribute('tabindex')).toBe('-1');
    await userEvent.click(screen.getByRole('link', { name: 'K' }));
    // jsdom follows the link and fires hashchange in two later tasks.
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('keeps the letter link native: the default action is not prevented', async () => {
    setup(loaded({ K: [klima] }));
    const notPrevented = fireEvent.click(
      screen.getByRole('link', { name: 'K' }),
    );
    expect(notPrevented).toBe(true);
    // jsdom follows the link in a task after the click, like Firefox, and the
    // focus follows the fragment navigation (R43).
    await waitFor(() =>
      expect(window.location.hash).toBe('#glossary-letter-K'),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById('glossary-letter-K'),
      ),
    );
  });

  it('focuses the letter heading when the hash changes to it', async () => {
    setup(loaded({ K: [klima], R: [{ ...klima, '@id': '/en/glossary/r' }] }));
    const changed = nextHashChange();
    window.location.hash = '#glossary-letter-R';
    await changed;
    expect(document.activeElement).toBe(
      document.getElementById('glossary-letter-R'),
    );
    // Back to an earlier letter, as with the browser's Back button.
    const back = nextHashChange();
    window.location.hash = '#glossary-letter-K';
    await back;
    expect(document.activeElement).toBe(
      document.getElementById('glossary-letter-K'),
    );
  });

  it('focuses the letter heading on a page loaded with its hash', () => {
    window.history.replaceState(null, '', '/en/glossary#glossary-letter-K');
    setup(loaded({ K: [klima] }));
    expect(document.activeElement).toBe(
      document.getElementById('glossary-letter-K'),
    );
  });

  it('focuses the letter heading of a hash once the terms have loaded', () => {
    window.history.replaceState(null, '', '/en/glossary#glossary-letter-K');
    const store = mockStore(stateWith(undefined));
    const view = render(ui(stateWith(undefined), store));
    expect(document.getElementById('glossary-letter-K')).toBeNull();
    const state = loaded({ K: [klima] });
    view.rerender(ui(state, mockStore(state)));
    expect(document.activeElement).toBe(
      document.getElementById('glossary-letter-K'),
    );
  });

  it('leaves the focus where the reader already is when the view mounts with a hash', async () => {
    const search = document.createElement('input');
    search.setAttribute('aria-label', 'Search');
    document.body.append(search);
    onTestFinished(() => search.remove());
    act(() => search.focus());
    window.history.replaceState(null, '', '/en/glossary#glossary-letter-K');
    setup(loaded({ K: [klima], R: [{ ...klima, '@id': '/en/glossary/r' }] }));
    expect(document.activeElement).toBe(search);
    // The reader's own navigation still moves the focus.
    const changed = nextHashChange();
    window.location.hash = '#glossary-letter-R';
    await changed;
    expect(document.activeElement).toBe(
      document.getElementById('glossary-letter-R'),
    );
  });

  it('leaves the focus alone for a modified click on the current letter', async () => {
    window.history.replaceState(null, '', '/en/glossary#glossary-letter-K');
    setup(loaded({ K: [klima] }));
    const heading = document.getElementById('glossary-letter-K')!;
    const link = screen.getByRole('link', { name: 'K' });
    act(() => link.focus());
    // New tab, new window or download: this page stays as it is.
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
      fireEvent.click(link, { [modifier]: true });
    }
    fireEvent.click(link, { button: 1 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.activeElement).toBe(link);
    // Control: a plain click on the same letter moves it.
    fireEvent.click(link);
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('focuses the heading again when the same letter is clicked twice', async () => {
    setup(loaded({ K: [klima] }));
    const heading = document.getElementById('glossary-letter-K')!;
    const link = screen.getByRole('link', { name: 'K' });
    const changed = nextHashChange();
    fireEvent.click(link);
    await changed;
    expect(document.activeElement).toBe(heading);

    act(() => link.focus());
    const hashChange = vi.fn();
    window.addEventListener('hashchange', hashChange);
    onTestFinished(() => window.removeEventListener('hashchange', hashChange));
    expect(fireEvent.click(link)).toBe(true);
    // Like Firefox, the browser clears the focus while it follows the link,
    // after the click handlers ran.
    act(() => (document.activeElement as HTMLElement).blur());
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(window.location.hash).toBe('#glossary-letter-K');
    expect(hashChange).not.toHaveBeenCalled();
  });

  it('ignores a hash that names no letter', async () => {
    setup(
      loaded({
        K: [
          {
            ...klima,
            definition: '<p><a id="source" href="/quelle">Quelle</a></p>',
          },
        ],
      }),
    );
    const link = screen.getByRole('link', { name: 'K' });
    act(() => link.focus());
    // Elements of the view that are not letter headings (one of them
    // focusable), a letter without entries, and a hash that does not decode.
    for (const hash of [
      '#content',
      '#source',
      '#glossary-letter-Q',
      '#%E0%A4%A',
    ]) {
      const changed = nextHashChange();
      window.location.hash = hash;
      await changed;
      expect(document.activeElement).toBe(link);
    }
  });

  it('copes with a letter link whose target is missing', () => {
    setup(loaded({ K: [klima] }));
    document.getElementById('glossary-letter-K')!.removeAttribute('id');
    expect(fireEvent.click(screen.getByRole('link', { name: 'K' }))).toBe(true);
  });

  it('renders the sections in the order of the navigation', () => {
    const { container } = setup(
      loaded({
        K: [klima],
        '1': [{ ...klima, '@id': '/en/glossary/eins' }],
        A: [{ ...klima, '@id': '/en/glossary/a' }],
      }),
    );
    const ids = [...container.querySelectorAll('section h2')].map((h) => h.id);
    expect(ids).toEqual([
      'glossary-letter-A',
      'glossary-letter-K',
      'glossary-letter-1',
    ]);
    const nav = [...container.querySelectorAll('nav a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(nav).toEqual(ids.map((id) => `#${id}`));
  });

  it('leaves out groups and fields that are not usable', () => {
    const { container } = setup(
      loaded({
        A: 'broken',
        K: [{ ...klima, terms: 'Climate', definition: 42 }],
      }),
    );
    expect(container.querySelector('h2#glossary-letter-A')).toBeNull();
    expect(screen.queryByRole('link', { name: 'A' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Klima' })).toBeTruthy();
    expect(container.querySelector('.variants')).toBeNull();
    expect(container.querySelector('.definition')!.innerHTML).toBe('');
  });

  it('keys the terms on the content, not on the location (R37)', () => {
    const content = {
      ...defaultContent,
      '@id': 'http://localhost:3000/en/glossary',
    };
    const state = loaded({ K: [klima] });
    const store = mockStore(state);
    const view = render(ui(state, store, content));
    view.rerender(ui(state, store, content, '/en/other-page'));
    expect(store.getActions()).toEqual([]);
    expect(screen.getByRole('link', { name: 'Klima' })).toBeTruthy();
  });

  it('adds group keys outside A to Z', () => {
    const { container } = setup(loaded({ '1': [{ ...klima, title: 'Eins' }] }));
    expect(container.querySelector('h2#glossary-letter-1')).toBeTruthy();
    expect(screen.getByRole('link', { name: '1' }).getAttribute('href')).toBe(
      '#glossary-letter-1',
    );
    expect(container.querySelectorAll('nav .unmatched, nav a')).toHaveLength(
      27,
    );
  });

  it('hides the alphabet navigation when showAlphabetNavigation is false, read at render (F3)', () => {
    config.settings.glossary = { showAlphabetNavigation: false };
    setup(loaded({ K: [klima] }));
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('renders the description and copes with entries without variants or definition', () => {
    const { container } = setup(
      loaded({
        K: [{ ...klima, terms: undefined, definition: undefined }],
      }),
    );
    expect(screen.getByText('All terms')).toBeTruthy();
    expect(container.querySelector('.variants')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = setup(loaded({ K: [klima] }));
    await expectNoA11yViolations(container);
  });
});
