import * as entry from './index';
import applyConfig, { GlossaryText } from './index';
import GlossaryTextDefault from './volto/GlossaryText';
import { descriptionBlock, titleBlock } from './volto/blocks';
import { GlossaryTrigger } from './react';
import { glossaryTerms, glossaryTooltipTerms } from './volto/reducers';
import GlossaryTermsLoader from './volto/GlossaryTermsLoader';
import { defaultGlossarySettings } from './volto/settings';
import { glossaryAsyncPropsExtender } from './volto/ssr';
import GlossaryView from './volto/views/GlossaryView';
import TermView from './volto/views/TermView';
import { makeConfig } from './volto/test-utils';

describe('applyConfig', () => {
  it('returns the given config', () => {
    const c = makeConfig();
    expect(applyConfig(c)).toBe(c);
  });

  it('exports GlossaryText', () => {
    expect(GlossaryText).toBe(GlossaryTextDefault);
  });

  it('exports the trigger of the react layer and the block views', () => {
    expect(entry.GlossaryTrigger).toBe(GlossaryTrigger);
    expect(entry.titleBlock).toBe(titleBlock);
    expect(entry.descriptionBlock).toBe(descriptionBlock);
  });

  it('exports nothing else at runtime', () => {
    // The types of the entry are checked in index.types.test.tsx.
    expect(Object.keys(entry).sort()).toEqual([
      'GlossaryText',
      'GlossaryTrigger',
      'default',
      'descriptionBlock',
      'titleBlock',
    ]);
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

  it('adds the loader and the extender once when applied twice (C15)', () => {
    const c = makeConfig();
    applyConfig(applyConfig(c));
    expect(
      c.settings.appExtras.filter(
        (extra: { component: unknown }) =>
          extra.component === GlossaryTermsLoader,
      ),
    ).toHaveLength(1);
    expect(c.settings.asyncPropsExtenders).toEqual([
      glossaryAsyncPropsExtender,
    ]);
    expect(Object.keys(c.settings.slate.leafs)).toEqual(['text']);
  });

  it('starts the lists of app extras and extenders when there are none', () => {
    const c = makeConfig({
      appExtras: undefined,
      asyncPropsExtenders: undefined,
    });
    applyConfig(c);
    expect(c.settings.appExtras).toEqual([
      { match: '', component: GlossaryTermsLoader },
    ]);
    expect(c.settings.asyncPropsExtenders).toEqual([
      glossaryAsyncPropsExtender,
    ]);
  });

  it('appends the async props extender and keeps the others', () => {
    const old = { path: '/x', extend: (items: unknown[]) => items };
    const c = makeConfig({ asyncPropsExtenders: [old] });
    applyConfig(c);
    expect(c.settings.asyncPropsExtenders).toEqual([
      old,
      glossaryAsyncPropsExtender,
    ]);
  });

  it('registers the views of Glossary and Term and keeps other views', () => {
    const other = () => null;
    const c = makeConfig();
    c.views.contentTypesViews = { Other: other };
    applyConfig(c);
    expect(c.views.contentTypesViews).toEqual({
      Other: other,
      Glossary: GlossaryView,
      Term: TermView,
    });
  });
});
