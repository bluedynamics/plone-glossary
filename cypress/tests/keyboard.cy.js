const { ENTER, ESC, TAB } = Cypress.Keyboard.Keys;

function isClimateTrigger(element) {
  return (
    element.matches('.glossary-term__trigger') &&
    element.textContent === 'climate'
  );
}

/** Records the keys a document-level bubble-phase listener sees. */
function recordDocumentKeys() {
  const seen = [];
  cy.document().then((doc) => {
    doc.addEventListener('keydown', (event) => seen.push(event.key));
  });
  return seen;
}

describe('Keyboard', () => {
  beforeEach(() => {
    cy.visit('/en/page');
    cy.findAllByRole('button', { name: 'Climate Change' }).should(
      'have.length',
      1,
    );
  });

  it('operates a tooltip with the keyboard only', () => {
    cy.tabUntil(isClimateTrigger);
    cy.findAllByRole('button', { name: 'climate' })
      .first()
      .should('have.focus');

    cy.press(ENTER);
    cy.findByRole('dialog', { name: 'Climate' }).should('be.visible');
    cy.document()
      .its('activeElement')
      .should((element) => {
        expect(element.closest('.glossary-popover')).to.not.equal(null);
      });

    cy.press(TAB);
    cy.findByRole('link', { name: 'More about the weather' }).should(
      'have.focus',
    );

    cy.press(ESC);
    cy.findByRole('dialog').should('not.exist');
    cy.findAllByRole('button', { name: 'climate' })
      .first()
      .should('have.focus');
  });

  it('keeps Escape in a pinned popover from reaching a surrounding layer', () => {
    const seen = recordDocumentKeys();
    cy.findAllByRole('button', { name: 'Climate Change' }).first().click();
    cy.findByRole('dialog', { name: 'Climate Change' }).should('be.visible');

    cy.press(ESC);
    cy.findByRole('dialog').should('not.exist');
    cy.findAllByRole('button', { name: 'Climate Change' })
      .first()
      .should('have.focus');
    cy.then(() => expect(seen).to.not.include('Escape'));

    // Control: without a popover the same listener sees Escape.
    cy.press(ESC);
    cy.then(() => expect(seen).to.include('Escape'));
  });

  it('closes a popover opened by hover with Escape', () => {
    const seen = recordDocumentKeys();
    cy.findAllByRole('button', { name: 'Climate Change' })
      .first()
      .pointerEnter();
    cy.findByRole('dialog', { name: 'Climate Change' }).should('be.visible');
    // Opened by hover, the focus stays where it was.
    cy.document()
      .its('activeElement')
      .should((element) => {
        expect(element.closest('.glossary-popover')).to.equal(null);
      });

    cy.press(ESC);
    cy.findByRole('dialog').should('not.exist');
    cy.then(() => expect(seen).to.not.include('Escape'));

    // Control: without a popover the same listener sees Escape.
    cy.press(ESC);
    cy.then(() => expect(seen).to.include('Escape'));
  });
});

describe('Keyboard order and motion', () => {
  beforeEach(() => {
    cy.visit('/en/page');
    cy.findAllByRole('button', { name: 'Climate Change' }).should(
      'have.length',
      1,
    );
  });

  it('reaches the triggers with Tab in document order', () => {
    cy.get('main .glossary-term__trigger').then(($triggers) => {
      const triggers = [...$triggers];
      cy.tabThroughPage().then(({ stops }) => {
        const order = stops
          .filter((stop) => triggers.includes(stop))
          .map((stop) => triggers.indexOf(stop));
        expect(order).to.deep.equal(triggers.map((_, index) => index));
      });
    });
  });

  it('keeps Tab inside a pinned popover until Escape, then goes on after the trigger', () => {
    cy.tabUntil(isClimateTrigger);
    cy.press(ENTER);
    cy.findByRole('dialog', { name: 'Climate' }).should('be.visible');
    const link = () =>
      cy.findByRole('link', { name: 'More about the weather' });
    cy.press(TAB);
    link().should('have.focus');
    // react-aria keeps the focus in the dialog: Tab does not leave it.
    cy.press(TAB);
    link().should('have.focus');
    cy.press(ESC);
    cy.findByRole('dialog').should('not.exist');
    cy.findAllByRole('button', { name: 'climate' })
      .first()
      .should('have.focus')
      .then(($trigger) => {
        cy.press(TAB);
        cy.document()
          .its('activeElement')
          .should((element) => {
            expect(
              $trigger[0].compareDocumentPosition(element) &
                Node.DOCUMENT_POSITION_FOLLOWING,
              'focus follows the trigger',
            ).to.not.equal(0);
          });
      });
  });

  it('shows and hides the popover without animation', () => {
    // Without animation, prefers-reduced-motion needs no rule of its own.
    const still = (element) => {
      const style = getComputedStyle(element);
      expect(style.animationName, 'animation').to.equal('none');
      style.transitionDuration
        .split(',')
        .forEach((duration) =>
          expect(parseFloat(duration), 'transition').to.equal(0),
        );
    };
    cy.findAllByRole('button', { name: 'climate' })
      .first()
      .then(($trigger) => still($trigger[0]))
      .click();
    cy.get('.glossary-popover').should(($popover) => still($popover[0]));
  });

  it('fits the popover into 320 CSS pixels, as at 400 percent zoom', () => {
    cy.viewport(320, 256);
    cy.findAllByRole('button', { name: 'climate' }).first().as('trigger');
    cy.document().then((doc) => {
      const before = doc.documentElement.scrollWidth;
      cy.get('@trigger').click();
      cy.findByRole('dialog', { name: 'Climate' }).should('be.visible');
      cy.get('.glossary-popover').isInsideViewport();
      // The popover adds no horizontal scrolling to the page.
      cy.document()
        .its('documentElement.scrollWidth')
        .should('be.at.most', before);
    });
  });
});
