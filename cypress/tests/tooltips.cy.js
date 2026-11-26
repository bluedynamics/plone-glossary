import {
  apiRequest,
  createPublished,
  documentWithBlocks,
  richText,
  slate,
} from '../support/fixture';

// Occurrences become buttons once the terms of the navigation root are loaded.
function waitForTooltips() {
  cy.findAllByRole('button', { name: 'Climate Change' }).should(
    'have.length',
    1,
  );
}

describe('Tooltips', () => {
  beforeEach(() => {
    cy.visit('/en/page');
    waitForTooltips();
  });

  it('shows a tooltip for a term in slate text', () => {
    cy.findAllByRole('button', { name: 'Climate Change' }).first().click();
    cy.findByRole('dialog', { name: 'Climate Change' })
      .should('be.visible')
      .and('contain.text', 'A lasting change of the climate.');
  });

  it('prefers the longer term and keeps uppercase terms exact', () => {
    cy.findAllByRole('button', { name: 'Climate Change' }).should(
      'have.length',
      1,
    );
    // "Climate" alone would match inside "Climate Change".
    cy.findAllByRole('button', { name: 'Climate' }).should('not.exist');
    cy.findAllByRole('button', { name: 'REST' }).should('have.length', 1);
    cy.findAllByRole('button', { name: 'rest' }).should('not.exist');
    cy.contains('p', 'REST is not rest.').should('exist');
  });

  it('shows tooltips inside a grid block', () => {
    cy.get('.block.gridBlock').within(() => {
      cy.findByRole('button', { name: 'climate' }).click();
    });
    cy.findByRole('dialog', { name: 'Climate' }).should('be.visible');
  });

  it('renders the trigger inline and selectable', () => {
    cy.findAllByRole('button', { name: 'climate' })
      .first()
      .should('have.css', 'display', 'inline')
      .and('have.css', 'user-select', 'text');
  });

  it('has no accessibility violations with a closed and an open popover', () => {
    cy.injectAxe();
    cy.checkWcagAA('main');
    cy.findAllByRole('button', { name: 'Climate Change' }).first().click();
    cy.findByRole('dialog', { name: 'Climate Change' }).should('be.visible');
    // The popover renders in a portal at the end of body, outside main.
    cy.checkWcagAA({ include: [['main'], ['.glossary-popover']] });
  });
});

