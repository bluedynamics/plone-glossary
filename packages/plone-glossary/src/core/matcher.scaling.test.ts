import { createMatcher } from './matcher';
import type { GlossaryTerm, Matcher } from './types';

const SIZES = [1000, 4000];

const name = (i: number): string => `prefix${i.toString(36)}zz`;

const terms = (n: number): GlossaryTerm[] =>
  Array.from({ length: n }, (_, i) => ({
    term: name(i),
    definition: ['<p>d</p>'],
  }));

// Many word starts that share the prefix of every term but never match.
const nearMisses = (): string =>
  Array.from({ length: 300 }, (_, i) => `prefix${i}q`).join(' ');

// The same near misses with every fifth word replaced by a term spread over
// the whole list, so the lookup has to search deep into large size buckets.
// Every second match is in uppercase, a case variant of its entry.
const withMatches = (n: number): string =>
  Array.from({ length: 300 }, (_, i) => {
    if (i % 5) return `prefix${i}q`;
    const term = name(Math.floor(((i / 5) * n) / 60));
    return i % 10 ? term : term.toUpperCase();
  }).join(' ');

const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const time = (matcher: Matcher, text: string, repeat: number): number => {
  const start = performance.now();
  for (let i = 0; i < repeat; i += 1) matcher.match(text);
  return performance.now() - start;
};

// Median time per size. Runs of both sizes alternate, so a burst of load
// on the machine slows both alike.
const measure = (text: (n: number) => string, repeat: number): number[] => {
  const cases = SIZES.map((n) => ({
    matcher: createMatcher(terms(n)),
    text: text(n),
    runs: [] as number[],
  }));
  for (const c of cases) c.matcher.match(c.text);
  for (let run = 0; run < 7; run += 1) {
    for (const c of cases) c.runs.push(time(c.matcher, c.text, repeat));
  }
  return cases.map((c) => median(c.runs));
};

describe('createMatcher: scaling', () => {
  it('does not grow quadratically with the number of terms', () => {
    const [small, large] = measure(nearMisses, 200);
    expect(large).toBeLessThan(small * 10);
  });
  it('does not grow quadratically when the text has matches', () => {
    const [small, large] = measure(withMatches, 20);
    expect(large).toBeLessThan(small * 10);
  });
});
