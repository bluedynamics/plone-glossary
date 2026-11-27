---
myst:
  html_meta:
    "description": "How to move a Volto project from @rohberg/volto-slate-glossary to plone-glossary, and what changes for editors and readers."
    "property=og:description": "How to move a Volto project from @rohberg/volto-slate-glossary to plone-glossary, and what changes for editors and readers."
    "property=og:title": "Migrate from @rohberg/volto-slate-glossary"
    "keywords": "Plone, Volto, glossary, migration, volto-slate-glossary"
---

# Migrate from `volto-slate-glossary`

This guide shows you how to move a project from `@rohberg/volto-slate-glossary` to this package.
The package owes the old add-on no backward compatibility.
{ref}`settings-old-names` maps every old name to its successor.

(migrate-package)=

## Swap the package

Remove the old add-on from your policy add-on and add the package.
Replace `volto-my-project` with the name of your policy add-on.

```shell
pnpm --filter volto-my-project remove @rohberg/volto-slate-glossary
pnpm --filter volto-my-project add @bluedynamics/plone-glossary
```

Replace `@rohberg/volto-slate-glossary` with `@bluedynamics/plone-glossary` wherever your project lists it:

- the list `addons` in {file}`volto.config.js`
- the key `addons` in the {file}`package.json` of your policy add-on
- the dependencies, also a `workspace:*` entry in the {file}`package.json` at the root of the project
- an entry in {file}`mrs.developer.json`, if your project checked out the old add-on

The package needs `collective.glossary` 3.x in the backend.
Upgrade the backend first if it runs an older version.
{ref}`compatibility-backend` lists the tested version.

(migrate-imports)=

## Rename the imports

Import everything from the package entry `@bluedynamics/plone-glossary`.
The old paths `@rohberg/volto-slate-glossary/components`, `@rohberg/volto-slate-glossary/utils`, and `@rohberg/volto-slate-glossary/actions` have no successor.
The actions `getTooltipTerms` and `getGlossaryTerms` are gone.
The old store keys `glossaryterms` and `glossarytooltipterms` are gone too.
The store keys of the package are internal, see {ref}`components-public-api`.

Replace each call of the function `TextWithGlossaryTooltips` with the component `GlossaryText`.
Render it as an element.
The old code called the function:

```jsx
description = TextWithGlossaryTooltips({ text: description });
```

The new code renders the component:

```tsx
import type { JSX } from 'react';
import { GlossaryText } from '@bluedynamics/plone-glossary';

export function Description({ text }: { text: string }): JSX.Element {
  return (
    <p className="documentDescription">
      <GlossaryText text={text} />
    </p>
  );
}
```

If you copied the example views of the old add-on, replace them as follows:

- Remove your copies of `TitleBlockViewWithTooltips` and `DescriptionBlockViewWithTooltips`.
  Switch on the package's own views as {ref}`settings-block-views` describes.
- Remove your copy of `AccordionBlockViewWithTooltips`.
  Slate text inside the panels gets tooltips through the package's text leaf.
  The tests cover nested blocks in the grid block only.
  The panel titles lose their tooltips.
  Each title is a control with the role `button`.
  The package renders no trigger inside a control.
  {ref}`accessibility-links` explains why.
- Remove your copy of `TeaserViewWithTooltips`.
  Volto's teaser renders its description inside a link, where the package renders no tooltip.
  For a card with tooltips, follow {doc}`tooltips-in-cards`.

If you registered your own component as `TooltipPopup`, register it as `GlossaryTrigger` instead.
It receives other props.
{ref}`components-trigger` lists them and shows the registration.

(migrate-settings)=

## Rename the settings

Rename the setting `matchOnlyFirstOccurence` to `matchOnlyFirstOccurrence`.
The old spelling has no effect.

Remove the setting `includeAccordionBlock`.
The package renders tooltips in the Slate text of nested blocks without it.

The settings `caseSensitive`, `showAlphabetNavigation`, and `mentionTermInTooltip` keep their names.

