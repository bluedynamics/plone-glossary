---
myst:
  html_meta:
    "description": "The known limits of plone-glossary: matching, where tooltips appear, the popover, the first-occurrence setting, the glossary views, and the supported size of a glossary."
    "property=og:description": "The known limits of plone-glossary: matching, where tooltips appear, the popover, the first-occurrence setting, the glossary views, and the supported size of a glossary."
    "property=og:title": "Known limits"
    "keywords": "Plone, Volto, glossary, limits, performance, browsers"
---

# Known limits

This page lists the known limits of the package.
Each limit is a behavior that the package has by design, or one that comes from Volto or the backend.
For the others, a fix would need a redesign or would cost something else.
None of them breaks the page.

(limits-matching)=

## Matching

(limits-formatting)=

### Text split by formatting

The package matches each Slate text run on its own.
Formatting, such as bold text, splits a text into runs.
A word that formatting splits is not found as a whole.
For example, with `Klima` in bold followed by `wandel` in plain text, the package does not find the term `Klimawandel`.
The first part of such a word can be found as a term of its own, here `Klima`.

(limits-jamo)=

### Korean text in conjoining jamo

Text and terms match each other whether they use composed or decomposed characters.
Korean text written with separate conjoining jamo matches no term.

(limits-scripts)=

### Scripts without spaces between words

A term matches only as a whole word.
In Chinese, Japanese, Thai, and other scripts written without spaces between words, a term inside running text is not found.
A term that punctuation or a space separates from the surrounding text is found.

(limits-case-folding)=

### Case folding

Matching regardless of case uses simple case folding.
`Straße` does not match `STRASSE`.
The Turkish `İ` does not match `i`.

(limits-lookbehind)=

### Browsers without lookbehind

The package needs lookbehind in regular expressions.
Browsers without it, such as Safari before version 16.4, show no tooltips.
The page still works.

(limits-where)=

## Where tooltips appear

(limits-hidden-content)=

### Content hidden by styles

Terms in content that CSS or the `hidden` attribute hides get tooltips like visible ones.
Examples are a collapsed accordion panel or an inactive tab.
Content marked with `aria-hidden="true"` or `inert` gets no tooltips.

(limits-page-changes)=

### Attributes of the root selector

The package follows changes of the page within one animation frame.
{ref}`components-activation` lists the changes it follows.
It does not follow a change of any other attribute, such as `class` or `id`, that the selector in `tooltipRootSelector` depends on.
Such a change takes effect at the next change of the page that the package follows.

(limits-cms-route-names)=

### Paths that contain a Volto route name

Volto treats a path as a page of its editing interface when it contains the name of an editing route followed by more characters.
Editing routes are, for example, `sharing` and `contents`.
Examples of such paths are `/de/sharing-economy` and `/de/contents-overview`.
Such pages get no tooltips.
Volto itself also renders them as pages of its editing interface, see [Volto issue 870](https://github.com/plone/volto/issues/870).

(limits-navroot-expander)=

### Volto without the `navroot` expander

The package needs the `navroot` API expander, which Volto's default configuration requests.
A project that replaces `config.settings.apiExpanders` without `navroot` makes every page count as the site root.
The package then loads the terms of the site root.
They hold the terms of all languages, and all of them get tooltips.

(limits-slate-leafs)=

### Slate leafs of other add-ons

An add-on loaded after this package can put its own Slate leaf before the package's text leaf.
That leaf then gets the text first.
Text runs with its mark get no tooltips.
Add-ons that append their leaf after the existing ones do not have this effect.

(limits-loading)=

### Terms that cannot be loaded

When the terms cannot be loaded, the page shows plain text.
The package requests them again at the next change of the navigation root.
It does not retry in a loop.

(limits-popover)=

## Tooltips and popover

(limits-double-click)=

### Double click on a term

A double click on a term opens and closes its popover and selects no word.
You can select a term by dragging over it or with the keyboard.

(limits-tab-in-popover)=

### Tab inside an open popover

In a popover opened by a click or a key press, {kbd}`Tab` moves the focus only between the elements inside the popover.
{kbd}`Escape` closes the popover.
The next {kbd}`Tab` then goes on after the term.

(limits-first-occurrence)=

## With `matchOnlyFirstOccurrence`

The following limits exist only when `matchOnlyFirstOccurrence` is `true`.
{ref}`accessibility-tab-stops` explains why the setting is off by default.

(limits-hidden-first)=

### A hidden first occurrence

The first occurrence of a term can be in content that CSS or the `hidden` attribute hides.
That occurrence then takes the only tooltip.
The visible occurrences of the term have none.

(limits-case-variants)=

### Terms that differ only in case

Terms that differ only in case count as one term, for example `EMS` and `Ems`.
Only the first of them on the page gets a tooltip.

(limits-late-content)=

### Content that loads above an open popover

Content can load later above the reading position and hold an earlier occurrence of a term whose popover is open.
That popover then closes.
The keyboard focus is then on the `body` element of the page and no longer on the term.
Where the next {kbd}`Tab` goes depends on the browser.

(limits-views)=

## Glossary and term view

(limits-same-letter)=

### The letter already in the address bar

Following the link of the letter whose section is already in the address bar moves the focus to its heading after the browser's own jump.
This relies on the order in which the browser handles the jump.
It was checked in Chromium and Firefox.
Other browsers are not tested.

(limits-definition-links)=

### Links and images in definitions

The result depends on the editor that wrote the definition:

- Definitions written with Volto's editor show links as app addresses everywhere.
- Definitions written with Plone's classic editor can hold links and images that point to other content of the site.
  In the glossary view's list, these keep their raw `resolveuid` address.
  The cause is the backend's `@glossary_terms` endpoint, which returns the definitions as stored.
  Such links and images work through a redirect of the server.
  They show the raw address.
  The term view and the popover show app addresses.

A link inside a definition always loads the whole page.
Links in rich text fields behave the same way in Volto's views.

(limits-unbalanced-html)=

### Definitions with unbalanced markup

The server renders the glossary view and the term view with the definitions as the backend delivers them.
A definition with unbalanced HTML can break the nesting of the elements in the server's HTML of the page.
The browser repairs the page by rendering it again.
It reports hydration errors, which reach error monitoring as uncaught errors.
Readers without JavaScript and crawlers get the wrongly nested HTML of the server.

(limits-size)=

## Size of the glossary

The package is built and tested for glossaries of up to about 1000 terms.

Larger glossaries work.
Matching can take noticeably long for them.
The cost comes from terms of several words that begin alike.
Examples are terms that begin with the same word, or with the same letters as many words of the text.
With several thousand such terms, marking a page can take a second or more.
Single-word terms stay fast, also when they begin alike.

The following measurements create the matcher and mark 300 texts of 300 characters each.
The texts contain words such as `terminal` and `terms`.
The measurements ran in Node.js on an idle machine.
Each value is the median of several runs.

| Terms | Time |
| --- | --- |
| 1000 terms of one word | 3 milliseconds |
| 5000 terms of one word | 10 milliseconds |
| 5000 terms of one word, every second match in another case than the term | 95 milliseconds |
| 5000 terms of two words whose beginning matches many words of the text, such as `term1 uebergang` | 1.1 seconds |
| 5000 terms of two words that share their first word, such as `station term1` | 0.34 seconds |

Text with soft hyphens or decomposed characters takes 2.2 to 2.6 times as long as other text.
