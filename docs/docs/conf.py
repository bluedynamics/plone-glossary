# Configuration file for the Sphinx documentation builder.
# plone-glossary build configuration file
# https://www.sphinx-doc.org/en/master/usage/configuration.html


# -- Project information -----------------------------------------------------

project = "plone-glossary"
author = "Jens W. Klein"
copyright = "2026, BlueDynamics Alliance"  # noqa: A001

# The site follows the main branch and names no version.
# A version number would go stale between the package's releases and the next documentation build.


# -- General configuration ----------------------------------------------------

# Add any paths that contain templates here, relative to this directory.
templates_path = ["_templates"]

# Each extension has one use:
# myst_parser parses the MyST Markdown pages.
# notfound.extension renders the 404 page with links that work on any path.
# sphinx_copybutton adds a copy button to code blocks.
# sphinx_design provides the cards, grids, and tabs.
# sphinx_sitemap writes sitemap.xml for search engines.
# sphinxext.opengraph writes Open Graph metadata for shared links.
extensions = [
    "myst_parser",
    "notfound.extension",
    "sphinx_copybutton",
    "sphinx_design",
    "sphinx_sitemap",
    "sphinxext.opengraph",
]

# If true, the Docutils Smart Quotes transform, originally based on SmartyPants
# (limited to English) and currently applying to many languages, will be used
# to convert quotes and dashes to typographically correct entities.
smartquotes = False

# Options for the linkcheck builder
linkcheck_ignore = [
    # Ignore local and example URLs
    r"http://0.0.0.0",
    r"http://127.0.0.1",
    r"http://localhost",
    # Ignore pages that require authentication
    r"https://github.com/bluedynamics/plone-glossary/issues/new",
    # Ignore github.com pages with anchors, GitHub renders the anchors with JavaScript
    r"https://github.com/.*#.*",
]
linkcheck_anchors = True
linkcheck_timeout = 5
linkcheck_retries = 1

# The suffix of source filenames.
source_suffix = {
    ".md": "markdown",
}

# The root toctree document.
root_doc = "index"

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
exclude_patterns = []


# -- Options for HTML output -------------------------------------------------

html_theme = "plone_sphinx_theme"
html_title = f"{project} documentation"

# GitHub Pages serves the site under this address.
# sphinx_sitemap and sphinxext.opengraph build their absolute URLs from it.
html_baseurl = "https://bluedynamics.github.io/plone-glossary/"

# The default value includes icon-links. Override it with that item omitted,
# then add it to html_theme_options[footer_content_items].
html_sidebars = {
    "**": [
        "navbar-logo",
        "search-button-field",
        "sbt-sidebar-nav",
    ]
}
html_theme_options = {
    "article_header_start": ["toggle-primary-sidebar"],
    "extra_footer": (
        "<p>The documentation is licensed under the "
        '<a href="https://github.com/bluedynamics/plone-glossary/blob/main/LICENSE">'
        "MIT license</a>, the same license as the package.</p>"
    ),
    "footer_content_items": [
        "author",
        "copyright",
        "extra-footer",
        "icon-links",
    ],
    "icon_links": [
        {
            "name": "GitHub",
            "url": "https://github.com/bluedynamics/plone-glossary",
            "icon": "fa-brands fa-square-github",
            "type": "fontawesome",
        },
    ],
    "logo": {
        "text": "plone-glossary",
    },
    # Keep navigation_with_keys at its default False.
    # With True, the arrow keys on a focused, scrollable code block go to another page instead of scrolling.
    "path_to_docs": "docs/docs",
    "repository_branch": "main",
    "repository_url": "https://github.com/bluedynamics/plone-glossary",
    "search_bar_text": "Search",
    "show_toc_level": 2,
    "use_edit_page_button": True,
    "use_issues_button": True,
    "use_repository_button": True,
}

# Announce that we have an opensearch plugin
# https://www.sphinx-doc.org/en/master/usage/configuration.html#confval-html_use_opensearch
html_use_opensearch = "https://bluedynamics.github.io/plone-glossary"

# No page feeds the general index yet.
html_use_index = False


# -- Options for sphinx_sitemap ----------------------------------------------

# https://sphinx-sitemap.readthedocs.io/en/latest/advanced-configuration.html#customizing-the-url-scheme
sitemap_url_scheme = "{link}"
# These pages have no content for search engines.
# opensearch.html does not exist, Sphinx writes the OpenSearch description to _static/opensearch.xml.
sitemap_excludes = ["404.html", "opensearch.html", "search.html"]


# -- Options for MyST markdown conversion to html -----------------------------

# For more information see:
# https://myst-parser.readthedocs.io/en/latest/syntax/optional.html
myst_enable_extensions = [
    "attrs_block",  # Support parsing of block attributes.
    "attrs_inline",  # Support parsing of inline attributes.
    "colon_fence",  # Use ::: delimiters for code fences instead of ```.
    "deflist",  # Support definition lists. https://myst-parser.readthedocs.io/en/latest/syntax/optional.html#definition-lists
    "html_image",  # For inline images. See https://myst-parser.readthedocs.io/en/latest/syntax/optional.html#html-images
    "strikethrough",  # See https://myst-parser.readthedocs.io/en/latest/syntax/optional.html#syntax-strikethrough
    "substitution",  # Use Jinja2 for substitutions. https://myst-parser.readthedocs.io/en/latest/syntax/optional.html#substitutions-with-jinja2
]


# -- OpenGraph configuration ----------------------------------

ogp_site_url = html_baseurl
ogp_description_length = 200
ogp_site_name = "plone-glossary documentation"
ogp_type = "website"
ogp_custom_meta_tags = [
    '<meta property="og:locale" content="en_US" />',
]


# -- sphinx-notfound-page configuration ----------------------------------

# GitHub Pages serves the 404 page for any missing path below the site.
# Its links must therefore be absolute and start with the path of the site.
notfound_urls_prefix = "/plone-glossary/"
notfound_template = "404.html"
