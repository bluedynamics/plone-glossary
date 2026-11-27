import { matchPath } from 'react-router';
import { isCmsUi } from '@plone/volto/helpers/Url/Url';
import type { TooltipRoute } from './settings';

/** True if the route is content (not the CMS UI) and matches a tooltip route. */
export function isTooltipRoute(
  pathname: string,
  tooltipRoutes: TooltipRoute[],
): boolean {
  if (isCmsUi(pathname)) return false;
  return tooltipRoutes.some((route) => Boolean(matchPath(pathname, route)));
}
