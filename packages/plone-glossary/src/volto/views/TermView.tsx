import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { flattenToAppURL } from '@plone/volto/helpers/Url/Url';
import messages from '../messages';

interface TermViewProps {
  content: {
    title?: string;
    variants?: string[];
    definition?: { data?: string };
    parent?: { '@id'?: string };
  };
}

/** The view of a single glossary term. */
export default function TermView({ content }: TermViewProps) {
  const intl = useIntl();
  const variants = Array.isArray(content.variants) ? content.variants : [];
  const parent = content.parent?.['@id'];

  return (
    <div className="ui container view-wrapper term-view">
      <article id="content">
        <header>
          <h1 className="documentFirstHeading">{content.title}</h1>
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
          {content.definition?.data && (
            <div
              className="definition"
              dangerouslySetInnerHTML={{ __html: content.definition.data }}
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
