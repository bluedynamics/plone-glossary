const path = require('path');
const { defineConfig } = require('cypress');

// The Makefile runs Cypress from core/packages/volto with this file as its
// configuration, so every path is anchored here, not at the working directory.
const cypressFolder = path.join(__dirname, 'cypress');
// Generated files go where the reusable CI workflow
// (plone/meta frontend-acceptance.yml) uploads them from after a failure.
const outputFolder = path.join(__dirname, 'acceptance', 'cypress');

module.exports = defineConfig({
  viewportWidth: 1280,
  viewportHeight: 1280,
  retries: {
    runMode: 3,
  },
  video: false,
  fixturesFolder: path.join(cypressFolder, 'fixtures'),
  screenshotsFolder: path.join(outputFolder, 'screenshots'),
  videosFolder: path.join(outputFolder, 'videos'),
  downloadsFolder: path.join(outputFolder, 'downloads'),
  env: {
    // cypress-axe reads axe-core relative to the working directory by default.
    AXE_CORE_PATH: require.resolve('axe-core/axe.min.js', {
      paths: [path.dirname(require.resolve('cypress-axe'))],
    }),
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: path.join(cypressFolder, 'tests/**/*.cy.{js,jsx,ts,tsx}'),
    supportFile: path.join(cypressFolder, 'support/e2e.js'),
    setupNodeEvents(on) {
      on('task', {
        // Prints a line to the terminal of `cypress run`.
        log(message) {
          // eslint-disable-next-line no-console
          console.log(message);
          return null;
        },
      });
    },
  },
});
