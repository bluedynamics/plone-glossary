import { act } from '@testing-library/react';
import axe from 'axe-core';
import { expect, vi } from 'vitest';

// Every WCAG level A and AA tag axe-core knows: wcag2a, wcag2aa, wcag21a,
// wcag21aa and wcag22aa (axe-core 4.14 has one rule for WCAG 2.2 AA,
// target-size). Best-practice rules are not part of WCAG 2.2 AA and stay out.
// Most WCAG 2.2 criteria cannot be checked automatically, see the manual
// test list in the documentation.
export const WCAG_A_AA_TAGS = [
  ...new Set(axe.getRules().flatMap((rule) => rule.tags)),
].filter((tag) => /^wcag2\d?a{1,2}$/.test(tag));

// jsdom has no layout and no paint. Color contrast cannot be computed there
// (axe reports it as incomplete and draws on a canvas jsdom does not have);
// the acceptance tests check it in real browsers. Preloading style sheets
// waits on timers that fake timers never run, and jsdom has nothing to load.
const JSDOM_OPTIONS: axe.RunOptions = {
  runOnly: { type: 'tag', values: WCAG_A_AA_TAGS },
  rules: { 'color-contrast': { enabled: false } },
  preload: false,
};

// With fake timers, axe-core gets this many turns, one millisecond each.
const MAX_TURNS = 100;

/**
 * Runs axe-core on `container` with the WCAG A and AA rules and fails with
 * the rule ids and offending markup when it finds a violation. Works with
 * real and with fake timers.
 */
export async function expectNoA11yViolations(
  container: Element,
): Promise<void> {
  const running = axe.run(container, JSDOM_OPTIONS);
  if (vi.isFakeTimers()) {
    // axe-core yields to the event loop with short timers, one per rule and
    // one of a millisecond at the end. Each turn moves the clock by one
    // millisecond and then lets axe-core's promises run, so a check moves the
    // fake clock by about 2 ms: a pending timer of the code under test that
    // is due within that time fires during the check. (A timer scheduled
    // while the fake clock runs timers gets at least one millisecond, so
    // advancing by zero would never reach it.)
    let settled = false;
    const settle = () => {
      settled = true;
    };
    running.then(settle, settle);
    for (let turn = 0; !settled; turn += 1) {
      if (turn === MAX_TURNS) {
        throw new Error(
          `axe-core did not finish in ${MAX_TURNS} ms of fake time`,
        );
      }
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
    }
  }
  const { violations } = await running;
  const report = violations.map((violation) => ({
    rule: violation.id,
    nodes: violation.nodes.map((node) => node.html),
  }));
  expect(report).toEqual([]);
}
