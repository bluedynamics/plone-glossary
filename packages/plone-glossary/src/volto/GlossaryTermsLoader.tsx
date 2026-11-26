import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ActivationContext } from '../react';
import { getTooltipTerms } from './actions';
import { isTooltipRoute } from './routes';
import { getNavroot } from './selectors';
import { getGlossarySettings } from './settings';
import type { TooltipTermsState } from './reducers';

export interface GlossaryTermsLoaderProps {
  content?: unknown;
  pathname: string;
}

/**
 * App extra: loads the tooltip terms of the navigation root of the current
 * content and configures the activation of the occurrences. Renders nothing.
 */
export default function GlossaryTermsLoader({
  content,
  pathname,
}: GlossaryTermsLoaderProps): null {
  const dispatch = useDispatch();
  const loadedNavroot = useSelector(
    (state: { glossaryTooltipTerms?: TooltipTermsState }) =>
      state.glossaryTooltipTerms?.navroot ?? null,
  );
  const registry = useContext(ActivationContext);
  const { tooltipRoutes, matchOnlyFirstOccurrence, tooltipRootSelector } =
    getGlossarySettings();

  useEffect(() => {
    registry.configure({
      firstOnly: matchOnlyFirstOccurrence,
      rootSelector: tooltipRootSelector,
    });
  }, [registry, matchOnlyFirstOccurrence, tooltipRootSelector]);

  const navroot = getNavroot(content);
  const wanted = isTooltipRoute(pathname, tooltipRoutes);
  useEffect(() => {
    if (wanted && navroot !== loadedNavroot) {
      dispatch(getTooltipTerms(navroot));
    }
  }, [wanted, navroot, loadedNavroot, dispatch]);

  return null;
}
