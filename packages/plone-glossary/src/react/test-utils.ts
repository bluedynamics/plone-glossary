import { act } from '@testing-library/react';
import axe from 'axe-core';
import { expect, vi } from 'vitest';

// Every WCAG level A and AA tag the installed axe-core knows (wcag2a,
// wcag2aa, wcag21a, wcag21aa, and wcag22aa once axe ships rules for it).
// Best-practice rules are not part of WCAG 2.2 AA and stay out.
const WCAG_A_AA_TAGS = [
  ...new Set(axe.getRules().flatMap((rule) => rule.tags)),
].filter((tag) => /^wcag2\d?a{1,2}$/.test(tag));

/**
 * Runs axe-core on `container` with the WCAG A and AA rules and fails with
 * the rule ids and offending markup when it finds a violation. Works with
 * real and with fake timers.
 */
export async function expectNoA11yViolations(
  container: Element,
): Promise<void> {
  const running = axe.run(container, {
    runOnly: { type: 'tag', values: WCAG_A_AA_TAGS },
  });
  if (vi.isFakeTimers()) {
    // axe-core yields to the event loop with `setTimeout(…, 0)`. Advance only
    // those zero-delay timers, so pending timers of the code under test stay.
    let settled = false;
    const settle = () => {
      settled = true;
    };
    running.then(settle, settle);
    while (!settled) {
      await act(() => vi.advanceTimersByTimeAsync(0));
    }
  }
  const { violations } = await running;
  const report = violations.map((violation) => ({
    rule: violation.id,
    nodes: violation.nodes.map((node) => node.html),
  }));
  expect(report).toEqual([]);
}
