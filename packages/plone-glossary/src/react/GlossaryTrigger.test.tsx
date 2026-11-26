import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  GlossaryTrigger,
  HOVER_CLOSE_DELAY,
  HOVER_OPEN_DELAY,
  type GlossaryTriggerProps,
} from './GlossaryTrigger';
import { expectNoA11yViolations } from './test-utils';

const DEFINITION = '<p>Wetter über lange Zeit</p>';

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

// A bubble-phase Escape listener on `document`, as a surrounding modal would
// have; removed when the test ends.
const listenForEscapeOnDocument = () => {
  const listener = vi.fn();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      listener();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  onTestFinished(() => document.removeEventListener('keydown', onKeyDown));
  return listener;
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
  expect(button).toHaveClass('glossary-term__trigger');
  expect(button).not.toHaveClass('glossary-term');
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('is a span with button role, not a native button', () => {
  const { button } = setup();
  expect(button.tagName).toBe('SPAN');
  expect(button).toHaveAttribute('role', 'button');
  expect(button).toHaveAttribute('tabindex', '0');
  // The only native button is the one this test renders next to it.
  expect(
    [...document.querySelectorAll('button')].map(
      (element) => element.textContent,
    ),
  ).toEqual(['Elsewhere']);
});

it('keeps its text selectable while the pointer is down', () => {
  const { button } = setup();
  // A pointer with a size: react-aria takes one without for a screen reader.
  const mouse = {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    width: 1,
    height: 1,
  };
  fireEvent.pointerDown(button, mouse);
  // A press must not switch off text selection, so a mouse selection can
  // start inside a term like in the text around it.
  expect(button).not.toHaveAttribute('style');
  fireEvent.pointerCancel(button, mouse);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('opens with Space without scrolling the page', () => {
  const { button } = setup();
  act(() => button.focus());
  // A default that is not prevented would scroll the page.
  expect(fireEvent.keyDown(button, { key: ' ', code: 'Space' })).toBe(false);
  fireEvent.keyUp(button, { key: ' ', code: 'Space' });
  expect(screen.getByRole('dialog', { name: 'Klima' })).toBeInTheDocument();
  expect(button).toHaveAttribute('aria-expanded', 'true');
});

it('leaves Escape from inside a pinned popover to react-aria', async () => {
  const { user, button } = setup();
  await user.click(button);
  const dialog = screen.getByRole('dialog', { name: 'Klima' });
  const dialogKeyDown = vi.fn();
  dialog.addEventListener('keydown', dialogKeyDown);
  // react-aria handles the Escape inside the popover and prevents its
  // default; the trigger's own capture-phase listener must not take it.
  expect(fireEvent.keyDown(dialog, { key: 'Escape' })).toBe(false);
  expect(dialogKeyDown).toHaveBeenCalledTimes(1);
  nextFrame();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(button);
});

it('ignores the mouse pointer that iOS emulates right after a tap', async () => {
  const { user, button } = setup();
  // A tap pins the popover, a second tap closes it.
  await user.pointer({ keys: '[TouchA]', target: button });
  await user.pointer({ keys: '[TouchA]', target: button });
  nextFrame();
  expect(screen.queryByRole('dialog')).toBeNull();
  // iOS then lets a pointer of type "mouse" enter the trigger.
  fireEvent.pointerOver(button, { pointerType: 'mouse' });
  advance(HOVER_OPEN_DELAY * 2);
  expect(screen.queryByRole('dialog')).toBeNull();
  // A real mouse hover later on still opens it.
  fireEvent.pointerOut(button, { pointerType: 'mouse' });
  advance(1000);
  fireEvent.pointerOver(button, { pointerType: 'mouse' });
  advance(HOVER_OPEN_DELAY);
  expect(screen.getByRole('dialog', { name: 'Klima' })).toBeInTheDocument();
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
  const documentEscape = listenForEscapeOnDocument();
  await user.click(button);
  await user.keyboard('{Escape}');
  nextFrame();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(button);
  // One Escape is one dismissal (R32).
  expect(documentEscape).not.toHaveBeenCalled();
});

it('opens on hover after HOVER_OPEN_DELAY without moving focus', async () => {
  const { user, button, elsewhere } = setup();
  act(() => elsewhere.focus());
  await user.hover(button);
  advance(HOVER_OPEN_DELAY - 1);
  expect(screen.queryByRole('dialog')).toBeNull();
  advance(1);
  const dialog = screen.getByRole('dialog', { name: 'Klima' });
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(button).toHaveAttribute('aria-controls', dialog.id);
  advance(1000);
  expect(screen.getByRole('dialog')).toBe(dialog);
  expect(document.activeElement).toBe(elsewhere);
  await user.unhover(button);
  advance(HOVER_CLOSE_DELAY);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(button).not.toHaveAttribute('aria-controls');
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

  it('consumes the Escape that closes a popover opened by hover (R32)', async () => {
    const { user, button, elsewhere } = setup();
    const documentEscape = listenForEscapeOnDocument();
    act(() => elsewhere.focus());
    await hoverOpen(user, button);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(documentEscape).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(documentEscape).toHaveBeenCalledTimes(1);
  });

  it('closes a popover opened by hover on Escape although the focused element stops it (R31)', async () => {
    const { user, button, elsewhere } = setup();
    elsewhere.addEventListener('keydown', (event) => event.stopPropagation());
    act(() => elsewhere.focus());
    await hoverOpen(user, button);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(elsewhere);
  });

  it('ignores Escape that ends a text composition', async () => {
    const { user, button, elsewhere } = setup();
    act(() => elsewhere.focus());
    const dialog = await hoverOpen(user, button);
    fireEvent.keyDown(elsewhere, { key: 'Escape', isComposing: true });
    expect(screen.getByRole('dialog')).toBe(dialog);
  });

  it('pins the popover on a tap and moves focus into it, without a hover timer', async () => {
    const { user, button } = setup();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    await user.pointer({ keys: '[TouchA]', target: button });
    const delays = setTimeoutSpy.mock.calls.map(([, delay]) => delay);
    setTimeoutSpy.mockRestore();
    expect(delays).not.toContain(HOVER_OPEN_DELAY);
    const dialog = screen.getByRole('dialog', { name: 'Klima' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(dialog);
    // react-aria's own 500 ms timers (emulated-mouse guard after touch,
    // VoiceOver refocus) and their follow-ups run out; no timer of the
    // trigger is left.
    advance(1000);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(document.activeElement).toBe(dialog);
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
