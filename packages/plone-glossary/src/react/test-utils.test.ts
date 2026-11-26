import { expectNoA11yViolations } from './test-utils';

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
