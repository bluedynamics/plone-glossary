import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import config from '@plone/volto/registry';
import { GlossaryTrigger } from '../react';
import DemoCard from '../../../demo/src/DemoCard';
import { makeState } from './test-utils';

const mockStore = configureStore();

function show(data: object) {
  return render(
    <Provider store={mockStore(makeState())}>
      <main>
        <DemoCard data={data} />
      </main>
    </Provider>,
  );
}

beforeEach(() => {
  config.registerComponent({
    name: 'GlossaryTrigger',
    component: GlossaryTrigger,
  });
});

afterEach(() => {
  cleanup();
  delete config.settings.glossary;
});

describe('demo card', () => {
  it('links only the title and keeps the description outside the link', async () => {
    show({ title: 'Karte', description: 'Das Klima', href: '/de/ziel' });
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('Karte');
    expect(links[0]).toHaveAttribute('href', '/de/ziel');
    const button = await screen.findByRole('button', { name: 'Klima' });
    expect(links[0]).not.toContainElement(button);
    expect(links[0].querySelector('button')).toBeNull();
    expect(document.querySelector('.demo-card__description')).toContainElement(
      button,
    );
  });

  it('links to the app path of an internal link from the backend', () => {
    show({ title: 'Karte', href: `${config.settings.apiPath}/de/ziel` });
    expect(screen.getByRole('link', { name: 'Karte' })).toHaveAttribute(
      'href',
      '/de/ziel',
    );
  });

  it('renders no link without a title but keeps the description', async () => {
    const { container } = show({ description: 'Das Klima', href: '/de/ziel' });
    await screen.findByRole('button', { name: 'Klima' });
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.textContent).toBe('Das Klima');
  });

  it('renders nothing with neither title nor description', () => {
    const { container } = show({ href: '/de/ziel' });
    expect(container.querySelector('main')?.innerHTML).toBe('');
  });
});
