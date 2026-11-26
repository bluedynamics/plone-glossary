import config from '@plone/volto/registry';
import { defaultGlossarySettings, getGlossarySettings } from './settings';

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