// The trigger is text with the role of a button (R42): a multi-word term
// wraps and is selected like the text around it.
describe('Trigger as text', () => {
  const TEXT = 'Words before Climate Change and words after it.';
  const TERM = 'Climate Change';

  /**
   * The lines the text inside `node` covers, as the tops of its text boxes,
   * top to bottom. Measured on the text, not on elements: a block has one
   * box however many lines it holds.
   */
  function textLines(node) {
    const doc = node.ownerDocument;
    const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const tops = new Set();
    while (walker.nextNode()) {
      const range = doc.createRange();
      range.selectNodeContents(walker.currentNode);
      [...range.getClientRects()]
        .filter((rect) => rect.width > 0)
        .forEach((rect) => tops.add(Math.round(rect.top)));
    }
    return [...tops].sort((a, b) => a - b);
  }

  /** The top of the first character of `node`'s text, on its first line. */
  function firstCharacterTop(node) {
    const doc = node.ownerDocument;
    const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let first = walker.nextNode();
    while (first && !first.data.trim()) first = walker.nextNode();
    const range = doc.createRange();
    range.setStart(first, 0);
    range.setEnd(first, 1);
    return Math.round(range.getBoundingClientRect().top);
  }

  /**
   * Narrows `paragraph` so that the first word of the term at `termNode` ends
   * the first line and the rest of the term does not fit on it.
   */
  function narrowAtTerm(paragraph, termNode) {
    const doc = paragraph.ownerDocument;
    const word = doc.createRange();
    word.setStart(termNode.firstChild, 0);
    word.setEnd(termNode.firstChild, TERM.indexOf(' '));
    const start = termNode.getBoundingClientRect().left;
    const left = paragraph.getBoundingClientRect().left;
    paragraph.style.width = `${start - left + word.getBoundingClientRect().width + 4}px`;
  }

  /** The same text with the term as plain text, after `paragraph`. */
  function plainTextControl(paragraph) {
    const doc = paragraph.ownerDocument;
    const control = doc.createElement('p');
    control.className = paragraph.className;
    const plain = doc.createElement('span');
    plain.textContent = TERM;
    control.append('Words before ', plain, ' and words after it.');
    paragraph.after(control);
    return { control, plain };
  }

  beforeEach(() => {
    createPublished(
      '/en',
      documentWithBlocks('wrap', 'Wrap', [
        ['title', { '@type': 'title' }],
        ['text', slate(TEXT)],
      ]),
    );
    cy.visit('/en/wrap');
    cy.findByRole('button', { name: TERM }).should('exist');
  });

  it('breaks a multi-word term at the line end like plain text', () => {
    cy.findByRole('button', { name: TERM }).then(($trigger) => {
      const trigger = $trigger[0];
      const paragraph = trigger.closest('p');
      expect(textLines(paragraph), 'one line before narrowing').to.have.length(
        1,
      );
      const { control, plain } = plainTextControl(paragraph);
      narrowAtTerm(paragraph, trigger);
      narrowAtTerm(control, plain);
      expect(textLines(plain), 'plain-text control').to.have.length(2);
      expect(textLines(trigger), 'term').to.have.length(2);
      // The term starts on the paragraph's first line, like the control.
      expect(textLines(trigger)[0], 'term on the first line').to.equal(
        firstCharacterTop(paragraph),
      );
      expect(textLines(plain)[0], 'control on the first line').to.equal(
        firstCharacterTop(control),
      );
      control.remove();
    });
  });

  it('includes a term in the text of a selected paragraph', () => {
    cy.findByRole('button', { name: TERM }).then(($trigger) => {
      const paragraph = $trigger[0].closest('p');
      const doc = paragraph.ownerDocument;
      const selection = doc.defaultView.getSelection();
      const { control } = plainTextControl(paragraph);

      // A range over the whole paragraph.
      const range = doc.createRange();
      range.selectNodeContents(paragraph);
      selection.removeAllRanges();
      selection.addRange(range);
      expect(selection.toString().trim(), 'range selection').to.equal(TEXT);

      // The browser extends the selection word by word, as with
      // Ctrl+Shift+Right, until it stops growing or leaves the paragraph.
      const wordByWord = (node) => {
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
        return text.trim();
      };
      expect(wordByWord(control), 'plain-text control').to.include(TERM);
      expect(wordByWord(paragraph), 'word by word').to.equal(
        wordByWord(control),
      );
      control.remove();
    });
  });
});

describe('Tooltips and client-side navigation', () => {
  it('closes the popover on client-side navigation', () => {
    // Opened by press, closed by the browser's Back button: no press outside.
    cy.visit('/en');
    cy.markWindow();
    cy.get('#navigation').findByRole('link', { name: 'Page' }).click();
    cy.location('pathname').should('eq', '/en/page');
    waitForTooltips();
    cy.findAllByRole('button', { name: 'Climate Change' }).first().click();
    cy.findByRole('dialog', { name: 'Climate Change' }).should('be.visible');

    cy.go('back');
    cy.location('pathname').should('eq', '/en');
    cy.findByRole('dialog').should('not.exist');
    cy.windowIsMarked();
  });

  it('closes a popover opened by hover when a link is followed with the keyboard', () => {
    cy.visit('/en/page');
    cy.markWindow();
    waitForTooltips();
    cy.findAllByRole('button', { name: 'Climate Change' })
      .first()
      .pointerEnter();
    cy.findByRole('dialog', { name: 'Climate Change' }).should('be.visible');

    cy.findByRole('link', { name: 'climate link' }).focus();
    // Moving the focus does not close a popover opened by hover.
    cy.findByRole('dialog', { name: 'Climate Change' }).should('be.visible');
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.location('pathname').should('eq', '/de/seite');
    cy.findByRole('dialog').should('not.exist');
    cy.windowIsMarked();
  });
});

