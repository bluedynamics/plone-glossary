const fs = require('fs');
const projectRootPath = __dirname;
const { AddonRegistry } = require('@plone/registry/addon-registry');

let coreLocation;
if (fs.existsSync(`${projectRootPath}/core`))
  coreLocation = `${projectRootPath}/core`;
else if (fs.existsSync(`${projectRootPath}/../../core`))
  coreLocation = `${projectRootPath}/../../core`;

const { registry } = AddonRegistry.init(`${coreLocation}/packages/volto`);

// Extends ESlint configuration for adding the aliases to `src` directories in Volto addons
const addonAliases = Object.keys(registry.packages).map((o) => [
  o,
  registry.packages[o].modulePath,
]);

const srcDir = 'packages/plone-glossary/src';
const testFiles = ['**/*.test.ts', '**/*.test.tsx', '**/test-utils.ts'];

// Layer rule: core -> nothing, react -> core, volto -> everything.
// The anchored first pattern matches every bare module specifier (and, via its
// parent directory, every subpath), the negations let the allowed packages
// through, the relative patterns catch imports that leave the layer.
const layerRule = (message, group) => [
  'error',
  { patterns: [{ group, message }] },
];

module.exports = {
  extends: `${coreLocation}/packages/volto/.eslintrc`,
  rules: {
    'import/no-unresolved': 1,
  },
  overrides: [
    {
      files: [`${srcDir}/core/**/*.{ts,tsx}`],
      excludedFiles: testFiles.map((f) => `${srcDir}/core/${f}`),
      rules: {
        'no-restricted-imports': layerRule(
          'The core layer imports only relatively inside core.',
          [
            '/[a-z0-9@_$]*',
            '../react/**',
            '../volto/**',
            '../index',
            '../../react/**',
            '../../volto/**',
            '../../index',
          ],
        ),
      },
    },
    {
      files: [`${srcDir}/react/**/*.{ts,tsx}`],
      excludedFiles: testFiles.map((f) => `${srcDir}/react/${f}`),
      rules: {
        'no-restricted-imports': layerRule(
          'The react layer imports only core, react, react-dom and react-aria-components.',
          [
            '/[a-z0-9@_$]*',
            '!/react',
            '!/react-dom',
            '!/react-aria-components',
            '../volto/**',
            '../index',
            '../../volto/**',
            '../../index',
          ],
        ),
      },
    },
  ],
  settings: {
    // Volto's configuration detects the version, but eslint runs from the
    // repository root, where react is not installed.
    react: { version: '18.2' },
    'import/resolver': {
      alias: {
        map: [
          ['@plone/volto', `${coreLocation}/packages/volto/src`],
          ['@plone/volto-slate', `${coreLocation}/packages/volto-slate/src`],
          ['@plone/registry', `${coreLocation}/packages/registry/src`],
          [
            '@bluedynamics/plone-glossary',
            './packages/plone-glossary/src',
          ],
          ...addonAliases,
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
};
