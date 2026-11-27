---
myst:
  html_meta:
    "description": "The public API of plone-glossary, the GlossaryText component, the GlossaryTrigger registry component, the markup with its CSS classes, and the custom properties."
    "property=og:description": "The public API of plone-glossary, the GlossaryText component, the GlossaryTrigger registry component, the markup with its CSS classes, and the custom properties."
    "property=og:title": "Components and markup"
    "keywords": "Plone, Volto, glossary, GlossaryText, GlossaryTrigger, CSS, custom properties"
---

# Components and markup

This page describes what a project can use from `@bluedynamics/plone-glossary` in code and in styles.
It covers the public API, the components, the markup that the package renders, its CSS classes, and its custom properties.

(components-public-api)=

## Public API

A project may import the following from the package entry `@bluedynamics/plone-glossary`.

| Export | Kind | Purpose |
| --- | --- | --- |
| default export | function `applyConfig(config)` | The add-on configuration. Volto calls it when the package is in the project's list of add-ons. |
| `GlossaryText` | React component | Renders a text with glossary tooltips. See {ref}`components-glossarytext`. |
| `titleBlock` | function `(config) => config` | Optional view for the title block. See {ref}`settings-block-views`. |
| `descriptionBlock` | function `(config) => config` | Optional view for the description block. See {ref}`settings-block-views`. |
| `GlossaryTrigger` | React component | The package's trigger. A project renders it in its own trigger to add to it. See {ref}`components-wrap-trigger`. |
| `GlossaryTriggerProps` | TypeScript type | The props of a trigger. A project types its own trigger with it. See {ref}`components-trigger`. |
| `GlossaryTextProps` | TypeScript type | The props of `GlossaryText`. |
| `GlossarySettings` | TypeScript type | The settings under `config.settings.glossary`. A project types its configuration with it. See {doc}`settings`. |
| `TooltipRoute` | TypeScript type | One entry of the setting `tooltipRoutes`. See {ref}`settings-tooltiproutes`. |

The following parts are also public:

- the settings under `config.settings.glossary`, described in {doc}`settings`
- the registry component `GlossaryTrigger`, described in {ref}`components-trigger`
- the CSS classes and custom properties on this page

Everything else is internal, whatever import path reaches it.
This includes the modules under `src/core`, `src/react`, and `src/volto` with their `index.ts` files.
It also includes the TypeScript types that the package entry does not export, and the Redux store keys `glossaryTooltipTerms` and `glossaryTerms`.
The package makes no promise to keep them stable.

(components-applyconfig)=

## What the add-on configuration registers

`applyConfig` changes the configuration as follows:

- It adds the reducers `glossaryTooltipTerms` and `glossaryTerms` to `config.addonReducers`.
- It fills in the defaults under `config.settings.glossary`.
- It puts its text leaf first in `config.settings.slate.leafs` under the key `text` and keeps the leafs of other add-ons.
- It appends a loader to `config.settings.appExtras` with `match: ''`, which loads the terms for tooltips from `@tooltip_terms` of the current navigation root.
- It appends an extender to `config.settings.asyncPropsExtenders`.
  On the server, the extender loads the terms of a glossary from `@glossary_terms` for content of the type `Glossary`.
- It registers views for the content types `Glossary` and `Term` in `config.views.contentTypesViews`.
- It registers the component `GlossaryTrigger`.
- It imports the package's stylesheet.

Applied twice, the configuration still holds one loader and one extender.

The text leaf returns the text unchanged when `volto-slate` serializes a value for storage.
The stored HTML is the same as without the package.
In the editor, the leaf passes its content through unchanged.

(components-glossarytext)=

## `GlossaryText`

`GlossaryText` renders a text with glossary tooltips.
The package uses it for every Slate text.
A project uses it for other texts in its own views.

```jsx
import { GlossaryText } from '@bluedynamics/plone-glossary';

const CardDescription = ({ description }) => (
  <p className="card-description">
    <GlossaryText text={description} />
  </p>
);
```

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | `ReactNode` | yes | The text to render. Only a string gets tooltips. |

