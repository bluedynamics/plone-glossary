// This script file adds the commands to the global Cypress namespace.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace Cypress {
  export interface Chainable {
    /**
     * Custom command to select DOM element by data-cy attribute.
     * @example cy.dataCy('greeting')
     */
    navigate(value: string): Chainable<JQuery<HTMLElement>>;
    getSlateEditorAndType(value: string): Chainable<JQuery<HTMLElement>>;
    setSlateSelection(value: string): Chainable<JQuery<HTMLElement>>;
    clickSlateButton(value: string): Chainable<JQuery<HTMLElement>>;
    autologin(): Chainable<JQuery<HTMLElement>>;
    createContent({
      contentType,
      contentId,
      contentTitle,
      path,
      bodyModifier,
      preview_image_link,
    }: {
      contentType: string;
      contentId: string;
      contentTitle: string;
      path?: string;
      bodyModifier?: (body: any) => any;
      preview_image_link?: { '@id': string };
    }): Chainable<JQuery<HTMLElement>>;
    addNewBlock(value: string): Chainable<JQuery<HTMLElement>>;
    matchImage(): Chainable<JQuery<HTMLElement>>;
    injectAxe({
      axeCorePath,
    }: {
      axeCorePath: string;
    }): Chainable<JQuery<HTMLElement>>;
    checkA11y(
      context?: Object | string,
      options?: Object,
      violationCallback?: (violations: any[]) => void,
      skipFailures?: boolean,
    ): Chainable<JQuery<HTMLElement>>;
    checkAccessibility(): Chainable<JQuery<HTMLElement>>;
    getSlate(): Chainable<JQuery<HTMLElement>>;
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
