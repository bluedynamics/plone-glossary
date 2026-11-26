import { useMemo, type ComponentType, type JSX, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { I18nProvider } from 'react-aria-components';
import config from '@plone/volto/registry';
import { GlossaryTextView, type GlossaryTriggerProps } from '../react';
import { getMatcher } from './matcherCache';
import { isTooltipRoute } from './routes';
import { getNavroot } from './selectors';
import { getGlossarySettings } from './settings';
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
 * Text with glossary tooltips. Renders plain text unless the route gets
 * tooltips and the terms of the current navigation root are loaded.
 */
export default function GlossaryText({ text }: GlossaryTextProps): JSX.Element {
  const pathname = useSelector(
    (state: State) => state.router?.location?.pathname ?? '',
  );
  const content = useSelector((state: State) => state.content?.data);
  const terms = useSelector((state: State) => state.glossaryTooltipTerms);
  const locale = useSelector((state: State) => state.intl?.locale);

  const settings = getGlossarySettings();
  const ready =
    isTooltipRoute(pathname, settings.tooltipRoutes) &&
    !!terms?.loaded &&
    terms.navroot === getNavroot(content);

  const items = ready ? terms.items : null;
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