`GlossaryText` uses React hooks.
You must render it as an element, `<GlossaryText text={text} />`.
You must not call it as a function.

It behaves as follows:

- A `text` that is not a string is rendered unchanged and gets no tooltips.
- In a string, each line break, `\n` or `\r\n`, becomes a `br` element.
- The text is plain when there is no Redux store, as in the function `serializeNodesToHtml` of `volto-slate`.
- The text is plain on a path that gets no tooltips, see {ref}`settings-tooltiproutes`.
- The text is plain until the terms of the current content's navigation root are loaded.
  The package loads them in the browser.
  The server therefore renders plain text.
- Occurrences become tooltips in the browser only, under the conditions in {ref}`components-activation`.
- It renders the component that is registered as `GlossaryTrigger`.
- It renders inside react-aria's `I18nProvider` with Volto's current locale.
  Labels that react-aria-components adds, such as the popover's dismiss button, follow the language of the page.
- Backend URLs in the definitions become app URLs.

(components-trigger)=

## `GlossaryTrigger`

`GlossaryTrigger` is the name of the component in Volto's component registry that renders an active occurrence.
The package registers its own trigger under this name.
A project replaces it by registering its own component under the same name after the package's configuration.
For that order, the project's add-on must come after `@bluedynamics/plone-glossary` in the list of add-ons, or name it in its own `addons` list.

```js
import MyTrigger from './components/MyTrigger';

export default function applyConfig(config) {
  config.registerComponent({
    name: 'GlossaryTrigger',
    component: MyTrigger,
  });
  return config;
}
```

Volto's registry types the component as `ComponentType` from `react`, without props.
With TypeScript's `strict` option, a component with required props therefore needs a cast, `component: MyTrigger as ComponentType`.
The package registers its own trigger with the same cast.

The component receives these props:

| Prop | Type | Description |
| --- | --- | --- |
| `text` | `string` | The visible text of the occurrence, as written on the page. The package's trigger uses it as its accessible name. |
| `term` | `string` | The term of the glossary entry, as the glossary spells it. The package's trigger uses it as the name of the dialog. |
| `definitions` | `string[]` | The definitions of the entry as HTML from the backend, with backend URLs turned into app URLs. The list holds at least one definition. |
| `showTermHeading` | `boolean` | The value of the setting `mentionTermInTooltip`. |

A replacement must know these facts:

- The package renders the component only for an active occurrence, inside the wrapper `span.glossary-term`.
- The component replaces the text inside the wrapper.
  It must render `text`.
  Without it, the text of the occurrence disappears from the page.
- The component gets none of the behavior of the package's trigger.
  This includes hover, focus handling, Escape, and the rule that at most one popover is open.
- The tests check that a registered replacement is rendered with these props.
  The tests check behavior and accessibility for the package's own trigger, also inside the wrapper below.
  They do not check a replacement that renders its own control.

(components-wrap-trigger)=

### Wrapping the package's trigger

A project that only adds to the trigger renders the exported `GlossaryTrigger` in its own component.
It passes all props on.
Such a wrapper keeps the package's trigger.
It therefore keeps the tested behavior of that trigger, described in {ref}`components-default-trigger`.
The following component `MarkedTrigger` adds a decorative marker after the trigger.

```tsx
import {
  GlossaryTrigger,
  type GlossaryTriggerProps,
} from '@bluedynamics/plone-glossary';

export default function MarkedTrigger(props: GlossaryTriggerProps) {
  return (
    <>
      <GlossaryTrigger {...props} />
      <span className="my-glossary-marker" aria-hidden="true" />
    </>
  );
}
```

Register `MarkedTrigger` under the name `GlossaryTrigger` as in the previous example.
The exported `GlossaryTrigger` is the package's component itself.
It is not looked up in the registry.
`MarkedTrigger` therefore does not render itself.

