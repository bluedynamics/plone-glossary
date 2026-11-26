import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import type { RefObject } from 'react';

export interface ActivationOptions {
  firstOnly: boolean;
  rootSelector: string;
}

export const DEFAULT_ACTIVATION_OPTIONS: ActivationOptions = {
  firstOnly: false,
  rootSelector: 'main',
};

export const INTERACTIVE_SELECTOR =
  'a[href], button, summary, label, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"]';
export const OPT_OUT_SELECTOR = '[data-glossary="off"]';

export interface ActivationRegistry {
  /** Registers an element for a key. The returned function unregisters it. */
  register(key: string, element: Element): () => void;
  isActive(element: Element): boolean;
  subscribe(listener: () => void): () => void;
  configure(options: Partial<ActivationOptions>): void;
  /** Recomputes immediately, for tests. */
  flush(): void;
}

interface Entry {
  key: string;
  element: Element;
}

// Pure DOM logic

/**
 * Whether an element may become active at all, ignoring `firstOnly`.
 * An invalid root selector never throws, nothing is eligible then.
 */
function isEligible(element: Element, rootSelector: string): boolean {
  if (!element.isConnected) return false;
  try {
    if (!element.closest(rootSelector)) return false;
  } catch {
    return false;
  }
  return (
    !element.closest(INTERACTIVE_SELECTOR) && !element.closest(OPT_OUT_SELECTOR)
  );
}

/** Returns the elements that are active for the given entries. */
function computeActive(
  entries: Iterable<Entry>,
  options: ActivationOptions,
): Set<Element> {
  const eligible: Entry[] = [];
  for (const entry of entries) {
    if (isEligible(entry.element, options.rootSelector)) eligible.push(entry);
  }
  if (!options.firstOnly) return new Set(eligible.map((e) => e.element));

  eligible.sort((a, b) => {
    if (a.element === b.element) return 0;
    return a.element.compareDocumentPosition(b.element) &
      Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  });
  const seen = new Set<string>();
  const active = new Set<Element>();
  for (const { key, element } of eligible) {
    const group = key.toLowerCase();
    if (seen.has(group)) continue;
    seen.add(group);
    active.add(element);
  }
  return active;
}

/** The options that are given, an option given as `undefined` is left out. */
function given(
  partial: Partial<ActivationOptions>,
): Partial<ActivationOptions> {
  return Object.fromEntries(
    Object.entries(partial).filter(([, value]) => value !== undefined),
  );
}

export function createActivationRegistry(
  initial: Partial<ActivationOptions> = {},
): ActivationRegistry {
  let options: ActivationOptions = {
    ...DEFAULT_ACTIVATION_OPTIONS,
    ...given(initial),
  };
  const entries = new Set<Entry>();
  const listeners = new Set<() => void>();
  let active = new Set<Element>();
  let pending = false;
  let notifying = false;

  const recompute = () => {
    if (notifying) {
      // A flush from inside a listener: the state is fresh at once, but the
      // listeners are not called again in this round. A registration made
      // there has scheduled a round of its own.
      active = computeActive(entries, options);
      return;
    }
    pending = false;
    active = computeActive(entries, options);
    // A listener that throws does not keep the others from being notified;
    // the first error is thrown once all of them ran.
    const errors: unknown[] = [];
    notifying = true;
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        errors.push(error);
      }
    });
    notifying = false;
    if (errors.length > 0) throw errors[0];
  };

  // Registrations of one commit collapse into one recomputation.
  const schedule = () => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      if (pending) recompute();
    });
  };

  return {
    register(key, element) {
      const entry = { key, element };
      entries.add(entry);
      schedule();
      return () => {
        if (entries.delete(entry)) schedule();
      };
    },
    isActive: (element) => element.isConnected && active.has(element),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(partial) {
      options = { ...options, ...given(partial) };
      schedule();
    },
    flush: recompute,
  };
}

// React binding

export const ActivationContext = createContext<ActivationRegistry>(
  createActivationRegistry(),
);

/**
 * Registers the element of `ref` and tells whether it is active.
 * On the server nothing is active.
 *
 * Contract for callers:
 * - The ref must point to a stable element that exists in both the inactive
 *   and the active state of an occurrence.
 * - The hook reads the ref once, when React subscribes to the registry after
 *   the commit, never while rendering.
 * - That element must not itself match `INTERACTIVE_SELECTOR`.
 *
 * In this package the element is a wrapper `span.glossary-term` that holds the
 * text when inactive and the trigger button when active.
 */
export function useActivation(
  key: string,
  ref: RefObject<Element | null>,
): boolean {
  const registry = useContext(ActivationContext);
  // The registered element lives in the store, set on subscribe and cleared
  // on unsubscribe. A new store only means one more subscription, so its
  // identity is a matter of performance, not of correctness.
  const store = useMemo(() => {
    let element: Element | null = null;
    return {
      subscribe(onChange: () => void) {
        element = ref.current;
        const unregister = element ? registry.register(key, element) : null;
        const unsubscribe = registry.subscribe(onChange);
        return () => {
          unsubscribe();
          unregister?.();
          element = null;
        };
      },
      getSnapshot: () => (element ? registry.isActive(element) : false),
    };
  }, [registry, key, ref]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}
