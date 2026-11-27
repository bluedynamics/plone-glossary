---
myst:
  html_meta:
    "description": "The settings of plone-glossary, the data-glossary attribute, the optional title and description block views, and the names of the old add-on."
    "property=og:description": "The settings of plone-glossary, the data-glossary attribute, the optional title and description block views, and the names of the old add-on."
    "property=og:title": "Settings"
    "keywords": "Plone, Volto, glossary, settings, tooltipRoutes, matchOnlyFirstOccurrence"
---

# Settings

This page lists the settings of `@bluedynamics/plone-glossary` and the configuration a project can add.
It covers the following topics:

- the settings under `config.settings.glossary`
- the `data-glossary` attribute
- the optional views for the title and description blocks
- the names of the add-on `@rohberg/volto-slate-glossary` and their successors

(settings-overview)=

## Settings under `config.settings.glossary`

All settings live in the object `config.settings.glossary`.

| Setting | Type | Default | Effect |
| --- | --- | --- | --- |
| `tooltipRoutes` | list of routes | `['/']` | The paths whose text gets tooltips. |
| `tooltipRootSelector` | string | `'main'` | The CSS selector of the page area in which occurrences become tooltips. |
| `caseSensitive` | Boolean | `false` | With `true`, every term matches only its exact spelling. |
| `matchOnlyFirstOccurrence` | Boolean | `false` | With `true`, only the first occurrence of each term on a page gets a tooltip. |
| `mentionTermInTooltip` | Boolean | `false` | With `true`, the popover shows the term as a heading above its definitions. |
| `showAlphabetNavigation` | Boolean | `true` | With `false`, the glossary view shows no letter navigation. |

These rules apply to every setting:

- The package fills in the default of every setting that the project does not set.
- The package keeps a value that is already set when its own configuration runs.
- The package reads the settings each time it renders.
- The default applies to a setting whose value is `undefined` or of another type.
- Keys that the package does not know stay in the object and have no effect.

The following project configuration works whether it runs before or after the package's configuration:

```js
export default function applyConfig(config) {
  config.settings.glossary = Object.assign({}, config.settings.glossary, {
    matchOnlyFirstOccurrence: true,
  });
  return config;
}
```

(settings-tooltiproutes)=

## `tooltipRoutes`

`tooltipRoutes` lists the paths on which text gets tooltips.
Its default `['/']` matches every path.

Each entry is one of the following:

- a string with a path pattern
- an object with the options of react-router's `matchPath`: `path` as a string, and the Booleans `exact`, `strict`, and `sensitive`

The package matches an entry against the current path as Volto matches the `match` of an entry in `config.settings.appExtras`.
A string matches its path and every path below it.
An object with `exact: true` matches only its own path.

```js
config.settings.glossary = Object.assign({}, config.settings.glossary, {
  tooltipRoutes: ['/documentation', { path: '/news', exact: true }],
});
```

The value is interpreted as follows:

- A single route that is not in a list counts as a list of one.
- An entry that is neither a string nor an object with a string `path` is left out.
- A list with entries of which none is usable falls back to the default `['/']`.
- An empty list `[]` gives tooltips on no path.
- A value of another type, such as a number, falls back to the default.

Routes that Volto's `isCmsUi` classifies as editing interface never get tooltips, whatever the setting says.
Examples are the paths ending in `/edit`, `/add`, or `/contents`, and `/controlpanel`.
The package requests the terms for tooltips only on a path that gets tooltips.

{ref}`limits-cms-route-names` describes content paths that Volto classifies as editing interface.

(settings-tooltiprootselector)=

## `tooltipRootSelector`

`tooltipRootSelector` is a CSS selector.
An occurrence becomes a tooltip only inside an element that matches it.
With the default `'main'`, text in the page header and footer gets no tooltips.

An invalid selector raises no error.
With an invalid selector, no occurrence becomes a tooltip.

{ref}`components-activation` lists the other conditions for an occurrence to become a tooltip.
{ref}`limits-page-changes` describes a change of the page that the package does not follow for this selector.

(settings-casesensitive)=

## `caseSensitive`

With the default `false`, terms match regardless of case, except terms that have uppercase letters and no lowercase letter, such as `REST`.
Those always match their exact spelling.
With `true`, every term matches only its exact spelling.

{ref}`matching-rules-case` describes the rule with examples.

(settings-matchonlyfirstoccurrence)=

## `matchOnlyFirstOccurrence`

With the default `false`, every occurrence of a term gets a tooltip.

With `true`, only the first occurrence of each term on the page gets a tooltip.
The first occurrence is the one that comes first in document order among the occurrences that can become a tooltip.
The other occurrences stay plain text.
Terms that differ only in case count as one term.
When the first occurrence leaves the page, the next one gets the tooltip.

The default is `false` on purpose.
{ref}`accessibility-tab-stops` explains the trade-off.
{ref}`limits-first-occurrence` lists three limits that exist only with `true`.

(settings-mentionterm)=

## `mentionTermInTooltip`

With `true`, the popover shows the term as a heading above its definitions.
The heading names the dialog.
With the default `false`, the popover shows only the definitions.
The dialog then carries the term as its accessible name.

