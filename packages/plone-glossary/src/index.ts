import type { ComponentType } from 'react';
import type { ConfigType } from '@plone/registry';
import { GlossaryTrigger } from './react';
import { glossaryTerms, glossaryTooltipTerms } from './volto/reducers';
import { withDefaults } from './volto/settings';
import GlossaryTermsLoader from './volto/GlossaryTermsLoader';
import { installSlateLeaf } from './volto/slate';
import { glossaryAsyncPropsExtender } from './volto/ssr';
import GlossaryView from './volto/views/GlossaryView';
import TermView from './volto/views/TermView';
import './styles/glossary.css';

function applyConfig(config: ConfigType) {
  config.addonReducers = {
    ...config.addonReducers,
    glossaryTooltipTerms,
    glossaryTerms,
  };
  config.settings.glossary = withDefaults(config.settings.glossary);
  installSlateLeaf(config as never);
  // Applied twice, the configuration still holds one loader and one
  // extender, so the terms are requested once.
  const appExtras = config.settings.appExtras ?? [];
  if (!appExtras.some((extra) => extra.component === GlossaryTermsLoader)) {
    config.settings.appExtras = [
      ...appExtras,
      // Volto passes `props` only when an entry has them.
      { match: '', component: GlossaryTermsLoader } as never,
    ];
  }
  const extenders = config.settings.asyncPropsExtenders ?? [];
  if (!extenders.includes(glossaryAsyncPropsExtender)) {
    config.settings.asyncPropsExtenders = [
      ...extenders,
      glossaryAsyncPropsExtender,
    ];
  }
  // Volto types these components without props, and a component with
  // required props is not assignable to that type under `strict`. Volto
  // passes the props at runtime, the cast changes nothing there.
  config.views.contentTypesViews = {
    ...config.views.contentTypesViews,
    Glossary: GlossaryView as ComponentType,
    Term: TermView as ComponentType,
  };
  config.registerComponent({
    name: 'GlossaryTrigger',
    // Typed without props by the registry, see above.
    component: GlossaryTrigger as ComponentType,
  });
  return config;
}

export default applyConfig;
export { default as GlossaryText } from './volto/GlossaryText';
export type { GlossaryTextProps } from './volto/GlossaryText';
export { titleBlock, descriptionBlock } from './volto/blocks';
// For a project that replaces the registered trigger or wraps this one.
export { GlossaryTrigger } from './react';
export type { GlossaryTriggerProps } from './react';
// For a project that types its `config.settings.glossary`.
export type { GlossarySettings, TooltipRoute } from './volto/settings';
