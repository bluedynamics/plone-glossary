import { apiRequest, richText } from '../support/fixture';

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

  // DEFECT (R35): the trigger is a native button, which browsers lay out as
  // an inline-block whatever glossary.css says. Chromium (and Electron) even
  // compute `display: inline-block`, so this fails there; Firefox computes
  // `inline` but lays it out as one box too. A multi-word term therefore never
  // wraps inside, see measurements.cy.js. Skipped until R35 is decided.
  it.skip('renders the trigger inline and selectable', () => {
    cy.findAllByRole('button', { name: 'climate' })
      .first()
      .should('have.css', 'display', 'inline')
      .and('have.css', 'user-select', 'text');
  });

  it('keeps the trigger text selectable', () => {
    cy.findAllByRole('button', { name: 'climate' })
      .first()
      .should('have.css', 'user-select', 'text');
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
