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
  config.settings.appExtras = [
    ...(config.settings.appExtras ?? []),
    // Volto passes `props` only when an entry has them.
    { match: '', component: GlossaryTermsLoader } as never,
  ];
  config.settings.asyncPropsExtenders = [
    ...(config.settings.asyncPropsExtenders ?? []),
    glossaryAsyncPropsExtender,
  ];
  config.views.contentTypesViews = {
    ...config.views.contentTypesViews,
    Glossary: GlossaryView,
    Term: TermView,
  };
  config.registerComponent({
    name: 'GlossaryTrigger',
    component: GlossaryTrigger,
  });
  return config;
}

export default applyConfig;
export { default as GlossaryText } from './volto/GlossaryText';
