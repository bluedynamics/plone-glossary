const { ENTER, ESC, TAB } = Cypress.Keyboard.Keys;

function isClimateTrigger(element) {
  return (
    element.matches('button.glossary-term__trigger') &&
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
