import 'cypress-axe';
import 'cypress-file-upload';
import './commands';
import { API_PATH } from './fixture';

// The acceptance backend resets its database through the robot server's
// remote keywords, as Volto's own reset-fixture does. Volto's version reads
// Cypress.env(), which needs the deprecated allowCypressEnv option.
function robotKeyword(keyword) {
  return cy.request({
    method: 'POST',
    url: `${API_PATH}/RobotRemote`,
    headers: { Accept: 'text/xml', 'content-type': 'text/xml' },
    body:
      '<?xml version="1.0"?><methodCall><methodName>run_keyword</methodName>' +
      `<params><param><value><string>${keyword}</string></value></param>` +
      '<param><value><array><data><value><string>' +
      'plone.app.robotframework.testing.PLONE_ROBOT_TESTING' +
      '</string></value></data></array></value></param></params></methodCall>',
  });
}

Cypress.on('uncaught:exception', (err) => {
  // Volto's own acceptance tests ignore this browser message too.
  if (/ResizeObserver loop/.test(err.message)) {
    return false;
  }
});

beforeEach(function () {
  cy.log('Setting up API fixture');
  robotKeyword('remote_zodb_setup');
  cy.createGlossaryFixture();
});

afterEach(function () {
  cy.log('Tearing down API fixture');
  robotKeyword('remote_zodb_teardown');
});
