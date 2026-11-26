import { createMatcher } from './matcher';
import type { GlossaryTerm } from './types';

// Three times the local median of 44 ms, measured with `pnpm run test:ci`
// (coverage on, all test files in parallel) as in CI. Run alone without
// coverage the median is 23 ms.
const BUDGET_MS = 132;

const terms: GlossaryTerm[] = Array.from({ length: 1000 }, (_, i) => ({
  term: `term${i}`,
  definition: ['<p>d</p>'],
}));

// Words that start like the terms but never match one.
const PAD = 'the alps see terminal heat and terms shift';

// 300 characters each with five matches. Every second match is capitalized,
// so the lookup runs both for the exact spelling and for a case variant.
const texts = Array.from({ length: 300 }, (_, k) => {
  const hits = Array.from({ length: 5 }, (_, j) => {
    const i = ((k * 5 + j) * 7919) % 1000;
    return j % 2 ? `Term${i}` : `term${i}`;
  });
  const body = hits.map((hit) => `${PAD} ${hit}`).join(' ');
  return `${body} ${PAD} ${PAD}`.slice(0, 300);
});

const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

// One page: build the matcher, then match every text once.
const run = (): number => {
  const start = performance.now();
  const matcher = createMatcher(terms);
  for (const text of texts) matcher.match(text);
  return performance.now() - start;
};

it('matches 1000 terms against 300 texts of 300 characters within the budget', () => {
  const matcher = createMatcher(terms);
  const found = texts.map(
    (text) => matcher.match(text).filter((s) => s.type === 'term').length,
  );
  expect(new Set(texts.map((text) => text.length))).toEqual(new Set([300]));
  expect(new Set(found)).toEqual(new Set([5]));

  run();
  const elapsedMs = median(Array.from({ length: 7 }, run));
  expect(elapsedMs).toBeLessThan(BUDGET_MS);
});
