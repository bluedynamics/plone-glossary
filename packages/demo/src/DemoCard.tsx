import type { JSX } from 'react';
import { GlossaryText } from '@bluedynamics/plone-glossary';
import './demo.css';

interface DemoCardProps {
  data: { title?: string; description?: string; href?: string };
}

/**
 * A card that links to another page and keeps its tooltips operable.
 * A glossary trigger is a button, and a button must not be inside a link.
 * So only the title is the link. Its ::after covers the whole card, and the
 * description sits outside the link, above that click area.
 */
export default function DemoCard({ data }: DemoCardProps): JSX.Element {
  return (
    <article className="demo-card">
      <h2 className="demo-card__title">
        <a className="demo-card__link" href={data.href}>
          {data.title}
        </a>
      </h2>
      <p className="demo-card__description">
        <GlossaryText text={data.description || ''} />
      </p>
    </article>
  );
}
