describe('First occurrence', () => {
  it('shows every occurrence by default', () => {
    cy.visit('/en/page');
    // Two in the text, one in the grid, one in the card; none in the link.
    cy.findAllByRole('button', { name: 'climate' }).should('have.length', 4);
  });

  it('shows only the first occurrence when the setting is on', () => {
    cy.visit('/en');
    cy.window().then((w) => {
      w.__PLONE_GLOSSARY_SETTINGS__.matchOnlyFirstOccurrence = true;
    });
    cy.get('#navigation').findByRole('link', { name: 'Page' }).click();
    cy.location('pathname').should('eq', '/en/page');
    cy.findAllByRole('button', { name: 'Climate Change' }).should(
      'have.length',
      1,
    );
    cy.findAllByRole('button', { name: 'REST' }).should('have.length', 1);

    cy.findAllByRole('button', { name: 'climate' }).should('have.length', 1);
    // It is the topmost occurrence of the term, in the slate text.
    cy.get('main span.glossary-term')
      .filter((_, element) => element.textContent.toLowerCase() === 'climate')
      .first()
      .should('have.class', 'glossary-term--active')
      .within(() => {
        cy.findByRole('button', { name: 'climate' }).should('exist');
      })
      .closest('p')
      .should('contain.text', 'Climate Change affects the climate.');
  });
});

// Measurement for the decision on the default of matchOnlyFirstOccurrence.
describe('Tab stops', () => {
  const count = (stops) => ({
    all: stops.length,
    triggers: stops.filter((stop) => stop.matches('.glossary-term__trigger'))
      .length,
  });

  it('counts the tab stops on the page with the setting off and on', () => {
    let off;
    cy.visit('/en/page');
    cy.findAllByRole('button', { name: 'climate' }).should('have.length', 4);
    cy.tabThroughPage().then(({ stops }) => {
      off = count(stops);
    });

    cy.visit('/en');
    cy.window().then((w) => {
      w.__PLONE_GLOSSARY_SETTINGS__.matchOnlyFirstOccurrence = true;
    });
    cy.get('#navigation').findByRole('link', { name: 'Page' }).click();
    cy.location('pathname').should('eq', '/en/page');
    cy.findAllByRole('button', { name: 'climate' }).should('have.length', 1);
    cy.tabThroughPage().then(({ stops }) => {
      const on = count(stops);
      cy.task(
        'log',
        `Tab stops on /en/page: setting off ${off.all} (${off.triggers} triggers), on ${on.all} (${on.triggers} triggers)`,
      );
      // Off: Climate Change, climate (4), REST. On: one per term.
      expect(off.triggers).to.equal(6);
      expect(on.triggers).to.equal(3);
      expect(on.all).to.equal(off.all - 3);
    });
  });
});
