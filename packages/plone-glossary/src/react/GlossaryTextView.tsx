import {
  Fragment,
  useMemo,
  useRef,
  type ComponentType,
  type JSX,
  type ReactNode,
} from 'react';
import type { Matcher } from '../core';
import { useActivation } from './activation';
import { GlossaryTrigger, type GlossaryTriggerProps } from './GlossaryTrigger';

export interface GlossaryTextViewProps {
  text: ReactNode;
  /** `null` switches the glossary off. */
  matcher: Matcher | null;
  showTermHeading?: boolean;
  /** Defaults to `GlossaryTrigger`. */
  TriggerComponent?: ComponentType<GlossaryTriggerProps>;
}

/** Plain text with every line break (`\n`, `\r\n`) as a `<br>`. */
function PlainText({ text }: { text: string }): JSX.Element {
  const lines = text.split(/\r?\n/);
  return (
    <>
      {lines.map((line, index) => (
        // Lines have no identity of their own and never reorder.
        // eslint-disable-next-line react/no-array-index-key
        <Fragment key={index}>
          {index > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}

interface OccurrenceProps {
  text: string;
  term: string;
  definitions: string[];
  showTermHeading?: boolean;
  TriggerComponent: ComponentType<GlossaryTriggerProps>;
}

/**
 * One matched term. The wrapper span is the same element in both states, it
 * holds the ref for `useActivation`.
 */
function Occurrence({
  text,
  term,
  definitions,
  showTermHeading,
  TriggerComponent,
}: OccurrenceProps): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const active = useActivation(term, ref);
  return (
    <span
      ref={ref}
      className={
        active ? 'glossary-term glossary-term--active' : 'glossary-term'
      }
    >
      {active ? (
        <TriggerComponent
          text={text}
          term={term}
          definitions={definitions}
          showTermHeading={showTermHeading}
        />
      ) : (
        text
      )}
    </span>
  );
}

/**
 * Renders a text with its glossary occurrences. Text that is not a string
 * and text without a matcher pass through unchanged.
 */
export function GlossaryTextView({
  text,
  matcher,
  showTermHeading,
  TriggerComponent = GlossaryTrigger,
}: GlossaryTextViewProps): JSX.Element {
  const segments = useMemo(
    () => (matcher && typeof text === 'string' ? matcher.match(text) : null),
    [matcher, text],
  );

  if (segments === null) {
    return typeof text === 'string' ? <PlainText text={text} /> : <>{text}</>;
  }
  return (
    <>
      {segments.map((segment, index) =>
        segment.type === 'text' ? (
          // Segments have no identity of their own and never reorder.
          // eslint-disable-next-line react/no-array-index-key
          <PlainText key={index} text={segment.text} />
        ) : (
          <Occurrence
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            text={segment.text}
            term={segment.key}
            definitions={segment.definitions}
            showTermHeading={showTermHeading}
            TriggerComponent={TriggerComponent}
          />
        ),
      )}
    </>
  );
}
