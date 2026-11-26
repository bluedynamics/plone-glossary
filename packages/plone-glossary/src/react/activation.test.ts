import { act, render, renderHook } from '@testing-library/react';
import { createElement, StrictMode, useRef } from 'react';
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

  it('keeps the defaults for options given as undefined (C4)', () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry({
      firstOnly: undefined,
      rootSelector: undefined,
    });
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    expect(state(r, el('a'), el('b'))).toEqual([true, true]);
    r.configure({ firstOnly: true, rootSelector: undefined });
    expect(state(r, el('a'), el('b'))).toEqual([true, false]);
    r.configure({ firstOnly: undefined });
    expect(state(r, el('a'), el('b'))).toEqual([true, false]);
  });

  it('activates occurrences in hidden content (B5)', () => {
    const el = dom(
      '<main><div hidden><span data-id="a"></span></div>' +
        '<div style="display: none"><span data-id="b"></span></div>' +
        '<div aria-hidden="true"><span data-id="c"></span></div></main>',
    );
    const r = createActivationRegistry();
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    r.register('Klima', el('c'));
    expect(state(r, el('a'), el('b'), el('c'))).toEqual([true, true, true]);
  });

  it('lets a hidden first occurrence take the only trigger under firstOnly (B5)', () => {
    const el = dom(
      '<main><div hidden><span data-id="a"></span></div><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    expect(state(r, el('a'), el('b'))).toEqual([true, false]);
  });

  it('counts keys that differ only in case as one term under firstOnly', () => {
    // EMS (emergency medical services) and Ems (a river) are two entries.
    const el = dom(
      '<main><span data-id="river"></span><span data-id="ems"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    r.register('Ems', el('river'));
    r.register('EMS', el('ems'));
    expect(state(r, el('river'), el('ems'))).toEqual([true, false]);
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

describe('automatic recomputation', () => {
  it('reports a removed element as inactive without a flush', () => {
    const el = dom('<main><span data-id="x"></span></main>');
    const node = el('x');
    const r = createActivationRegistry();
    r.register('Klima', node);
    r.flush();
    expect(r.isActive(node)).toBe(true);
    node.remove();
    expect(r.isActive(node)).toBe(false);
  });

  it('recomputes on its own when an element unregisters', async () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    const offA = r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    r.flush();
    expect(r.isActive(el('b'))).toBe(false);
    const listener = vi.fn();
    r.subscribe(listener);
    offA();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(r.isActive(el('b'))).toBe(true);
  });

  it('recomputes on its own when options change', async () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry();
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    r.flush();
    const listener = vi.fn();
    r.subscribe(listener);
    r.configure({ firstOnly: true });
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(r.isActive(el('b'))).toBe(false);
  });

  it('does not recurse when a listener flushes (C5)', () => {
    const el = dom('<main><span data-id="a"></span></main>');
    const r = createActivationRegistry();
    const seen: boolean[] = [];
    r.subscribe(() => {
      r.flush();
      seen.push(r.isActive(el('a')));
    });
    r.register('Klima', el('a'));
    expect(() => r.flush()).not.toThrow();
    expect(seen).toEqual([true]);
  });

  it('notifies a change made from inside a listener in a later round (C5)', async () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry();
    let registered = false;
    const seen: boolean[] = [];
    r.subscribe(() => {
      if (!registered) {
        registered = true;
        r.register('Klima', el('b'));
        r.flush();
      }
      seen.push(r.isActive(el('b')));
    });
    r.register('Klima', el('a'));
    r.flush();
    await Promise.resolve();
    expect(seen).toEqual([true, true]);
  });

  it('notifies the other listeners when one throws, then reports the error (C5)', () => {
    const el = dom('<main><span data-id="a"></span></main>');
    const r = createActivationRegistry();
    const later = vi.fn();
    r.subscribe(() => {
      throw new Error('broken listener');
    });
    r.subscribe(later);
    r.register('Klima', el('a'));
    expect(() => r.flush()).toThrow('broken listener');
    expect(later).toHaveBeenCalledTimes(1);
    expect(r.isActive(el('a'))).toBe(true);
  });

  it('keeps an element registered twice active after one unregisters', () => {
    const el = dom('<main><span data-id="a"></span></main>');
    const r = createActivationRegistry({ firstOnly: true });
    r.register('Klima', el('a'));
    const off = r.register('klima', el('a'));
    expect(state(r, el('a'))).toEqual([true]);
    off();
    expect(state(r, el('a'))).toEqual([true]);
  });
});

// The registry recomputes on register, unregister and configure only. These
// tests pin what it does not notice on its own (C2).
describe('DOM changes between recomputations', () => {
  it('keeps the document order of the last recomputation after a move', () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    expect(state(r, el('a'), el('b'))).toEqual([true, false]);
    // b moves before a, as keyed siblings do when React reorders them.
    el('a').before(el('b'));
    expect([r.isActive(el('a')), r.isActive(el('b'))]).toEqual([true, false]);
    // The next recomputation follows the new order.
    expect(state(r, el('a'), el('b'))).toEqual([false, true]);
  });

  it('keeps an occurrence active that is wrapped in a link later', () => {
    const node = dom('<main><p><span data-id="x"></span></p></main>')('x');
    const r = createActivationRegistry();
    r.register('Klima', node);
    expect(state(r, node)).toEqual([true]);
    // Code outside React wraps the occurrence in a link.
    const link = document.createElement('a');
    link.href = '/elsewhere';
    node.replaceWith(link);
    link.append(node);
    expect(r.isActive(node)).toBe(true);
    expect(state(r, node)).toEqual([false]);
  });

  it('activates an element attached after registration only at the next recomputation', () => {
    document.body.innerHTML = '<main></main>';
    const node = document.createElement('span');
    const r = createActivationRegistry();
    r.register('Klima', node);
    r.flush();
    document.querySelector('main')!.append(node);
    expect(r.isActive(node)).toBe(false);
    expect(state(r, node)).toEqual([true]);
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

  it('does not register or throw when the ref is empty', async () => {
    setup();
    const registry = createActivationRegistry();
    const spy = vi.spyOn(registry, 'register');
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(ActivationContext.Provider, { value: registry }, children);
    const { result } = renderHook(
      () => useActivation('Klima', { current: null }),
      {
        wrapper,
      },
    );
    await settle();
    expect(result.current).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(() => registry.flush()).not.toThrow();
  });

  it('does not read the ref while rendering (C3)', async () => {
    document.body.innerHTML = '<main><span id="s"></span></main>';
    const element = document.getElementById('s')!;
    let rendering = false;
    const readsWhileRendering: number[] = [];
    let reads = 0;
    const ref = {
      get current() {
        reads += 1;
        if (rendering) readsWhileRendering.push(reads);
        return element;
      },
    };
    const { result } = renderHook(() => {
      rendering = true;
      const active = useActivation('Klima', ref);
      rendering = false;
      return active;
    });
    await settle();
    expect(result.current).toBe(true);
    expect(reads).toBeGreaterThan(0);
    expect(readsWhileRendering).toEqual([]);
  });

  it('registers once and unregisters cleanly in StrictMode', async () => {
    const ref = setup();
    const registry = createActivationRegistry();
    const register = vi.spyOn(registry, 'register');
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(
        StrictMode,
        null,
        createElement(
          ActivationContext.Provider,
          { value: registry },
          children,
        ),
      );
    const { result, unmount } = renderHook(() => useActivation('Klima', ref), {
      wrapper,
    });
    await settle();
    expect(result.current).toBe(true);
    // StrictMode subscribes, unsubscribes and subscribes again.
    expect(register.mock.results.length).toBeGreaterThanOrEqual(1);
    unmount();
    registry.flush();
    expect(registry.isActive(ref.current)).toBe(false);
  });

  it('activates a span that React renders into an empty main', async () => {
    document.body.innerHTML = '<main id="m"></main>';
    const container = document.getElementById('m')!;
    const Term = () => {
      const ref = useRef<HTMLSpanElement>(null);
      const active = useActivation('Klima', ref);
      return createElement(
        'span',
        { ref, 'data-active': String(active) },
        'Klima',
      );
    };
    render(createElement(Term), { container });
    const span = container.querySelector('span')!;
    expect(span.dataset.active).toBe('false');
    await settle();
    expect(span.dataset.active).toBe('true');
  });
});