The marker is inside the wrapper `span.glossary-term`, after the trigger.
It is hidden from assistive technology.
The tests register `MarkedTrigger` and check its keyboard use and its accessibility.
The trigger gets the focus with {kbd}`Tab`.
{kbd}`Enter` opens the popover and moves the focus into the dialog.
{kbd}`Escape` closes it and returns the focus to the trigger.
The check with axe-core finds no violation of the WCAG A and AA rules while the popover is closed or open.

(components-default-trigger)=

## Behavior of the package's trigger

The package's trigger behaves as follows:

- Its accessible name is the visible text of the occurrence.
  The name of its dialog is the term.
- A press opens the popover, pins it, and moves the focus into the dialog.
  A press is a click, a tap, {kbd}`Enter`, {kbd}`Space`, or a click event that assistive technology sends.
  {kbd}`Space` does not scroll the page.
- A mouse or pen pointer that rests on the trigger opens the popover after 300 milliseconds.
  The focus stays where it is.
  A touch never opens the popover this way.
  A pointer that enters with a button held opens nothing.
- A popover opened by hover stays open while the pointer is on the trigger or the popover.
  It closes 200 milliseconds after the pointer has left both.
- A press on the trigger of a popover opened by hover pins it and moves the focus into the dialog.
  A press on the trigger of a pinned popover closes it.
  A press outside the trigger and the popover closes it.
- {kbd}`Escape` inside a pinned popover closes it and returns the focus to the trigger.
- {kbd}`Escape` closes a popover opened by hover wherever the focus is.
  The package then stops the key event and prevents its default action.
  An {kbd}`Escape` that ends a text composition is left alone.
- At most one popover is open on the page.
  Hovering another term does not replace a pinned popover.
- Scrolling the page closes the popover.
  Scrolling an element that contains the trigger also closes it.
  Scrolling a long definition inside the popover does not close it.
- Following a link to another page inside the app closes the popover.
- The trigger has `aria-expanded="true"` while its popover is open.
  Its `aria-controls` then points to the dialog.

{ref}`limits-popover` lists the limits of the trigger and the popover.
{doc}`/concepts/accessibility` explains the reasons for this behavior.

(components-occurrence)=

## Markup of an occurrence

Every occurrence of a term has a wrapper `span` with the class `glossary-term`.
The wrapper is the same element in both states.

An inactive occurrence holds its text:

```html
<span class="glossary-term">Klima</span>
```

An active occurrence gets the class `glossary-term--active` and holds the trigger:

```html
<span class="glossary-term glossary-term--active">
  <span role="button" tabindex="0" class="glossary-term__trigger" aria-expanded="false">Klima</span>
</span>
```

The trigger is a `span` with the role `button`.
The library react-aria-components adds further attributes to it, such as an `id`, and `aria-controls` while the popover is open.

In a Slate text, `volto-slate` wraps a text run with occurrences in another `span` with an empty `class` attribute.
That markup exists only on the page and is not stored.

(components-activation)=

## When an occurrence becomes active

An occurrence becomes active, and so a tooltip, when all of these conditions hold:

- The page runs in the browser.
  On the server, no occurrence is active.
- The occurrence is inside an element that matches `tooltipRootSelector`.
- The occurrence is not inside an interactive element.
  The interactive elements are `a[href]`, `button`, `summary`, `label`, and the roles `button`, `link`, `menuitem`, `tab`, and `option`.
  An `a` element without `href` is not interactive.
- The occurrence is not inside an element with `data-glossary="off"`.
- The occurrence is not inside an element with `aria-hidden="true"` or `inert`.
- With `matchOnlyFirstOccurrence`, the occurrence is the first of its term that meets the other conditions.

The package follows changes of the page.
It notices content that is added or removed, and changes of the attributes `aria-hidden`, `inert`, `href`, `role`, and `data-glossary`.
It decides again at most once per animation frame.
{ref}`limits-page-changes` lists the changes it does not notice.

(components-popover)=

## Markup of the popover

The popover is a `div` with the class `glossary-popover`.
The library react-aria-components renders it in a portal at the end of `body`.
It holds a dialog, an element with the role `dialog` named after the term.
It also holds a visually hidden dismiss button that react-aria-components adds.

