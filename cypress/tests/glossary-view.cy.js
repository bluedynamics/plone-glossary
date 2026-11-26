// A viewport low enough that the letter headings start below it.
const LOW_VIEWPORT = [1280, 200];

function letterLink(letter) {
  return cy
    .findByRole('navigation', { name: 'Glossary index' })
    .findByRole('link', { name: letter });
}

describe('Glossary view', () => {
  it('delivers the glossary terms in the server HTML', () => {
    cy.request('/en/glossary')
      .its('body')
      .should('include', 'Climate Change')
      .and('include', 'glossary-letter-C')
      // Rendered markup, not only the serialized store.
      .and('match', /<h2 id="glossary-letter-C"/)
      .and(
        'match',
        /<a href="\/en\/glossary\/climate-change">Climate Change<\/a>/,
      );
  });

  it('jumps to a letter from the alphabet navigation', () => {
    cy.viewport(...LOW_VIEWPORT);
    cy.visit('/en/glossary');
    cy.window().then((win) => {
      cy.get('h2#glossary-letter-C').should(($heading) => {
        expect(
          $heading[0].getBoundingClientRect().top,
          'heading starts below the viewport',
        ).to.be.greaterThan(win.innerHeight);
      });
    });
    letterLink('C').click();
    cy.get('h2#glossary-letter-C').isInsideViewport();
  });

  // DEFECT (R38, Firefox only): the click handler focuses the heading before
  // the browser follows the link; Firefox then clears the focus when it
  // scrolls to the fragment, so `cy.focused()` finds nothing there. Passes in
  // Chromium and Electron, the browsers of this suite and of CI.
  it('writes the letter to the URL and keeps the page when jumping', () => {
    cy.viewport(...LOW_VIEWPORT);
    // The API requests of the page load, made after hydration: the content
    // once more and the tooltip terms. Only later requests count below.
    cy.intercept({ method: 'GET', url: /\+\+api\+\+\/en\/glossary\?/ }).as(
      'content',
    );
    cy.intercept('GET', '**/en/@tooltip_terms').as('tooltipTerms');
    cy.visit('/en/glossary');
    cy.wait(['@content', '@tooltipTerms']);
    cy.markWindow();
    cy.get('main .term').should('have.length', 3);
    const requests = [];
    cy.intercept({ url: /\+\+api\+\+/ }, (request) => {
      requests.push(request.url);
    });

    letterLink('R').click();
    cy.location('hash').should('eq', '#glossary-letter-R');
    cy.focused().should('have.id', 'glossary-letter-R');
    cy.get('h2#glossary-letter-R').isInsideViewport();
    // Nothing scrolls the page back to the top afterwards.
    cy.wait(1000);
    cy.window().its('scrollY').should('be.greaterThan', 0);
    cy.get('h2#glossary-letter-R').isInsideViewport();
    // No reload, no request for the content or the terms.
    cy.windowIsMarked();
    cy.then(() => expect(requests, 'API requests after the click').to.eql([]));
    cy.get('main .term').should('have.length', 3);
  });

  it('links back from a term to its glossary', () => {
    cy.visit('/en/glossary/climate');
    cy.findByRole('heading', { level: 1, name: 'Climate' }).should('exist');
    cy.findByRole('link', { name: 'Back to glossary' }).click();
    cy.location('pathname').should('eq', '/en/glossary');
    cy.findByRole('heading', { level: 1, name: 'Glossary' }).should('exist');
  });

  it('has no accessibility violations', () => {
    cy.visit('/en/glossary');
    cy.get('main .term').should('have.length', 3);
    cy.injectAxe();
    cy.checkWcagAA('main');

    cy.visit('/en/glossary/climate');
    cy.findByRole('link', { name: 'Back to glossary' }).should('exist');
    cy.injectAxe();
    cy.checkWcagAA('main');
  });
});
