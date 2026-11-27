import { createMatcher } from './matcher';
import type { GlossaryTerm } from './types';

// A coarse backstop against a slowdown of an order of magnitude on any
// machine: ten times the median of 44 ms, measured on 2026-11-26 in the CI
// configuration (`pnpm run test:ci`, coverage on, all test files in
// parallel). It does not catch a return to one pass per term at this size
// (measured 170 to 350 ms); the next test does.
const BUDGET_MS = 440;

// The real matcher must take less than half the time of one pass per term.
// Measured ratio on 2026-11-26: 5.7 to 6.5 in the CI configuration, 6.7 to
// 7.1 run alone.
const FACTOR = 2;

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

const time = (work: () => void): number => {
  const start = performance.now();
  work();
  return performance.now() - start;
};

// One page: build the matcher, then match every text once.
const run = (): number =>
  time(() => {
    const matcher = createMatcher(terms);
    for (const text of texts) matcher.match(text);
  });

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

// Very large glossaries, very long terms and text that is not canonical
// (Task 14). One coarse backstop per case: ten times the highest median
// measured on 2026-11-27 in the CI configuration (`pnpm run test:ci`,
// coverage on, all test files in parallel), so a matcher that degrades by
// an order of magnitude in that case fails. Medians in the comments; the
// same 300 texts in canonical form took 36 to 38 ms there.
const BUDGETS_MS = {
  manyTerms: 310, // 5000 terms and 300 texts: 27 to 31 ms
  longTermWords: 530, // a 5000-character term of many words, 300 matches: 47 to 52 ms
  longTermWord: 100, // a 5000-character single word, 300 matches: 8 to 9 ms
  notCanonical: 1020, // 1000 terms, 300 texts with soft hyphens and a mark: 92 to 101 ms
};

it('matches 5000 terms against 300 texts within a coarse budget', () => {
  const many: GlossaryTerm[] = Array.from({ length: 5000 }, (_, i) => ({
    term: `term${i}`,
    definition: ['<p>d</p>'],
  }));
  const manyTexts = texts.map((text, k) =>
    text.replace(
      /term(\d+)/gi,
      (_hit, i) => `term${(Number(i) * 5 + k) % 5000}`,
    ),
  );
  const matchAll = () => {
    const matcher = createMatcher(many);
    return manyTexts.map(
      (text) => matcher.match(text).filter((s) => s.type === 'term').length,
    );
  };
  expect(new Set(matchAll())).toEqual(new Set([5]));
  const elapsedMs = median(Array.from({ length: 5 }, () => time(matchAll)));
  expect(elapsedMs).toBeLessThan(BUDGETS_MS.manyTerms);
});

it.each([
  [
    'many words',
    'longTermWords',
    Array.from({ length: 1200 }, (_, i) => `w${i}`).join(' '),
  ],
  ['one word', 'longTermWord', 'x'.repeat(5000)],
] as const)(
  'matches a term of 5000 characters (%s)',
  (_name, budget, source) => {
    const term = source.slice(0, 5000).trim();
    expect(term.length).toBeGreaterThanOrEqual(4999);
    const text = `before ${term} after`;
    const run300 = () => {
      const matcher = createMatcher([{ term, definition: ['<p>d</p>'] }]);
      let found = matcher.match(text);
      for (let k = 1; k < 300; k += 1) found = matcher.match(text);
      return found;
    };
    expect(run300().filter((s) => s.type === 'term')).toEqual([
      { type: 'term', text: term, key: term, definitions: ['<p>d</p>'] },
    ]);
    const elapsedMs = median(Array.from({ length: 5 }, () => time(run300)));
    expect(elapsedMs).toBeLessThan(BUDGETS_MS[budget]);
  },
);

// The same 300 texts, not in canonical form: a soft hyphen in two long
// words and one decomposed character each. They take the projected path.
const notCanonical = texts.map((text) =>
  text
    .replace(/terminal/g, 'termi\u00adnal')
    .replace(/shift/g, 'shi\u00adft')
    .replace('heat', 'he\u0301at'),
);

it('matches 1000 terms against 300 texts that are not canonical within a coarse budget', () => {
  expect(notCanonical.every((text) => text.normalize('NFC') !== text)).toBe(
    true,
  );
  const matchAll = () => {
    const matcher = createMatcher(terms);
    return notCanonical.map(
      (text) => matcher.match(text).filter((s) => s.type === 'term').length,
    );
  };
  expect(new Set(matchAll())).toEqual(new Set([5]));
  const elapsedMs = median(Array.from({ length: 7 }, () => time(matchAll)));
  expect(elapsedMs).toBeLessThan(BUDGETS_MS.notCanonical);
});

// Reference: one precompiled expression per term, with the matcher's word
// boundaries and flags, and one search pass per term over each text.
const WORD = '[\\p{L}\\p{M}\\p{N}]';
const perTerm = terms.map(
  ({ term }) => new RegExp(`(?<!${WORD})(?:${term})(?!${WORD})`, 'giu'),
);
const onePassPerTerm = (): void => {
  for (const text of texts) {
    for (const expression of perTerm) text.search(expression);
  }
};

it('is at least twice as fast as one pass per term', () => {
  const matcher = createMatcher(terms);
  const matchAll = (): void => {
    for (const text of texts) matcher.match(text);
  };
  // The warm-up of the reference compiles its 1000 expressions, about 1.5 s.
  matchAll();
  onePassPerTerm();
  // Alternate, so a burst of load on the machine slows both alike.
  const real: number[] = [];
  const baseline: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    real.push(time(matchAll));
    baseline.push(time(onePassPerTerm));
  }
  expect(median(real) * FACTOR).toBeLessThan(median(baseline));
}, 30_000);
