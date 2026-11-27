---
myst:
  html_meta:
    "description": "Why the glossary tooltips of plone-glossary work the way they do for keyboard, touch, and screen reader users, and which trade-offs the design makes."
    "property=og:description": "Why the glossary tooltips of plone-glossary work the way they do for keyboard, touch, and screen reader users, and which trade-offs the design makes."
    "property=og:title": "Accessibility of the tooltips"
    "keywords": "Plone, Volto, glossary, accessibility, WCAG, keyboard, screen reader"
---

# Accessibility of the tooltips

This page explains how the glossary tooltips serve readers who use a keyboard, a touch screen, or a screen reader.
It describes the design decisions behind the trigger, the popover, and the places where tooltips appear, and the trade-offs they make.

(accessibility-goal)=

## Accessibility as a hard goal

The package treats accessibility as a hard goal.
Its yardstick is WCAG 2.2 at level AA.
No function of the package is reachable with the mouse only.
When accessibility conflicts with convenience or with the behavior of the old add-on, accessibility wins.
The decisions on this page follow from that rule.

(accessibility-control)=

## A control with a popover

A classic tooltip appears when the mouse pointer rests on a word.
That serves mouse users only.
A keyboard user cannot hover.
A touch screen has no hover at all.
A tooltip that only hover opens fails WCAG success criterion 2.1.1, Keyboard.

The package turns each occurrence into a control instead.
A click, a tap, {kbd}`Enter`, and {kbd}`Space` all open the same popover.
A definition can contain links.
The popover is a dialog, which a reader can enter to follow them.

Mouse users still get a preview on hover.
The preview follows success criterion 1.4.13, Content on Hover or Focus.
{kbd}`Escape` dismisses it.
The pointer can move into it.
It stays open while the pointer rests on the term or on the popover.

(accessibility-span)=

## A span with the role of a button

The trigger is a `span` element with `role="button"` and `tabindex="0"`.
The package does not use a native `button` element for it.

The reason is the flow of the text.
Browsers lay out a native button as one box.
A term of several words inside a button would not break at the end of a line like the text around it.
A reader could also not select part of it like ordinary text.
The acceptance tests check that a term of several words breaks at the line end.
They also check that selecting a paragraph includes the term.

The `span` keeps the behavior of a button.
It is in the tab order.
Assistive technology announces it as a button.
It opens on {kbd}`Enter` and {kbd}`Space`.
The `Pressable` component of react-aria-components handles keyboard and pointer for it.
{kbd}`Space` does not scroll the page.
A bare click event, as voice control and screen readers send it, opens the popover too.
The trigger inherits the typography and color of its text and shows a dotted underline.

(accessibility-links)=

## No tooltips inside links and controls

A term inside a link gets no trigger.
The package still wraps the occurrence in `span.glossary-term`.
The occurrence stays text.
The same holds for terms inside buttons, `summary` and `label` elements, and elements with the role of a button, link, menu item, tab, or option.

Interactive content must not nest in HTML.
A control inside a link is invalid.
The only alternative would be a tooltip that hover alone opens inside links.
That would give mouse users a function that keyboard, touch, and screen reader users could not reach.
The hard goal rules this out.

This choice matters most for teasers and cards.
Volto's teaser block renders its title and description inside one link.
A wrapper with `GlossaryText` would have no effect there.
A card keeps its tooltips when only its title is the link and its description stands outside it.
The whole card can still respond to a click through the link's enlarged click area.
The acceptance tests check such a card.
The term in its description opens a popover.
A click on a free area of the card follows the link.

(accessibility-main)=

## Tooltips in the main content only

By default, occurrences become tooltips only inside the `main` element.
The page header and footer get none, even where a theme renders Slate text in them.
The old add-on knew only the texts of the page content.
The default keeps that scope.
A project that wants another area sets `tooltipRootSelector`, described in {ref}`settings-tooltiprootselector`.

(accessibility-hidden)=

## No tooltips in hidden content

Content marked with `aria-hidden="true"` disappears from the accessibility tree.
Its controls can still receive the focus.
A trigger there would be a tab stop that a screen reader does not announce.
That fails success criterion 4.1.2, Name, Role, Value.
The axe rule `aria-hidden-focus` reports it.
Content marked `inert` is the reverse case, announced but not usable.
Typical sources are the inactive slides of a carousel and the page behind a modal dialog.

