// This script file adds the commands to the global Cypress namespace.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace Cypress {
  export interface Chainable {
    // cypress-axe, injected with the package's axe-core (commands.js)
    injectAxe(options?: { axeCorePath?: string }): Chainable<void>;
    checkA11y(
      context?: Object | string,
      options?: Object,
      violationCallback?: (violations: any[]) => void,
      skipFailures?: boolean,
    ): Chainable<void>;
    // cypress/support/fixture.js and commands.js
    createGlossaryFixture(): Chainable<void>;
    checkWcagAA(context?: Object | string): Chainable<void>;
    pointerEnter(): Chainable<JQuery<HTMLElement>>;
    tabUntil(
      predicate: (element: Element) => boolean,
      limit?: number,
    ): Chainable<void>;
    markWindow(): Chainable<void>;
    windowIsMarked(): Chainable<void>;
    isInsideViewport(): Chainable<JQuery<HTMLElement>>;
    loginAsAdmin(): Chainable<void>;
    tabThroughPage(limit?: number): Chainable<{ stops: Element[] }>;
  }
}
