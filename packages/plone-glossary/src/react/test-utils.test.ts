import { expectNoA11yViolations, WCAG_A_AA_TAGS } from './test-utils';

// A button without an accessible name violates WCAG 4.1.2 (level A).
const renderUnnamedButton = () => {
  const main = document.createElement('main');
  main.innerHTML = '<button type="button"></button>';
  document.body.append(main);
  return main;
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('expectNoA11yViolations', () => {
  it('selects the WCAG 2.2 AA rules along with those of 2.0 and 2.1 (C11)', () => {
    // axe-core 4.4.2 had no wcag22aa tag, so the helper ran no 2.2 rule.
    expect([...WCAG_A_AA_TAGS].sort()).toEqual([
      'wcag21a',
      'wcag21aa',
      'wcag22aa',
      'wcag2a',
      'wcag2aa',
    ]);
  });

  it('fails on a WCAG A violation with real timers', async () => {
    const main = renderUnnamedButton();
    await expect(expectNoA11yViolations(main)).rejects.toThrow('button-name');
  });

  it('fails on a WCAG A violation with fake timers', async () => {
    vi.useFakeTimers();
    const main = renderUnnamedButton();
    await expect(expectNoA11yViolations(main)).rejects.toThrow('button-name');
  });
});
