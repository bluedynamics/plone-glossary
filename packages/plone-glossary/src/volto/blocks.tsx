import type { JSX } from 'react';
import type { ConfigType } from '@plone/registry';
import GlossaryText from './GlossaryText';

interface BlockViewProps {
  properties: Record<string, string | undefined>;
  metadata?: Record<string, string | undefined>;
}

// Same markup, class names and props as Volto's title block view.
function TitleBlockView({ properties, metadata }: BlockViewProps): JSX.Element {
  return (
    <h1 className="documentFirstHeading">
      <GlossaryText text={(metadata || properties).title || ''} />
    </h1>
  );
}

// Same markup, class names and props as Volto's description block view.
function DescriptionBlockView({
  properties,
  metadata,
}: BlockViewProps): JSX.Element {
  return (
    <p className="documentDescription">
      <GlossaryText text={(metadata || properties).description || ''} />
    </p>
  );
}

function setView(config: ConfigType, block: string, view: unknown) {
  const blocksConfig = config.blocks.blocksConfig as Record<
    string,
    { view?: unknown }
  >;
  blocksConfig[block] = { ...blocksConfig[block], view };
  return config;
}

/** Optional configuration: the title block view renders glossary tooltips. */
export function titleBlock(config: ConfigType): ConfigType {
  return setView(config, 'title', TitleBlockView);
}

/** Optional configuration: the description block view renders tooltips. */
export function descriptionBlock(config: ConfigType): ConfigType {
  return setView(config, 'description', DescriptionBlockView);
}
