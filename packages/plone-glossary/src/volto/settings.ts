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
  return withDefaults(configured);
}

const BOOLEANS = [
  'caseSensitive',
  'matchOnlyFirstOccurrence',
  'mentionTermInTooltip',
  'showAlphabetNavigation',
] as const;

/** Routes as a list of strings; a single string is a list of one route. */
function routesOf(value: unknown): string[] | undefined {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.filter((route): route is string => typeof route === 'string');
  }
  return undefined;
}

/**
 * The defaults, overridden by every setting that has the right type. A
 * setting that is `undefined` or of another type is ignored, so a mistake in
 * the project's configuration cannot break the page; a route that is not a
 * string is left out. The result shares no array with the defaults or the
 * configuration, a caller may change it. Other keys are kept.
 */
export function withDefaults(
  configured?: Partial<GlossarySettings>,
): GlossarySettings {
  const given: Record<string, unknown> =
    configured && typeof configured === 'object' ? { ...configured } : {};
  const settings: Record<string, unknown> = Object.fromEntries(
    Object.entries(given).filter(([, value]) => value !== undefined),
  );
  settings.tooltipRoutes = [
    ...(routesOf(given.tooltipRoutes) ?? defaultGlossarySettings.tooltipRoutes),
  ];
  settings.tooltipRootSelector =
    typeof given.tooltipRootSelector === 'string'
      ? given.tooltipRootSelector
      : defaultGlossarySettings.tooltipRootSelector;
  for (const key of BOOLEANS) {
    settings[key] =
      typeof given[key] === 'boolean'
        ? given[key]
        : defaultGlossarySettings[key];
  }
  return settings as unknown as GlossarySettings;
}
