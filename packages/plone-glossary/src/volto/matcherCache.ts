import { createMatcher } from '../core';
import type { GlossaryTerm, Matcher } from '../core';

const caches = {
  sensitive: new WeakMap<readonly GlossaryTerm[], Matcher>(),
  insensitive: new WeakMap<readonly GlossaryTerm[], Matcher>(),
};

/** One matcher per term list and case option, built on first use. */
export function getMatcher(
  items: GlossaryTerm[],
  caseSensitive: boolean,
): Matcher {
  const cache = caseSensitive ? caches.sensitive : caches.insensitive;
  let matcher = cache.get(items);
  if (!matcher) {
    matcher = createMatcher(items, { caseSensitive });
    cache.set(items, matcher);
  }
  return matcher;
}
