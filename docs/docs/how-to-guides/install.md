---
myst:
  html_meta:
    "description": "How to install plone-glossary in an existing Volto project and check that the tooltips work."
    "property=og:description": "How to install plone-glossary in an existing Volto project and check that the tooltips work."
    "property=og:title": "Install the package"
    "keywords": "Plone, Volto, glossary, install, add-on"
---

# Install the package

This guide shows you how to install the package in an existing Volto project.
The steps follow [Install an add-on in Volto](https://6.docs.plone.org/volto/development/add-ons/install-an-add-on.html) of the Volto documentation.

(install-requirements)=

## Requirements

Check these requirements before you start:

- The project uses Volto 19.5.1 or a later version 19.
- The project has a policy add-on, as a project that Cookieplone generates has.
- The Plone site has `collective.glossary` 3.x installed and activated.
  See the [README of `collective.glossary`](https://github.com/collective/collective.glossary).

{doc}`/reference/compatibility` lists the tested versions.

(install-add)=

## Add the package

Add the package to your policy add-on.
Replace `volto-my-project` with the name of your policy add-on.

```shell
pnpm --filter volto-my-project add @bluedynamics/plone-glossary
```

(install-register)=

## Register the add-on

Open the {file}`package.json` of your policy add-on.
Add the package to the list under the key `addons`:

```json
{
  "name": "volto-my-project",
  "addons": ["@bluedynamics/plone-glossary"]
}
```

Volto then loads the package before your policy add-on.
The configuration of your policy add-on runs after the package's configuration.
This order matters when you change settings or replace the trigger.

Volto also accepts add-ons in {file}`volto.config.js`.
See [Programmatically define the active add-ons and theme](https://6.docs.plone.org/volto/configuration/volto-config-js.html) in the Volto documentation.

To show tooltips in the title and description blocks as well, see {ref}`settings-block-views`.

(install-check)=

## Check the installation

1. Restart Volto.
2. Log in and add a {guilabel}`Glossary`.
   The new glossary shows the letters A to Z above the message "This glossary has no terms yet."
3. Add a {guilabel}`Term` to the glossary, with a definition.
4. Add a page whose text contains the term, and save it.
5. Reload the page in your browser.
   The package loads the terms when the page loads.
   The term in the text has a dotted underline.
6. Press {kbd}`Tab` until the term has the focus.
7. Press {kbd}`Enter`.
   A popover with the definition opens.
   The focus moves into the popover.
8. Press {kbd}`Escape`.
   The popover closes.
   The focus returns to the term.

If the term has no underline, check the conditions in {ref}`components-activation`.
