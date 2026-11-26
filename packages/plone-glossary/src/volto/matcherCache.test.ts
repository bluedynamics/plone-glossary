import { getMatcher } from './matcherCache';

const make = () => [{ term: 'Klima', definition: ['<p>d</p>'] }];

describe('getMatcher', () => {
  it('returns the same matcher for the same items array', () => {
    const items = make();
    expect(getMatcher(items, false)).toBe(getMatcher(items, false));
    expect(getMatcher(items, true)).toBe(getMatcher(items, true));
  });

  it('returns different matchers for different case options', () => {
    const items = make();
    expect(getMatcher(items, true)).not.toBe(getMatcher(items, false));
  });

  it('returns a new matcher for a new items array', () => {
    expect(getMatcher(make(), false)).not.toBe(getMatcher(make(), false));
  });
});