The old add-on replaced the whole object `config.settings.glossary` with its defaults.
Set your values with the pattern in {ref}`settings-overview`.
That pattern works whether your configuration runs before or after the package's configuration.

(migrate-appextra)=

## Remove the `Tooltips` app extra

Remove every entry with the component `Tooltips` from `config.settings.appExtras`, together with its import.
The package registers its own loader.
If such an entry has `props`, drop them.
The old `Tooltips` read only the path and the content.
Such props had no effect.
Set options under `config.settings.glossary` instead.

Move the `match` values of the removed entries to the setting `tooltipRoutes`.
For example, entries with `match: '/documentation'` and `match: '/news'` become the following setting.
Add the lines that set `config.settings.glossary` to the function that configures your policy add-on.

```ts
import type { ConfigType } from '@plone/registry';
import type { GlossarySettings } from '@bluedynamics/plone-glossary';

export default function applyConfig(config: ConfigType) {
  const glossary: Partial<GlossarySettings> = {
    tooltipRoutes: ['/documentation', '/news'],
  };
  config.settings.glossary = Object.assign(
    {},
    config.settings.glossary,
    glossary,
  );
  return config;
}
```

If your entries covered every route, for example with `match: ''`, set nothing.
The default of `tooltipRoutes` covers every route.
{doc}`limit-tooltips-to-routes` describes the setting.

(migrate-gone)=

## Replace what is gone

The following parts of the old add-on have no successor:

- The member field `glossarytooltips`, with which a user could switch the tooltips off.
  Remove the field from the user schema if nothing else uses it.
- The old CSS classes, such as `glossarytooltip`, `tooltip`, and `tooltip_content`.
  Rewrite your styles for the classes in {ref}`components-classes`.
  The custom properties in {ref}`components-custom-properties` cover the underline and the width of the popover.
- The anchors of the letters in the glossary view, such as `#K`.
  A letter's anchor is now `#glossary-letter-K`.
  Update links that point to the old anchors.

(migrate-behavior)=

## Behavior that changes for readers and editors

The following behavior changes without a renamed setting.
Tell your editors about it.

- The old trigger was a `span` that the keyboard could not reach.
  It opened on a click or when the mouse pointer rested on it.
  The new trigger is in the tab order.
  A click, a tap, {kbd}`Enter`, or {kbd}`Space` opens the popover and moves the focus into it.
  A mouse pointer that rests on the term for 300 milliseconds opens a preview.
  The preview leaves the focus where it is.
- Every term with a tooltip is a tab stop.
  A long text with frequent terms gets many of them.
  {ref}`accessibility-tab-stops` explains the trade-off and the setting `matchOnlyFirstOccurrence`.
- A term inside a link, a button, or another interactive element gets no tooltip.
  The old add-on showed tooltips inside links.
- The start page of the site, the route `/`, gets tooltips.
  The old add-on showed none there.
  To keep the start page without tooltips, list the routes that should get them in `tooltipRoutes`.
- With `showAlphabetNavigation: false`, the glossary view shows no letter navigation.
  In the old add-on, the value had no effect.
  The navigation always showed.
  If your project set `false`, the glossary view loses its letter navigation after the migration.
  Remove the setting to keep the navigation.
- With `mentionTermInTooltip: true`, the heading of the popover shows the term as the glossary spells it.
  The old add-on showed the text as written on the page.

{doc}`/reference/known-limits` lists the limits of the new package.

(migrate-check)=

## Check the migration

1. Restart Volto.
2. Open a page whose text contains a glossary term, and reload it.
   The term has a dotted underline.
3. Press {kbd}`Tab` until the term has the focus, then press {kbd}`Enter`.
   The popover with the definition opens.
   The focus moves into the popover.
4. Press {kbd}`Escape`.
   The popover closes.
   The focus returns to the term.
5. Open the glossary.
   The view lists the terms by letter.
6. Search the code of your project for `volto-slate-glossary`, `TooltipPopup`, and `TextWithGlossaryTooltips`.
   No result remains.
