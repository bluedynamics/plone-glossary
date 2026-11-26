import type { GlossaryTerm, Matcher, MatcherOptions, Segment } from './types';

interface Entry {
  key: string;
  definitions: string[];
  pattern: string;
  length: number;
}

const WORD = '[\\p{L}\\p{M}\\p{N}]';
const SYNTAX_CHARS = /[\\^$.*+?()[\]{}|]/g;

const escapeRegExp = (value: string): string =>
  value.replace(SYNTAX_CHARS, '\\$&');

const words = (term: string): string[] => term.trim().split(/\s+/u);

/** Lookup form of a term: whitespace runs collapsed, case folded. */
const fold = (value: string): string =>
  words(value).join(' ').toUpperCase().toLowerCase();

/** Regular expression source for one term: any whitespace run matches. */
const toPattern = (term: string): string =>
  words(term).map(escapeRegExp).join('\\s+');

const isValid = (pattern: string): boolean => {
  try {
    new RegExp(pattern, 'u');
    return true;
  } catch {
    return false;
  }
};

/** Normalizes the input: drops unusable terms, merges repeated ones. */
const collect = (terms: readonly GlossaryTerm[]): Map<string, Entry> => {
  const entries = new Map<string, Entry>();
  for (const { term, definition } of terms) {
    const definitions = definition.filter((d) => d.trim() !== '');
    if (term.trim() === '' || definitions.length === 0) continue;
    const folded = fold(term);
    const known = entries.get(folded);
    if (known) {
      known.definitions.push(...definitions);
      continue;
    }
    const pattern = toPattern(term);
    if (!isValid(pattern)) continue;
    entries.set(folded, {
      key: term,
      definitions,
      pattern,
      length: folded.length,
    });
  }
  return entries;
};

const NOTHING: Matcher = {
  match: (text) => (text === '' ? [] : [{ type: 'text', text }]),
};

/**
 * Creates a matcher for the given terms.
 * Whole words only, leftmost match first, longest term at the same position,
 * one search expression for all terms.
 * Never throws: a term that cannot be processed is left out.
 */
export function createMatcher(
  terms: readonly GlossaryTerm[],
  // Reserved for Task 5.
  _options?: MatcherOptions,
): Matcher {
  const entries = collect(terms);
  if (entries.size === 0) return NOTHING;

  const sorted = [...entries.values()].sort((a, b) => b.length - a.length);
  let search: RegExp;
  try {
    search = new RegExp(
      `(?<!${WORD})(?:${sorted.map((e) => e.pattern).join('|')})(?!${WORD})`,
      'giu',
    );
  } catch {
    return NOTHING;
  }

  return {
    match(text: string): Segment[] {
      const segments: Segment[] = [];
      let last = 0;
      for (const found of text.matchAll(search)) {
        const entry = entries.get(fold(found[0])) as Entry;
        if (found.index > last) {
          segments.push({ type: 'text', text: text.slice(last, found.index) });
        }
        segments.push({
          type: 'term',
          text: found[0],
          key: entry.key,
          definitions: entry.definitions,
        });
        last = found.index + found[0].length;
      }
      if (last < text.length) {
        segments.push({ type: 'text', text: text.slice(last) });
      }
      return segments;
    },
  };
}
