import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-intl-redux';
import configureStore from 'redux-mock-store';
import config from '@plone/volto/registry';
import { GlossaryTrigger } from '../react';
import GlossaryText from './GlossaryText';
import { makeState } from './test-utils';

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
