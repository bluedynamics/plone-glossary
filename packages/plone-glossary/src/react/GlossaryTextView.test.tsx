import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createMatcher } from '../core';
import { GlossaryTextView } from './GlossaryTextView';
import type { GlossaryTriggerProps } from './GlossaryTrigger';

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
    expect(html).not.toContain('<button');
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
