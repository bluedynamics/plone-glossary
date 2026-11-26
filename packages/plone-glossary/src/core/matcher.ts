import type { GlossaryTerm, Matcher, MatcherOptions, Segment } from './types';

/**
 * Regular expression flags per case rule. The search and the lookup both
 * take their flags from here, so they always agree on what matches.
 */
const FLAGS = { folded: 'iu', exact: 'u' } as const;
type Rule = keyof typeof FLAGS;

interface Entry {
  key: string;
  definitions: string[];
  pattern: string;
  rule: Rule;
  length: number;
  /** Code points that are not whitespace, fixed for every spelling a match can have. */
  size: number;
  /** Accepts exactly the texts this entry matches under its case rule. */
  own: RegExp;
}

const WORD = '[\\p{L}\\p{M}\\p{N}]';
const SYNTAX_CHARS = /[\\^$.*+?()[\]{}|]/g;

// A soft hyphen only marks where a word may be hyphenated at a line end.
// Hyphen and non-breaking hyphen count as hyphen-minus.
const SOFT_HYPHENS = /\u00AD/g;
const HYPHENS = /[\u2010\u2011]/g;
const NOT_CANONICAL = /[\u00AD\u2010\u2011]/;
// A character with the combining marks that follow it, or a run of marks.
const CLUSTERS = /\P{M}\p{M}*|\p{M}+/gu;

const escapeRegExp = (value: string): string =>
  value.replace(SYNTAX_CHARS, '\\$&');

/**
 * The form in which terms and texts are compared: composed (NFC), without
 * soft hyphens, every hyphen as hyphen-minus. Spellings that differ only in
 * these respects look the same to a reader.
 */
const canonical = (value: string): string =>
  value.normalize('NFC').replace(SOFT_HYPHENS, '').replace(HYPHENS, '-');

const isCanonical = (text: string): boolean =>
  !NOT_CANONICAL.test(text) && text.normalize('NFC') === text;

/**
 * The canonical form of a text, with the range in the text that each of its
 * code units comes from. Normalized per character and its marks, which
 * covers composition except for conjoining Hangul jamo.
 */
const project = (
  text: string,
): { text: string; from: number[]; to: number[] } => {
  let form = '';
  const from: number[] = [];
  const to: number[] = [];
  CLUSTERS.lastIndex = 0;
  for (let found = CLUSTERS.exec(text); found; found = CLUSTERS.exec(text)) {
    const part = canonical(found[0]);
    for (let i = 0; i < part.length; i += 1) {
      from.push(found.index);
      to.push(found.index + found[0].length);
    }
    form += part;
  }
  return { text: form, from, to };
};

const words = (term: string): string[] => term.trim().split(/\s+/u);

/** Number of non-whitespace code points. */
const sizeOf = (value: string): number =>
  [...value.replace(/\s+/gu, '')].length;

/** Spelling of a canonical term or text, whitespace runs collapsed. */
const spelling = (value: string): string => words(value).join(' ');

/** Regular expression source for one canonical term: any whitespace run matches. */
const toPattern = (term: string): string =>
  words(term).map(escapeRegExp).join('\\s+');

/**
 * A term in uppercase letters only, such as REST.
 * Case conversion classifies the term here and is never used to compare it
 * with text; comparing is left to the regular expression engine.
 */
const isUppercase = (term: string): boolean =>
  term === term.toUpperCase() && term !== term.toLowerCase();

/** Builds an expression, or returns undefined when its source or the engine fails. */
const compile = (source: () => string, flags: string): RegExp | undefined => {
  try {
    return new RegExp(source(), flags);
  } catch {
    return undefined;
  }
};

/**
 * Runs an expression once on a one-byte and once on a two-byte string.
 * V8 compiles an expression for each kind of string on first use and only
 * then rejects one that is too large, such as a term over 32,767 characters.
 */
const runs = (expression: RegExp): boolean => {
  try {
    expression.test('');
    expression.test('Ā'); // U+0100, outside Latin-1
    return true;
  } catch {
    return false;
  }
};

const append = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

/**
 * Normalizes the input: drops unusable terms, merges repeated spellings.
 * The input comes from a backend response, so its runtime shape is checked.
 */
const collect = (
  terms: readonly GlossaryTerm[],
  caseSensitive: boolean,
): Map<string, Entry> => {
  const entries = new Map<string, Entry>();
  for (const item of Array.isArray(terms) ? terms : []) {
    const term: unknown = item?.term;
    const raw: unknown = item?.definition;
    if (typeof term !== 'string' || !Array.isArray(raw)) continue;
    const definitions = raw.filter(
      (d): d is string => typeof d === 'string' && d.trim() !== '',
    );
    const text = canonical(term);
    if (text.trim() === '' || definitions.length === 0) continue;
    const identity = spelling(text);
    const known = entries.get(identity);
    if (known) {
      for (const definition of definitions) known.definitions.push(definition);
      continue;
    }
    const pattern = toPattern(text);
    const rule: Rule =
      caseSensitive || isUppercase(identity) ? 'exact' : 'folded';
    const own = compile(() => `^(?:${pattern})$`, FLAGS[rule]);
    if (!own) continue;
    entries.set(identity, {
      key: term,
      definitions,
      pattern,
      rule,
      length: identity.length,
      size: sizeOf(identity),
      own,
    });
  }
  return entries;
};

