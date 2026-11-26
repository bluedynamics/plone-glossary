import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import config from '@plone/volto/registry';
import { GlossaryTrigger } from '../react';
import applyConfig, { descriptionBlock, titleBlock } from '../index';
import { makeConfig, makeState } from './test-utils';

const mockStore = configureStore();

function show(View: React.ComponentType<never>, props: object) {
  const Component = View as React.ComponentType<object>;
  return render(
    <Provider store={mockStore(makeState())}>
      <main>
        <Component {...props} />
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

describe('optional block wrappers', () => {
  it('titleBlock renders the title through GlossaryText', async () => {
    const View = titleBlock(makeConfig()).blocks.blocksConfig.title.view;
    const { container } = show(View, { properties: { title: 'Das Klima' } });
    const heading = container.querySelector('h1.documentFirstHeading');
    expect(heading).not.toBeNull();
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
    expect(heading).toContainElement(screen.getByRole('button'));
  });

  it('titleBlock prefers metadata over properties', () => {
    const View = titleBlock(makeConfig()).blocks.blocksConfig.title.view;
    const { container } = show(View, {
      properties: { title: 'Eigenschaft' },
      metadata: { title: 'Metadaten' },
    });
    expect(container.querySelector('h1')?.textContent).toBe('Metadaten');
  });

  it('descriptionBlock renders the description through GlossaryText', async () => {
    const View =
      descriptionBlock(makeConfig()).blocks.blocksConfig.description.view;
    const { container } = show(View, {
      properties: { description: 'Das Klima' },
    });
    const p = container.querySelector('p.documentDescription');
    expect(p).not.toBeNull();
    expect(
      await screen.findByRole('button', { name: 'Klima' }),
    ).toBeInTheDocument();
    expect(p).toContainElement(screen.getByRole('button'));
  });

  it('renders empty elements without a value', () => {
    const cfg = descriptionBlock(titleBlock(makeConfig()));
    const { container } = show(cfg.blocks.blocksConfig.title.view, {
      properties: {},
    });
    expect(container.querySelector('h1')?.textContent).toBe('');
    cleanup();
    const d = show(cfg.blocks.blocksConfig.description.view, {
      properties: {},
    });
    expect(d.container.querySelector('p')?.textContent).toBe('');
  });

  it('the default configuration leaves title and description views alone', () => {
    const before = makeConfig();
    const title = before.blocks.blocksConfig.title.view;
    const description = before.blocks.blocksConfig.description.view;
    const after = applyConfig(before);
    expect(after.blocks.blocksConfig.title.view).toBe(title);
    expect(after.blocks.blocksConfig.description.view).toBe(description);
  });
});
