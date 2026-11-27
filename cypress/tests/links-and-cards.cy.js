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
      cy.findAllByRole('button').should('not.exist');
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

// R48: a slide that a carousel hides with aria-hidden holds no control.
describe('Hidden regions', () => {
  it('drops the trigger in content hidden with aria-hidden and restores it', () => {
    cy.visit('/en/page');
    cy.findAllByRole('button', { name: 'Climate Change' }).should(
      'have.length',
      1,
    );
    cy.injectAxe();
    cy.get('.block.gridBlock').as('slide');
    cy.get('@slide').find('.glossary-term--active').should('have.length', 1);
    cy.get('@slide').invoke('attr', 'aria-hidden', 'true');
    cy.get('@slide').within(() => {
      cy.get('span.glossary-term')
        .should('have.length', 1)
        .and('not.have.class', 'glossary-term--active');
      cy.get('[role="button"], [tabindex="0"]').should('not.exist');
    });
    cy.checkWcagAA('main');
    cy.get('@slide').invoke('removeAttr', 'aria-hidden');
    cy.get('@slide').within(() => {
      cy.findByRole('button', { name: 'climate' }).should('exist');
    });
    cy.checkWcagAA('main');
  });
});