/**
 * At most one search expression per case rule, never one pass per term.
 * Longest first, so each search prefers the longest term at a position.
 * Each one is compiled here, so a failure shows once and not on every match.
 */
const searchesFor = (entries: Map<string, Entry>): RegExp[] | undefined => {
  const sorted = [...entries.values()].sort((a, b) => b.length - a.length);
  const alternatives = new Map<Rule, string[]>();
  for (const entry of sorted) append(alternatives, entry.rule, entry.pattern);
  const searches: RegExp[] = [];
  for (const [rule, patterns] of alternatives) {
    const search = compile(
      () => `(?<!${WORD})(?:${patterns.join('|')})(?!${WORD})`,
      `g${FLAGS[rule]}`,
    );
    if (!search || !runs(search)) return undefined;
    searches.push(search);
  }
  return searches;
};

type Found = RegExpExecArray | null;

/** The leftmost match comes first, the longer one at the same position. */
const precedes = (a: RegExpExecArray, b: RegExpExecArray): boolean =>
  a.index < b.index || (a.index === b.index && a[0].length > b[0].length);

/** The match that comes first among the next matches of all searches. */
const earliest = (candidates: Found[]): Found =>
  candidates.reduce<Found>(
    (best, next) => (next && (!best || precedes(next, best)) ? next : best),
    null,
  );

const NOTHING: Matcher = {
  match: (text) =>
    typeof text !== 'string' || text === '' ? [] : [{ type: 'text', text }],
};

/**
 * Creates a matcher for the given terms.
 * Whole words only, leftmost match first, longest term at the same position.
 * Case-insensitive, except for terms in uppercase letters only and for every
 * term with `caseSensitive`; those match their exact spelling.
 * Composed and decomposed characters, soft hyphens and the kinds of hyphen
 * do not tell spellings apart; segments keep the text as it was.
 * At most one search expression per case rule, never one pass per term.
 * Never throws: a term that cannot be processed is left out, also one that
 * is too long for the engine. If no search can be built from the remaining
 * terms, no text is marked.
 */
export function createMatcher(
  terms: readonly GlossaryTerm[],
  options?: MatcherOptions,
): Matcher {
  const entries = collect(terms, options?.caseSensitive === true);
  if (entries.size === 0) return NOTHING;

  let searches = searchesFor(entries);
  if (!searches) {
    // Leave out the terms the engine cannot compile, then try once more.
    // A healthy glossary never gets here and pays nothing per term.
    for (const [identity, entry] of entries) {
      if (!runs(entry.own)) entries.delete(identity);
    }
    searches = entries.size > 0 ? searchesFor(entries) : undefined;
  }
  if (!searches) return NOTHING;

  // Candidates per size, in backend order.
  const bySize = new Map<number, Entry[]>();
  for (const entry of entries.values()) append(bySize, entry.size, entry);

  // The entry with the exact spelling of the matched text, otherwise the
  // first one in backend order whose own expression accepts it. Beyond the
  // plain string comparison of the spelling, the engine decides what
  // matches, never JavaScript case conversion.
  const entryOf = (matched: string): Entry =>
    entries.get(spelling(matched)) ??
    ((bySize.get(sizeOf(matched)) as Entry[]).find((entry) =>
      entry.own.test(matched),
    ) as Entry);

  const nextFrom = (search: RegExp, text: string, from: number): Found => {
    search.lastIndex = from;
    return search.exec(text);
  };

  const split = (text: string): Segment[] => {
    const segments: Segment[] = [];
    // The next match of every search at or after `last`.
    const ahead = searches.map((search) => nextFrom(search, text, 0));
    let last = 0;
    for (;;) {
      const found = earliest(ahead);
      if (!found) break;
      const entry = entryOf(found[0]);
      if (found.index > last) {
        segments.push({ type: 'text', text: text.slice(last, found.index) });
      }
      segments.push({
        type: 'term',
        text: found[0],
        key: entry.key,
        definitions: [...entry.definitions],
      });
      last = found.index + found[0].length;
      // A search whose next match starts before `last` looks again from there.
      for (let i = 0; i < searches.length; i += 1) {
        const next = ahead[i];
        if (next && next.index < last) {
          ahead[i] = nextFrom(searches[i], text, last);
        }
      }
    }
    if (last < text.length) {
      segments.push({ type: 'text', text: text.slice(last) });
    }
    return segments;
  };

  // A text that is not in canonical form is matched in that form, so a term
  // matches decomposed text, matches across soft hyphens and never inside a
  // hyphenated word. The segments hold the original text: soft hyphens and
  // decomposed characters inside a term stay in the term.
  const splitProjected = (text: string): Segment[] => {
    const { text: form, from, to } = project(text);
    const segments: Segment[] = [];
    let at = 0; // position in the canonical form
    let last = 0; // position in `text`
    for (const segment of split(form)) {
      const start = at;
      at += segment.text.length;
      if (segment.type === 'text') continue;
      const begin = from[start];
      const end = to[at - 1];
      if (begin > last) {
        segments.push({ type: 'text', text: text.slice(last, begin) });
      }
      segments.push({ ...segment, text: text.slice(begin, end) });
      last = end;
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
        return isCanonical(text) ? split(text) : splitProjected(text);
      } catch {
        return NOTHING.match(text);
      }
    },
  };
}
