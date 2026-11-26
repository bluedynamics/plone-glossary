/** One glossary entry, shaped like an item of the `@tooltip_terms` endpoint. */
export interface GlossaryTerm {
  term: string;
  definition: string[];
}

export interface MatcherOptions {
  caseSensitive?: boolean;
}

export type Segment =
  | { type: 'text'; text: string }
  | { type: 'term'; text: string; key: string; definitions: string[] };

export interface Matcher {
  match(text: string): Segment[];
}
