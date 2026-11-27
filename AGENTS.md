# AGENTS.md

Rules for AI coding agents working in this repository.
People are welcome to read them too, they describe how the project is developed.
An instruction from the maintainer in your session takes precedence over this file.

## The project

`@bluedynamics/plone-glossary` provides glossary tooltips and glossary views for Plone.
Version 1 targets Volto 19, from 19.5.1 on.
The backend is `collective.glossary` 3.x with its endpoints `@tooltip_terms` and `@glossary_terms`.
The package is a standalone rebuild of `rohberg/volto-slate-glossary`, and it owes that add-on no backward compatibility.
Support for Plone's next frontend is planned for version 2, so nothing in version 1 may block it.

## Priorities

When goals conflict, the earlier one wins.

1. **Accessibility is a hard goal.** The yardstick is WCAG 2.2 AA. No function is reachable with the mouse only. An axe violation fails the tests. Do not build or recommend a variant that gives up accessibility for convenience or for parity with the old add-on.
2. **The page never breaks.** A faulty term, malformed backend data, or a failed request leaves the page readable and without tooltips at worst.
3. **Architecture and sustainability come before speed.** Take the time to do it properly.
4. **Few dependencies.** See the dependency rules below.

## Repository layout

| Path | Content |
| --- | --- |
| `packages/plone-glossary/` | The published package: `src/`, `locales/`, `news/` |
| `packages/demo/` | Private demo add-on, used by the acceptance tests |
| `cypress/` | Acceptance tests and their fixture |
| `docs/` | Sphinx documentation project, sources in `docs/docs/` |
| `core/` | Volto checkout, fetched by `make install`. Not part of the repository, never edit it |
| `legacy/`, `backend/` | The old add-on, kept as reference until the 1.0 release. Never import from it |
| `analysis/failure-paths.md` | Protocol of the analyzed failure paths, each with its test and result |

## Architecture rules

The source has three layers under `packages/plone-glossary/src/`.

- `core`: the term matcher in plain TypeScript. It imports only relatively inside `core`.
- `react`: activation registry, trigger, and popover. It imports `core`, `react`, `react-dom`, and `react-aria-components`, nothing else. It does not know Volto, Redux, or react-intl.
- `volto`: settings, store, loader, Slate integration, views. It may import everything Volto ships.

Test files (`*.test.ts`, `*.test.tsx`, `test-utils.ts`) are exempt.
ESLint and `src/layers.test.ts` enforce the layers.
Code in `core` and `react` must also be valid under React 19.

Dependencies:

- The package has no `dependencies` of its own. Every imported third-party library is listed in `peerDependencies`.
- Peer ranges follow Volto 19.5.1. Use only APIs that exist there.
- A new dependency, including a development dependency, needs a written justification in the commit message. A few lines of code are not a justification.

Decisions that were made on purpose.
Do not change them without the maintainer:

- Terms are matched when text is rendered. Tooltips become interactive in the browser only. The glossary view is rendered on the server.
- The matcher never throws. It builds at most one search expression per case rule, never one pass per term. Terms are escaped, whole words match, the longest term wins.
- Every occurrence has a stable wrapper `span.glossary-term`. When active it also carries `glossary-term--active` and contains the trigger, a `span` with `role="button"` and `tabindex="0"` (class `glossary-term__trigger`), not a native `<button>`, because a button cannot wrap and be selected like text.
- No trigger inside links or other interactive elements, inside `aria-hidden="true"` or `inert` content, or inside `data-glossary="off"`.
- The Slate text leaf never changes stored content.
- No CSS rules on classes the package does not own.
- All options live under `config.settings.glossary`.

## Environment and commands

Use Node 24 or 26 and the pnpm version pinned in `package.json`, through corepack.
Do not install global tools and do not change the Node installation of the machine.
If `pnpm` is not on the path, call `corepack pnpm`.

```shell
make install     # fetch Volto into core/, install, build Volto's dependencies
make lint        # ESLint without warnings, Prettier, Stylelint
make format      # fix what can be fixed automatically
make ci-test     # unit tests with coverage thresholds
make ci-i18n     # fails when the locales are out of sync, `make i18n` syncs them
```

