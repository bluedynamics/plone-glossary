import {
  createContext,
  useCallback,
  useContext,
  useState,
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
/** Content hidden from assistive technology or from interaction. */
export const HIDDEN_SELECTOR = '[aria-hidden="true"], [inert]';
const BLOCKING_SELECTOR = `${INTERACTIVE_SELECTOR}, ${OPT_OUT_SELECTOR}, ${HIDDEN_SELECTOR}`;

/** Attributes whose change can decide whether an occurrence may be active. */
const OBSERVED_ATTRIBUTES = [
  'aria-hidden',
  'inert',
  'href',
  'role',
  'data-glossary',
];

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
 * Whether an element may become active at all, ignoring `firstOnly`: inside
 * the root, and not inside an interactive element, opted-out content or
 * content hidden with `aria-hidden="true"` or `inert`, where a control would
 * be reachable but not announced, or announced but not usable.
 * An invalid root selector never throws, nothing is eligible then.
 */
function isEligible(element: Element, rootSelector: string): boolean {
  if (!element.isConnected) return false;
  try {
    if (!element.closest(rootSelector)) return false;
  } catch {
    return false;
  }
  return !element.closest(BLOCKING_SELECTOR);
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
  let observer: MutationObserver | null = null;
  let frame: number | null = null;

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

  // DOM changes made by anyone (an element moved, wrapped in a link, hidden
  // or shown again) are seen by one observer of the document body, which
  // also covers ancestors of the root, such as an application root a modal
  // hides. They are recomputed at most once per animation frame. The
  // observer exists only while occurrences are registered, in a browser.
  const recomputeInFrame = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      recompute();
    });
  };
  const observe = () => {
    if (
      typeof MutationObserver !== 'function' ||
      typeof requestAnimationFrame !== 'function'
    ) {
      return;
    }
    observer = new MutationObserver(recomputeInFrame);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: OBSERVED_ATTRIBUTES,
    });
  };
  const unobserve = () => {
    observer?.disconnect();
    observer = null;
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };

  return {
    register(key, element) {
      const entry = { key, element };
      entries.add(entry);
      if (entries.size === 1) observe();
      schedule();
      return () => {
        if (!entries.delete(entry)) return;
        if (entries.size === 0) unobserve();
        schedule();
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
  // The registered element lives in a box that outlives every subscription:
  // set on subscribe, cleared on unsubscribe only while it still holds that
  // element. When the key changes, React renders with the new subscribe
  // function before it resubscribes; the box still holds the element, which
  // is registered under the old key until then, so it stays active.
  const [box] = useState<{ element: Element | null }>(() => ({
    element: null,
  }));
  const subscribe = useCallback(
    (onChange: () => void) => {
      const element = ref.current;
      box.element = element;
      const unregister = element ? registry.register(key, element) : null;
      const unsubscribe = registry.subscribe(onChange);
      return () => {
        unsubscribe();
        unregister?.();
        if (box.element === element) box.element = null;
      };
    },
    [registry, key, ref, box],
  );
  const getSnapshot = useCallback(
    () => (box.element ? registry.isActive(box.element) : false),
    [registry, box],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
