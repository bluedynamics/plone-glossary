import '@plone/volto/cypress/add-commands';

const { TAB } = Cypress.Keyboard.Keys;

// Every WCAG level A and AA tag the injected axe-core knows, as in the unit
// tests (src/react/test-utils.ts). Best-practice rules stay out.
function wcagTags(axe) {
  return [...new Set(axe.getRules().flatMap((rule) => rule.tags))].filter(
    (tag) => /^wcag2\d?a{1,2}$/.test(tag),
  );
}

function logViolations(violations) {
  cy.task(
    'log',
    violations
      .map(
        ({ id, nodes }) =>
          `axe ${id}: ${nodes.map((node) => node.html).join(' | ')}`,
      )
      .join('\n'),
  );
}

// The Makefile runs Cypress from core/packages/volto, where cypress-axe's
// default path to axe-core does not exist.
Cypress.Commands.overwrite('injectAxe', (injectAxe, options = {}) =>
  injectAxe({ axeCorePath: Cypress.env('AXE_CORE_PATH'), ...options }),
);

/** Fails on any WCAG A or AA violation inside `context`. Needs cy.injectAxe(). */
Cypress.Commands.add('checkWcagAA', (context) => {
  cy.window({ log: false }).then((win) => {
    cy.checkA11y(
      context,
      { runOnly: { type: 'tag', values: wcagTags(win.axe) } },
      logViolations,
    );
  });
});

/** A mouse pointer entering the element, as react-aria's useHover sees it. */
Cypress.Commands.add('pointerEnter', { prevSubject: 'element' }, (subject) =>
  cy.wrap(subject).trigger('pointerover', {
    eventConstructor: 'PointerEvent',
    pointerType: 'mouse',
  }),
);

/**
 * Presses Tab, with real key events, until the focused element matches
 * `predicate`, at most `limit` times.
 */
Cypress.Commands.add('tabUntil', (predicate, limit = 80) => {
  const step = (remaining) => {
    cy.press(TAB);
    cy.document({ log: false }).then((doc) => {
      const element = doc.activeElement;
      if (element && predicate(element)) return;
      if (remaining <= 1) {
        throw new Error(`Tab did not reach the element in ${limit} presses`);
      }
      step(remaining - 1);
    });
  };
  step(limit);
});

/** Marks the current window, to tell a client-side navigation from a reload. */
Cypress.Commands.add('markWindow', () =>
  cy.window({ log: false }).then((win) => {
    win.__acceptanceMarker = true;
  }),
);

Cypress.Commands.add('windowIsMarked', () =>
  cy.window({ log: false }).its('__acceptanceMarker').should('equal', true),
);

/** Asserts, with retries, that the whole element lies inside the viewport. */
Cypress.Commands.add(
  'isInsideViewport',
  { prevSubject: 'element' },
  (subject) =>
    cy.window({ log: false }).then((win) =>
      cy.wrap(subject, { log: false }).should(($element) => {
        const rect = $element[0].getBoundingClientRect();
        // One pixel of tolerance for subpixel positions.
        expect(rect.top, 'top').to.be.at.least(-1);
        expect(rect.bottom, 'bottom').to.be.at.most(win.innerHeight + 1);
      }),
    ),
);
