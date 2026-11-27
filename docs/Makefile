# Makefile for Sphinx documentation
.DEFAULT_GOAL   = help
SHELL           = bash

# You can set these variables from the command line.
SPHINXOPTS      ?=
# Extra options for sphinx-autobuild in livehtml, for example O="--open-browser".
O               ?=

# Internal variables.
DOCS_DIR        = ./docs/
BUILDDIR        = ./_build
ALLSPHINXOPTS   = -d $(BUILDDIR)/doctrees $(SPHINXOPTS) $(DOCS_DIR)
VALEFILES       := $(shell find $(DOCS_DIR) -type f -name "*.md" -print)
VALEOPTS        ?=

# Add the following 'help' target to your Makefile
# And add help text after each target name starting with '\#\#'
.PHONY: help
help:  # This help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'


# environment management
.venv/bin/python:  ## Create Python virtual environment and install package requirements
	@uv sync

.PHONY: install
install:  .venv/bin/python ## Sync package requirements


.PHONY: init
init: clean clean-python .venv/bin/python  ## Clean docs build directory and Python, and initialize Python virtual environment

.PHONY: clean
clean:  ## Clean docs build directory
	rm -rf $(BUILDDIR)/

.PHONY: clean-python
clean-python: clean
	rm -rf .venv/
	rm -rf *.egg-info
# /environment management


# documentation builders
.PHONY: html
html: .venv/bin/python  ## Build html, a warning fails the build
	@uv run sphinx-build -b html -W --keep-going $(ALLSPHINXOPTS) $(BUILDDIR)/html
	@echo
	@echo "Build finished. The HTML pages are in $(BUILDDIR)/html."

.PHONY: livehtml
livehtml: .venv/bin/python  ## Rebuild Sphinx documentation on changes, with live-reload in the browser
	@uv run sphinx-autobuild \
		--ignore "*.swp" \
		--port 8050 \
		-b html $(DOCS_DIR) "$(BUILDDIR)/html" $(SPHINXOPTS) $(O)

.PHONY: dirhtml
dirhtml: .venv/bin/python
	@uv run sphinx-build -b dirhtml $(ALLSPHINXOPTS) $(BUILDDIR)/dirhtml
	@echo
	@echo "Build finished. The HTML pages are in $(BUILDDIR)/dirhtml."

.PHONY: singlehtml
singlehtml: .venv/bin/python
	@uv run sphinx-build -b singlehtml $(ALLSPHINXOPTS) $(BUILDDIR)/singlehtml
	@echo
	@echo "Build finished. The HTML page is in $(BUILDDIR)/singlehtml."

.PHONY: text
text: .venv/bin/python
	@uv run sphinx-build -b text $(ALLSPHINXOPTS) $(BUILDDIR)/text
	@echo
	@echo "Build finished. The text files are in $(BUILDDIR)/text."

.PHONY: changes
changes: .venv/bin/python
	@uv run sphinx-build -b changes $(ALLSPHINXOPTS) $(BUILDDIR)/changes
	@echo
	@echo "The overview file is in $(BUILDDIR)/changes."

.PHONY: build
build: html  ## Build documentation in HTML format

# /documentation builders


# test
.PHONY: linkcheck
linkcheck: .venv/bin/python  ## Run linkcheck
	@uv run sphinx-build -b linkcheck $(ALLSPHINXOPTS) $(BUILDDIR)/linkcheck
	@echo
	@echo "Link check complete; look for any errors in the above output " \
		"or in $(BUILDDIR)/linkcheck/ ."

# In quiet mode Sphinx prints broken and timed out links as warnings and nothing else.
# It exits with status 1 when a link is broken or timed out, and that status fails the target.
.PHONY: linkcheckbroken
linkcheckbroken: .venv/bin/python  ## Run linkcheck, show only broken links, and fail when there is one
	@uv run sphinx-build -q -b linkcheck $(ALLSPHINXOPTS) $(BUILDDIR)/linkcheck
	@echo "Link check complete, no broken links. The full report is in $(BUILDDIR)/linkcheck/."

.PHONY: vale
vale: .venv/bin/python  ## Run Vale style, grammar, and spell checks
	@uv run vale sync
	@uv run vale --no-wrap $(VALEOPTS) $(VALEFILES)
	@echo "Vale is finished; look for any errors in the above output."
	@echo

.PHONY: test
test: clean vale linkcheckbroken html  ## Clean docs build, then run vale, linkcheckbroken, and build html

.PHONY: all
all: clean vale linkcheckbroken html  ## Clean docs build, then run vale and linkcheckbroken, and build html
# /test
