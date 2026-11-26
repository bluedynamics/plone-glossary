// Measurements for ruling R35 (native button or a span with button role).
// They record what the browser does and print it to the terminal; they fail
// only if a measurement could not be taken.
import { createPublished, documentWithBlocks, slate } from '../support/fixture';

const TEXT = 'Words before Climate Change and words after it.';
const TERM = 'Climate Change';

function record(name, result) {
  const browser = `${Cypress.browser.name} ${Cypress.browser.version}`;
  cy.task('log', `R35 ${name} [${browser}]: ${JSON.stringify(result)}`);
}

/** Line boxes of `node`, merged per line (some engines split inline boxes). */
function lines(node) {
  const tops = [...node.getClientRects()]
    .filter((rect) => rect.width > 0)
    .map((rect) => Math.round(rect.top));
  return [...new Set(tops)];
}

/**
 * Narrows the paragraph so that the first word of the term ends the first
 * line and the rest of the term does not fit on it.
 */
function narrowAtTerm(paragraph, termNode) {
  const doc = paragraph.ownerDocument;
  const textNode = [...termNode.childNodes].find(
    (child) => child.nodeType === Node.TEXT_NODE,
  );
  const word = doc.createRange();
  word.setStart(textNode, 0);
  word.setEnd(textNode, TERM.indexOf(' '));
  const start = termNode.getBoundingClientRect().left;
  const left = paragraph.getBoundingClientRect().left;
  paragraph.style.width = `${start - left + word.getBoundingClientRect().width + 4}px`;
}

/** Top of the first line: the box of the paragraph's first character. */
function firstLineTop(paragraph) {
  const doc = paragraph.ownerDocument;
  const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let first = walker.nextNode();
  while (first && !first.data.trim()) first = walker.nextNode();
  const range = doc.createRange();
  range.setStart(first, 0);
  range.setEnd(first, 1);
  return Math.round(range.getBoundingClientRect().top);
}

function outcome(termNode, paragraph) {
  const termLines = lines(termNode);
  const firstLine = firstLineTop(paragraph);
  if (termLines.length > 1) return 'breaks inside the term';
  return termLines[0] > firstLine
    ? 'moves to the next line as a whole'
    : 'stays on the first line';
}

