import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createMatcher, type Matcher } from '../core';
import { ActivationContext, createActivationRegistry } from './activation';
import { GlossaryTextView } from './GlossaryTextView';
import type { GlossaryTriggerProps } from './GlossaryTrigger';
import { expectNoA11yViolations } from './test-utils';

const m = createMatcher([{ term: 'Klima', definition: ['<p>d</p>'] }]);
const inMain = (ui: React.ReactElement) => render(<main>{ui}</main>);

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error');
  consoleWarn = vi.spyOn(console, 'warn');
});

afterEach(() => {
  cleanup();
  expect(consoleError).not.toHaveBeenCalled();
  expect(consoleWarn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

const flush = () => act(() => Promise.resolve());

describe('GlossaryTextView', () => {
  it('passes non-string text through unchanged', () => {
    const node = <em data-testid="x">Klima</em>;
    inMain(<GlossaryTextView text={node} matcher={m} />);
    expect(screen.getByTestId('x').tagName).toBe('EM');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders plain text without a matcher', () => {
    const { container } = inMain(
      <GlossaryTextView text="Das Klima" matcher={null} />,
    );
    expect(container.textContent).toBe('Das Klima');
    expect(container.querySelector('.glossary-term')).toBeNull();
  });

  it('keeps line breaks', () => {
    const { container } = inMain(
      <GlossaryTextView text={'a\nb'} matcher={m} />,
    );
    expect(container.querySelectorAll('br')).toHaveLength(1);
    expect(container.textContent).toBe('ab');
  });

  it('treats \\r\\n as one line break', () => {
    const { container } = inMain(
      <GlossaryTextView text={'a\r\nb'} matcher={m} />,
    );
    expect(container.querySelectorAll('br')).toHaveLength(1);
    expect(container.textContent).toBe('ab');
    expect(container.textContent).not.toContain('\r');
  });

  it('renders nothing for an empty string', () => {
    const { container } = inMain(<GlossaryTextView text="" matcher={m} />);
    expect(container.querySelector('main')!.childNodes).toHaveLength(0);
  });

  it('keeps whitespace-only text', () => {
    const { container } = inMain(<GlossaryTextView text="  " matcher={m} />);
    expect(container.textContent).toBe('  ');
  });

  it('renders an occurrence as inactive text first, then as a button', async () => {
    const { container } = inMain(
      <GlossaryTextView text="Das Klima" matcher={m} />,
    );
    const wrapper = container.querySelector('.glossary-term')!;
    expect(wrapper.textContent).toBe('Klima');
    expect(wrapper.className).toBe('glossary-term');
    expect(wrapper.innerHTML).toBe('Klima');
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
    expect(container.textContent).toBe('Das Klima');
  });

  it('keeps the same wrapper element when it becomes active', async () => {
    const { container } = inMain(
      <GlossaryTextView text="Das Klima" matcher={m} />,
    );
    const wrapper = container.querySelector('.glossary-term')!;
    expect(wrapper.classList.contains('glossary-term--active')).toBe(false);
    const button = await screen.findByRole('button', { name: 'Klima' });
    expect(container.querySelectorAll('.glossary-term')).toHaveLength(1);
    expect(container.querySelector('.glossary-term')).toBe(wrapper);
    expect(wrapper.isConnected).toBe(true);
    expect(wrapper.classList.contains('glossary-term--active')).toBe(true);
    expect(wrapper.contains(button)).toBe(true);
    expect(button.classList.contains('glossary-term__trigger')).toBe(true);
  });

  it('renders the same markup on the server and on the first client render (F6)', () => {
    const html = renderToString(
      <GlossaryTextView text="Das Klima" matcher={m} />,
    );
    expect(html).toContain('<span class="glossary-term">Klima</span>');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('glossary-term__trigger');
  });

  it('leaves occurrences inside a link inactive', async () => {
    const { container } = render(
      <main>
        <a href="/x">
          <GlossaryTextView text="Das Klima" matcher={m} />
        </a>
      </main>,
    );
    await flush();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('.glossary-term--active')).toBeNull();
    expect(container.querySelector('.glossary-term')!.textContent).toBe(
      'Klima',
    );
  });

  it('gives two instances with the same text their own occurrences', async () => {
    inMain(
      <>
        <p>
          <GlossaryTextView text="Das Klima" matcher={m} />
        </p>
        <p>
          <GlossaryTextView text="Das Klima" matcher={m} />
        </p>
      </>,
    );
    expect(
      await screen.findAllByRole('button', { name: 'Klima' }),
    ).toHaveLength(2);
  });

  it('uses the trigger component passed in', async () => {
    const Stub = () => <i data-testid="stub" />;
    inMain(
      <GlossaryTextView text="Das Klima" matcher={m} TriggerComponent={Stub} />,
    );
    expect(await screen.findByTestId('stub')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('matches each text run on its own, also where formatting splits a word (B1)', async () => {
    const both = createMatcher([
      { term: 'Klima', definition: ['<p>k</p>'] },
      { term: 'Klimawandel', definition: ['<p>w</p>'] },
    ]);
    const { container } = inMain(
      <p>
        <strong>
          <GlossaryTextView text="Klima" matcher={both} />
        </strong>
        <GlossaryTextView text="wandel" matcher={both} />
      </p>,
    );
    // The reader sees "Klimawandel"; the first run alone is the word "Klima".
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Klimawandel' })).toBeNull();
    expect(container.textContent).toBe('Klimawandel');
  });

  it('registers each occurrence once and keeps one popover open in StrictMode (B6)', async () => {
    const registry = createActivationRegistry();
    const live = new Set<object>();
    const register = registry.register.bind(registry);
    registry.register = (key, element) => {
      const token = {};
      live.add(token);
      const unregister = register(key, element);
      return () => {
        live.delete(token);
        unregister();
      };
    };
    render(
      <StrictMode>
        <ActivationContext.Provider value={registry}>
          <main>
            <GlossaryTextView text="Das Klima und das Klima" matcher={m} />
          </main>
        </ActivationContext.Provider>
      </StrictMode>,
    );
    const triggers = await screen.findAllByRole('button', { name: 'Klima' });
    expect(triggers).toHaveLength(2);
    expect(live.size).toBe(2);
    const user = userEvent.setup();
    await user.click(triggers[0]);
    await user.click(triggers[1]);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('keeps headings, table cells, lists and right-to-left text accessible (B7)', async () => {
    const arabic = createMatcher([
      { term: 'المناخ', definition: ['<p>م</p>'] },
    ]);
    const { container } = render(
      <main>
        <h2>
          <GlossaryTextView text="Das Klima" matcher={m} />
        </h2>
        <table>
          <tbody>
            <tr>
              <td>
                <GlossaryTextView text="Klima" matcher={m} />
              </td>
            </tr>
          </tbody>
        </table>
        <ul>
          <li>
            <GlossaryTextView text="Klima" matcher={m} />
          </li>
        </ul>
        <p dir="rtl" lang="ar">
          <GlossaryTextView text="تغير المناخ مهم" matcher={arabic} />
        </p>
      </main>,
    );
    expect(
      await screen.findAllByRole('button', { name: 'Klima' }),
    ).toHaveLength(3);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Das Klima' }),
    ).toContainElement(screen.getAllByRole('button', { name: 'Klima' })[0]);
    expect(container.querySelector('td [role="button"]')).not.toBeNull();
    expect(container.querySelector('li [role="button"]')).not.toBeNull();
    const rtl = screen.getByRole('button', { name: 'المناخ' });
    expect(rtl.closest('p')).toHaveAttribute('dir', 'rtl');
    await expectNoA11yViolations(container);
    await userEvent.setup().click(rtl);
    expect(screen.getByRole('dialog', { name: 'المناخ' })).toBeInTheDocument();
    await expectNoA11yViolations(document.body);
  });

  it('renders a term segment without definitions as plain text (C9)', async () => {
    const empty: Matcher = {
      match: (text) => [{ type: 'term', text, key: text, definitions: [] }],
    };
    const broken = {
      match: (text: string) => [{ type: 'term', text, key: text }],
    } as unknown as Matcher;
    const { container } = inMain(
      <>
        <GlossaryTextView text="Klima" matcher={empty} />
        <GlossaryTextView text="Wetter" matcher={broken} />
      </>,
    );
    await flush();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('.glossary-term')).toBeNull();
    expect(container.textContent).toBe('KlimaWetter');
  });

  it('closes an open popover when its occurrence stops being the first (further path)', async () => {
    const registry = createActivationRegistry({ firstOnly: true });
    const ui = (before: boolean) => (
      <ActivationContext.Provider value={registry}>
        <main>
          {before && (
            <p>
              <GlossaryTextView text="Klima vorher" matcher={m} />
            </p>
          )}
          <p>
            <GlossaryTextView text="Das Klima" matcher={m} />
          </p>
        </main>
      </ActivationContext.Provider>
    );
    const view = render(ui(false));
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Klima' }));
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
    // Content above loads later and holds an earlier occurrence of the term.
    view.rerender(ui(true));
    await flush();
    const [first, second] = [
      ...document.querySelectorAll('main .glossary-term'),
    ];
    expect(first.classList.contains('glossary-term--active')).toBe(true);
    expect(second.classList.contains('glossary-term--active')).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    // The focus was in the popover, which is gone with its trigger.
    expect(document.activeElement).toBe(document.body);
  });

  it('passes text, term, definitions and showTermHeading on to the trigger', async () => {
    const received: GlossaryTriggerProps[] = [];
    const Stub = (props: GlossaryTriggerProps) => {
      received.push(props);
      return <i data-testid="stub" />;
    };
    inMain(
      <GlossaryTextView
        text="Das Klima"
        matcher={m}
        showTermHeading
        TriggerComponent={Stub}
      />,
    );
    await screen.findByTestId('stub');
    expect(received.at(-1)).toEqual({
      text: 'Klima',
      term: 'Klima',
      definitions: ['<p>d</p>'],
      showTermHeading: true,
    });
  });
});
