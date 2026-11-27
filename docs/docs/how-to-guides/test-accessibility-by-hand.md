---
myst:
  html_meta:
    "description": "How to check the glossary tooltips of plone-glossary by hand with a keyboard, screen readers, voice control, and a phone, with the expected result of each check."
    "property=og:description": "How to check the glossary tooltips of plone-glossary by hand with a keyboard, screen readers, voice control, and a phone, with the expected result of each check."
    "property=og:title": "Test the tooltips by hand"
    "keywords": "Plone, Volto, glossary, accessibility, screen reader, NVDA, JAWS, VoiceOver, TalkBack, manual test"
---

# Test the tooltips by hand

This guide shows you how to check the tooltips with a keyboard, a screen reader, and a phone.
The automated tests of the package cannot run these checks.
Each check lists its steps and the result you should see.
Record any other result together with the browser, the device, and the assistive technology.

(manual-test-page)=

## Prepare a test page

Create a page with a text block that holds the following:

- a sentence with a glossary term
- a link whose text contains a glossary term
- a glossary term whose definition contains a link

Publish the glossary, its terms, and the page.
Run the checks in the browsers and on the devices that your readers use.

(manual-desktop-screen-readers)=

## Screen readers on the desktop

### NVDA with Firefox on Windows

1. Read the paragraph in browse mode.
2. Press {kbd}`Tab` until the term has the focus.
3. Press {kbd}`Enter`.
4. Press {kbd}`Tab`.
5. Press {kbd}`Escape`.

Expected result:

- NVDA announces the term as a collapsed button inside the sentence.
  It reads the sentence without a break.
- {kbd}`Enter` announces a dialog named after the term, and its definition.
- {kbd}`Tab` reaches the link in the definition.
- {kbd}`Escape` closes the popover.
  NVDA is back on the term, which is collapsed again.

### JAWS with Chrome on Windows

1. Repeat the steps for NVDA.
2. Read the paragraph and the popover with the virtual cursor, using the arrow keys.
3. Open the popover with {kbd}`Space` instead of {kbd}`Enter`.

Expected result:

- JAWS behaves as NVDA does.
- The virtual cursor also stops on a dismiss button inside the popover.
  The button is visually hidden.
  Its name is in the language of the page, such as "Dismiss" in English or "Schließen" in German.
  It belongs to the popover by design.
  This result is correct.

### VoiceOver with Safari on macOS

1. Move through the paragraph with {kbd}`VO+Right Arrow`.
2. Press {kbd}`VO+Space` on the term.
3. Press {kbd}`Tab`.
4. Press {kbd}`Escape`.
5. Open the rotor and its list of buttons.

Expected result:

- VoiceOver behaves as NVDA does.
- The rotor lists the term among the buttons, by its visible text.

(manual-phones)=

## Phones

### VoiceOver on iOS with Safari

1. Swipe through the paragraph.
2. Double-tap the term.
3. Swipe into the dialog.
4. Scrub with two fingers.

Expected result:

- The term is a button inside the text.
- The double tap opens the dialog and moves the focus into it.
- The scrub closes the dialog.
  The focus returns to the term.

### TalkBack with Chrome on Android

1. Swipe to the term.
2. Double-tap the term.
3. Swipe into the dialog.
4. Use the back gesture.

Expected result:

- TalkBack behaves as VoiceOver on iOS does.
- The back gesture closes the popover.
  It does not leave the page.

### Long press on a term

Use Safari on an iPhone and Chrome on an Android phone.

1. Press and hold the term until the selection handles appear.
2. Lift your finger.

Expected result:

- A word is selected.
- No popover opens.

If a popover opens on top of the selection, record the browser and the device.

### Tap on a term

1. Tap a term.
2. Tap the same term again.
3. Tap the term once more, then tap outside the popover.
4. Tap a term, then scroll the page.

Expected result:

- The first tap opens the popover inside the screen.
- The second tap closes it.
- A tap outside the popover closes it.
- Scrolling the page closes it.
- No popover opens a moment after a tap, as a hover preview would.

(manual-voice-control)=

## Voice control

Use Voice Control on macOS or iOS, or Dragon on Windows.

1. Say "Click" followed by the visible text of the term.
2. Close the popover.
3. Say "Show numbers" and pick the number of the term.

Expected result:

- Each command opens the popover and keeps it open.
- No second, invisible target with the same name competes for the command.

(manual-mouse)=

## Mouse selection

Use Firefox on the desktop.

1. Drag from before a term to after it.
2. Drag from inside the term to after it.
3. Double-click the term.
4. Triple-click the paragraph.
5. Copy the selection and paste it into a plain text editor.

Expected result:

- Dragging selects text across the term and inside it.
  It opens no popover.
- A double click opens or closes the popover and selects no word.
  {ref}`limits-double-click` describes this limit.
- A triple click selects the whole paragraph, including the term.
- The pasted text is plain text.

(manual-display)=

## Display, zoom, and focus

### Forced colors

Turn on a contrast theme in the Windows settings.

1. Press {kbd}`Tab` until a term has the focus.
2. Press {kbd}`Enter` to open the popover.

Expected result:

- The dotted underline of the term stays visible.
- The focus outline stays visible.
- The border of the popover stays visible.

### Zoom and text spacing

1. Zoom the browser to 400 percent.
2. Apply the text spacing values of WCAG success criterion 1.4.12, for example with a browser extension.
3. Open the popover of a term with a long definition.

Expected result:

- The popover fits into the window.
- A long definition scrolls inside the popover.
- No text overlaps other text or gets cut off.

### Focus behind sticky elements

1. Give the page a sticky header, or use a theme that has one.
2. Scroll down until a term is just below the sticky header.
3. Press {kbd}`Tab` and {kbd}`Shift+Tab` until the term has the focus.

Expected result:

- The term with the focus is not hidden behind the sticky header or any other sticky part of the page.

### Target size of a term alone in a table cell

1. Add a table whose cell holds only a glossary term.
2. Measure the term in the browser's developer tools.

Expected result:

- The term is at least 24 by 24 CSS pixels.
  If it is smaller, it has the spacing to other targets that WCAG success criterion 2.5.8 asks for.

A term inside running text is exempt from this criterion.
The criteria 2.5.7 Dragging Movements, 3.2.6 Consistent Help, 3.3.7 Redundant Entry, and 3.3.8 Accessible Authentication do not apply to the tooltips.
