---
myst:
  html_meta:
    "description": "The versions of Volto, React, Node.js, collective.glossary, and the browsers that plone-glossary supports and is tested with."
    "property=og:description": "The versions of Volto, React, Node.js, collective.glossary, and the browsers that plone-glossary supports and is tested with."
    "property=og:title": "Compatibility"
    "keywords": "Plone, Volto, glossary, compatibility, React, Node.js, collective.glossary, browsers"
---

# Compatibility

This page lists the versions that `@bluedynamics/plone-glossary` supports and the setups its tests run in.

(compatibility-frontend)=

## Volto and its libraries

The package supports Volto from version 19.5.1 up to, but not including, version 20.
It has no dependencies of its own.
Every library it imports is a peer dependency.
Volto 19.5.1 ships each of them.

| Peer dependency | Range |
| --- | --- |
| `@plone/volto` | `>=19.5.1 <20` |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `react-aria-components` | `^1.22.1` |
| `react-intl` | `^3.12.1` |
| `react-redux` | `^8.1.2` |
| `react-router` | `^5.2.0` |
| `react-router-dom` | `^5.2.0` |

The continuous integration runs the unit tests against Volto 19.5.1, the lowest supported version.
It runs the unit tests and the acceptance tests against Volto 19.8.2, the version of the development setup.

(compatibility-node)=

## Node.js

The continuous integration runs the unit tests on Node.js 24 and 26.
It runs the code analysis, the translation check, and the acceptance tests on Node.js 24.

| Volto | Node.js in the tests |
| --- | --- |
| 19.5.1 | 24 |
| 19.8.2 | 24 and 26 |

The package has no Node.js requirement of its own.
Volto 19.5.1 declares Node.js 22 or 24 in its `engines` field.
Volto 19.8.2 declares Node.js 22, 24, or 26.
Node.js 22 is not tested.

(compatibility-backend)=

## Backend

The package reads the glossary from the backend add-on `collective.glossary` 3.x.
It uses two of its REST API endpoints:

- `@tooltip_terms` for the tooltips
- `@glossary_terms` for the glossary view

The acceptance tests run with `collective.glossary` 3.0.2 on Plone 6.2.3, in the container image `plone/server-acceptance:6.2.3`.
Their site is multilingual, with the language roots `/en`, `/de`, and `/it`.

`collective.glossary` 3.0.2 declares its namespace package with `pkg_resources`, which Plone 6.2 no longer ships.
The acceptance setup installs `horse-with-no-namespace` next to it.
That package makes the declaration work.

(compatibility-browsers)=

## Browsers

The continuous integration runs the acceptance tests in Electron, the Chromium-based browser that comes with Cypress.
The acceptance tests can also run in Chrome and Firefox.
Firefox is not part of the continuous integration.
The project's rules ask for a run in Firefox when a change touches focus or pointer handling.
The unit tests run in jsdom.

Safari and the browsers of mobile devices are not part of the automated tests.
Checks with screen readers, voice control, and touch screens need a person with the device.

Safari before version 16.4 shows no tooltips.
{ref}`limits-lookbehind` describes this limit.

(compatibility-next-frontend)=

## Plone's next frontend

Support for Plone's next frontend is planned for version 2 of the package.
