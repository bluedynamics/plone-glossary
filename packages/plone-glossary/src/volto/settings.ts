import config from '@plone/volto/registry';

export interface GlossarySettings {
  tooltipRoutes: string[];
  tooltipRootSelector: string;
  caseSensitive: boolean;
  matchOnlyFirstOccurrence: boolean;
  mentionTermInTooltip: boolean;
  showAlphabetNavigation: boolean;
}

export const defaultGlossarySettings: GlossarySettings = {
  tooltipRoutes: ['/'],
  tooltipRootSelector: 'main',
  caseSensitive: false,
  matchOnlyFirstOccurrence: false,
  mentionTermInTooltip: false,
  showAlphabetNavigation: true,
};

/** The defaults merged under `config.settings.glossary`, read on every call. */
export function getGlossarySettings(): GlossarySettings {
  const configured = (
    config.settings as { glossary?: Partial<GlossarySettings> } | undefined
  )?.glossary;
  return { ...defaultGlossarySettings, ...configured };
}
