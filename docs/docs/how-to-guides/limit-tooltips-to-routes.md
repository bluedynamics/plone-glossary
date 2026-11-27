---
myst:
  html_meta:
    "description": "How to show glossary tooltips of plone-glossary on selected routes only with the setting tooltipRoutes."
    "property=og:description": "How to show glossary tooltips of plone-glossary on selected routes only with the setting tooltipRoutes."
    "property=og:title": "Show tooltips on selected routes"
    "keywords": "Plone, Volto, glossary, tooltipRoutes, routes"
---

# Show tooltips on selected routes

This guide shows you how to show tooltips on selected routes only.
By default, every route of the site gets tooltips.

(routes-set)=

## Set `tooltipRoutes`

Open the configuration of your policy add-on, usually {file}`src/index.ts`.
Set `tooltipRoutes` under `config.settings.glossary` to the routes that should get tooltips:

```ts
import type { ConfigType } from '@plone/registry';
import type { GlossarySettings } from '@bluedynamics/plone-glossary';

export default function applyConfig(config: ConfigType) {
  const glossary: Partial<GlossarySettings> = {
    tooltipRoutes: ['/documentation', { path: '/news', exact: true }],
  };
  config.settings.glossary = Object.assign(
    {},
    config.settings.glossary,
    glossary,
  );
  return config;
}
```

With this setting, `/documentation` and every page below it get tooltips.
The page `/news` gets tooltips.
The pages below `/news` get none.
All other routes get none.

Adapt the list to your site:

- To include a path and every page below it, add the path as a string.
- To include a single page, add an object with `path` and `exact: true`.
- To switch the tooltips off on every route, set an empty list `[]`.

{ref}`settings-tooltiproutes` describes the accepted values and how the package treats invalid ones.

Restart Volto.

(routes-check)=

## Check the routes

1. Open a page on a route that you listed, whose text contains a glossary term.
   The term has a dotted underline.
2. Press {kbd}`Tab` until the term has the focus, then press {kbd}`Enter`.
   The popover with the definition opens.
   Press {kbd}`Escape` to close it.
3. Open a page on a route that you did not list, with the same term in its text.
   The term looks like the rest of the text.
   {kbd}`Tab` moves past it without stopping.