The package leaves occurrences in such content as text.
It follows the attributes.
The triggers return when the attribute goes away, for example when a modal dialog closes.

Content hidden only by CSS or by the `hidden` attribute keeps its triggers.
A rule based on visibility would need layout reads at every change of the page.
It would still miss a change of a class or a style sheet.
{ref}`limits-hidden-content` describes the effect.

(accessibility-focus)=

## Focus, Escape, and hover

A press and a hover express different intentions.
The popover treats them differently.

A press is a decision to read the definition.
The popover stays open.
The focus moves into the dialog.
A keyboard or screen reader user then lands in the definition and reaches its links with {kbd}`Tab`.
{kbd}`Escape` closes the popover and returns the focus to the term, where the reader left off.
A tap counts as a press and never as a hover.

A hover is a glance.
The preview opens after a short delay and leaves the focus where it is.
If a hover moved the focus, a keyboard or screen reader user would lose their position whenever the mouse passed over a term.
A press on the term during a preview pins the popover and moves the focus into it.

{kbd}`Escape` closes the popover wherever the focus is, as success criterion 1.4.13 asks.
One {kbd}`Escape` is one dismissal.
The package consumes the key press that closes a preview.
The same key press does not also clear a search field or close a surrounding dialog.
A second {kbd}`Escape` does that.

At most one popover is open at a time.
Hovering another term does not replace a pinned popover.
The reader chose that one.

Inside a pinned popover, {kbd}`Tab` stays in the dialog until {kbd}`Escape`.
This is the dialog pattern of react-aria-components.
{kbd}`Escape` is the standard way out of a dialog.
With it, the behavior meets success criterion 2.1.2, No Keyboard Trap.
A reader who expects {kbd}`Tab` to leave a popover that is not modal has to press {kbd}`Escape` first.
Letting {kbd}`Tab` leave would mean overriding the focus containment of react-aria-components and deciding where the focus goes next.

(accessibility-tab-stops)=

## Many tab stops and the first occurrence

Every active occurrence is a tab stop.
A long text with frequent terms holds many of them.
A keyboard user passes each one.

The acceptance tests count the tab stops on their test page with real presses of {kbd}`Tab` from the top of the page.
With `matchOnlyFirstOccurrence` off, the page has 26 tab stops, 6 of them triggers.
With the setting on, it has 23, of which 3 are triggers.
Chromium and Firefox give the same numbers.
The difference grows with the length of a text and the frequency of its terms.

The setting is off by default.
The project owner decided this on 2026-11-27.
With the setting off, every occurrence explains its term where the reader meets it.
That matters for readers who do not start at the top of the page.
One example is a reader who follows a link to a section.
Another is a screen reader user who jumps from heading to heading.
A third is a reader who reads a long page in parts.
Extra tab stops do not fail a WCAG success criterion.

With the setting on, only the first occurrence of each term gets a tooltip.
Three limits come with it, listed in {ref}`limits-first-occurrence`.
The setting helps on pages with long texts and frequent terms that readers read from the top.

(accessibility-testing)=

## What the tests cover and what needs a person

The automated tests check what tools can check.
The unit tests run axe-core with the rules of WCAG 2.0, 2.1, and 2.2 at levels A and AA, with the popover closed and open.
An axe violation fails the tests.
The unit tests run in jsdom, which has no layout.
The rules that need layout, color contrast and the WCAG 2.2 rule for target size, run in the acceptance tests in a real browser.

The acceptance tests also check keyboard operation in a real browser.
They cover the tab order, opening and closing with keys, the return of the focus, and {kbd}`Tab` inside a pinned popover.
They check that the popover fits a viewport of 320 CSS pixels, as at 400 percent zoom, and that it has no animation.
The continuous integration runs them in Electron, a Chromium-based browser.
The project runs them in Firefox too when a change touches focus or pointer handling.

Some checks need a person with a device.
How a screen reader announces the term and the dialog differs between NVDA, JAWS, VoiceOver, and TalkBack.
No automated test hears it.
The same is true for voice control, a long press or a tap on a real phone, mouse selection, and forced colors mode.
Browser zoom with changed text spacing also needs a person.
Some WCAG 2.2 criteria have no automated check at all.
Examples are Focus Not Obscured and the target size of a term that stands alone in a table cell.
