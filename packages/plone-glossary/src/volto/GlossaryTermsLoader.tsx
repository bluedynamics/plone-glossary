import { useContext, useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
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
  const store = useStore<{ glossaryTooltipTerms?: TooltipTermsState }>();
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

  // No content yet: nothing to load, not even the site root.
  const navroot = content == null ? null : getNavroot(content);
  const wanted = isTooltipRoute(pathname, tooltipRoutes);
  useEffect(() => {
    // The store, not the value of the last render: a request started since
    // (by a second loader, or by StrictMode running this effect twice) has
    // already set the navigation root it loads.
    const current = store.getState().glossaryTooltipTerms?.navroot ?? null;
    if (wanted && navroot !== null && navroot !== current) {
      dispatch(getTooltipTerms(navroot));
    }
  }, [wanted, navroot, loadedNavroot, dispatch, store]);

  return null;
}
