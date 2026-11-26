import {
  useContext,
  useMemo,
  type ComponentType,
  type JSX,
  type ReactNode,
} from 'react';
import { ReactReduxContext, useSelector } from 'react-redux';
import { I18nProvider } from 'react-aria-components';
import config from '@plone/volto/registry';
import { GlossaryTextView, type GlossaryTriggerProps } from '../react';
import { getMatcher } from './matcherCache';
import { isTooltipRoute } from './routes';
import { getNavroot } from './selectors';
import { getGlossarySettings } from './settings';
import type { GlossaryTerm } from '../core';
import type { TooltipTermsState } from './reducers';

export interface GlossaryTextProps {
  text: ReactNode;
}

interface State {
  router?: { location?: { pathname?: string } };
  content?: { data?: unknown };
  intl?: { locale?: string };
  glossaryTooltipTerms?: TooltipTermsState;
}

/**
 * The terms the text gets tooltips from, or `null`: on a tooltip route, once
 * the terms of the content's navigation root are loaded. While they apply it
 * returns the same array, so a change of the content or the route that
 * leaves them as they are re-renders no text.
 */
function selectItems(state: State): GlossaryTerm[] | null {
  const terms = state.glossaryTooltipTerms;
  if (!terms?.loaded) return null;
  const pathname = state.router?.location?.pathname ?? '';
  return isTooltipRoute(pathname, getGlossarySettings().tooltipRoutes) &&
    terms.navroot === getNavroot(state.content?.data)
    ? terms.items
    : null;
}

const selectLocale = (state: State) => state.intl?.locale;

/**
 * Text with glossary tooltips. Renders plain text unless the route gets
 * tooltips and the terms of the current navigation root are loaded.
 * Without a Redux store, as in volto-slate's `serializeNodesToHtml`, there
 * are no terms and the text is plain.
 */
export default function GlossaryText({ text }: GlossaryTextProps): JSX.Element {
  return useContext(ReactReduxContext) ? (
    <ConnectedGlossaryText text={text} />
  ) : (
    <GlossaryTextView text={text} matcher={null} />
  );
}

function ConnectedGlossaryText({ text }: GlossaryTextProps): JSX.Element {
  const items = useSelector(selectItems);
  const locale = useSelector(selectLocale);

  const settings = getGlossarySettings();
  const matcher = useMemo(
    () => (items ? getMatcher(items, settings.caseSensitive) : null),
    [items, settings.caseSensitive],
  );

  if (!matcher) {
    return <GlossaryTextView text={text} matcher={null} />;
  }

  const TriggerComponent = config.getComponent('GlossaryTrigger')?.component as
    | ComponentType<GlossaryTriggerProps>
    | undefined;

  return (
    <I18nProvider locale={locale}>
      <GlossaryTextView
        text={text}
        matcher={matcher}
        showTermHeading={settings.mentionTermInTooltip}
        TriggerComponent={TriggerComponent}
      />
    </I18nProvider>
  );
}
