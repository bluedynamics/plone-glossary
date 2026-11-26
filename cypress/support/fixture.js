// The content every acceptance test starts with. The backend resets the
// database after each test (see e2e.js), so each test creates it anew.
//
// /en/glossary  Glossary with the terms Climate (variant Climates, definition
//               with a link), Climate Change and REST
// /de/glossar   Glossary with the term Klima
// /de/seite     Page with the text "Das Klima."
// /en/page      Page with a text, a grid, a link to /de/seite and a demo card
import { ploneAuth } from '@plone/volto/cypress/support/constants';

export const API_PATH =
  Cypress.env('API_PATH') || 'http://127.0.0.1:55001/plone';

export const PAGE_TEXT =
  'Climate Change affects the climate. REST is not rest. The climate again.';

export const CLIMATE_DEFINITION =
  '<p>The average weather over a long time. ' +
  '<a href="https://www.example.org/">More about the weather</a></p>';

const auth = { user: ploneAuth[0], pass: ploneAuth[1] };

/** A request to the backend as the site administrator. */
export function apiRequest(method, path, body) {
  return cy.request({
    method,
    url: `${API_PATH}${path}`,
    headers: { Accept: 'application/json' },
    auth,
    body,
  });
}

export function slate(text) {
  return {
    '@type': 'slate',
    value: [{ type: 'p', children: [{ text }] }],
    plaintext: text,
  };
}

export function richText(html) {
  return { data: html, 'content-type': 'text/html', encoding: 'utf-8' };
}

/** Creates and publishes `data` in the folder at `path`. */
export function createPublished(path, data) {
  return apiRequest('POST', path, data).then(() =>
    apiRequest('POST', `${path}/${data.id}/@workflow/publish`),
  );
}

function term(id, title, definition, variants = []) {
  return {
    '@type': 'Term',
    id,
    title,
    variants,
    definition: richText(definition),
  };
}

export function documentWithBlocks(id, title, blocks) {
  return {
    '@type': 'Document',
    id,
    title,
    blocks: Object.fromEntries(blocks),
    blocks_layout: { items: blocks.map(([blockId]) => blockId) },
  };
}

Cypress.Commands.add('createGlossaryFixture', () => {
  createPublished('/en', {
    '@type': 'Glossary',
    id: 'glossary',
    title: 'Glossary',
  });
  createPublished(
    '/en/glossary',
    term('climate', 'Climate', CLIMATE_DEFINITION, ['Climates']),
  );
  createPublished(
    '/en/glossary',
    term(
      'climate-change',
      'Climate Change',
      '<p>A lasting change of the climate.</p>',
    ),
  );
  createPublished(
    '/en/glossary',
    term(
      'rest',
      'REST',
      '<p>Representational State Transfer, a style of web interfaces.</p>',
    ),
  );

  createPublished('/de', {
    '@type': 'Glossary',
    id: 'glossar',
    title: 'Glossar',
  });
  createPublished(
    '/de/glossar',
    term('klima', 'Klima', '<p>Das mittlere Wetter über lange Zeit.</p>'),
  );
  createPublished(
    '/de',
    documentWithBlocks('seite', 'Seite', [
      ['title', { '@type': 'title' }],
      ['text', slate('Das Klima.')],
    ]),
  );

  // Created after /de/seite, so the backend stores the link by UID.
  createPublished(
    '/en',
    documentWithBlocks('page', 'Page', [
      ['title', { '@type': 'title' }],
      ['text', slate(PAGE_TEXT)],
      [
        'grid',
        {
          '@type': 'gridBlock',
          blocks: { 'grid-text': slate('climate in a grid') },
          blocks_layout: { items: ['grid-text'] },
        },
      ],
      [
        'link',
        {
          '@type': 'slate',
          value: [
            {
              type: 'p',
              children: [
                { text: '' },
                {
                  type: 'link',
                  data: { url: `${API_PATH}/de/seite` },
                  children: [{ text: 'climate link' }],
                },
                { text: '' },
              ],
            },
          ],
          plaintext: 'climate link',
        },
      ],
      [
        'card',
        {
          '@type': 'demoCard',
          title: 'Open the glossary',
          description: 'climate in a card',
          href: '/en/glossary',
        },
      ],
    ]),
  );
});
