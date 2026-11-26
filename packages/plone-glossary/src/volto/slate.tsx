import type { ReactNode } from 'react';
import GlossaryText from './GlossaryText';

/**
 * Puts a `text` leaf first in the Slate leaf renderers, so every Slate text
 * gets tooltips. The leaf returns an element instead of calling hooks, it is
 * called as a plain function by volto-slate. Children that are not a string
 * (the editor) pass through unchanged.
 */
export function installSlateLeaf(config: {
  settings: { slate: { leafs: Record<string, unknown> } };
}): void {
  const { leafs } = config.settings.slate;
  config.settings.slate.leafs = {
    text: ({ children }: { children: ReactNode }) => (
      <GlossaryText text={children} />
    ),
    ...leafs,
  };
}
