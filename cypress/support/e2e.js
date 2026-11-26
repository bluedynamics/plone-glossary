import 'cypress-axe';
import 'cypress-file-upload';
import './commands';
import './fixture';
import { setup, teardown } from '@plone/volto/cypress/support/reset-fixture';

Cypress.on('uncaught:exception', (err) => {
  // Volto's own acceptance tests ignore this browser message too.
  if (/ResizeObserver loop/.test(err.message)) {
    return false;
  }
});

beforeEach(function () {
  cy.log('Setting up API fixture');
  setup();
  cy.createGlossaryFixture();
});

afterEach(function () {
  cy.log('Tearing down API fixture');
  teardown();
});
