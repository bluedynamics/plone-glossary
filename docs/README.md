# plone-glossary documentation

This directory holds the documentation of `@bluedynamics/plone-glossary`.
Sphinx builds it with the Plone Sphinx theme.
The workflow `.github/workflows/docs.yml` publishes it on GitHub Pages at https://bluedynamics.github.io/plone-glossary/ when a change to the documentation reaches `main`.

## Build and check

The build needs [uv](https://docs.astral.sh/uv/).
It creates its own Python environment in `docs/.venv` on the first run.
Run the commands from the root of the repository.

```shell
make docs-html             # build the HTML pages into docs/_build/html, a warning fails the build
make docs-livehtml         # serve the pages on http://127.0.0.1:8050 and rebuild them on changes
make docs-vale             # check style and spelling with Vale
make docs-linkcheckbroken  # check the links, fails when a link is broken
```

## Pages

The pages are MyST Markdown files in `docs/docs/`.
They follow the Plone documentation style, with one sentence per line.
Every page belongs to exactly one Diátaxis section: `tutorials/`, `how-to-guides/`, `reference/`, or `concepts/`.

AI coding agents must use the [plone-doc-style](https://github.com/plone/plone-doc-style-skill) skill for every documentation task.
`AGENTS.md` in the root of the repository has the details.
