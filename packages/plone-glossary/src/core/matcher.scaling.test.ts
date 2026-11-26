import { createMatcher } from './matcher';
import type { GlossaryTerm } from './types';

const terms = (n: number): GlossaryTerm[] =>
  Array.from({ length: n }, (_, i) => ({
    term: `prefix${i.toString(36)}zz`,
    definition: ['<p>d</p>'],
  }));

// Many word starts that share the prefix of every term but never match.
const text = Array.from({ length: 300 }, (_, i) => `prefix${i}q`).join(' ');

const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const measure = (n: number): number => {
  const matcher = createMatcher(terms(n));
  matcher.match(text);
  const runs = Array.from({ length: 7 }, () => {
    const start = performance.now();
    for (let i = 0; i < 200; i += 1) matcher.match(text);
    return performance.now() - start;
  });
  return median(runs);
};

describe('createMatcher: scaling', () => {
  it('does not grow quadratically with the number of terms', () => {
    const small = measure(1000);
    const large = measure(4000);
    expect(large).toBeLessThan(small * 10);
  });
});
