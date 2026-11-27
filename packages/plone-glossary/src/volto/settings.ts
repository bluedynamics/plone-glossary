import config from '@plone/volto/registry';

/**
 * A route as `match` of Volto's `appExtras` takes it: a path pattern, or the
 * options of react-router's `matchPath` with a string `path`.
 */
export type TooltipRoute =
  | string
  | { path: string; exact?: boolean; strict?: boolean; sensitive?: boolean };

export interface GlossarySettings {
  tooltipRoutes: TooltipRoute[];
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

function isRoute(route: unknown): route is TooltipRoute {
  return (
    typeof route === 'string' ||
    (!!route &&
      typeof route === 'object' &&
      typeof (route as { path?: unknown }).path === 'string')
  );
}

/**
 * The usable routes of a setting, each a copy; a single route is a list of
 * one. A list whose entries are all unusable is no setting at all, so a
 * mistake does not switch the tooltips off everywhere. An empty list stays
 * empty: tooltips on no route.
 */
function routesOf(value: unknown): TooltipRoute[] | undefined {
  const list = Array.isArray(value) ? value : [value];
  const routes = list
    .filter(isRoute)
    .map((route) => (typeof route === 'string' ? route : { ...route }));
  return routes.length > 0 || (Array.isArray(value) && value.length === 0)
    ? routes
    : undefined;
}

/**
 * The defaults, overridden by every setting that has the right type. A
 * setting that is `undefined` or of another type is ignored, so a mistake in
 * the project's configuration cannot break the page; a route that is neither
 * a string nor `matchPath` options with a string `path` is left out. The
 * result shares no array or route with the defaults or the configuration, a
 * caller may change it. Other keys are kept.
 */
export function withDefaults(
  configured?: Partial<GlossarySettings>,
): GlossarySettings {
  const given: Record<string, unknown> =
    configured && typeof configured === 'object' ? { ...configured } : {};
  const settings: Record<string, unknown> = Object.fromEntries(
    Object.entries(given).filter(([, value]) => value !== undefined),
  );
  settings.tooltipRoutes =
    routesOf(given.tooltipRoutes) ??
    routesOf(defaultGlossarySettings.tooltipRoutes);
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
