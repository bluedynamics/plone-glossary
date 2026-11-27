import { act, render, renderHook } from '@testing-library/react';
import { createElement, StrictMode, useRef } from 'react';
import {
  ActivationContext,
  createActivationRegistry as createRegistry,
  DEFAULT_ACTIVATION_OPTIONS,
  useActivation,
  type ActivationRegistry,
} from './activation';

// Every registration a test makes is undone after it, and stubs are
// restored, so no observer of one test outlives it and the order of the
// tests does not matter.
const cleanups: (() => void)[] = [];
const createActivationRegistry: typeof createRegistry = (options) => {
  const registry = createRegistry(options);
  const register = registry.register.bind(registry);
  registry.register = (key, element) => {
    const unregister = register(key, element);
    cleanups.push(unregister);
    return unregister;
  };
  return registry;
};

afterEach(() => {
  cleanups.splice(0).forEach((unregister) => unregister());
  vi.unstubAllGlobals();
});

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

  it('activates occurrences in content hidden by CSS or the hidden attribute (B5)', () => {
    const el = dom(
      '<main><div hidden><span data-id="a"></span></div>' +
        '<div style="display: none"><span data-id="b"></span></div></main>',
    );
    const r = createActivationRegistry();
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    expect(state(r, el('a'), el('b'))).toEqual([true, true]);
  });

  it.each(['aria-hidden="true"', 'inert'])(
    'does not activate inside an ancestor with %s (R48)',
    (attribute) => {
      const el = dom(
        `<main><div ${attribute}><p><span data-id="x"></span></p></div>` +
          '<div aria-hidden="false"><span data-id="y"></span></div></main>',
      );
      const r = createActivationRegistry();
      r.register('Klima', el('x'));
      r.register('Klima', el('y'));
      expect(state(r, el('x'), el('y'))).toEqual([false, true]);
    },
  );

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
    const a = dom('<main><span data-id="a"></span></main>')('a');
    const r = createActivationRegistry();
    const seen: boolean[] = [];
    const unsubscribe = r.subscribe(() => {
      r.flush();
      seen.push(r.isActive(a));
    });
    const unregister = r.register('Klima', a);
    expect(() => r.flush()).not.toThrow();
    expect(seen).toEqual([true]);
    unsubscribe();
    unregister();
  });

  it('notifies a change made from inside a listener in a later round (C5)', async () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const [a, b] = [el('a'), el('b')];
    const r = createActivationRegistry();
    let registered = false;
    const seen: boolean[] = [];
    const unsubscribe = r.subscribe(() => {
      if (!registered) {
        registered = true;
        r.register('Klima', b);
        r.flush();
      }
      seen.push(r.isActive(b));
    });
    r.register('Klima', a);
    r.flush();
    // The flush inside the listener does not call it again in this round.
    expect(seen).toEqual([true]);
    await Promise.resolve();
    expect(seen).toEqual([true, true]);
    unsubscribe();
  });

  it('notifies the other listeners when one throws, then reports the error (C5)', () => {
    const a = dom('<main><span data-id="a"></span></main>')('a');
    const r = createActivationRegistry();
    const later = vi.fn();
    const unsubscribeBroken = r.subscribe(() => {
      throw new Error('broken listener');
    });
    r.subscribe(later);
    const unregister = r.register('Klima', a);
    expect(() => r.flush()).toThrow('broken listener');
    expect(later).toHaveBeenCalledTimes(1);
    expect(r.isActive(a)).toBe(true);
    unsubscribeBroken();
    unregister();
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

// The registry observes the document and recomputes, batched in an
// animation frame, when the DOM changes (R48).
describe('DOM changes (R48)', () => {
  /** Lets the observer's microtask and the registry's frame run. */
  const afterFrame = async () => {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    await Promise.resolve();
  };

  it('follows a keyed reorder under firstOnly', async () => {
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry({ firstOnly: true });
    r.register('Klima', el('a'));
    r.register('Klima', el('b'));
    expect(state(r, el('a'), el('b'))).toEqual([true, false]);
    // b moves before a, as keyed siblings do when React reorders them.
    el('a').before(el('b'));
    await afterFrame();
    expect([r.isActive(el('a')), r.isActive(el('b'))]).toEqual([false, true]);
  });

  it('leaves an occurrence that is wrapped in a link later', async () => {
    const node = dom('<main><p><span data-id="x"></span></p></main>')('x');
    const r = createActivationRegistry();
    r.register('Klima', node);
    expect(state(r, node)).toEqual([true]);
    // Code outside React wraps the occurrence in a link.
    const link = document.createElement('a');
    link.href = '/elsewhere';
    node.replaceWith(link);
    link.append(node);
    await afterFrame();
    expect(r.isActive(node)).toBe(false);
  });

  it('notices an anchor that gets an href', async () => {
    const el = dom('<main><a data-id="a"><span data-id="x"></span></a></main>');
    const r = createActivationRegistry();
    r.register('Klima', el('x'));
    expect(state(r, el('x'))).toEqual([true]);
    el('a').setAttribute('href', '/elsewhere');
    await afterFrame();
    expect(r.isActive(el('x'))).toBe(false);
  });

  it('activates an element attached after registration', async () => {
    document.body.innerHTML = '<main></main><footer></footer>';
    const node = document.createElement('span');
    const r = createActivationRegistry();
    r.register('Klima', node);
    r.flush();
    expect(r.isActive(node)).toBe(false);
    document.querySelector('main')!.append(node);
    await afterFrame();
    expect(r.isActive(node)).toBe(true);
    // Moved out of the root, it is no longer active.
    document.querySelector('footer')!.append(node);
    await afterFrame();
    expect(r.isActive(node)).toBe(false);
  });

  it.each(['aria-hidden', 'inert'])(
    'drops and restores an occurrence whose ancestor toggles %s',
    async (attribute) => {
      const el = dom(
        '<main><section data-id="slide"><span data-id="x"></span></section></main>',
      );
      const r = createActivationRegistry();
      const listener = vi.fn();
      r.subscribe(listener);
      r.register('Klima', el('x'));
      expect(state(r, el('x'))).toEqual([true]);
      listener.mockClear();
      el('slide').setAttribute(attribute, attribute === 'inert' ? '' : 'true');
      await afterFrame();
      expect(r.isActive(el('x'))).toBe(false);
      expect(listener).toHaveBeenCalledTimes(1);
      el('slide').removeAttribute(attribute);
      await afterFrame();
      expect(r.isActive(el('x'))).toBe(true);
      expect(listener).toHaveBeenCalledTimes(2);
    },
  );

  it('drops and restores an occurrence whose ancestor toggles data-glossary="off"', async () => {
    const el = dom(
      '<main><section data-id="box"><span data-id="x"></span></section></main>',
    );
    const r = createActivationRegistry();
    r.register('Klima', el('x'));
    expect(state(r, el('x'))).toEqual([true]);
    el('box').setAttribute('data-glossary', 'off');
    await afterFrame();
    expect(r.isActive(el('x'))).toBe(false);
    el('box').removeAttribute('data-glossary');
    await afterFrame();
    expect(r.isActive(el('x'))).toBe(true);
  });

  it('drops and restores an occurrence whose ancestor toggles role="button"', async () => {
    const el = dom(
      '<main><div data-id="box"><span data-id="x"></span></div></main>',
    );
    const r = createActivationRegistry();
    r.register('Klima', el('x'));
    expect(state(r, el('x'))).toEqual([true]);
    // Code outside React turns the surrounding element into a control.
    el('box').setAttribute('role', 'button');
    await afterFrame();
    expect(r.isActive(el('x'))).toBe(false);
    el('box').removeAttribute('role');
    await afterFrame();
    expect(r.isActive(el('x'))).toBe(true);
  });

  it('recomputes once for changes spread over several microtasks in one frame', async () => {
    const el = dom(
      '<main><div data-id="box"><span data-id="x"></span></div></main>',
    );
    const r = createActivationRegistry();
    r.register('Klima', el('x'));
    r.flush();
    const listener = vi.fn();
    r.subscribe(listener);
    // Each change reaches the observer in its own callback.
    for (let i = 0; i < 5; i += 1) {
      el('box').setAttribute('aria-hidden', i % 2 ? 'true' : 'false');
      await Promise.resolve();
    }
    expect(listener).not.toHaveBeenCalled();
    await afterFrame();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('observes the whole document while there is no body', async () => {
    const body = document.body;
    body.remove();
    onTestFinished(() => {
      if (!document.body) document.documentElement.append(body);
    });
    const node = document.createElement('span');
    const r = createActivationRegistry();
    expect(() => r.register('Klima', node)).not.toThrow();
    // The registration's own recomputation finds the occurrence detached.
    await Promise.resolve();
    expect(r.isActive(node)).toBe(false);
    // The body arrives later, with the occurrence inside its root; only the
    // observer of the document can notice.
    body.innerHTML = '<main></main>';
    body.querySelector('main')!.append(node);
    document.documentElement.append(body);
    await afterFrame();
    expect(r.isActive(node)).toBe(true);
  });

  it('observes only while occurrences are registered', async () => {
    const RealObserver = MutationObserver;
    const calls: string[] = [];
    vi.stubGlobal(
      'MutationObserver',
      class extends RealObserver {
        observe(target: Node, options?: MutationObserverInit) {
          calls.push('observe');
          super.observe(target, options);
        }
        disconnect() {
          calls.push('disconnect');
          super.disconnect();
        }
      },
    );
    onTestFinished(() => vi.unstubAllGlobals());
    const el = dom(
      '<main><span data-id="a"></span><span data-id="b"></span></main>',
    );
    const r = createActivationRegistry();
    const offA = r.register('Klima', el('a'));
    const offB = r.register('Klima', el('b'));
    expect(calls).toEqual(['observe']);
    offA();
    expect(calls).toEqual(['observe']);
    offB();
    expect(calls).toEqual(['observe', 'disconnect']);
    r.register('Klima', el('a'));
    expect(calls).toEqual(['observe', 'disconnect', 'observe']);
  });

  it('drops a pending frame when the last occurrence unregisters', async () => {
    const el = dom(
      '<main><div data-id="box"><span data-id="x"></span></div></main>',
    );
    const r = createActivationRegistry();
    const off = r.register('Klima', el('x'));
    r.flush();
    const listener = vi.fn();
    r.subscribe(listener);
    el('box').setAttribute('aria-hidden', 'true');
    await Promise.resolve();
    off();
    await afterFrame();
    // Only the recomputation of the unregistration ran, not the frame's.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('works without MutationObserver, recomputing on registrations only', () => {
    vi.stubGlobal('MutationObserver', undefined);
    onTestFinished(() => vi.unstubAllGlobals());
    const el = dom('<main><span data-id="x"></span></main>');
    const r = createActivationRegistry();
    const off = r.register('Klima', el('x'));
    expect(state(r, el('x'))).toEqual([true]);
    off();
    expect(state(r, el('x'))).toEqual([false]);
  });

  it('observes nothing without requestAnimationFrame, recomputing on registrations only', () => {
    const RealObserver = MutationObserver;
    const observed = vi.fn();
    vi.stubGlobal(
      'MutationObserver',
      class extends RealObserver {
        observe(target: Node, options?: MutationObserverInit) {
          observed();
          super.observe(target, options);
        }
      },
    );
    vi.stubGlobal('requestAnimationFrame', undefined);
    onTestFinished(() => vi.unstubAllGlobals());
    const el = dom('<main><span data-id="x"></span></main>');
    const r = createActivationRegistry();
    r.register('Klima', el('x'));
    expect(observed).not.toHaveBeenCalled();
    expect(state(r, el('x'))).toEqual([true]);
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

  it('stays active in every render when the key changes', async () => {
    const ref = setup();
    const seen: string[] = [];
    const { rerender } = renderHook(
      ({ term }: { term: string }) => {
        const active = useActivation(term, ref);
        seen.push(`${term}:${active}`);
        return active;
      },
      { initialProps: { term: 'Klima' } },
    );
    await settle();
    expect(seen.at(-1)).toBe('Klima:true');
    seen.length = 0;
    // A text or matcher change hands the occurrence at this index a new key.
    rerender({ term: 'KLIMA' });
    await settle();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.filter((entry) => entry !== 'KLIMA:true')).toEqual([]);
  });

  it('registers once and unregisters cleanly in StrictMode', async () => {
    const ref = setup();
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
    // StrictMode subscribes, unsubscribes and subscribes again: one stays.
    expect(live.size).toBe(1);
    unmount();
    expect(live.size).toBe(0);
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
