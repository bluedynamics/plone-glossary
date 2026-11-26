import config from '@plone/volto/registry';
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

describe('getMatcher: definitions', () => {
  it('turns backend URLs into app URLs and leaves malformed entries to the matcher (B11)', () => {
    const api = config.settings.apiPath;
    const items = [
      null,
      { term: 'Wetter', definition: null },
      { term: 'Klima', definition: [`<a href="${api}/de/x">x</a>`, 42] },
    ] as never;
    const [segment] = getMatcher(items, false).match('Klima');
    expect(segment).toMatchObject({
      type: 'term',
      definitions: ['<a href="/de/x">x</a>'],
    });
    expect(getMatcher(items, false).match('Wetter')).toEqual([
      { type: 'text', text: 'Wetter' },
    ]);
  });
});
