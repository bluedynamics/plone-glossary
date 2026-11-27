import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import type { ReactNode } from 'react';
import config from '@plone/volto/registry';
import * as slateConfig from '@plone/volto-slate/editor/config';
import { deserialize } from '@plone/volto-slate/editor/deserialize';
import {
  simpleLinkDeserializer,
  withSimpleLink,
} from '@plone/volto-slate/editor/plugins/Link/extensions';
import { LinkElement } from '@plone/volto-slate/editor/plugins/Link/render';
import {
  Leaf,
  serializeNodes,
  serializeNodesToHtml,
} from '@plone/volto-slate/editor/render';
import { makeEditor } from '@plone/volto-slate/utils/editor';
import { GlossaryTrigger } from '../react';
import GlossaryText from './GlossaryText';
import { installSlateLeaf } from './slate';
import { makeConfig, makeState } from './test-utils';

const mockStore = configureStore();
// Kept to restore the spy's pass-through after a filtered render.
// eslint-disable-next-line no-console
const originalConsoleError = console.error;

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;
let savedSlate: unknown;

// volto-slate's own editor configuration (its default elements, leafs and
// extensions) with the link plugin's element and deserializer, as Volto
// installs them. The editor's plugin index pulls in theme styles, which the
// tests cannot compile, so the pieces are assembled here.
const stockSlate = () => ({
  ...slateConfig,
  elements: { ...slateConfig.elements, link: LinkElement },
  leafs: {},
  extensions: [...slateConfig.extensions, withSimpleLink],
  htmlTagsToSlate: {
    ...slateConfig.htmlTagsToSlate,
    A: simpleLinkDeserializer,
  },
});

beforeEach(() => {
  config.registerComponent({
    name: 'GlossaryTrigger',
    component: GlossaryTrigger,
  });
  savedSlate = config.settings.slate;
  config.settings.slate = stockSlate();
  consoleError = vi.spyOn(console, 'error');
  consoleWarn = vi.spyOn(console, 'warn');
});

