import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import {
  ActivationContext,
  createActivationRegistry,
  DEFAULT_ACTIVATION_OPTIONS,
  useActivation,
  type ActivationRegistry,
} from './activation';

const dom = (html: string) => {
  document.body.innerHTML = html;
  return (id: string) => document.querySelector(`[data-id="${id}"]`)!;
};
const state = (r: ActivationRegistry, ...els: Element[]) => {
  r.flush();
  return els.map((e) => r.isActive(e));
};

describe('createActivationRegistry', () => {
  it('has the documented defaults', () => {
    expect(DEFAULT_ACTIVATION_OPTIONS).toEqual({
      firstOnly: false,
      rootSelector: 'main',
    });
  });

  it('activates only inside the root selector', () => {
    const el = dom(
      '<main><span data-id="in"></span></main><footer><span data-id="out"></span></footer>',
    );
    const r = createActivationRegistry();
    r.register('Klima', el('in'));
    r.register('Klima', el('out'));
    expect(state(r, el('in'), el('out'))).toEqual([true, false]);
  });

  it.each([
    'a href="/x"',
    'button',
    'summary',
    'label',
    'div role="button"',
    'div role="link"',
  ])('does not activate inside <%s> (F16)', (tag) => {
    const name = tag.split(' ')[0];
    const el = dom(`<main><${tag}><span data-id="x"></span></${name}></main>`);
    const r = createActivationRegistry();
    r.register('Klima', el('x'));
    expect(state(r, el('x'))).toEqual([false]);
  });

  it('does not activate inside data-glossary="off"', () => {
    const el = dom(
      '<main><div data-glossary="off"><span data-id="x"></span></div></main>',
    );
    const r = createActivationRegistry();
    r.register('Klima', el('x'));
    expect(state(r, el('x'))).toEqual([false]);
  });

  it('activates an anchor without href as normal text', () => {
    const el = dom('<main><a><span data-id="x"></span></a></main>');
    const r = createActivationRegistry();
    r.register('Klima', el('x'));
    expect(state(r, el('x'))).toEqual([true]);
  });

  it('keeps everything inactive for an invalid root selector (R24)', () => {
    const el = dom('<main><span data-id="x"></span></main>');
    const r = createActivationRegistry({ rootSelector: '[' });
    r.register('Klima', el('x'));
    expect(state(r, el('x'))).toEqual([false]);
  });

  it('never activates an element that is not connected', () => {
    const el = dom('<main><span data-id="x"></span></main>');
    const node = el('x');
    const r = createActivationRegistry();
    r.register('Klima', node);
    node.remove();
    expect(state(r, node)).toEqual([false]);
  });

  it('reports unregistered elements as inactive', () => {
    const el = dom('<main><span data-id="x"></span></main>');
    expect(state(createActivationRegistry(), el('x'))).toEqual([false]);
  });

  it('firstOnly activates only the first occurrence in document order (F13)', () => {
    const el = dom(
      '<main><span data-id="b"></span><span data-id="a"></span><span data-id="c"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    r.register('Klima', el('a'));
    r.register('klima', el('c'));
    r.register('KLIMA', el('b'));
    expect(state(r, el('b'), el('a'), el('c'))).toEqual([true, false, false]);
  });

  it('firstOnly treats different keys independently', () => {
    const el = dom(
      '<main><span data-id="k1"></span><span data-id="w1"></span><span data-id="k2"></span><span data-id="w2"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    r.register('Klima', el('k1'));
    r.register('Wetter', el('w1'));
    r.register('Klima', el('k2'));
    r.register('Wetter', el('w2'));
    expect(state(r, el('k1'), el('w1'), el('k2'), el('w2'))).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it('firstOnly skips occurrences that cannot be activated', () => {
    const el = dom(
      '<main><a href="/x"><span data-id="a"></span></a><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    expect(state(r, el('a'), el('b'))).toEqual([false, true]);
  });

  it('promotes the next occurrence when the first unregisters', () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    const offA = r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    expect(state(r, el('a'), el('b'))).toEqual([true, false]);
    offA();
    expect(state(r, el('a'), el('b'))).toEqual([false, true]);
  });

  it('demotes an occurrence when an earlier one registers later', () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    r.register('Klima', el('b'));
    expect(state(r, el('b'))).toEqual([true]);
    r.register('Klima', el('a'));
    expect(state(r, el('a'), el('b'))).toEqual([true, false]);
  });

  it('notifies subscribers once per batch of registrations', async () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span><span data-id="c"></span></main>',
    );
    const r = createActivationRegistry();
    const listener = vi.fn();
    r.subscribe(listener);
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    r.register('Klima', el('c'));
    expect(listener).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(r.isActive(el('a'))).toBe(true);
  });

  it('does not notify again after flush consumed the pending batch', async () => {
    const el = dom('<main><span data-id="a"></span></main>');
    const r = createActivationRegistry();
    const listener = vi.fn();
    r.subscribe(listener);
    r.register('Klima', el('a'));
    r.flush();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', async () => {
    const el = dom('<main><span data-id="a"></span></main>');
    const r = createActivationRegistry();
    const listener = vi.fn();
    r.subscribe(listener)();
    r.register('Klima', el('a'));
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
  });

  it('recomputes when options change', () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry();
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    expect(state(r, el('a'), el('b'))).toEqual([true, true]);
    r.configure({ firstOnly: true });
    expect(state(r, el('a'), el('b'))).toEqual([true, false]);
  });
});

describe('useActivation', () => {
  // Lets the batched microtask run inside act.
  const settle = () => act(async () => {});
  const setup = () => {
    document.body.innerHTML = '<main><span id="s"></span></main>';
    // Stable ref to an element outside the React root, inside <main>.
    return { current: document.getElementById('s')! };
  };

  it('returns false before registration and true after', async () => {
    const ref = setup();
    const seen: boolean[] = [];
    const { result } = renderHook(() => {
      const active = useActivation('Klima', ref);
      seen.push(active);
      return active;
    });
    expect(seen[0]).toBe(false);
    await settle();
    expect(result.current).toBe(true);
  });

  it('unregisters on unmount', async () => {
    const ref = setup();
    const registry = createActivationRegistry({ firstOnly: true });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(ActivationContext.Provider, { value: registry }, children);
    const first = renderHook(() => useActivation('Klima', ref), { wrapper });
    await settle();
    expect(first.result.current).toBe(true);
    first.unmount();
    registry.flush();
    expect(registry.isActive(ref.current)).toBe(false);
  });
});
