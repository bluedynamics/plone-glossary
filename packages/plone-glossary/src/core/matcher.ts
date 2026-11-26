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

/** Identity of an entry: its exact spelling, whitespace runs collapsed. */
const spelling = (value: string): string => words(value).join(' ');

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

/**
 * Normalizes the input: drops unusable terms, merges repeated spellings.
 * The input comes from a backend response, so its runtime shape is checked.
 */
const collect = (terms: readonly GlossaryTerm[]): Map<string, Entry> => {
  const entries = new Map<string, Entry>();
  for (const item of Array.isArray(terms) ? terms : []) {
    const term: unknown = item?.term;
    const raw: unknown = item?.definition;
    if (typeof term !== 'string' || !Array.isArray(raw)) continue;
    const definitions = raw.filter(
      (d): d is string => typeof d === 'string' && d.trim() !== '',
    );
    if (term.trim() === '' || definitions.length === 0) continue;
    const identity = spelling(term);
    const known = entries.get(identity);
    if (known) {
      known.definitions.push(...definitions);
      continue;
    }
    const pattern = toPattern(term);
    if (!isValid(pattern)) continue;
    entries.set(identity, {
      key: term,
      definitions,
      pattern,
      length: identity.length,
    });
  }
  return entries;
};

const NOTHING: Matcher = {
  match: (text) =>
    typeof text !== 'string' || text === '' ? [] : [{ type: 'text', text }],
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
      `(?<!${WORD})(?:${sorted.map((e) => `(${e.pattern})`).join('|')})(?!${WORD})`,
      'giu',
    );
  } catch {
    return NOTHING;
  }

  const entryOf = (found: RegExpMatchArray): Entry =>
    sorted.reduce(
      (hit, entry, i) => (found[i + 1] !== undefined ? entry : hit),
      sorted[0],
    );

  const split = (text: string): Segment[] => {
    const segments: Segment[] = [];
    let last = 0;
    for (const found of text.matchAll(search)) {
      const entry = entryOf(found);
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
  };

  return {
    match(text: string): Segment[] {
      if (typeof text !== 'string') return [];
      try {
        return split(text);
      } catch {
        return NOTHING.match(text);
      }
    },
  };
}
