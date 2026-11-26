import { getNavroot } from './selectors';

describe('getNavroot', () => {
  it('reads the navroot from the content', () => {
    const content = {
      '@components': {
        navroot: { navroot: { '@id': 'http://localhost:8080/Plone/de' } },
      },
    };
    expect(getNavroot(content)).toBe('/de');
  });

  it.each([[undefined], [{}], [{ '@components': {} }]])(
    'falls back to the site root for %j',
    (c) => {
      expect(getNavroot(c)).toBe('');
    },
  );
});
