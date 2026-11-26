import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import type { ReactNode } from 'react';
import config from '@plone/volto/registry';
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
