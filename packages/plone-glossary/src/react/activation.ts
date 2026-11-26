import {
  createContext,
  useContext,
  useEffect,
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

export function createActivationRegistry(
  initial: Partial<ActivationOptions> = {},
): ActivationRegistry {
  let options: ActivationOptions = {
    ...DEFAULT_ACTIVATION_OPTIONS,
    ...initial,
  };
  const entries = new Set<Entry>();
  const listeners = new Set<() => void>();
  let active = new Set<Element>();
  let pending = false;

  const recompute = () => {
    pending = false;
    active = computeActive(entries, options);
    listeners.forEach((listener) => listener());
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
    isActive: (element) => active.has(element),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(partial) {
      options = { ...options, ...partial };
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
 */
export function useActivation(key: string, ref: RefObject<Element>): boolean {
  const registry = useContext(ActivationContext);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    return registry.register(key, element);
  }, [registry, key, ref]);
  return useSyncExternalStore(
    registry.subscribe,
    () => (ref.current ? registry.isActive(ref.current) : false),
    () => false,
  );
}
