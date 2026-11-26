### Defensive settings for make:
#     https://tech.davis-hansson.com/p/make/
SHELL:=bash
.ONESHELL:
.SHELLFLAGS:=-eu -o pipefail -c
.SILENT:
.DELETE_ON_ERROR:
MAKEFLAGS+=--warn-undefined-variables
MAKEFLAGS+=--no-builtin-rules

CURRENT_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

# Recipe snippets for reuse

# We like colors
# From: https://coderwall.com/p/izxssa/colored-makefile-for-golang-projects
RED=`tput setaf 1`
GREEN=`tput setaf 2`
RESET=`tput sgr0`
YELLOW=`tput setaf 3`

GIT_FOLDER=$(CURRENT_DIR)/.git

PLONE_VERSION=6.2.3
DOCKER_IMAGE=plone/server-dev:${PLONE_VERSION}
DOCKER_IMAGE_ACCEPTANCE=plone/server-acceptance:${PLONE_VERSION}
API_PATH ?= http://127.0.0.1:55001/plone

# Acceptance backend: the stock acceptance image, with collective.glossary
# installed when the container starts, and a multilingual site with the
# language roots /en, /de and /it from plone.volto:multilingual.
# Each test creates its content over the REST API, see cypress/support/fixture.js.
# collective.glossary 3.0.2 declares its namespace with pkg_resources, which
# Plone 6.2 no longer ships; horse-with-no-namespace (pinned by the image's
# constraints) makes that declaration work.
# pip has explicit network bounds, so an unreachable package index stops the
# container within minutes, with the reason in the log.
ACCEPTANCE_CONTAINER=plone-glossary-acceptance-backend
ACCEPTANCE_ADDONS=collective.glossary==3.0.2 horse-with-no-namespace
ACCEPTANCE_CONFIGURE_PACKAGES=plone.app.contenttypes,plone.restapi,plone.volto,plone.volto.cors,collective.glossary
ACCEPTANCE_APPLY_PROFILES=plone.app.contenttypes:plone-content,plone.restapi:default,plone.volto:multilingual,collective.glossary:default
ACCEPTANCE_PIP_OPTIONS=--timeout 20 --retries 2 --progress-bar off --disable-pip-version-check --root-user-action=ignore
ACCEPTANCE_BACKEND_COMMAND=/app/bin/pip install $(ACCEPTANCE_PIP_OPTIONS) --constraint /app/constraints.txt $(ACCEPTANCE_ADDONS) && exec /app/bin/robot-server plone.app.robotframework.testing.VOLTO_ROBOT_TESTING
ACCEPTANCE_BACKEND_RUN=docker run --rm --init --name $(ACCEPTANCE_CONTAINER) -p 55001:55001 -e CONFIGURE_PACKAGES=$(ACCEPTANCE_CONFIGURE_PACKAGES) -e APPLY_PROFILES=$(ACCEPTANCE_APPLY_PROFILES) --entrypoint /bin/sh
# Cypress browser and specs, for example
# make ci-acceptance-test ACCEPTANCE_BROWSER=firefox ACCEPTANCE_SPECS=$(pwd)/cypress/tests/keyboard.cy.js
ACCEPTANCE_BROWSER ?= electron
ACCEPTANCE_SPECS ?= $(CURRENT_DIR)/cypress/tests/**/*.cy.{js,jsx,ts,tsx}

ADDON_NAME='@bluedynamics/plone-glossary'

.PHONY: help
help: ## Show this help
	@echo -e "$$(grep -hE '^\S+:.*##' $(MAKEFILE_LIST) | sed -e 's/:.*##\s*/:/' -e 's/^\(.\+\):\(.*\)/\\x1b[36m\1\\x1b[m:\2/' | column -c2 -t -s :)"

# Dev Helpers

.PHONY: clean
clean: ## Clean environment
	@echo "$(RED)==> Cleaning Volto core and node_modules$(RESET)"
	rm -rf core node_modules

.PHONY: install
install: ## Installs the add-on in a development environment
	@echo "$(GREEN)Install$(RESET)"
	pnpm dlx mrs-developer missdev --no-config --fetch-https
	pnpm i
	make build-deps

.PHONY: start
start: ## Starts Volto, allowing reloading of the add-on during development
	pnpm start