The dialog holds the following elements:

- With `mentionTermInTooltip`, a heading with the class `glossary-popover__heading` that shows the term.
- With one definition, a `div` with the class `glossary-popover__definition` that holds the definition's HTML.
- With several definitions, an `ol` with one `li` per definition, each with the class `glossary-popover__definition`.

(components-views)=

## Glossary and term views

The package registers views for the content types `Glossary` and `Term` of `collective.glossary`.

| Content type | View |
| --- | --- |
| `Glossary` | Title, description, letter navigation, and every term with its variants and definition, grouped by letter. |
| `Term` | Title, variants, definition, and a link "Back to glossary" to the glossary. |

The glossary view shows the terms from `@glossary_terms` of the glossary.
On the server, the package loads them together with the page.
The list is part of the server's HTML.
In the browser, the view loads them when the store holds none for this glossary.
Each letter heading has the `id` `glossary-letter-` followed by the letter, for example `glossary-letter-K`.

The glossary view shows these messages in a status region:

| Situation | Message in English |
| --- | --- |
| The terms could not be loaded. | "The glossary terms could not be loaded." with a button "Try again" |
| A retry is loading. | "Loading the glossary terms…" |
| A retry succeeded. | "The glossary terms have been loaded." |
| The glossary has no terms. | "This glossary has no terms yet." |

The texts of the views exist in English and German.
The package also has message catalogs for Spanish and Brazilian Portuguese, `es` and `pt_BR`, whose messages are empty.

(components-classes)=

## CSS classes

The package renders these classes.
Its stylesheet sets rules only on its own classes.

| Class | Element |
| --- | --- |
| `glossary-term` | The wrapper of every occurrence. |
| `glossary-term--active` | The wrapper of an active occurrence, in addition to `glossary-term`. |
| `glossary-term__trigger` | The trigger inside an active wrapper. |
| `glossary-popover` | The popover. |
| `glossary-popover__heading` | The heading with the term in the popover. |
| `glossary-popover__definition` | One definition in the popover. |
| `glossary-view` | The outer element of the glossary view. |
| `glossary-alphabet` | The letter navigation of the glossary view. |
| `matched` | A letter with terms in the letter navigation, a link. |
| `unmatched` | A letter without terms in the letter navigation. |
| `glossary` | The section with the terms in the glossary view. |
| `glossary-status` | The status region of the glossary view. |
| `glossary-retry` | The button "Try again" in the glossary view. |
| `glossary-letter` | The group of one letter in the glossary view. |
| `term` | One term in the glossary view. |
| `variants` | The variants of a term, in both views. |
| `definition` | The definition of a term, in both views. |
| `term-view` | The outer element of the term view. |
| `glossary-back` | The link back to the glossary in the term view. |

The stylesheet gives the elements this appearance:

- The trigger stays inline, inherits the typography and color of its text, and has an underline.
- A trigger with keyboard focus has an outline of 2 pixels in the current text color.
- The popover is at most `24rem` wide and never wider than the viewport minus `2rem`.
- The popover has a white background, dark text, a gray border, and a shadow.
  These colors are fixed.
- A long definition scrolls inside the popover.
  Long words wrap, and images and videos shrink to the popover's width.
- The printed page leaves out an open popover.
- The trigger and the popover have no animation and no transition.

(components-custom-properties)=

## Custom properties

| Property | Default | Effect |
| --- | --- | --- |
| `--glossary-term-underline-color` | `currentcolor` | The color of the trigger's underline. |
| `--glossary-term-underline-style` | `dotted` | The style of the trigger's underline, a value of `text-decoration-style`. |
| `--glossary-popover-max-width` | `24rem` | The maximum width of the popover. The popover is never wider than the viewport minus `2rem`. |

Set the underline properties on `:root` or on any ancestor of the text.
The popover renders at the end of `body`.
Set `--glossary-popover-max-width` on `:root` or on `body`.

```css
:root {
  --glossary-term-underline-color: #0b5394;
  --glossary-popover-max-width: 30rem;
}
```
