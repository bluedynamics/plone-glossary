import { useEffect } from 'react';
import type { MouseEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { flattenToAppURL, getBaseUrl } from '@plone/volto/helpers/Url/Url';

import { getGlossaryTerms } from '../actions';
import messages from '../messages';
import { getGlossarySettings } from '../settings';
import type { GlossaryTermsState } from '../reducers';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface GlossaryViewProps {
  content: { title?: string; description?: string };
  location: { pathname: string };
}

function focusLetter(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (target) {
    event.preventDefault();
    target.focus();
  }
}

/**
 * The glossary page. The terms come from the store, where the server load
 * puts them. In the browser the view loads them when the store has none for
 * this path.
 */
export default function GlossaryView({ content, location }: GlossaryViewProps) {
  const intl = useIntl();
  const dispatch = useDispatch();
  const path = getBaseUrl(location.pathname);
  const state = useSelector(
    (s: { glossaryTerms?: GlossaryTermsState }) => s.glossaryTerms,
  );
  const present = state?.path === path;

  useEffect(() => {
    if (!present) dispatch(getGlossaryTerms(path));
  }, [present, path, dispatch]);

  const items = present && state ? state.items : {};
  const groups = Object.keys(items);
  const letters = [...ALPHABET, ...groups.filter((g) => !ALPHABET.includes(g))];
  const { showAlphabetNavigation } = getGlossarySettings();

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
                  onClick={(e) => focusLetter(e, `glossary-letter-${letter}`)}
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

        <section id="content-core" className="glossary">
          {groups.map((letter) => (
            <div key={letter} className="glossary-letter">
              <h2 id={`glossary-letter-${letter}`} tabIndex={-1}>
                {letter}
              </h2>
              {items[letter].map((entry) => (
                <article className="term" key={entry['@id']}>
                  <h3>
                    <Link to={flattenToAppURL(entry['@id'])}>
                      {entry.title}
                    </Link>
                    {entry.terms?.length > 0 && (
                      <span className="variants">
                        {' '}
                        {entry.terms.join(', ')}
                      </span>
                    )}
                  </h3>
                  <div
                    className="definition"
                    dangerouslySetInnerHTML={{ __html: entry.definition || '' }}
                  />
                </article>
              ))}
            </div>
          ))}
        </section>
      </article>
    </div>
  );
}
