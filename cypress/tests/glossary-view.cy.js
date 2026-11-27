import {
  apiRequest,
  createPublished,
  documentWithBlocks,
  richText,
  slate,
} from '../support/fixture';

// A PNG image of one pixel.
const PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// A viewport low enough that the letter headings start below it.
const LOW_VIEWPORT = [1280, 200];

function letterLink(letter) {
  return cy
    .findByRole('navigation', { name: 'Glossary index' })
    .findByRole('link', { name: letter });
}

/**
 * Visits the glossary and waits for the API requests of the page load, made
 * after hydration: the content once more and the tooltip terms.
 */
function visitHydrated(url) {
  cy.intercept({ method: 'GET', url: /\+\+api\+\+\/en\/glossary\?/ }).as(
    'content',
  );
  cy.intercept('GET', '**/en/@tooltip_terms').as('tooltipTerms');
  cy.visit(url);
  cy.wait(['@content', '@tooltipTerms']);
  cy.get('main .term').should('have.length', 3);
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

  it('writes the letter to the URL and keeps the page when jumping', () => {
    cy.viewport(...LOW_VIEWPORT);
    // Only requests after the page load count below.
    visitHydrated('/en/glossary');
    cy.markWindow();
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

    // The same letter again: no hash change, the focus still ends on the
    // heading after the browser's fragment navigation.
    letterLink('R').click();
    cy.location('hash').should('eq', '#glossary-letter-R');
    cy.focused().should('have.id', 'glossary-letter-R');
    cy.wait(500);
    cy.focused().should('have.id', 'glossary-letter-R');
  });

  it('keeps focus and hash consistent when going Back from a letter jump', () => {
    cy.viewport(...LOW_VIEWPORT);
    visitHydrated('/en/glossary');
    letterLink('C').click();
    cy.location('hash').should('eq', '#glossary-letter-C');
    cy.focused().should('have.id', 'glossary-letter-C');
    letterLink('R').click();
    cy.location('hash').should('eq', '#glossary-letter-R');
    cy.focused().should('have.id', 'glossary-letter-R');

    cy.go('back');
    cy.location('hash').should('eq', '#glossary-letter-C');
    cy.focused().should('have.id', 'glossary-letter-C');
    cy.get('h2#glossary-letter-C').isInsideViewport();

    cy.go('forward');
    cy.location('hash').should('eq', '#glossary-letter-R');
    cy.focused().should('have.id', 'glossary-letter-R');
  });

  it('focuses the letter heading of a page loaded with its hash', () => {
    cy.viewport(...LOW_VIEWPORT);
    visitHydrated('/en/glossary#glossary-letter-C');
    cy.location('hash').should('eq', '#glossary-letter-C');
    cy.focused().should('have.id', 'glossary-letter-C');
    cy.get('h2#glossary-letter-C').isInsideViewport();
  });

  it('links back from a term to its glossary', () => {
    cy.visit('/en/glossary/climate');
    cy.findByRole('heading', { level: 1, name: 'Climate' }).should('exist');
    cy.findByRole('link', { name: 'Back to glossary' }).click();
    cy.location('pathname').should('eq', '/en/glossary');
    cy.findByRole('heading', { level: 1, name: 'Glossary' }).should('exist');
  });

  it('keeps the focus on "Try again" and moves it to the list after a retry', () => {
    cy.intercept(
      { method: 'GET', url: '**/en/glossary/@glossary_terms', times: 1 },
      { statusCode: 502, body: {} },
    ).as('failed');
    // After a client-side navigation the view loads the terms itself. A
    // click before hydration would load the glossary on the server and make
    // no request to fail: wait for the terms request the loader makes once
    // the term page is hydrated.
    cy.intercept('GET', '**/en/@tooltip_terms').as('hydrated');
    cy.visit('/en/glossary/climate');
    cy.wait('@hydrated');
    cy.findByRole('link', { name: 'Back to glossary' }).click();
    cy.location('pathname').should('eq', '/en/glossary');
    cy.wait('@failed');
    cy.findByRole('status').should(
      'contain.text',
      'The glossary terms could not be loaded.',
    );
    cy.findByRole('button', { name: 'Try again' }).focus();
    // Space: cy.press sends Enter without the activation a native button
    // needs, in Chromium and in Firefox; a real Space key press activates it.
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.focused().should('have.id', 'glossary-letter-C');
    cy.findByRole('status').should(
      'contain.text',
      'The glossary terms have been loaded.',
    );
    cy.get('main .term').should('have.length', 3);
  });

  // R49, revised by R66: @glossary_terms returns the raw definition; the
  // popover and the term view get the transformed one.
  it('shows raw internal links and images in the list, resolved ones elsewhere', () => {
    // An image and a link stored the way Plone's TinyMCE writes them.
    apiRequest('POST', '/en', {
      '@type': 'Image',
      id: 'chart',
      title: 'Chart',
      image: {
        data: PIXEL_PNG,
        encoding: 'base64',
        filename: 'chart.png',
        'content-type': 'image/png',
      },
    })
      .its('body.UID')
      .then((imageUid) => {
        apiRequest('GET', '/en/page')
          .its('body.UID')
          .then((uid) => {
            createPublished('/en/glossary', {
              '@type': 'Term',
              id: 'weather',
              title: 'Weather',
              definition: richText(
                `<p>See <a href="resolveuid/${uid}">the page</a>.</p>` +
                  `<p><img src="resolveuid/${imageUid}/@@images/image/preview" alt="Weather chart"></p>`,
              ),
            });
            createPublished(
              '/en',
              documentWithBlocks('forecast', 'Forecast', [
                ['title', { '@type': 'title' }],
                ['text', slate('The weather today.')],
              ]),
            );
            const href = () =>
              cy
                .findByRole('link', { name: 'the page' })
                .invoke('attr', 'href');
            /** The image's address; it must have loaded. */
            const image = () =>
              cy
                .findByRole('img', { name: 'Weather chart' })
                .should(($image) => {
                  expect($image[0].complete, 'loaded').to.equal(true);
                  expect($image[0].naturalWidth, 'width').to.be.greaterThan(0);
                })
                .invoke('attr', 'src');
            const RESOLVED_IMAGE = /^\/en\/chart\/@@images\/image-/;

            cy.visit('/en/glossary');
            cy.get('main .term').should('have.length', 4);
            href().should('eq', `resolveuid/${uid}`);
            image().should(
              'eq',
              `resolveuid/${imageUid}/@@images/image/preview`,
            );
            // Following the raw link works, through a redirect of the server.
            cy.findByRole('link', { name: 'the page' }).click();
            cy.location('pathname').should('eq', '/en/page');
            cy.findByRole('heading', { level: 1, name: 'Page' }).should(
              'exist',
            );

            cy.visit('/en/glossary/weather');
            href().should('eq', '/en/page');
            image().should('match', RESOLVED_IMAGE);

            cy.visit('/en/forecast');
            cy.findByRole('button', { name: 'weather' }).click();
            cy.findByRole('dialog', { name: 'Weather' }).within(() => {
              href().should('eq', '/en/page');
              image().should('match', RESOLVED_IMAGE);
            });
          });
      });
  });

  // What Volto's rich text widget stores for a page picked as link target:
  // an app path (the widget renders the link with UniversalLink).
  it("shows a link written with Volto's editor as the same app path everywhere", () => {
    const VOLTO_HTML = '<p>See <a href="/en/page">the page</a>.</p>';
    createPublished('/en/glossary', {
      '@type': 'Term',
      id: 'weather',
      title: 'Weather',
      definition: richText('<p>Draft</p>'),
    });
    // Saved as Volto's edit form saves a rich text field.
    apiRequest('PATCH', '/en/glossary/weather', {
      definition: {
        data: VOLTO_HTML,
        'content-type': 'text/html',
        encoding: 'utf8',
      },
    });
    createPublished(
      '/en',
      documentWithBlocks('forecast', 'Forecast', [
        ['title', { '@type': 'title' }],
        ['text', slate('The weather today.')],
      ]),
    );
    // The backend returns it unchanged from all three endpoints.
    apiRequest('GET', '/en/glossary/@glossary_terms')
      .its('body.items.W.0.definition')
      .should('eq', VOLTO_HTML);
    apiRequest('GET', '/en/glossary/weather')
      .its('body.definition.data')
      .should('eq', VOLTO_HTML);
    apiRequest('GET', '/en/@tooltip_terms')
      .its('body.items')
      .then((items) => {
        expect(items.find((item) => item.term === 'Weather').definition).to.eql(
          [VOLTO_HTML],
        );
      });
    const link = () => cy.findByRole('link', { name: 'the page' });

    cy.visit('/en/glossary');
    cy.get('main .term').should('have.length', 4);
    link().should('have.attr', 'href', '/en/page');
    // A link inside a definition is plain HTML: following it loads the page.
    cy.markWindow();
    link().click();
    cy.location('pathname').should('eq', '/en/page');
    cy.window().should((win) => {
      expect(win.__acceptanceMarker, 'same window').to.equal(undefined);
    });

    cy.visit('/en/glossary/weather');
    link().should('have.attr', 'href', '/en/page');
    cy.markWindow();
    link().click();
    cy.location('pathname').should('eq', '/en/page');
    cy.window().should((win) => {
      expect(win.__acceptanceMarker, 'same window').to.equal(undefined);
    });

    cy.visit('/en/forecast');
    cy.findByRole('button', { name: 'weather' }).click();
    cy.findByRole('dialog', { name: 'Weather' }).within(() => {
      link().should('have.attr', 'href', '/en/page');
    });
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