The term in the popover is the term as the glossary spells it.
It can differ from the text on the page, for example in case.
The package passes the value to the trigger as the prop `showTermHeading`.

(settings-alphabet)=

## `showAlphabetNavigation`

With the default `true`, the glossary view shows a letter navigation above the terms.
It lists the letters A to Z, followed by the letters of groups outside A to Z.
A letter with terms links to its section in the list.
A letter without terms is plain text.
The navigation is a `nav` element, named "Glossary index" in English.

With `false`, the glossary view shows no letter navigation.

(settings-data-glossary)=

## The `data-glossary` attribute

Occurrences inside an element with the attribute `data-glossary="off"` never become tooltips.
The attribute applies to the element and everything inside it.
Only the value `off` has this effect.

```html
<aside data-glossary="off">
  <p>The climate in this box gets no tooltip.</p>
</aside>
```

The package still finds the terms in such an element and wraps each occurrence in `span.glossary-term`.
The occurrence stays plain text.
The package follows the attribute when it is added or removed after the page has loaded.

(settings-block-views)=

## Optional block views

The package exports two optional configurations, `titleBlock` and `descriptionBlock`.
Each one replaces the `view` of a block in `config.blocks.blocksConfig` and keeps the block's other settings.

| Export | Block | Rendered markup |
| --- | --- | --- |
| `titleBlock` | `title` | `h1.documentFirstHeading` with the title through `GlossaryText` |
| `descriptionBlock` | `description` | `p.documentDescription` with the description through `GlossaryText` |

The markup and class names are the same as in Volto's own views of these blocks.
Both views read the value from the content's metadata, and from the block's properties when there is no metadata.
Without these configurations, the package leaves the views of both blocks as they are.

A project can switch them on in its list of add-ons with Volto's named configuration loaders.
Volto then applies the package's default configuration first, then `titleBlock` and `descriptionBlock`.

```js
const addons = ['@bluedynamics/plone-glossary:titleBlock,descriptionBlock'];
```

Alternatively, a project calls them in its own configuration.
Each function takes the configuration and returns it:

```js
import { descriptionBlock, titleBlock } from '@bluedynamics/plone-glossary';

export default function applyConfig(config) {
  titleBlock(config);
  descriptionBlock(config);
  return config;
}
```

(settings-old-names)=

## Names in `@rohberg/volto-slate-glossary`

The package owes `@rohberg/volto-slate-glossary` no backward compatibility.
The following table maps the names of version 2.3.1 of that add-on to their successors.

| Old name | New name | Note |
| --- | --- | --- |
| setting `caseSensitive` | `caseSensitive` | Unchanged. |
| setting `matchOnlyFirstOccurence` | `matchOnlyFirstOccurrence` | Spelling corrected. The old name has no effect. |
| setting `showAlphabetNavigation` | `showAlphabetNavigation` | Unchanged. |
| setting `mentionTermInTooltip` | `mentionTermInTooltip` | Unchanged. |
| setting `includeAccordionBlock` | none | Gone. The package's text leaf renders the Slate text of every block that `volto-slate` renders, also in nested blocks, except in the case of {ref}`limits-slate-leafs`. The tests cover nesting in the grid block. To exclude an area, use `data-glossary="off"`. |
| component `Tooltips` from `@rohberg/volto-slate-glossary/components`, registered in `config.settings.appExtras` with `match` | `tooltipRoutes` | Gone. The package registers its own loader for all routes. |
| function `TextWithGlossaryTooltips` from `@rohberg/volto-slate-glossary/utils` | `GlossaryText` | Render it as an element, `<GlossaryText text={text} />`. |
| registry component `TooltipPopup` with the props `term`, `definition`, and `idx` | `GlossaryTrigger` | The props are `text`, `term`, `definitions`, and `showTermHeading`. See {ref}`components-trigger`. |
| example views `TitleBlockViewWithTooltips` and `DescriptionBlockViewWithTooltips` | `titleBlock` and `descriptionBlock` | Part of the package. See {ref}`settings-block-views`. |
| example view `TeaserViewWithTooltips` | none | Gone. Volto's teaser renders its title and description inside a link, where the package renders no tooltip. |
| example view `AccordionBlockViewWithTooltips` | none | Gone. An accordion block whose panels hold Slate text blocks needs no setting of its own. The tests contain no accordion block. |
| member field `glossarytooltips` for a per-user opt-out | none | Gone. |
| CSS class `glossarytooltip` | `glossary-term__trigger` | See {ref}`components-classes`. |
| CSS classes `tooltip` and `tooltip_content` | `glossary-popover` and `glossary-popover__definition` | See {ref}`components-classes`. |
| CSS class `glossaryAlphabet` on the letter navigation | `glossary-alphabet` | The navigation is a `nav` element. |
| CSS class `alphabetLetter` on each letter | none | The letters keep the classes `matched` and `unmatched`. |
| CSS class `letter` on the letter heading | none | Select the heading with `.glossary-letter > h2`. |
| anchor `#K` of a letter, the heading's `id` `K` | `#glossary-letter-K`, the heading's `id` `glossary-letter-K` | Links to the old anchors no longer reach the letter. |
| CSS class `item` on the term view's link back to the glossary | `glossary-back` | See {ref}`components-classes`. |
