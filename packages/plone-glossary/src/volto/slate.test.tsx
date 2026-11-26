import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import type { ReactNode } from 'react';
import config from '@plone/volto/registry';
import {
  serializeNodes,
  serializeNodesToHtml,
} from '@plone/volto-slate/editor/render';
import { GlossaryTrigger } from '../react';
import { installSlateLeaf } from './slate';
import { makeConfig, makeState } from './test-utils';

const mockStore = configureStore();

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
  expect(consoleError).not.toHaveBeenCalled();
  expect(consoleWarn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

function setup() {
  const c = makeConfig();
  installSlateLeaf(c);
  const store = mockStore(makeState());
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <main>{children}</main>
    </Provider>
  );
  return { leafs: c.settings.slate.leafs, Wrapper };
}

describe('installSlateLeaf', () => {
  it('adds tooltips to slate text through the text leaf', async () => {
    const { leafs, Wrapper } = setup();
    render(<Wrapper>{leafs.text({ children: 'Das Klima' })}</Wrapper>);
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
  });

  it('passes editor children through unchanged', () => {
    const { leafs, Wrapper } = setup();
    const children = <span data-slate-string>Das Klima</span>;
    const plain = render(<main>{children}</main>).container.innerHTML;
    cleanup();
    const { container } = render(<Wrapper>{leafs.text({ children })}</Wrapper>);
    expect(container.innerHTML).toBe(plain);
  });

  it('does not throw when the number of leaf instances changes between renders (F5)', async () => {
    const { leafs, Wrapper } = setup();
    const Texts = ({ n }: { n: number }) => (
      <>
        {Array.from({ length: n }, (_, i) => (
          <p key={i}>{leafs.text({ children: 'Das Klima' })}</p>
        ))}
      </>
    );
    const { rerender } = render(<Texts n={1} />, { wrapper: Wrapper });
    rerender(<Texts n={3} />);
    expect(
      await screen.findAllByRole('button', { name: 'Klima' }),
    ).toHaveLength(3);
    rerender(<Texts n={1} />);
    expect(
      await screen.findAllByRole('button', { name: 'Klima' }),
    ).toHaveLength(1);
  });

  it('keeps leafs of other add-ons', () => {
    const c = makeConfig({ slate: { leafs: { foo: () => null } } });
    installSlateLeaf(c);
    expect(Object.keys(c.settings.slate.leafs)).toEqual(['text', 'foo']);
  });
});

// volto-slate's own serializers, with a minimal element configuration.
describe('the text leaf in volto-slate rendering', () => {
  const value = [{ type: 'p', children: [{ text: 'Das Klima' }] }];
  let saved: unknown;

  beforeEach(() => {
    saved = config.settings.slate;
    config.settings.slate = {
      elements: {
        default: ({
          attributes,
          children,
        }: {
          attributes: object;
          children: ReactNode;
        }) => <p {...attributes}>{children}</p>,
      },
      leafs: {},
    };
  });

  afterEach(() => {
    config.settings.slate = saved;
  });

  // HtmlSlateWidget, Volto's default rich text widget, stores this markup.
  // react-redux warns about useLayoutEffect because jsdom has a window.
  const storedHtml = (nodes: unknown[]) => {
    consoleError.mockImplementation((...args) => {
      if (!String(args[0]).includes('useLayoutEffect')) {
        throw new Error(String(args[0]));
      }
    });
    try {
      return renderToStaticMarkup(
        <Provider store={mockStore({ userSession: { token: null } })}>
          <MemoryRouter>{serializeNodes(nodes)}</MemoryRouter>
        </Provider>,
      );
    } finally {
      consoleError.mockReset();
    }
  };

  it('wraps every text run in an empty span in view mode (C14)', async () => {
    installSlateLeaf(config as never);
    const { container } = render(
      <Provider store={mockStore(makeState())}>
        <main>{serializeNodes(value)}</main>
      </Provider>,
    );
    const button = await screen.findByRole('button', { name: 'Klima' });
    const wrapper = container.querySelector('main > p > span');
    expect(wrapper?.getAttribute('class')).toBe('');
    expect(wrapper).toContainElement(button);
  });

  it('adds the empty span to the HTML a rich text widget stores (C14, documented limit)', () => {
    expect(storedHtml(value)).toBe('<p>Das Klima</p>');
    installSlateLeaf(config as never);
    expect(storedHtml(value)).toBe('<p><span class="">Das Klima</span></p>');
    // Volto wraps marked text the same way without this package.
    config.settings.slate.leafs = {
      bold: ({ children }: { children: ReactNode }) => <b>{children}</b>,
    };
    expect(
      storedHtml([{ type: 'p', children: [{ text: 'fett', bold: true }] }]),
    ).toBe('<p><span class=""><b>fett</b></span></p>');
  });

  it('serializes slate text to HTML without a Redux store (further path)', () => {
    installSlateLeaf(config as never);
    expect(serializeNodesToHtml(value)).toBe(
      '<p><span class="">Das Klima</span></p>',
    );
  });

  it('leaves the string to a leaf another add-on puts before it (C16)', async () => {
    installSlateLeaf(config as never);
    const highlight = ({ children }: { children: ReactNode }) => (
      <mark>{children}</mark>
    );
    const marked = [
      { type: 'p', children: [{ text: 'Das Klima', highlight: true }] },
    ];
    const show = () =>
      render(
        <Provider store={mockStore(makeState())}>
          <main>{serializeNodes(marked)}</main>
        </Provider>,
      );
    // Loaded after this package and appended: the text leaf comes first.
    config.settings.slate.leafs = { ...config.settings.slate.leafs, highlight };
    show();
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
    cleanup();
    // Loaded after this package and prepended: it gets the string first,
    // the text leaf gets its element and passes it through.
    const { text, ...others } = config.settings.slate.leafs;
    config.settings.slate.leafs = { highlight, text, ...others };
    const { container } = show();
    await act(() => Promise.resolve());
    expect(container.querySelector('mark')?.textContent).toBe('Das Klima');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
