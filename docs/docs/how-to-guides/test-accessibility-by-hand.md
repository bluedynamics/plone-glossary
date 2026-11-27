---
myst:
  html_meta:
    "description": "How to check the glossary tooltips of plone-glossary by hand with a keyboard, screen readers, voice control, and a phone, with expected results and observations to record."
    "property=og:description": "How to check the glossary tooltips of plone-glossary by hand with a keyboard, screen readers, voice control, and a phone, with expected results and observations to record."
    "property=og:title": "Test the tooltips by hand"
    "keywords": "Plone, Volto, glossary, accessibility, screen reader, NVDA, JAWS, VoiceOver, TalkBack, manual test"
---

# Test the tooltips by hand

This guide shows you how to check the tooltips with a keyboard, a screen reader, and a phone.
The automated tests of the package cannot run these checks.

Each check has two kinds of results.
An expected result follows from the code of the package.
If you see something else, the check fails.
An observation depends on the assistive technology, the browser, or the device.
Record what you notice, together with the names and versions of the tools.
Report failed checks and observations in the [issue tracker of the project](https://github.com/bluedynamics/plone-glossary/issues).

(manual-test-page)=

## Prepare the test page

Create a page whose text holds the following:

- a sentence with a glossary term
- a link whose text contains a glossary term
- a glossary term whose definition contains a link
- a glossary term with a long definition of several paragraphs
- a table with a cell that holds only a glossary term
- enough text below the terms to scroll the page

Publish the glossary, its terms, and the page.
Log out, or open the page in a private window of the browser.
Reload the page.
A reader who is not logged in gets only published terms.
The package loads the terms when the page loads.

Run the checks in the browsers and on the devices that your readers use.

(manual-desktop-screen-readers)=

## Screen readers on the desktop

### NVDA with Firefox on Windows

1. Read the paragraph with the first term in browse mode.
2. Press {kbd}`Tab` until the term whose definition contains a link has the focus.
3. Press {kbd}`Enter`.
4. Press {kbd}`Tab`.
5. Press {kbd}`Escape`.

Expected results:

- When the term has the focus, NVDA reports a button with the visible text of the term, collapsed.
- {kbd}`Enter` opens the popover.
  The focus moves into a dialog whose name is the term.
- {kbd}`Tab` moves the focus to the link in the definition.
- {kbd}`Escape` closes the popover.
  The focus is back on the term, which is collapsed again.

Observations to record:

- How NVDA reads the sentence with the term in browse mode, for example whether it pauses at the term.
- What NVDA announces when the dialog opens, and whether it reads the definition.

### JAWS with Chrome on Windows

1. Repeat the steps of the NVDA check.
2. Read the paragraph and the open popover with the virtual cursor, using the arrow keys.
3. Open the popover with {kbd}`Space` instead of {kbd}`Enter`.

Expected results:

- The expected results of the NVDA check hold for JAWS.
- {kbd}`Space` opens the popover as {kbd}`Enter` does.
- The virtual cursor stops on a dismiss button inside the popover.
  The button is visually hidden.
  Its name is in the language of the page, such as "Dismiss" in English or "Schließen" in German.
  It belongs to the popover by design.

Observations to record:

- How the virtual cursor reads the sentence with the term.

### VoiceOver with Safari on macOS

1. Move through the paragraph with {kbd}`VO+Right Arrow`.
2. Press {kbd}`VO+Space` on the term whose definition contains a link.
3. Press {kbd}`Tab`.
4. Press {kbd}`Escape`.
5. Open the rotor with {kbd}`VO+U`.
6. Move to the rotor's list that contains the buttons.
   It is the list {guilabel}`Form Controls`, unless the list {guilabel}`Buttons` is switched on in the rotor settings.
   The names of the lists may differ by version.

Expected results:

- On the term, VoiceOver reports a button with the visible text of the term, collapsed.
- {kbd}`VO+Space` opens the popover.
  The focus moves into a dialog whose name is the term.
- {kbd}`Tab` moves the focus to the link in the definition.
- {kbd}`Escape` closes the popover.
  The focus is back on the term, which is collapsed again.
- The rotor's list names the term by its visible text.

Observations to record:

- Whether {kbd}`VO+Right Arrow` stops at the term as an item of its own, and how VoiceOver reads the sentence.
- In which list of the rotor the term appears.

(manual-term-in-link)=

## A term inside a link

1. Press {kbd}`Tab` until the link whose text contains a term has the focus.
2. Press {kbd}`Tab` again.
3. Read the link with a screen reader.

Expected results:

- The focus stops on the link once.
  The term inside the link has no tab stop of its own.
- The screen reader reads the term as part of the link text.
  It reports no button for the term.

(manual-phones)=

## Phones

### VoiceOver on iOS with Safari

1. Turn on VoiceOver.
2. Swipe right through the paragraph.
3. Double-tap the term.
4. Swipe right into the dialog.
5. Scrub with two fingers: move two fingers quickly in the shape of a Z.

Expected results:

- On the term, VoiceOver reports a button with the visible text of the term.
- The double tap opens the popover.
  The focus moves into the dialog.

Observations to record:

- How VoiceOver reads the sentence with the term while you swipe.
- Whether the scrub closes the popover and returns the focus to the term.
  The package has no handler for the scrub.
  It closes the popover when it receives {kbd}`Escape`.

### TalkBack with Chrome on Android

1. Turn on TalkBack.
2. Swipe to the term.
3. Double-tap the term.
4. Swipe into the dialog.
5. Use the back gesture.

Expected results:

- On the term, TalkBack reports a button with the visible text of the term.
- The double tap opens the popover.
  The focus moves into the dialog.

Observations to record:

- What the back gesture does.
  The package does not handle the back gesture.
  Record whether the popover closes, the browser goes back to the previous page, or nothing happens.

### Long press on a term

Use Safari on an iPhone and Chrome on an Android phone.
Turn off VoiceOver and TalkBack first.
With a screen reader on, a single tap selects an element and does not activate it.

1. Press and hold the term until the selection handles appear.
2. Lift your finger.

Observations to record:

- Whether a word is selected, and how the selection handles look.
- Whether a popover opens.
  The package opens the popover only on a completed press.
  When the browser cancels the touch for its selection, no popover opens.
  A browser may also leave the touch uncanceled.

### Tap on a term

Use the same phones, with VoiceOver and TalkBack off.

1. Tap a term.
2. Tap the same term again.
3. Tap the term once more, then tap outside the popover.
4. Tap a term, then scroll the page.

Expected results:

- The first tap opens the popover inside the screen.
- The second tap closes it.
- A tap outside the popover closes it.
- Scrolling the page closes it.
- No popover opens a moment after a tap, as a hover preview would.

(manual-voice-control)=

## Voice control

Use Voice Control on macOS or iOS, or Dragon on Windows.
The commands may differ by version.

1. Give the command for a click on the term.
   On macOS and with Dragon, say "Click" followed by the visible text of the term.
   On iOS, say "Tap" followed by the visible text of the term.
2. Close the popover.
3. With Voice Control on macOS or iOS, say "Show numbers" and then the number of the term.

Expected results:

- Each command opens the popover and keeps it open.
- Each occurrence of the term is one target.
  No hidden element carries the visible text of the term as its name.

Observations to record:

- How the tool handles a term that occurs more than once on the page.

(manual-mouse)=

## Mouse selection

Use Firefox on the desktop.

1. Drag from before a term to after it.
2. Drag from inside the term to after it.
3. Double-click the term.
4. Triple-click the paragraph.
5. Copy the selection and paste it into a plain text editor.

Expected results:

- Dragging leaves no popover open after you release the mouse button.
- A double click opens or closes the popover and selects no word.
  {ref}`limits-double-click` describes this limit.
- The pasted text reads exactly like the paragraph, with no added or missing words around the term.

Observations to record:

- Whether each drag selects the text across the term and inside it.
- Whether the triple click selects the whole paragraph, including the term.

(manual-display)=

## Display, zoom, and focus

### Forced colors

Turn on a contrast theme in the Windows settings.

1. Press {kbd}`Tab` until a term has the focus.
2. Press {kbd}`Enter` to open the popover.

Expected results:

- The dotted underline of the term stays visible.
- The focus outline stays visible.
- The border of the popover stays visible.

### Zoom and text spacing

This check covers WCAG success criteria 1.4.10 Reflow and 1.4.12 Text Spacing.

1. Zoom the browser to 400 percent.
2. Apply the text spacing values of success criterion 1.4.12, for example with a browser extension.
3. Open the popover of the term with the long definition.

Expected results:

- The popover fits into the window.
- The long definition scrolls inside the popover.

Observations to record:

- Any text that overlaps other text or gets cut off.

### Focus behind a sticky header

This check covers WCAG success criterion 2.4.11 Focus Not Obscured (Minimum).

1. Give the page a sticky header, or use a theme that has one.
2. Scroll down until a term has moved up behind the header.
3. Press {kbd}`Shift+Tab` until the term has the focus.

Observations to record:

- Whether the term with the focus is hidden behind the header or another sticky part of the page.
  The package leaves the scrolling to the browser and the theme.

### Target size of a term alone in a table cell

This check covers WCAG success criterion 2.5.8 Target Size (Minimum).

1. Open the table with the cell that holds only a glossary term.
2. Measure the term in the developer tools of the browser.

Observations to record:

- The width and height of the term in CSS pixels.
  The criterion asks for at least 24 by 24 CSS pixels, or enough spacing to other targets.
  The size depends on the typography of your theme.

A term inside running text is exempt from this criterion.
The criteria 2.5.7 Dragging Movements, 3.2.6 Consistent Help, 3.3.7 Redundant Entry, and 3.3.8 Accessible Authentication (Minimum) do not apply to the tooltips.
