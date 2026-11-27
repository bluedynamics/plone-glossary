import { useContext, type ReactNode } from 'react';
import { ReactReduxContext } from 'react-redux';
import GlossaryText from './GlossaryText';

/**
 * The Slate text leaf. On a routed page it returns `GlossaryText` for the
 * string of a text run, on the server and in the browser alike. Everywhere
 * else it returns its children unchanged (R47): when volto-slate serializes
 * a value for storage (`HtmlSlateWidget` renders with a static store of its
 * own) or without any store (`serializeNodesToHtml`), and for an empty or
 * whitespace-only string, so volto-slate's `Leaf` adds no wrapper and the
 * stored HTML is exactly what Volto stores without this package.
 *
 * A routed page is told apart by the store: Volto's store always holds the
 * router's location (`connectRouter`), the static store holds only the
 * session. This is a hook, called by volto-slate's `Leaf` component for the
 * key `text` exactly once per render (every Slate text has that key), so the
 * order of hooks inside `Leaf` never changes.
 */
export function useGlossaryLeaf({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const redux = useContext(ReactReduxContext);
  const state = redux?.store.getState() as
    | { router?: { location?: unknown } }
    | undefined;
  if (!state?.router?.location) return children;
  if (typeof children !== 'string' || children.trim() === '') return children;
  return <GlossaryText text={children} />;
}

/**
 * Puts the text leaf first in the Slate leaf renderers, so every Slate text
 * gets tooltips. Children that are not a string (the editor) pass through
 * unchanged.
 */
export function installSlateLeaf(config: {
  settings: { slate: { leafs: Record<string, unknown> } };
}): void {
  const { leafs } = config.settings.slate;
  config.settings.slate.leafs = {
    text: useGlossaryLeaf,
    ...leafs,
  };
}
