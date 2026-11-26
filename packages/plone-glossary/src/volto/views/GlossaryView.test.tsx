import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

function ui(state: object, store = mockStore(state)) {
  return (
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        <MemoryRouter>
          <GlossaryView
            content={{ title: 'Glossary', description: 'All terms' }}
            location={{ pathname: '/en/glossary' }}
          />
        </MemoryRouter>
      </IntlProvider>
    </Provider>
  );
}

function setup(state: object) {
  const store = mockStore(state);
  return { store, ...render(ui(state, store)) };
}

afterEach(() => {
  cleanup();
  delete config.settings.glossary;
});

describe('GlossaryView', () => {
  it('renders the term list on the server (F15)', () => {
    // react-redux warns about useLayoutEffect because jsdom provides a window.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToString(ui(loaded({ K: [klima] })));
    error.mockRestore();
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
    expect(screen.getByRole('link', { name: 'Klima' })).toHaveProperty(
      'href',
      'http://localhost:3000/en/glossary/klima'.replace(
        'http://localhost:3000',
        window.location.origin,
      ),
    );
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
    expect(document.activeElement).toBe(heading);
  });

  it('does not intercept the link when the target is missing', () => {
    setup(loaded({ K: [klima] }));
    document.getElementById('glossary-letter-K')!.removeAttribute('id');
    const notPrevented = fireEvent.click(
      screen.getByRole('link', { name: 'K' }),
    );
    expect(notPrevented).toBe(true);
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
