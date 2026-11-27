import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  flattenHTMLToAppURL,
  flattenToAppURL,
  getBaseUrl,
} from '@plone/volto/helpers/Url/Url';

import { getGlossaryTerms } from '../actions';
import messages from '../messages';
import { getGlossarySettings } from '../settings';
import type { GlossaryEntry, GlossaryTermsState } from '../reducers';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface GlossaryViewProps {
  content: { '@id'?: string; title?: string; description?: string };
  location: { pathname: string };
}

/** The element id a location hash names, percent-decoded like the browser does. */
function idOfHash(hash: string): string {
  const fragment = hash.slice(1);
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

/**
 * Moves the keyboard and screen reader position to the letter heading that
 * `hash` names, if `glossary` holds it, and tells whether it did; any other
 * hash is left to the browser.
 */
function focusLetterOfHash(glossary: HTMLElement | null, hash: string) {
  const id = idOfHash(hash);
  const headings = glossary?.querySelectorAll<HTMLElement>(
    '.glossary-letter > h2',
  );
  const heading = Array.from(headings ?? []).find((h) => h.id === id);
  heading?.focus();
  return !!heading;
}

/** An entry that can be shown: an object with a title. */
function isEntry(entry: unknown): entry is GlossaryEntry {
  return (
    !!entry &&
    typeof entry === 'object' &&
    typeof (entry as { title?: unknown }).title === 'string'
  );
}

/** The groups with at least one entry that can be shown. */
function usableGroups(items: Record<string, unknown>) {
  const groups: Record<string, GlossaryEntry[]> = {};
  for (const [letter, entries] of Object.entries(items)) {
    const usable = Array.isArray(entries) ? entries.filter(isEntry) : [];
    if (usable.length > 0) groups[letter] = usable;
  }
  return groups;
}

/**
 * The glossary page. The terms come from the store, where the server load
 * puts them. In the browser the view loads them when the store has none for
 * this path.
 */
export default function GlossaryView({ content, location }: GlossaryViewProps) {
  const intl = useIntl();
  const dispatch = useDispatch();
  // Keyed on the content shown, not on the location: during navigation the
  // location is already the next page while the old content is still shown.
  const path = content['@id']
    ? flattenToAppURL(content['@id'])
    : getBaseUrl(location.pathname);
  const state = useSelector(
    (s: { glossaryTerms?: GlossaryTermsState }) => s.glossaryTerms,
  );
  const present = state?.path === path;
  const store = useStore<{ glossaryTerms?: GlossaryTermsState }>();

  // The store, not the value of the last render: a request started since
  // (StrictMode runs this effect twice) has already set the path it loads.
  useEffect(() => {
    if (store.getState().glossaryTerms?.path !== path) {
      dispatch(getGlossaryTerms(path));
    }
  }, [present, path, dispatch, store]);

  // The letter links stay native in-page links (hash, Back, new tab). The
  // focus follows the hash after the browser's own fragment navigation:
  // Firefox clears the focus while it navigates to a fragment, so a focus
  // set before, in the click handler, would be lost. This covers a letter
  // link, Back and Forward, and a page loaded with a hash; it runs again
  // when the terms arrive, so a hash that names a later loaded letter counts.
  const glossaryRef = useRef<HTMLElement>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const history = useHistory();
  const { hash } = useLocation();
  useEffect(() => {
    const onHashChange = () => {
      focusLetterOfHash(glossaryRef.current, window.location.hash);
    };
    // An in-app link to a letter (a push of the router) is the reader's own
    // navigation, but fires no hashchange, and the link may stay mounted in
    // a header or footer and keep the focus. At hydration and when the terms
    // arrive, the reader may already be elsewhere, for example in the search
    // field: take the focus only when nothing else has it. A hash change is
    // the reader's own navigation.
    const pushed =
      history.action === 'PUSH' && focusLetterOfHash(glossaryRef.current, hash);
    const active = document.activeElement;
    if (!pushed && (!active || active === document.body)) {
      onHashChange();
    }
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      clearTimeout(focusTimer.current);
    };
  }, [present, history, hash]);

  // A click on the letter whose hash is already in the URL changes nothing,
  // so no hashchange follows. The browser still navigates to the fragment,
  // Firefox in a task after the click, so the focus moves in a later task.
  // A click with another button or a modifier key opens the link elsewhere
  // (new tab or window, download) and leaves this page as it is.
  const onLetterClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const plain =
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey;
    if (plain && event.currentTarget.hash === window.location.hash) {
      clearTimeout(focusTimer.current);
      focusTimer.current = setTimeout(() =>
        focusLetterOfHash(glossaryRef.current, window.location.hash),
      );
    }
  };

  // "Try again" stays mounted and focused while the retry loads, so the
  // reader keeps the position; the outcome is announced, and after a success
  // the focus moves to the list.
  const [retrying, setRetrying] = useState(false);
  const [retried, setRetried] = useState(false);
  const retry = () => {
    if (loading) return;
    setRetrying(true);
    setRetried(false);
    dispatch(getGlossaryTerms(path));
  };

  const items = usableGroups(present && state ? state.items : {});
  const groups = Object.keys(items);
  const letters = [...ALPHABET, ...groups.filter((g) => !ALPHABET.includes(g))];
  const sections = letters.filter((letter) => groups.includes(letter));
  const { showAlphabetNavigation } = getGlossarySettings();
  // A failed load and an empty glossary look the same without a message.
  const loaded = present && !!state?.loaded;
  const loading = present && !!state?.loading;
  const failed = loaded && !!state?.error;
  const empty = loaded && !failed && sections.length === 0;

  useEffect(() => {
    if (!retrying || !loaded) return;
    if (!failed) {
      const heading = glossaryRef.current?.querySelector<HTMLElement>(
        '.glossary-letter > h2',
      );
      (heading ?? glossaryRef.current)?.focus();
      setRetried(true);
    }
    setRetrying(false);
  }, [retrying, loaded, failed]);

  return (
    <div className="ui container view-wrapper glossary-view">
      <article id="content">
        <header>
          <h1 className="documentFirstHeading">{content.title}</h1>
          {content.description && (
            <p className="documentDescription">{content.description}</p>
          )}
        </header>

        {showAlphabetNavigation && (
          <nav
            className="glossary-alphabet"
            aria-label={intl.formatMessage(messages.alphabetNavigation)}
          >
            {letters.map((letter) =>
              groups.includes(letter) ? (
                <a
                  key={letter}
                  className="matched"
                  href={`#glossary-letter-${letter}`}
                  onClick={onLetterClick}
                >
                  {letter}
                </a>
              ) : (
                <span key={letter} className="unmatched">
                  {letter}
                </span>
              ),
            )}
          </nav>
        )}

        <section
          id="content-core"
          className="glossary"
          ref={glossaryRef}
          tabIndex={-1}
        >
          {/* Announced when it changes, for example after a retry. */}
          <div className="glossary-status" role="status">
            {retrying && loading && (
              <p>{intl.formatMessage(messages.termsLoading)}</p>
            )}
            {failed && <p>{intl.formatMessage(messages.termsNotLoaded)}</p>}
            {retried && loaded && !failed && (
              <p>{intl.formatMessage(messages.termsLoaded)}</p>
            )}
            {empty && <p>{intl.formatMessage(messages.noTerms)}</p>}
          </div>
          {(failed || retrying) && (
            <button
              type="button"
              className="glossary-retry"
              aria-disabled={loading || undefined}
              onClick={retry}
            >
              {intl.formatMessage(messages.tryAgain)}
            </button>
          )}
          {sections.map((letter) => (
            <div key={letter} className="glossary-letter">
              <h2 id={`glossary-letter-${letter}`} tabIndex={-1}>
                {letter}
              </h2>
              {items[letter].map((entry, index) => {
                const id =
                  typeof entry['@id'] === 'string' ? entry['@id'] : null;
                const variants = Array.isArray(entry.terms)
                  ? entry.terms.filter(
                      (variant): variant is string =>
                        typeof variant === 'string',
                    )
                  : [];
                return (
                  <article className="term" key={id ?? `entry-${index}`}>
                    <h3>
                      {id ? (
                        <Link to={flattenToAppURL(id)}>{entry.title}</Link>
                      ) : (
                        entry.title
                      )}
                      {variants.length > 0 && (
                        <span className="variants"> {variants.join(', ')}</span>
                      )}
                    </h3>
                    <div
                      className="definition"
                      dangerouslySetInnerHTML={{
                        __html:
                          typeof entry.definition === 'string'
                            ? flattenHTMLToAppURL(entry.definition)
                            : '',
                      }}
                    />
                  </article>
                );
              })}
            </div>
          ))}
        </section>
      </article>
    </div>
  );
}
