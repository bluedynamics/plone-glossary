---
myst:
  html_meta:
    "description": "How to show glossary tooltips of plone-glossary in the text of your own Volto block with the component GlossaryText."
    "property=og:description": "How to show glossary tooltips of plone-glossary in the text of your own Volto block with the component GlossaryText."
    "property=og:title": "Show tooltips in your own block"
    "keywords": "Plone, Volto, glossary, GlossaryText, block"
---

# Show tooltips in your own block

This guide shows you how to show tooltips in the text of your own block.
Slate text gets tooltips without further work.
Follow this guide for a text that your block renders from a plain string, such as a field of the block's data.

(block-import)=

## Import `GlossaryText`

Import the component from the package entry in the view of your block:

```ts
import { GlossaryText } from '@bluedynamics/plone-glossary';
```

Do not import it from a path inside the package.
{ref}`components-public-api` lists what a project may import.

(block-render)=

## Render the text through `GlossaryText`

Pass the string as the prop `text` and render the component as an element.
The following view of a quote block renders its quote with tooltips:

```tsx
import type { JSX } from 'react';
import { GlossaryText } from '@bluedynamics/plone-glossary';

interface QuoteViewProps {
  data: { quote?: string; source?: string };
}

export default function QuoteView({ data }: QuoteViewProps): JSX.Element {
  return (
    <figure className="quote-block">
      <blockquote>
        <p>
          <GlossaryText text={data.quote ?? ''} />
        </p>
      </blockquote>
      {data.source && <figcaption>{data.source}</figcaption>}
    </figure>
  );
}
```

Keep these rules in mind:

- Render `<GlossaryText text={text} />`.
  Do not call `GlossaryText` as a function.
- Pass a string.
  A value of another type is rendered unchanged and gets no tooltips.
- Keep the text outside links and buttons.
  A term inside an interactive element gets no tooltip.
  If your block links to another page, follow {doc}`tooltips-in-cards`.
- Expect tooltips only where the package activates them.
  The text must be inside the element that `tooltipRootSelector` selects, `main` by default.
  The page must be on a route of `tooltipRoutes`.
  See {ref}`settings-tooltiprootselector` and {ref}`settings-tooltiproutes`.

{ref}`components-glossarytext` describes the component and its behavior.

(block-check)=

## Check the block

1. Add your block to a page and enter a text that contains a glossary term.
2. Save the page and reload it in your browser.
   The term has a dotted underline.
3. Press {kbd}`Tab` until the term has the focus.
4. Press {kbd}`Enter`.
   The popover with the definition opens.
   The focus moves into the popover.
5. Press {kbd}`Escape`.
   The popover closes.
   The focus returns to the term.
