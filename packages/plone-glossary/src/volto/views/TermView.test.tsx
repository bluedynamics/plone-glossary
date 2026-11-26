import { cleanup, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import config from '@plone/volto/registry';
import { MemoryRouter } from 'react-router-dom';
import { expectNoA11yViolations } from '../../react/test-utils';
import TermView from './TermView';

const term = {
  title: 'Klima',
  variants: ['Climate', 'Klimata'],
  definition: { data: '<p>Wetter über Jahre</p>' },
  parent: { '@id': 'http://localhost:3000/en/glossary' },
};

function setup(content: object = term) {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <MemoryRouter>
        <TermView content={content} />
      </MemoryRouter>
    </IntlProvider>,
  );
}

afterEach(cleanup);

describe('TermView', () => {
  it('lists the variants', () => {
    const { container } = setup();
    const items = container.querySelectorAll('ul.variants > li');
    expect([...items].map((li) => li.textContent)).toEqual([
      'Climate',
      'Klimata',
    ]);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Variants',
    );
  });

  it('renders the definition in a div', () => {
    const { container } = setup();
    const definition = container.querySelector('div.definition')!;
    expect(definition.innerHTML).toBe('<p>Wetter über Jahre</p>');
  });

  it('links back to the glossary with an accessible name', () => {
    setup();
    const link = screen.getByRole('link', { name: 'Back to glossary' });
    expect(link.getAttribute('href')).toBe('/en/glossary');
    expect(link.textContent).toContain('Back to glossary');
    expect(link.hasAttribute('aria-label')).toBe(false);
  });

  it('ignores variants that are not a list', () => {
    const { container } = setup({ ...term, variants: 'Climate' });
    expect(container.querySelector('.variants')).toBeNull();
  });

  it('leaves out what the content does not have', () => {
    const { container } = setup({ title: 'Klima' });
    expect(container.querySelector('.variants')).toBeNull();
    expect(container.querySelector('.definition')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('turns backend URLs in the definition into app URLs (B11)', () => {
    const api = config.settings.apiPath;
    setup({
      ...term,
      definition: { data: `<p><a href="${api}/en/weather">Weather</a></p>` },
    });
    expect(
      screen.getByRole('link', { name: 'Weather' }).getAttribute('href'),
    ).toBe('/en/weather');
  });

  it('leaves out malformed fields without breaking the page (C18)', () => {
    const { container } = setup({
      title: { en: 'Klima' },
      variants: [{ x: 1 }, 'Climate', 42],
      definition: { data: 42 },
      parent: { '@id': 7 },
    });
    expect(container.querySelector('h1')!.textContent).toBe('');
    expect(
      [...container.querySelectorAll('ul.variants > li')].map(
        (li) => li.textContent,
      ),
    ).toEqual(['Climate']);
    expect(container.querySelector('.definition')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = setup();
    await expectNoA11yViolations(container);
  });
});