describe('R35 measurements', () => {
  beforeEach(() => {
    createPublished(
      '/en',
      documentWithBlocks('measure', 'Measure', [
        ['title', { '@type': 'title' }],
        ['text', slate(TEXT)],
      ]),
    );
    cy.visit('/en/measure');
    cy.findByRole('button', { name: TERM }).should('exist');
  });

  it('records how a multi-word term breaks at the end of a line', () => {
    cy.findByRole('button', { name: TERM }).then(($button) => {
      const button = $button[0];
      const paragraph = button.closest('p');
      const doc = button.ownerDocument;

      // Control: the same words as plain text in an identical paragraph.
      const control = doc.createElement('p');
      control.className = paragraph.className;
      const plain = doc.createElement('span');
      plain.textContent = TERM;
      control.append('Words before ', plain, ' and words after it.');
      paragraph.after(control);

      narrowAtTerm(paragraph, button);
      narrowAtTerm(control, plain);

      const result = {
        button: outcome(button, paragraph),
        buttonLineBoxes: button.getClientRects().length,
        plainTextControl: outcome(plain, control),
        computedDisplay: getComputedStyle(button).display,
      };
      record('line break', result);
      control.remove();
      expect(result.plainTextControl, 'control').to.equal(
        'breaks inside the term',
      );
    });
  });

  it('records whether a selected paragraph contains the term text', () => {
    cy.findByRole('button', { name: TERM }).then(($button) => {
      const paragraph = $button[0].closest('p');
      const doc = paragraph.ownerDocument;
      const selection = doc.defaultView.getSelection();

      // Control: the same words as plain text.
      const control = doc.createElement('p');
      control.textContent = TEXT;
      paragraph.after(control);

      // 1. A range over the whole paragraph.
      const rangeText = (node) => {
        const range = doc.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
        const text = selection.toString();
        selection.removeAllRanges();
        return text;
      };

      // 2. The browser extends the selection word by word, as with
      // Ctrl+Shift+Right, until it stops growing or leaves the paragraph
      // (Firefox does not know the paragraph granularity).
      const wordByWordText = (node) => {
        selection.removeAllRanges();
        selection.collapse(node, 0);
        let text = '';
        for (let step = 0; step < 40; step += 1) {
          selection.modify('extend', 'forward', 'word');
          const next = selection.toString();
          if (next === text || !node.contains(selection.focusNode)) break;
          text = next;
        }
        selection.removeAllRanges();
        return text;
      };

      const result = {
        rangeText: rangeText(paragraph),
        wordByWordText: wordByWordText(paragraph),
        wordByWordPlainTextControl: wordByWordText(control),
      };
      result.rangeContainsTerm = result.rangeText.includes(TERM);
      result.wordByWordContainsTerm = result.wordByWordText.includes(TERM);
      control.remove();
      record('selection', result);
      expect(result.rangeText, 'range selection').to.include('Words before');
      expect(result.wordByWordPlainTextControl, 'control').to.include(TERM);
    });
  });

  it('records a mouse selection across the term (Chromium only)', () => {
    if (Cypress.browser.family !== 'chromium') {
      record('mouse selection', 'not measured: needs the DevTools protocol');
      return;
    }
    cy.findByRole('button', { name: TERM }).then(($button) => {
      const paragraph = $button[0].closest('p');
      const doc = paragraph.ownerDocument;
      const textNodes = [];
      const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      const first = doc.createRange();
      first.setStart(textNodes[0], 0);
      first.setEnd(textNodes[0], 1);
      const last = doc.createRange();
      const lastNode = textNodes[textNodes.length - 1];
      last.setStart(lastNode, lastNode.length - 1);
      last.setEnd(lastNode, lastNode.length);

      // The page sits in the AUT iframe, possibly scaled.
      const frame = window.top.document.querySelector('iframe.aut-iframe');
      const frameRect = frame.getBoundingClientRect();
      const scale = frameRect.width / frame.offsetWidth;
      const toScreen = (rect, side) => ({
        x:
          frameRect.left +
          (side === 'start' ? rect.left + 1 : rect.right - 1) * scale,
        y: frameRect.top + (rect.top + rect.height / 2) * scale,
      });
      const from = toScreen(first.getBoundingClientRect(), 'start');
      const to = toScreen(last.getBoundingClientRect(), 'end');
      const mouse = (type, point, extra = {}) =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Input.dispatchMouseEvent',
          params: { type, ...point, button: 'left', ...extra },
        });

      cy.wrap(null)
        .then(() => mouse('mousePressed', from, { clickCount: 1 }))
        .then(() => mouse('mouseMoved', to, { buttons: 1 }))
        .then(() => mouse('mouseReleased', to, { clickCount: 1 }))
        .then(() => {
          const dragText = doc.defaultView.getSelection().toString();
          doc.defaultView.getSelection().removeAllRanges();
          return dragText;
        })
        .then((dragText) =>
          cy
            .wrap(null)
            .then(() => mouse('mousePressed', from, { clickCount: 3 }))
            .then(() => mouse('mouseReleased', from, { clickCount: 3 }))
            .then(() => {
              const tripleText = doc.defaultView.getSelection().toString();
              doc.defaultView.getSelection().removeAllRanges();
              record('mouse selection', {
                dragText,
                dragContainsTerm: dragText.includes(TERM),
                tripleClickText: tripleText,
                tripleClickContainsTerm: tripleText.includes(TERM),
              });
              expect(dragText, 'drag selection').to.include('Words');
            }),
        );
    });
  });
});
