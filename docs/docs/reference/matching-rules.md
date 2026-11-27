---
myst:
  html_meta:
    "description": "The rules by which plone-glossary finds glossary terms in a text, each with an example."
    "property=og:description": "The rules by which plone-glossary finds glossary terms in a text, each with an example."
    "property=og:title": "Matching rules"
    "keywords": "Plone, Volto, glossary, matching, terms, case"
---

# Matching rules

This page lists the rules by which the package finds glossary terms in a text.
Each rule has an example.
In the examples, square brackets mark the text that the package finds as a term.

The package applies these rules to each text that `GlossaryText` receives as a string.
In a Slate text, that is each text run.
The terms come from the endpoint `@tooltip_terms` of `collective.glossary`, in the order the backend sends them.

(matching-rules-list)=

## The nine rules

(matching-rules-whole-words)=

### 1. Whole words only

A match must not border on a letter, a combining mark, or a digit.
Punctuation, spaces, and hyphens are word boundaries.

| Term | Text | Result |
| --- | --- | --- |
| `Klima` | `Klimawandel` | `Klimawandel` |
| `CO` | `CO2 steigt` | `CO2 steigt` |
| `Klima` | `(Klima), Klima-Wandel` | `([Klima]), [Klima]-Wandel` |

(matching-rules-longest)=

### 2. Left to right, the longest term first

The package reads the text from left to right.
At the same position, the longest term wins.
Matches never overlap.

| Terms | Text | Result |
| --- | --- | --- |
| `Climate`, `Climate Change` | `Climate Change is real` | `[Climate Change] is real` |
| `Change Agent`, `Climate Change` | `Climate Change Agent` | `[Climate Change] Agent` |

(matching-rules-case)=

### 3. Case

By default, terms match regardless of case.
A term that has letters and no lowercase letter, such as `REST` or `CO2`, always matches its exact spelling.
With the setting `caseSensitive`, every term matches only its exact spelling.

| Term | Setting | Text | Result |
| --- | --- | --- | --- |
| `Hello` | default | `hello HELLO hElLo` | `[hello] [HELLO] [hElLo]` |
| `REST` | default | `REST rest Rest` | `[REST] rest Rest` |
| `Hello` | `caseSensitive: true` | `Hello hello` | `[Hello] hello` |

(matching-rules-exact-spelling)=

### 4. Exact spelling before backend order

When two terms differ only in case, a match belongs to the term with exactly the matched spelling.
Without such a term, the match belongs to the first of them in the backend's order.
The popover shows the definitions of the term the match belongs to.

| Terms in backend order | Text | Terms of the matches |
| --- | --- | --- |
| `Wetter`, `wetter` | `WETTER wetter Wetter` | `Wetter`, `wetter`, `Wetter` |

(matching-rules-whitespace)=

### 5. Any whitespace matches any whitespace

In a term of several words, any run of whitespace matches any run of whitespace in the text.
This includes non-breaking spaces and line breaks.

| Term | Text | Result |
| --- | --- | --- |
| `Climate Change` | `Climate` and `Change` separated by a non-breaking space | one match |
| `Climate Change` | `Climate`, a line break, two spaces, and `Change` | one match |

(matching-rules-literal)=

### 6. Special characters are literal

A term matches as written.
Characters that have a meaning in regular expressions have none in a term.

| Terms | Text | Result |
| --- | --- | --- |
| `C++`, `f(x)`, `a.b` | `C++ und f(x) und axb und a.b` | `[C++] und [f(x)] und axb und [a.b]` |

(matching-rules-dropped)=

### 7. Empty terms and terms without a definition are dropped

The package drops a term that is empty or holds only whitespace.
It drops empty definitions and a term that has no definition left.
Entries with the same spelling become one term with the definitions of all of them, in the backend's order.

| Term | Definitions | Text | Result |
| --- | --- | --- | --- |
| `Leer` | none | `Leer` | `Leer` |
| `Klima` twice | `<p>1</p>` and `<p>2</p>` | `Klima` | `[Klima]` with both definitions |

(matching-rules-never-throws)=

### 8. The matcher never throws

A term that the package cannot process is left out.
The other terms still match.
When no search can be built from the remaining terms, the text stays plain.

| Terms | Text | Result |
| --- | --- | --- |
| a term of 40,000 characters, too long for the JavaScript engine, and `ok` | `Das ok` | `Das [ok]` |

(matching-rules-one-search)=

### 9. One search per case rule

The package does not search the text once per term.
It builds at most one search expression per case rule.
One expression holds the terms that match their exact spelling, the other holds all other terms.
It builds them once per list of terms, before it searches any text.

| Terms | Setting | Search expressions |
| --- | --- | --- |
| `Klima`, `klima`, `REST` | default | two: one for `Klima` and `klima`, one for `REST` |

(matching-rules-equivalent)=

## Spellings that count as the same

The package compares terms and texts in a common form.
The following differences in spelling do not keep a term from matching.
The page always shows the text as it was written.

| Difference | Term | Text | Result |
| --- | --- | --- | --- |
| Composed and decomposed characters | `Ökosystem` | `Ökosystem` written as `O` and a combining diaeresis | one match |
| Soft hyphens, U+00AD | `Klima` | `Kli` and `ma` with a soft hyphen between them | one match |
| Hyphen-minus, hyphen U+2010, and non-breaking hyphen U+2011 | `Klima-Wandel` | `Klima-Wandel` written with a non-breaking hyphen | one match |

A term given in both composed and decomposed form is one term.
A soft hyphen does not join two words into one.
`Klima` does not match in `Klimawandel` written with a soft hyphen after `Klima`.
A non-breaking hyphen is a word boundary, like a hyphen.

(matching-rules-limits)=

## Limits

{ref}`limits-matching` lists the limits of matching.
They concern text split by formatting, scripts written without spaces, case folding, Korean text in conjoining jamo, and browsers without lookbehind in regular expressions.
{ref}`limits-size` describes the size of a glossary that the package supports.
