import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  GlossaryTrigger,
  HOVER_CLOSE_DELAY,
  HOVER_OPEN_DELAY,
  type GlossaryTriggerProps,
} from './GlossaryTrigger';
import { expectNoA11yViolations } from './test-utils';

const DEFINITION = '<p>Wetter über lange Zeit</p>';

// Volto's test setup defines a minimal global `jest` object. With fake timers
// active, Testing Library takes it for Jest and advances time through
// `jest.advanceTimersByTime`, which that object lacks.
beforeAll(() => {
  Object.assign((globalThis as unknown as { jest: object }).jest, {
    advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
  });
});

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  consoleError = vi.spyOn(console, 'error');
  consoleWarn = vi.spyOn(console, 'warn');
});

afterEach(() => {
  cleanup();
  act(() => vi.runOnlyPendingTimers());
  vi.useRealTimers();
  // React reports missing act() and other mistakes on the console.
  expect(consoleError).not.toHaveBeenCalled();
  expect(consoleWarn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
// Focus restoration after closing runs in an animation frame.
const nextFrame = () => advance(20);

const newUser = () =>
  userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

const setup = (props: Partial<GlossaryTriggerProps> = {}) => {
  const user = newUser();
  const view = render(
    <main>
      <GlossaryTrigger
        text="Klima"
        term="Klima"
        definitions={[DEFINITION]}
        {...props}
      />
      <button type="button">Elsewhere</button>
    </main>,
  );
  return {
    user,
    view,
    button: screen.getByRole('button', { name: props.text ?? 'Klima' }),
    elsewhere: screen.getByRole('button', { name: 'Elsewhere' }),
  };
};

const setupTwo = () => {
  const user = newUser();
  render(
    <main>
      <GlossaryTrigger text="Klima" term="Klima" definitions={[DEFINITION]} />
      <GlossaryTrigger
        text="Wetter"
        term="Wetter"
        definitions={['<p>Zustand der Atmosphäre</p>']}
      />
    </main>,
  );
  return {
    user,
    first: screen.getByRole('button', { name: 'Klima' }),
    second: screen.getByRole('button', { name: 'Wetter' }),
  };
};

const hoverOpen = async (
  user: ReturnType<typeof newUser>,
  button: HTMLElement,
) => {
  await user.hover(button);
  advance(HOVER_OPEN_DELAY);
  return screen.getByRole('dialog');
};

it('is a closed button named after the text', () => {
  const { button } = setup();
  expect(button).toHaveAttribute('type', 'button');
  expect(button).toHaveClass('glossary-term__trigger');
  expect(button).not.toHaveClass('glossary-term');
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('opens on click and names the dialog after the term', async () => {
  const { user, button } = setup();
  await user.click(button);
  const dialog = screen.getByRole('dialog', { name: 'Klima' });
  expect(dialog).toHaveTextContent('Wetter über lange Zeit');
  expect(dialog.closest('.glossary-popover')).not.toBeNull();
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(button).toHaveAttribute('aria-controls', dialog.id);
});

it('names the button after the text and the dialog after the term', async () => {
  const { user, button } = setup({ text: 'Klimas' });
  await user.click(button);
  expect(button).toHaveAccessibleName('Klimas');
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Klima');
});

it.each(['{Enter}', ' '])('opens with the key %j (F14)', async (key) => {
  const { user, button } = setup();
  act(() => button.focus());
  await user.keyboard(key);
  expect(screen.getByRole('dialog', { name: 'Klima' })).toBeInTheDocument();
  expect(button).toHaveAttribute('aria-expanded', 'true');
});

it('closes on Escape and returns focus to the button', async () => {
  const { user, button } = setup();
  await user.click(button);
  await user.keyboard('{Escape}');
  nextFrame();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(button);
});

it('opens on hover after HOVER_OPEN_DELAY without moving focus', async () => {
  const { user, button, elsewhere } = setup();
  act(() => elsewhere.focus());
  await user.hover(button);
  advance(HOVER_OPEN_DELAY - 1);
  expect(screen.queryByRole('dialog')).toBeNull();
  advance(1);
  expect(screen.getByRole('dialog', { name: 'Klima' })).toBeInTheDocument();
  advance(1000);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(document.activeElement).toBe(elsewhere);
});

it('stays open while the pointer moves into the popover', async () => {
  const { user, button } = setup();
  const dialog = await hoverOpen(user, button);
  await user.unhover(button);
  advance(HOVER_CLOSE_DELAY - 1);
  await user.hover(dialog);
  advance(HOVER_CLOSE_DELAY * 2);
  expect(screen.getByRole('dialog')).toBe(dialog);
});

it('stays open when the pointer returns to the trigger in time', async () => {
  const { user, button } = setup();
  const dialog = await hoverOpen(user, button);
  await user.unhover(button);
  advance(HOVER_CLOSE_DELAY - 1);
  await user.hover(button);
  advance(HOVER_CLOSE_DELAY * 2);
  expect(screen.getByRole('dialog')).toBe(dialog);
});

it('closes after HOVER_CLOSE_DELAY when the pointer leaves both', async () => {
  const { user, button } = setup();
  const dialog = await hoverOpen(user, button);
  await user.hover(dialog);
  await user.unhover(dialog);
  advance(HOVER_CLOSE_DELAY - 1);
  expect(screen.getByRole('dialog')).toBe(dialog);
  advance(1);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('keeps at most one popover open', async () => {
  const { user, first, second } = setupTwo();
  await user.click(first);
  await user.click(second);
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByRole('dialog', { name: 'Wetter' })).toBeInTheDocument();
});

it('closes a popover opened by hover when another trigger opens by key', async () => {
  const { user, first, second } = setupTwo();
  await hoverOpen(user, first);
  act(() => second.focus());
  await user.keyboard('{Enter}');
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByRole('dialog', { name: 'Wetter' })).toBeInTheDocument();
});

it('opens only the last hovered trigger when the pointer sweeps over several', async () => {
  const { user, first, second } = setupTwo();
  await user.hover(first);
  advance(HOVER_OPEN_DELAY / 2);
  await user.unhover(first);
  await user.hover(second);
  advance(HOVER_OPEN_DELAY - 1);
  expect(screen.queryByRole('dialog')).toBeNull();
  advance(1);
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByRole('dialog', { name: 'Wetter' })).toBeInTheDocument();
});

it('keeps a pinned popover open when another trigger is hovered', async () => {
  const { user, first, second } = setupTwo();
  await user.click(first);
  await user.hover(second);
  advance(HOVER_OPEN_DELAY * 2);
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.getByRole('dialog', { name: 'Klima' })).toBeInTheDocument();
});

it('removes the popover when it unmounts while open', async () => {
  const { user, button, view } = setup();
  await user.click(button);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  view.unmount();
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('leaves no timer behind when it unmounts during the hover delay', async () => {
  const { user, button, view } = setup();
  await user.hover(button);
  expect(vi.getTimerCount()).toBe(1);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  advance(HOVER_OPEN_DELAY);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('renders one definition without a list', async () => {
  const { user, button } = setup();
  await user.click(button);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).queryByRole('list')).toBeNull();
  expect(within(dialog).queryByRole('heading')).toBeNull();
  const definition = dialog.querySelector('.glossary-popover__definition');
  expect(definition?.innerHTML).toBe(DEFINITION);
});

it('renders several definitions as an ordered list', async () => {
  const { user, button } = setup({
    definitions: ['<p>eins</p>', '<p>zwei</p>'],
  });
  await user.click(button);
  const list = within(screen.getByRole('dialog')).getByRole('list');
  expect(list.tagName).toBe('OL');
  const items = within(list).getAllByRole('listitem');
  expect(items.map((item) => item.innerHTML)).toEqual([
    '<p>eins</p>',
    '<p>zwei</p>',
  ]);
});

it('shows the term as heading when showTermHeading is set', async () => {
  const { user, button } = setup({ text: 'Klimas', showTermHeading: true });
  await user.click(button);
  const dialog = screen.getByRole('dialog', { name: 'Klima' });
  const heading = within(dialog).getByRole('heading', { name: 'Klima' });
  expect(heading).toHaveClass('glossary-popover__heading');
});

it('has no accessibility violations closed and open', async () => {
  const { user, button } = setup({ showTermHeading: true });
  await expectNoA11yViolations(document.body);
  await hoverOpen(user, button);
  await expectNoA11yViolations(document.body);
  await user.click(button);
  await expectNoA11yViolations(document.body);
});

describe('popover behavior (R28)', () => {
  it('moves focus into the dialog when opened by press, and Tab reaches a link inside the definition', async () => {
    const { user, button } = setup({
      definitions: ['<p>Siehe <a href="/wetter">Wetter</a></p>'],
    });
    await user.click(button);
    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(dialog);
    await user.tab();
    expect(document.activeElement).toBe(
      within(dialog).getByRole('link', { name: 'Wetter' }),
    );
  });

  it('closes a popover opened by hover on Escape, with the focus unchanged', async () => {
    const { user, button, elsewhere } = setup();
    act(() => elsewhere.focus());
    await hoverOpen(user, button);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    nextFrame();
    expect(document.activeElement).toBe(elsewhere);
  });

  it('pins a popover opened by hover on a press on the trigger and moves focus into it', async () => {
    const { user, button } = setup();
    await hoverOpen(user, button);
    await user.click(button);
    const dialog = screen.getByRole('dialog', { name: 'Klima' });
    expect(document.activeElement).toBe(dialog);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await user.unhover(button);
    advance(HOVER_CLOSE_DELAY * 2);
    expect(screen.getByRole('dialog')).toBe(dialog);
    await user.keyboard('{Escape}');
    nextFrame();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('closes a pinned popover on a press on the trigger', async () => {
    const { user, button } = setup();
    await user.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(button);
    nextFrame();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(button);
  });

  it('closes a pinned popover on a press outside', async () => {
    const { user, button, elsewhere } = setup();
    await user.click(button);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(elsewhere);
    nextFrame();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(elsewhere);
  });
});