afterEach(() => {
  cleanup();
  config.settings.slate = savedSlate;
  expect(consoleError).not.toHaveBeenCalled();
  expect(consoleWarn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

// Plain, bold and linked text, with the empty text nodes Slate keeps next
// to an inline element.
const value = [
  {
    type: 'p',
    children: [
      { text: 'Das ' },
      { type: 'strong', children: [{ text: 'Klima' }] },
      { text: ' und ' },
      {
        type: 'link',
        data: { url: '/de/seite' },
        children: [{ text: 'mehr' }],
      },
      { text: '' },
    ],
  },
];
const STOCK_HTML =
  '<p>Das <strong>Klima</strong> und <a href="/de/seite">mehr</a></p>';

/** A page Volto renders: its store holds the router's location. */
const page = (ui: ReactNode) => (
  <Provider store={mockStore(makeState())}>
    <MemoryRouter>
      <main>{ui}</main>
    </MemoryRouter>
  </Provider>
);

/**
 * The HTML HtmlSlateWidget, Volto's default rich text widget, stores: it
 * renders with a static store that holds only the session. react-redux's
 * Provider warns about useLayoutEffect because jsdom has a window; that
 * warning is dropped here, any other error fails.
 */
const storedHtml = (nodes: unknown[]) => {
  const before = consoleError.mock.calls.length;
  consoleError.mockImplementation(() => {});
  try {
    return renderToStaticMarkup(
      <Provider store={mockStore({ userSession: { token: null } })}>
        <IntlProvider locale="de" messages={{}}>
          <MemoryRouter>{serializeNodes(nodes)}</MemoryRouter>
        </IntlProvider>
      </Provider>,
    );
  } finally {
    const added = consoleError.mock.calls.splice(before);
    consoleError.mockImplementation(originalConsoleError);
    expect(
      added.filter((args) => !String(args[0]).includes('useLayoutEffect')),
    ).toEqual([]);
  }
};

/** What HtmlSlateWidget makes of stored HTML when it loads it again. */
const loadIntoEditor = (html: string) => {
  const editor = makeEditor();
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return deserialize(editor, body, { collapseWhitespace: false });
};

describe('installSlateLeaf', () => {
  it('puts the text leaf first and keeps leafs of other add-ons', () => {
    const c = makeConfig({ slate: { leafs: { foo: () => null } } });
    installSlateLeaf(c);
    expect(Object.keys(c.settings.slate.leafs)).toEqual(['text', 'foo']);
  });

  it('adds tooltips to slate text on a page', async () => {
    installSlateLeaf(config as never);
    const { container } = render(page(serializeNodes(value)));
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
    expect(container.querySelector('main a')).toHaveAttribute(
      'href',
      '/de/seite',
    );
  });

  it('passes editor children through unchanged', () => {
    const children = <span data-slate-string>Das Klima</span>;
    const leaf = { text: 'Das Klima' };
    const plain = render(
      page(
        <Leaf leaf={leaf} mode="edit" attributes={{}}>
          {children}
        </Leaf>,
      ),
    ).container.innerHTML;
    cleanup();
    installSlateLeaf(config as never);
    const { container } = render(
      page(
        <Leaf leaf={leaf} mode="edit" attributes={{}}>
          {children}
        </Leaf>,
      ),
    );
    expect(container.innerHTML).toBe(plain);
  });

  // F5, the hooks bug of the old add-on, on the paths Volto uses (R47).
  it('renders GlossaryText a varying number of times without an error (F5)', async () => {
    const Texts = ({ n }: { n: number }) => (
      <>
        {Array.from({ length: n }, (_, i) => (
          <p key={i}>
            <GlossaryText text="Das Klima" />
          </p>
        ))}
      </>
    );
    const { rerender } = render(page(<Texts n={1} />));
    rerender(page(<Texts n={3} />));
    expect(
      await screen.findAllByRole('button', { name: 'Klima' }),
    ).toHaveLength(3);
    rerender(page(<Texts n={1} />));
    expect(
      await screen.findAllByRole('button', { name: 'Klima' }),
    ).toHaveLength(1);
  });

  it('serializes a varying number of text runs on a page without an error (F5)', async () => {
    installSlateLeaf(config as never);
    const runs = (n: number) => [
      {
        type: 'p',
        children: Array.from({ length: n }, (_, i) =>
          i % 2
            ? { type: 'strong', children: [{ text: 'und das Klima ' }] }
            : { text: 'Das Klima ' },
        ),
      },
    ];
    const { rerender } = render(page(serializeNodes(runs(1))));
    rerender(page(serializeNodes(runs(4))));
    expect(
      await screen.findAllByRole('button', { name: 'Klima' }),
    ).toHaveLength(4);
    rerender(page(serializeNodes(runs(2))));
    expect(
      await screen.findAllByRole('button', { name: 'Klima' }),
    ).toHaveLength(2);
  });
});

describe('stored content (R47)', () => {
  it('stores exactly the HTML of Volto without this package', () => {
    expect(storedHtml(value)).toBe(STOCK_HTML);
    installSlateLeaf(config as never);
    expect(storedHtml(value)).toBe(STOCK_HTML);
  });

  it('keeps stored HTML the same through loading and saving again', () => {
    installSlateLeaf(config as never);
    const stored = storedHtml(value);
    expect(storedHtml(loadIntoEditor(stored))).toBe(stored);
  });

  it('serializes to HTML without a store as Volto does (further path)', () => {
    // serializeNodesToHtml has no router, so no link can be rendered there.
    const plain = [value[0]].map((node) => ({
      ...node,
      children: node.children.slice(0, 3),
    }));
    const stock = serializeNodesToHtml(plain);
    installSlateLeaf(config as never);
    expect(serializeNodesToHtml(plain)).toBe(stock);
    expect(stock).toBe('<p>Das <strong>Klima</strong> und </p>');
  });

  it('renders no empty span for empty or blank text runs on a page', async () => {
    installSlateLeaf(config as never);
    const blank = [
      {
        type: 'p',
        children: [
          { text: '' },
          {
            type: 'link',
            data: { url: '/de/seite' },
            children: [{ text: 'Klima' }],
          },
          { text: ' ' },
          { type: 'strong', children: [{ text: 'fett' }] },
          { text: '' },
        ],
      },
    ];
    const { container } = render(page(serializeNodes(blank)));
    await act(() => Promise.resolve());
    const empty = [...container.querySelectorAll('span[class=""]')].filter(
      (span) => span.textContent?.trim() === '',
    );
    expect(empty).toEqual([]);
  });

  it('renders the same tooltips markup on the server and in the browser', async () => {
    installSlateLeaf(config as never);
    consoleError.mockImplementation(() => {});
    let html: string;
    try {
      html = renderToString(page(serializeNodes(value)));
    } finally {
      const added = consoleError.mock.calls.splice(0);
      consoleError.mockImplementation(originalConsoleError);
      expect(
        added.filter((args) => !String(args[0]).includes('useLayoutEffect')),
      ).toEqual([]);
    }
    expect(html).toContain('<span class="glossary-term">Klima</span>');
    // The first render in the browser, before the occurrences activate.
    const { container } = render(page(serializeNodes(value)));
    expect(container.innerHTML).toBe(html);
    await act(() => Promise.resolve());
  });
});

describe('the text leaf among other leafs', () => {
  it('wraps a text run with tooltips in an empty span in view mode, as Volto wraps any element (C14)', async () => {
    installSlateLeaf(config as never);
    const { container } = render(
      page(serializeNodes([{ type: 'p', children: [{ text: 'Das Klima' }] }])),
    );
    const button = await screen.findByRole('button', { name: 'Klima' });
    const wrapper = container.querySelector('main > p > span');
    expect(wrapper?.getAttribute('class')).toBe('');
    expect(wrapper).toContainElement(button);
  });

  it('leaves the string to a leaf another add-on puts before it (C16)', async () => {
    installSlateLeaf(config as never);
    const highlight = ({ children }: { children: ReactNode }) => (
      <mark>{children}</mark>
    );
    const marked = [
      { type: 'p', children: [{ text: 'Das Klima', highlight: true }] },
    ];
    const show = () => render(page(serializeNodes(marked)));
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
