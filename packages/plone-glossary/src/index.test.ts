import applyConfig, { GlossaryText } from './index';
import GlossaryTextDefault from './volto/GlossaryText';
import { GlossaryTrigger } from './react';
import { glossaryTerms, glossaryTooltipTerms } from './volto/reducers';
import GlossaryTermsLoader from './volto/GlossaryTermsLoader';
import { defaultGlossarySettings } from './volto/settings';
import { makeConfig } from './volto/test-utils';

describe('applyConfig', () => {
  it('returns the given config', () => {
    const c = makeConfig();
    expect(applyConfig(c)).toBe(c);
  });

  it('exports GlossaryText', () => {
    expect(GlossaryText).toBe(GlossaryTextDefault);
  });

  it('keeps leafs of other add-ons and puts the text leaf first (F9)', () => {
    const c = makeConfig({ slate: { leafs: { foo: () => null } } });
    applyConfig(c);
    expect(Object.keys(c.settings.slate.leafs)).toEqual(['text', 'foo']);
  });

  it('keeps glossary settings that are already set', () => {
    const c = makeConfig({ glossary: { caseSensitive: true } });
    applyConfig(c);
    expect(c.settings.glossary).toEqual({
      ...defaultGlossarySettings,
      caseSensitive: true,
    });
  });

  it('fills defaults when no glossary settings exist', () => {
    const c = makeConfig();
    applyConfig(c);
    expect(c.settings.glossary).toEqual(defaultGlossarySettings);
  });

  it('registers reducers, the loader for all routes and the trigger', () => {
    const old = { match: '/x', component: () => null };
    const c = makeConfig({ appExtras: [old] });
    c.addonReducers = { other: () => null };
    applyConfig(c);
    expect(c.addonReducers).toEqual({
      other: expect.any(Function),
      glossaryTooltipTerms,
      glossaryTerms,
    });
    expect(c.settings.appExtras).toEqual([
      old,
      { match: '', component: GlossaryTermsLoader },
    ]);
    expect(c.getComponent('GlossaryTrigger').component).toBe(GlossaryTrigger);
  });
});