The documentation in `docs/` needs `uv`, which keeps the Python environment in `docs/.venv`:

```shell
make docs-html             # Sphinx build, a warning fails it
make docs-vale             # Vale style and spelling checks, an error fails them
make docs-linkcheckbroken  # link check, fails on a broken link, needs the network
```

Run one test file:

```shell
pnpm --filter @bluedynamics/plone-glossary exec vitest run src/core/matcher.test.ts
```

Acceptance tests need Docker and three processes:

```shell
make ci-acceptance-backend-start      # container plone-glossary-acceptance-backend, port 55001
make acceptance-frontend-prod-start   # builds and serves the frontend on port 3000
make ci-acceptance-test               # Cypress, ACCEPTANCE_BROWSER=electron|chrome|firefox
make acceptance-backend-stop
```

Coverage thresholds: `src/core/**` 100 percent, the whole package at least 90 percent.
Do not add unreachable guard branches to satisfy them.

## How we work

1. **Understand first.** Read the code, its tests, and the reference documentation before you change behavior.
2. **Agree on the design before larger work.** Anything beyond a small fix starts with a short written design that the maintainer approves. A significant change to the architecture is always discussed first.
3. **Test first.** A fix comes with a test that fails before the fix and passes after it. A feature comes with tests for its behavior, including keyboard use.
4. **Never weaken an existing test** to make a change pass. If a test looks wrong, say so and ask.
5. **Treat failure paths as work items.** When you find an input or a state that can go wrong, record it with a test. Then fix it, or document it as a limit in words a user of the package understands. Fix it if it can break the page, lose data, mislead a reader, or shut out keyboard, touch, or screen reader users. Document it if a fix needs a redesign or trades one group of users against another, and name the trade.
6. **Verify browser behavior in a browser.** Focus, pointer, selection, and layout belong in the acceptance suite, jsdom is not enough. Run Firefox in addition to a Chromium browser when you touch focus or pointer handling.
7. **Get an independent review.** A change beyond a small fix is reviewed by someone who did not write it, a second agent or a person, before it counts as done.
8. **Verify before you report.** Run lint, unit tests, and the i18n check, plus the acceptance tests when behavior in the browser changed. Report what you ran and what failed. Do not call something done that you have not seen pass.
9. **Leave nothing running.** Stop dev servers, watchers, and containers you started. Only start and remove Docker containers whose names begin with `plone-glossary-acceptance`.

## Git, changelog, and releases

- Write Conventional Commits (`fix(react): ...`, `test(core): ...`, `docs: ...`), small and focused.
- A commit or a text on the forge (issue, pull request, comment, release note) that an AI model helped with ends with the trailer `Assisted-by: <model name>`. No `Co-Authored-By`, no "Generated with" footer, no email address.
- Maintainers work directly on `main`. Do not create branches or pull requests unless the maintainer asks for one. Contributions from outside come as pull requests.
- After the first release, every change that a user of the package can notice gets a news fragment in `packages/plone-glossary/news/`, named `<issue or +slug>.<type>` with the type `breaking`, `feature`, `bugfix`, `internal`, `documentation`, or `tests`.
- Pushing needs the maintainer's go-ahead. Tagging, creating a release, and publishing to npm need explicit approval each time.
- Do not commit working notes such as plans, specifications, and review ledgers (`.superpowers/` is ignored), and do not commit coverage or build output.

## Writing

- Code, comments, commit messages, README, and documentation are in American English.
- User-visible strings are react-intl messages in `src/volto/messages.ts`. After you change one, run `make i18n` and add the translations.
- The documentation follows the Plone documentation style: MyST Markdown, one sentence per line, and every page belongs to exactly one Diátaxis type, `tutorials/`, `how-to-guides/`, `reference/`, or `concepts/`.
- The [`plone-doc-style`](https://github.com/plone/plone-doc-style-skill) skill is mandatory for every documentation task: planning, writing, editing, or reviewing a page under `docs/`. Install it before you start, its README describes how for each agent. If the skill is not available in your session, stop and have it installed. Do not work on the documentation without it.
- Do not use em dashes in prose. Use a comma or a new sentence.
- The origin of the package stays named in `README.md` and `CONTRIBUTORS.md`. The license is MIT.