describe('Long definitions', () => {
  it('scrolls a long definition inside the popover', () => {
    const paragraphs = Array.from(
      { length: 40 },
      (_, index) => `<p>Paragraph ${index + 1} of a long definition.</p>`,
    ).join('');
    apiRequest('PATCH', '/en/glossary/climate-change', {
      definition: richText(paragraphs),
    });
    cy.viewport(1280, 600);
    cy.visit('/en/page');
    waitForTooltips();
    cy.findAllByRole('button', { name: 'Climate Change' }).first().click();
    cy.findByRole('dialog', { name: 'Climate Change' }).should('be.visible');

    cy.get('.glossary-popover')
      .isInsideViewport()
      .should(($popover) => {
        const popover = $popover[0];
        const { overflowY } = getComputedStyle(popover);
        expect(overflowY).to.be.oneOf(['auto', 'scroll']);
        // The content is taller than the popover: it scrolls instead of
        // spilling out.
        expect(popover.scrollHeight).to.be.greaterThan(popover.clientHeight);
      })
      .then(($popover) => {
        const popover = $popover[0];
        const last = popover.querySelector('p:last-of-type');
        const below = () =>
          last.getBoundingClientRect().top >=
          popover.getBoundingClientRect().bottom;
        expect(below(), 'last paragraph hidden before scrolling').to.equal(
          true,
        );
        popover.scrollTop = popover.scrollHeight;
        expect(popover.scrollTop).to.be.greaterThan(0);
        expect(below(), 'last paragraph hidden after scrolling').to.equal(
          false,
        );
      });
  });
});

describe('Small screens', () => {
  // A phone in portrait orientation.
  const PHONE = [375, 667];

  it('keeps every popover inside a 375 pixel wide viewport', () => {
    cy.viewport(...PHONE);
    cy.visit('/en/page');
    waitForTooltips();
    for (const name of ['Climate Change', 'climate', 'REST']) {
      cy.findAllByRole('button', { name }).first().click();
      cy.findAllByRole('dialog').should('have.length', 1);
      cy.get('.glossary-popover').isInsideViewport();
      cy.press(Cypress.Keyboard.Keys.ESC);
      cy.findByRole('dialog').should('not.exist');
    }
  });

  it('fits a long word and a wide image into the popover', () => {
    const wideImage =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200">' +
          '<rect width="800" height="200" fill="#ccc"/></svg>',
      );
    apiRequest('PATCH', '/en/glossary/climate', {
      definition: richText(
        '<p>Source: https://www.example.org/a/very/long/path/that/has/' +
          'no/break/opportunity/anywhere/in/it/and/goes/on-and-on</p>' +
          `<p><img src="${wideImage}" width="800" height="200" alt="Chart"></p>`,
      ),
    });
    cy.viewport(...PHONE);
    cy.visit('/en/page');
    waitForTooltips();
    cy.findAllByRole('button', { name: 'climate' }).first().click();
    cy.findByRole('img', { name: 'Chart' }).should('be.visible');
    cy.get('.glossary-popover')
      .isInsideViewport()
      .should(($popover) => {
        const popover = $popover[0];
        // Nothing to scroll sideways: the popover only scrolls up and down.
        expect(popover.scrollWidth, 'scroll width').to.be.at.most(
          popover.clientWidth + 1,
        );
        const image = popover.querySelector('img').getBoundingClientRect();
        expect(image.width, 'image width').to.be.at.most(popover.clientWidth);
      });
  });
});

describe('Logged-in editors', () => {
  it('shows tooltips in the view and none in the toolbar or the editor', () => {
    cy.loginAsAdmin();
    cy.visit('/en/page');
    cy.get('#toolbar').should('exist');
    waitForTooltips();
    cy.get('main')
      .findAllByRole('button', { name: 'climate' })
      .should('have.length', 4);
    cy.get('#toolbar .glossary-term').should('not.exist');

    cy.visit('/en/page/edit');
    cy.contains('[contenteditable="true"]', 'Climate Change affects').should(
      'exist',
    );
    cy.get('.glossary-term').should('not.exist');
  });
});

describe('Print', () => {
  it('leaves an open popover out of the printed page', () => {
    cy.visit('/en/page');
    waitForTooltips();
    cy.document().then((doc) => {
      const rules = (list) =>
        [...list].flatMap((rule) =>
          rule.cssRules ? [rule, ...rules(rule.cssRules)] : [rule],
        );
      const sheets = [...doc.styleSheets].flatMap((sheet) => {
        try {
          return [...sheet.cssRules];
        } catch {
          return [];
        }
      });
      const hiddenInPrint = rules(sheets)
        .filter((rule) => rule.media && [...rule.media].includes('print'))
        .flatMap((media) => [...media.cssRules])
        .some(
          (rule) =>
            rule.selectorText
              ?.split(',')
              .map((selector) => selector.trim())
              .includes('.glossary-popover') && rule.style.display === 'none',
        );
      expect(hiddenInPrint, '@media print hides .glossary-popover').to.equal(
        true,
      );
    });
  });
});