.PHONY: build
build: ## Build a production bundle for distribution of the project with the add-on
	pnpm build

core/packages/registry/dist: $(shell find core/packages/registry/src -type f)
	pnpm --filter @plone/registry build

core/packages/components/dist: $(shell find core/packages/components/src -type f)
	pnpm --filter @plone/components build

.PHONY: build-deps
build-deps: core/packages/registry/dist core/packages/components/dist ## Build dependencies

.PHONY: i18n
i18n: ## Sync i18n
	pnpm --filter $(ADDON_NAME) i18n

.PHONY: ci-i18n
ci-i18n: ## Check if i18n is not synced
	pnpm --filter $(ADDON_NAME) i18n && git diff -G'^[^\"POT]' --exit-code

.PHONY: format
format: ## Format codebase
	pnpm prettier:fix
	pnpm lint:fix
	pnpm stylelint:fix

.PHONY: lint
lint: ## Lint, or catch and remove problems, in code base
	pnpm lint
	pnpm prettier
	pnpm stylelint --allow-empty-input

.PHONY: release
release: ## Release the add-on on npmjs.org
	pnpm release

.PHONY: release-dry-run
release-dry-run: ## Dry-run the release of the add-on on npmjs.org
	pnpm release

.PHONY: test
test: ## Run unit tests
	pnpm test

.PHONY: ci-test
ci-test: ## Run unit tests in CI
	# Unit Tests need the i18n to be built
	VOLTOCONFIG=$(CURRENT_DIR)/volto.config.js pnpm --filter @plone/volto i18n
	CI=1 pnpm run test:ci

.PHONY: backend-docker-start
backend-docker-start:	## Starts a Docker-based backend for development
	@echo "$(GREEN)==> Start Docker-based Plone Backend$(RESET)"
	docker run -it --rm --name=backend -p 8080:8080 -e SITE=Plone $(DOCKER_IMAGE)

## Storybook
.PHONY: storybook-start
storybook-start: ## Start Storybook server on port 6006
	@echo "$(GREEN)==> Start Storybook$(RESET)"
	pnpm run storybook

.PHONY: storybook-build
storybook-build: ## Build Storybook
	@echo "$(GREEN)==> Build Storybook$(RESET)"
	mkdir -p $(CURRENT_DIR)/.storybook-build
	pnpm run storybook-build -o $(CURRENT_DIR)/.storybook-build

## Acceptance
.PHONY: acceptance-frontend-dev-start
acceptance-frontend-dev-start: ## Start acceptance frontend in development mode
	RAZZLE_API_PATH=http://127.0.0.1:55001/plone pnpm start

.PHONY: acceptance-frontend-prod-start
acceptance-frontend-prod-start: ## Start acceptance frontend in production mode
	RAZZLE_API_PATH=$(API_PATH) pnpm build && pnpm start:prod

.PHONY: acceptance-backend-start
acceptance-backend-start: ## Start backend acceptance server
	$(ACCEPTANCE_BACKEND_RUN) -it $(DOCKER_IMAGE_ACCEPTANCE) -c '$(ACCEPTANCE_BACKEND_COMMAND)'

.PHONY: ci-acceptance-backend-start
ci-acceptance-backend-start: ## Start backend acceptance server in headless mode for CI
	$(ACCEPTANCE_BACKEND_RUN) -i $(DOCKER_IMAGE_ACCEPTANCE) -c '$(ACCEPTANCE_BACKEND_COMMAND)'

.PHONY: acceptance-backend-stop
acceptance-backend-stop: ## Stop and remove the backend acceptance container
	docker rm -f $(ACCEPTANCE_CONTAINER) >/dev/null 2>&1 || true

.PHONY: acceptance-test
acceptance-test: ## Start Cypress in interactive mode
	pnpm --filter @plone/volto exec cypress open --config-file $(CURRENT_DIR)/cypress.config.js --config specPattern='$(ACCEPTANCE_SPECS)' --env API_PATH="$(API_PATH)"

.PHONY: ci-acceptance-test
ci-acceptance-test: ## Run cypress tests in headless mode for CI
	pnpm --filter @plone/volto exec cypress run --browser $(ACCEPTANCE_BROWSER) --config-file $(CURRENT_DIR)/cypress.config.js --config specPattern='$(ACCEPTANCE_SPECS)' --env API_PATH="$(API_PATH)"
