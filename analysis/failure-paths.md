# Failure-path analysis

Working protocol of Task 14.
Base commit: `709b71f`.
Every item of the brief (B1 to B16), of the carried list (C1 to C26) and every further path found by own analysis (FC, FR, FV) has one row.
Result is `fixed`, `documented limit` or `decision for Jens`.
For `fixed`, the test failed before the fix and passes after it (evidence in the task report).

Status: in progress.

## Layer core

| ID | Item | Finding | Test | Result |
| --- | --- | --- | --- | --- |
| B1 | Term across a formatting boundary | Each Slate text run is matched on its own. In `<strong>Klima</strong>wandel` the first run "Klima" is a whole word for the matcher and gets a trigger, although the reader sees "Klimawandel"; a term split by formatting ("Klima" bold, "wandel" plain) is never matched as "Klimawandel". The matcher cannot see the neighboring runs; matching across runs would need the text of the whole block and a redesign of the leaf approach. | `src/react/GlossaryTextView.test.tsx` › "matches each text run on its own, also where formatting splits a word (B1)" | documented limit |
| B2 | Unicode normalization | Before: a composed term (`Ökosystem`) never matched decomposed text (`O\u0308kosystem`) and the reverse, although both look the same. Now terms are compared in NFC; a text that is not NFC is matched in its NFC form, normalized per character and its marks, and the segments keep the original text. Residual: conjoining Hangul jamo are not composed across characters. | `src/core/matcher.test.ts` › "createMatcher: equivalent spellings in text and terms" › "matches a composed term in decomposed text", "matches a decomposed term in composed text", "matches both forms case-insensitively", "merges a term given in both forms into one entry", "still needs the whole word in decomposed text" | fixed |
| B3 | Soft hyphens, non-breaking hyphens | Before: `Kli\u00adma` did not match "Klima", and "Klima" matched inside `Klima\u00adwandel` (a part of a compound word got the tooltip). A term with hyphen-minus did not match the same word written with U+2010 or U+2011. Now soft hyphens are ignored in terms and texts (they stay in the segment text), and the three hyphens count as one. A non-breaking hyphen stays a word boundary, like a hyphen (`[Klima]\u2011Wandel`). | `src/core/matcher.test.ts` › "createMatcher: equivalent spellings in text and terms" › "matches a term across soft hyphens in the text", "does not match a term inside a soft-hyphenated word", "keeps soft hyphens next to a term in the text around it", "keeps a text of soft hyphens only as it is", "ignores soft hyphens in a term", "drops a term that is soft hyphens only", "treats a non-breaking hyphen as a word boundary, like a hyphen", "treats hyphen-minus, hyphen and non-breaking hyphen in a term alike" | fixed |
| B4 | Very long terms, very large lists | 5000 terms work: building the matcher and marking 300 texts of 300 characters takes 112 to 118 ms (Node 24, no coverage), linear in the number of terms. A term of 5000 characters is built in under 1 ms and matched 300 times in 6 to 38 ms. Terms over V8's literal limit (32,767 characters) are left out (already covered). The canonical-form check of B2/B3 costs nothing measurable on canonical text (base and new matcher within noise, see Measurements). | `src/core/matcher.perf.test.ts` › "matches 5000 terms against 300 texts within a coarse budget", "matches a term of 5000 characters (many words)", "matches a term of 5000 characters (one word)" | documented limit |
| C1 | "every term too long" did not prove its fix | Strengthened: the test now asserts that matching runs no expression at all. Against the matcher before `8f2429c` it fails (`exec` called twice, once per call, each failing). While working on B3 it also caught a new regression: a matcher whose terms were all dropped kept an empty list of searches instead of the no-op matcher; fixed. | `src/core/matcher.test.ts` › "createMatcher: failure paths" › "keeps the text when every term is too long for the engine" | fixed |
| FC1 | Engines without regular expression lookbehind (further path) | Whole-word matching uses `(?<!…)`. Safari before 16.4 rejects it with a SyntaxError; Volto 19's browserslist (`>1%, last 4 versions, Firefox ESR, not dead`) can still include such versions. The matcher does not throw, it marks nothing: no tooltips in those browsers, the page works. A fix would need word boundaries without lookbehind (a capture group and position bookkeeping), a redesign of the search. | `src/core/matcher.test.ts` › "createMatcher: documented limits" › "marks nothing, without throwing, in an engine without lookbehind" | documented limit |
| FC2 | Scripts without spaces between words (further path) | A term matches only as a whole word, between characters that are not letters, marks or digits. Chinese, Japanese and Thai write words without spaces, so a term inside running text in these scripts is never matched; separated by punctuation it is. Word segmentation would need a dictionary per language (`Intl.Segmenter`), a different matching model. | `src/core/matcher.test.ts` › "createMatcher: documented limits" › "does not match inside text written without spaces between words" | documented limit |
| FC3 | Case comparison uses simple case folding (further path) | Case-insensitive comparison is the engine's simple case folding. `Straße` does not match `STRASSE`, and Turkish `İzmir` matches neither `izmir` nor `IZMIR`; `STRAẞE` and `straße` do match. Full or locale-specific folding would change the length of a match and break the identification of the entry (search rule 8). | `src/core/matcher.test.ts` › "createMatcher: documented limits" › "compares case with simple case folding only" | documented limit |

## Layer react

| ID | Item | Finding | Test | Result |
| --- | --- | --- | --- | --- |

## Layer volto

| ID | Item | Finding | Test | Result |
| --- | --- | --- | --- | --- |

## Repository

| ID | Item | Finding | Test | Result |
| --- | --- | --- | --- | --- |

## Documented limits, for the package documentation

## Measurements

## Decisions for Jens

## Manual test list for real devices
