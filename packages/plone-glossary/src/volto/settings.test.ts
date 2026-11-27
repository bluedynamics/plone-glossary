import config from '@plone/volto/registry';
import {
  defaultGlossarySettings,
  getGlossarySettings,
  withDefaults,
} from './settings';

afterEach(() => {
  delete config.settings.glossary;
});

describe('glossary settings', () => {
  it('has the documented defaults', () => {
    expect(defaultGlossarySettings).toEqual({
      tooltipRoutes: ['/'],
      tooltipRootSelector: 'main',
      caseSensitive: false,
      matchOnlyFirstOccurrence: false,
      mentionTermInTooltip: false,
      showAlphabetNavigation: true,
    });
    expect(getGlossarySettings()).toEqual(defaultGlossarySettings);
  });

  it('reads the settings on every call (F3)', () => {
    config.settings.glossary = { showAlphabetNavigation: false };
    expect(getGlossarySettings().showAlphabetNavigation).toBe(false);
    config.settings.glossary = { showAlphabetNavigation: true };
    expect(getGlossarySettings().showAlphabetNavigation).toBe(true);
  });

  it('merges partial settings over the defaults', () => {
    config.settings.glossary = { caseSensitive: true };
    expect(getGlossarySettings()).toEqual({
      ...defaultGlossarySettings,
      caseSensitive: true,
    });
  });

  it('hands out routes a caller may change (C21)', () => {
    getGlossarySettings().tooltipRoutes.push('/changed');
    expect(defaultGlossarySettings.tooltipRoutes).toEqual(['/']);
    const routes = ['/docs'];
    config.settings.glossary = { tooltipRoutes: routes };
    getGlossarySettings().tooltipRoutes.push('/changed');
    expect(routes).toEqual(['/docs']);
    expect(withDefaults().tooltipRoutes).not.toBe(
      defaultGlossarySettings.tooltipRoutes,
    );
  });

  it('ignores settings of the wrong type (further path)', () => {
    config.settings.glossary = {
      tooltipRoutes: 5,
      tooltipRootSelector: 7,
      caseSensitive: 'yes',
      matchOnlyFirstOccurrence: 1,
      mentionTermInTooltip: null,
      showAlphabetNavigation: 'no',
    } as never;
    expect(getGlossarySettings()).toEqual(defaultGlossarySettings);
    config.settings.glossary = 'on' as never;
    expect(getGlossarySettings()).toEqual(defaultGlossarySettings);
  });

  it('takes a single route as a list of one and leaves out routes that are not strings', () => {
    config.settings.glossary = { tooltipRoutes: '/docs' as never };
    expect(getGlossarySettings().tooltipRoutes).toEqual(['/docs']);
    config.settings.glossary = {
      tooltipRoutes: [null, '/docs', 42, '/faq'] as never,
    };
    expect(getGlossarySettings().tooltipRoutes).toEqual(['/docs', '/faq']);
  });

  it('accepts matchPath options with a string path, as appExtras match does', () => {
    const exact = { path: '/docs', exact: true };
    config.settings.glossary = {
      tooltipRoutes: [exact, { path: 5 }, { exact: true }, '/faq'] as never,
    };
    const { tooltipRoutes } = getGlossarySettings();
    expect(tooltipRoutes).toEqual([{ path: '/docs', exact: true }, '/faq']);
    // A copy: changing it leaves the configuration as it is.
    (tooltipRoutes[0] as { path: string }).path = '/changed';
    expect(exact.path).toBe('/docs');
  });

  it('falls back to the default when every given route is unusable', () => {
    config.settings.glossary = {
      tooltipRoutes: [null, 42, {}, { path: null }] as never,
    };
    expect(getGlossarySettings().tooltipRoutes).toEqual(['/']);
  });

  it('keeps an empty route list: tooltips on no route', () => {
    config.settings.glossary = { tooltipRoutes: [] };
    expect(getGlossarySettings().tooltipRoutes).toEqual([]);
  });

  it('keeps keys it does not know', () => {
    // The old add-on spelled one setting matchOnlyFirstOccurence.
    config.settings.glossary = { matchOnlyFirstOccurence: true } as never;
    expect(getGlossarySettings()).toEqual({
      ...defaultGlossarySettings,
      matchOnlyFirstOccurence: true,
    });
  });

  it('falls back to the default for a setting that is undefined (R33)', () => {
    config.settings.glossary = {
      caseSensitive: undefined,
      tooltipRoutes: ['/docs'],
    };
    expect(getGlossarySettings()).toEqual({
      ...defaultGlossarySettings,
      tooltipRoutes: ['/docs'],
    });
  });
});
