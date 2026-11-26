// The browser requests the backend directly, through Volto's ++api++ route.
const TERMS_OF = (path) =>
  new RegExp(`/plone/(\\+\\+api\\+\\+/)?${path}@tooltip_terms$`);

describe('Navigation root', () => {
  it('switches the terms with the navigation root', () => {
    cy.intercept('GET', '**/@tooltip_terms').as('terms');
    cy.visit('/en/page');
    cy.markWindow();
    cy.findAllByRole('button', { name: 'climate' }).should(
      'have.length.at.least',
      1,
    );

    cy.findByRole('link', { name: 'climate link' }).click();
    cy.location('pathname').should('eq', '/de/seite');
    cy.findByRole('button', { name: 'Klima' }).should('exist');
    cy.findAllByRole('button', { name: 'climate' }).should('not.exist');
    cy.windowIsMarked();
    cy.get('@terms.all').then((calls) => {
      const urls = calls.map((call) => call.request.url);
      expect(urls).to.have.length(2);
      expect(urls[0]).to.match(TERMS_OF('en/'));
      expect(urls[1]).to.match(TERMS_OF('de/'));
    });
  });

  it('requests the terms once per page load, for the navigation root only', () => {
    cy.intercept('GET', '**/@tooltip_terms').as('terms');
    cy.visit('/en/page');
    cy.findAllByRole('button', { name: 'Climate Change' }).should(
      'have.length',
      1,
    );
    // Give a late second request the time to show up.
    cy.wait(1500);
    cy.get('@terms.all').then((calls) => {
      const urls = calls.map((call) => call.request.url);
      expect(urls, 'requests to @tooltip_terms').to.have.length(1);
      expect(urls[0]).to.match(TERMS_OF('en/'));
      expect(urls.filter((url) => TERMS_OF('').test(url))).to.have.length(0);
    });
  });

  it('keeps the terms on navigation inside the navigation root', () => {
    cy.intercept('GET', '**/@tooltip_terms').as('terms');
    cy.visit('/en/page');
    cy.findAllByRole('button', { name: 'Climate Change' }).should(
      'have.length',
      1,
    );
    cy.get('#navigation').findByRole('link', { name: 'Home' }).click();
    cy.location('pathname').should('eq', '/en');
    cy.get('#navigation').findByRole('link', { name: 'Page' }).click();
    cy.location('pathname').should('eq', '/en/page');
    cy.findAllByRole('button', { name: 'Climate Change' }).should(
      'have.length',
      1,
    );
    cy.wait(1000);
    cy.get('@terms.all').should('have.length', 1);
  });
});
