describe('Links and cards', () => {
  beforeEach(() => {
    cy.visit('/en/page');
    cy.findAllByRole('button', { name: 'Climate Change' }).should(
      'have.length',
      1,
    );
  });

  it('renders no trigger inside a link', () => {
    cy.findByRole('link', { name: 'climate link' }).within(() => {
      // The term is matched inside the link, but stays plain text.
      cy.get('span.glossary-term')
        .should('have.length', 1)
        .and('have.text', 'climate')
        .and('not.have.class', 'glossary-term--active');
      cy.get('button').should('not.exist');
    });
  });

  it('keeps the tooltip in a card and the card clickable', () => {
    cy.get('.demo-card').within(() => {
      cy.findByRole('button', { name: 'climate' }).click();
    });
    cy.findByRole('dialog', { name: 'Climate' }).should('be.visible');
    cy.location('pathname').should('eq', '/en/page');
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.findByRole('dialog').should('not.exist');

    // The free area of the card belongs to the link's click area.
    cy.get('.demo-card').click('bottomRight');
    cy.location('pathname').should('eq', '/en/glossary');
    cy.findByRole('heading', { level: 1, name: 'Glossary' }).should('exist');
  });
});
