import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  flattenHTMLToAppURL,
  flattenToAppURL,
} from '@plone/volto/helpers/Url/Url';
import messages from '../messages';

interface TermViewProps {
  content: {
    title?: string;
    variants?: string[];
    definition?: { data?: string };
    parent?: { '@id'?: string };
  };
}

/**
 * The view of a single glossary term. Fields of an unexpected shape are left
 * out, so malformed content cannot break the page.
 */
export default function TermView({ content }: TermViewProps) {
  const intl = useIntl();
  const title = typeof content.title === 'string' ? content.title : '';
  const variants = Array.isArray(content.variants)
    ? [
        ...new Set(
          content.variants.filter(
            (variant): variant is string => typeof variant === 'string',
          ),
        ),
      ]
    : [];
  const definition =
    typeof content.definition?.data === 'string' ? content.definition.data : '';
  const parent =
    typeof content.parent?.['@id'] === 'string' ? content.parent['@id'] : '';

  return (
    <div className="ui container view-wrapper term-view">
      <article id="content">
        <header>
          <h1 className="documentFirstHeading">{title}</h1>
        </header>
        <section id="content-core">
          {variants.length > 0 && (
            <>
              <h2>{intl.formatMessage(messages.variants)}</h2>
              <ul className="variants">
                {variants.map((variant) => (
                  <li key={variant}>{variant}</li>
                ))}
              </ul>
            </>
          )}
          {definition && (
            <div
              className="definition"
              dangerouslySetInnerHTML={{
                __html: flattenHTMLToAppURL(definition),
              }}
            />
          )}
          {parent && (
            <Link to={flattenToAppURL(parent)} className="glossary-back">
              <span aria-hidden="true">&larr;</span>{' '}
              {intl.formatMessage(messages.backToGlossary)}
            </Link>
          )}
        </section>
      </article>
    </div>
  );
}
