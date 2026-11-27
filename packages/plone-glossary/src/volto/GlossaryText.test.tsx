import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import config from '@plone/volto/registry';
import {
  GlossaryTrigger as EntryTrigger,
  type GlossaryTriggerProps,
} from '../index';
import { GlossaryTrigger } from '../react';
import { expectNoA11yViolations } from '../react/test-utils';
import GlossaryText from './GlossaryText';
import { makeState, makeStore } from './test-utils';

const mockStore = configureStore();

function show(state = makeState(), text: string = 'Das Klima') {
  return render(
    <Provider store={mockStore(state)}>
      <main>
        <GlossaryText text={text} />
      </main>
    </Provider>,
  );
}

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  config.registerComponent({
    name: 'GlossaryTrigger',
    component: GlossaryTrigger,
  });
  consoleError = vi.spyOn(console, 'error');
  consoleWarn = vi.spyOn(console, 'warn');
});

afterEach(() => {
  cleanup();
  delete config.settings.glossary;
  expect(consoleError).not.toHaveBeenCalled();
  expect(consoleWarn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe('GlossaryText', () => {
  it('renders plain text while no terms are loaded', () => {
    const { container } = show(makeState({ loaded: false }));
    expect(container.textContent).toBe('Das Klima');
    expect(container.querySelector('.glossary-term')).toBeNull();
  });

  it('renders occurrences for a plain string', async () => {
    show();
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
  });

  it('renders plain text on a CMS UI route', () => {
    const { container } = show(makeState({ pathname: '/de/page/edit' }));
    expect(container.querySelector('.glossary-term')).toBeNull();
    expect(container.textContent).toBe('Das Klima');
  });

  it('renders plain text outside the tooltip routes', () => {
    config.settings.glossary = { tooltipRoutes: ['/documentation'] };
    const { container } = show(makeState({ pathname: '/news' }));
    expect(container.querySelector('.glossary-term')).toBeNull();
  });

  it('does not use terms of another navigation root', () => {
    const { container } = show(
      makeState({ navroot: '/de', contentNavroot: '/en' }),
    );
    expect(container.querySelector('.glossary-term')).toBeNull();
  });

  it('uses the trigger registered as GlossaryTrigger', async () => {
    config.registerComponent({
      name: 'GlossaryTrigger',
      component: ({ text }: { text: string }) => (
        <i data-testid="stub">{text}</i>
      ),
    });
    show();
    expect(await screen.findByTestId('stub')).toHaveTextContent('Klima');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders a registered wrapper of the exported trigger with its behavior', async () => {
    // The example of the reference page, with the import renamed.
    function MarkedTrigger(props: GlossaryTriggerProps) {
      return (
        <>
          <EntryTrigger {...props} />
          <span className="my-glossary-marker" aria-hidden="true" />
        </>
      );
    }
    config.registerComponent({
      name: 'GlossaryTrigger',
      component: MarkedTrigger,
    });
    const { container } = show();
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: 'Klima' });
    const occurrence = container.querySelector('.glossary-term--active')!;
    expect(occurrence).toContainElement(button);
    expect(occurrence.querySelector('.my-glossary-marker')).not.toBeNull();
    expect(container.textContent).toBe('Das Klima');
    await expectNoA11yViolations(container);
    await user.tab();
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(
      screen.getByRole('dialog', { name: 'Klima' }),
    );
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await expectNoA11yViolations(document.body);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    // The focus returns in an animation frame.
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it('passes mentionTermInTooltip to the trigger', async () => {
    config.settings.glossary = { mentionTermInTooltip: true };
    config.registerComponent({
      name: 'GlossaryTrigger',
      component: ({ showTermHeading }: { showTermHeading?: boolean }) => (
        <i data-testid="stub">{String(showTermHeading)}</i>
      ),
    });
    show();
    expect(await screen.findByTestId('stub')).toHaveTextContent('true');
  });

  it('does not re-render the text on a content change that leaves the terms (C13)', async () => {
    let renders = 0;
    config.registerComponent({
      name: 'GlossaryTrigger',
      component: ({ text }: { text: string }) => {
        renders += 1;
        return <i data-testid="stub">{text}</i>;
      },
    });
    type S = ReturnType<typeof makeState>;
    const store = makeStore((state: S = makeState(), action) =>
      action.type === 'CONTENT_REFRESHED'
        ? { ...state, content: { data: { ...state.content.data } } }
        : state,
    );
    render(
      <Provider store={store}>
        <main>
          <GlossaryText text="Das Klima" />
        </main>
      </Provider>,
    );
    await screen.findByTestId('stub');
    const before = renders;
    // Volto loads the content once more after hydration: a new object for
    // the same page and the same navigation root.
    act(() => {
      store.dispatch({ type: 'CONTENT_REFRESHED' });
    });
    expect(renders).toBe(before);
  });

  it('turns backend URLs in definitions into app URLs (B11)', async () => {
    const api = config.settings.apiPath;
    show(
      makeState({
        items: [
          {
            term: 'Klima',
            definition: [
              `<p><a href="${api}/de/wetter">Wetter</a> <img src="${api}/de/bild.png/@@images/image" alt="Bild"></p>`,
            ],
          },
        ],
      }),
    );
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Klima' }));
    const dialog = screen.getByRole('dialog', { name: 'Klima' });
    expect(
      within(dialog).getByRole('link', { name: 'Wetter' }),
    ).toHaveAttribute('href', '/de/wetter');
    expect(within(dialog).getByRole('img', { name: 'Bild' })).toHaveAttribute(
      'src',
      '/de/bild.png/@@images/image',
    );
  });

  it('works with tooltip routes of the wrong type (further path)', async () => {
    config.settings.glossary = {
      tooltipRoutes: '/de' as never,
    };
    show();
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
    cleanup();
    config.settings.glossary = { tooltipRoutes: [null, 42, '/de'] as never };
    show();
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
  });

  it('uses tooltip routes given as matchPath options', async () => {
    config.settings.glossary = {
      tooltipRoutes: [{ path: '/de', exact: false }],
    };
    show();
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
    cleanup();
    config.settings.glossary = {
      tooltipRoutes: [{ path: '/de', exact: true }],
    };
    const { container } = show();
    expect(container.querySelector('.glossary-term')).toBeNull();
  });

  it('renders plain text without a Redux store (further path)', () => {
    // volto-slate's serializeNodesToHtml renders slate text without one.
    expect(renderToStaticMarkup(<GlossaryText text="Das Klima" />)).toBe(
      'Das Klima',
    );
  });

  it('names labels of the popover after the page language, not the browser (R33)', async () => {
    show(makeState({ locale: 'de' }));
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Klima' }));
    await act(() => Promise.resolve());
    expect(
      (await screen.findAllByRole('button', { name: 'Schließen' })).length,
    ).toBeGreaterThan(0);
  });
});
