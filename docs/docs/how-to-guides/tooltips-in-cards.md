---
myst:
  html_meta:
    "description": "How to build a card that links to another page and keeps the glossary tooltips of plone-glossary in its description reachable for keyboard, touch, and mouse."
    "property=og:description": "How to build a card that links to another page and keeps the glossary tooltips of plone-glossary in its description reachable for keyboard, touch, and mouse."
    "property=og:title": "Keep tooltips in a linked card"
    "keywords": "Plone, Volto, glossary, card, teaser, link, accessibility"
---

# Keep tooltips in a linked card

This guide shows you how to keep tooltips accessible in a card that links to another page.
A term inside a link gets no tooltip.
{ref}`accessibility-links` explains why.
The card in this guide keeps its description outside the link.
A click on any free area of the card outside the description still follows the link.

The code is based on the card block of the demo add-on in the repository of the package.

(cards-title-link)=

## Make the title the link

Render the title as the only link of the card.
Render the description in a paragraph next to it, through `GlossaryText`:

```tsx
import type { JSX } from 'react';
import { flattenToAppURL } from '@plone/volto/helpers/Url/Url';
import { GlossaryText } from '@bluedynamics/plone-glossary';
import './demo.css';

interface DemoCardProps {
  data: { title?: string; description?: string; href?: string };
}

export default function DemoCard({ data }: DemoCardProps): JSX.Element | null {
  const description = data.description ? (
    <p className="demo-card__description">
      <GlossaryText text={data.description} />
    </p>
  ) : null;

  // A link needs a name and a target, so without both render no link at all.
  if (!data.title || !data.href) {
    return (
      description && <article className="demo-card">{description}</article>
    );
  }

  return (
    <article className="demo-card">
      <h2 className="demo-card__title">
        <a className="demo-card__link" href={flattenToAppURL(data.href)}>
          {data.title}
        </a>
      </h2>
      {description}
    </article>
  );
}
```

Choose the heading level that fits the outline of your page.
The example uses `h2`.

The link's text is the title.
The title is therefore the accessible name of the link.
`flattenToAppURL` turns an internal link that the backend returns as an absolute backend URL into an app URL.

(cards-stretch)=

## Stretch the click area over the card

Give the card `position: relative`.
Let the pseudo-element `::after` of the link cover the whole card:

```css
.demo-card {
  position: relative;
  padding: 1rem;
  border: 1px solid #ccc;
}

.demo-card__title {
  margin: 0 0 0.5rem;
}

.demo-card__link::after {
  position: absolute;
  content: '';
  inset: 0;
}
```

A click on any free area of the card now follows the link.
Keyboard and screen reader users reach the same link through its title.

(cards-description)=

## Keep the description above the click area

Lift the description above the pseudo-element of the link:

```css
.demo-card__description {
  position: relative;
  z-index: 1;
  margin: 0;
}
```

A click or a tap on a term in the description now reaches the term.
A click on the description outside a term stays on the description.
It does not follow the link.
If the whole card must follow the link on every click, the description cannot hold tooltips.

(cards-check)=

## Check the card

1. Add the card to a page, with a glossary term in its description, and reload the page.
   The term in the description has a dotted underline.
2. Press {kbd}`Tab` until the title link has the focus.
3. Press {kbd}`Tab` again.
   The focus moves to the term in the description.
4. Press {kbd}`Enter`.
   The popover with the definition opens.
   The page stays the same.
5. Press {kbd}`Escape`.
   The popover closes.
   The focus returns to the term.
6. Press {kbd}`Shift+Tab` to move the focus back to the title link, then press {kbd}`Enter`.
   The browser opens the linked page.
7. Go back, and click a free corner of the card with the mouse.
   The browser opens the linked page.
