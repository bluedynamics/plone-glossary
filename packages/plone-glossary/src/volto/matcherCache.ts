import { flattenHTMLToAppURL } from '@plone/volto/helpers/Url/Url';
import { createMatcher } from '../core';
import type { GlossaryTerm, Matcher } from '../core';

const caches = {
  sensitive: new WeakMap<readonly GlossaryTerm[], Matcher>(),
  insensitive: new WeakMap<readonly GlossaryTerm[], Matcher>(),
};

/**
 * The terms with backend URLs in their definitions turned into app URLs, so
 * a link or an image in a popover stays inside the app. Malformed entries
 * are kept for the matcher, which leaves them out.
 */
function withAppURLs(items: GlossaryTerm[]): GlossaryTerm[] {
  return items.map((item) =>
    item && Array.isArray(item.definition)
      ? {
          ...item,
          definition: item.definition.map((definition) =>
            typeof definition === 'string'
              ? flattenHTMLToAppURL(definition)
              : definition,
          ),
        }
      : item,
  );
}

/** One matcher per term list and case option, built on first use. */
export function getMatcher(
  items: GlossaryTerm[],
  caseSensitive: boolean,
): Matcher {
  const cache = caseSensitive ? caches.sensitive : caches.insensitive;
  let matcher = cache.get(items);
  if (!matcher) {
    matcher = createMatcher(withAppURLs(items), { caseSensitive });
    cache.set(items, matcher);
  }
  return matcher;
}
