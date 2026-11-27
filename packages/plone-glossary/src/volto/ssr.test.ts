import config from '@plone/volto/registry';
import { nonContentRoutes } from '@plone/volto/config/NonContentRoutes';
import { getGlossaryTerms } from './actions';
import { glossaryAsyncPropsExtender } from './ssr';

const globals = globalThis as { __SERVER__?: boolean };
const original = globals.__SERVER__;
const originalRoutes = config.settings.nonContentRoutes;

beforeEach(() => {
  globals.__SERVER__ = true;
  config.settings.nonContentRoutes = nonContentRoutes;
});
afterEach(() => {
  globals.__SERVER__ = original;
  config.settings.nonContentRoutes = originalRoutes;
});

const run = async (
  type: string,
  dispatch = vi.fn(),
  pathname = '/en/glossary',
) => {
  const store = {
    dispatch,
    getState: () => ({ content: { data: { '@type': type } } }),
  };
  const items = glossaryAsyncPropsExtender.extend([
    { key: 'content', promise: async () => 'content-result' },
    { key: 'other', promise: async () => 1 },
  ]);
  const result = await items
    .find((i) => i.key === 'content')!
    .promise({ store, location: { pathname } });
  return { store, items, result };
};

describe('glossaryAsyncPropsExtender', () => {
  it('loads the glossary terms after the content of a Glossary (F15)', async () => {
    const { store, result } = await run('Glossary');
    expect(store.dispatch).toHaveBeenCalledWith(
      getGlossaryTerms('/en/glossary'),
    );
    expect(result).toBe('content-result');
  });

  it.each([
    '/en/glossary/edit',
    '/en/glossary/contents',
    '/en/glossary/sharing',
  ])('does not load the terms on the CMS route %s (C19)', async (pathname) => {
    const { store, result } = await run('Glossary', vi.fn(), pathname);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(result).toBe('content-result');
  });

  it('does nothing for other content types', async () => {
    const { store, result } = await run('Document');
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(result).toBe('content-result');
  });

  it('does nothing in the browser (R36)', async () => {
    globals.__SERVER__ = false;
    const { store, result } = await run('Glossary');
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(result).toBe('content-result');
  });

  it('returns exactly what the original returned in the browser', () => {
    globals.__SERVER__ = false;
    const original = vi.fn(() => false);
    const [item] = glossaryAsyncPropsExtender.extend([
      { key: 'content', promise: original },
    ]);
    const options = {
      store: { dispatch: vi.fn(), getState: () => ({}) },
      location: { pathname: '/x' },
    };
    expect(item.promise(options)).toBe(false);
    expect(original).toHaveBeenCalledWith(options);
  });

  it('keys the terms on the @id of the content, not the location', async () => {
    const store = {
      dispatch: vi.fn(),
      getState: () => ({
        content: {
          data: {
            '@type': 'Glossary',
            '@id': 'http://localhost:3000/de/glossar',
          },
        },
      }),
    };
    const [item] = glossaryAsyncPropsExtender.extend([
      { key: 'content', promise: async () => 1 },
    ]);
    await item.promise({ store, location: { pathname: '/en/other' } });
    expect(store.dispatch).toHaveBeenCalledWith(
      getGlossaryTerms('/de/glossar'),
    );
  });

  it('does nothing when __SERVER__ is not defined', async () => {
    delete globals.__SERVER__;
    const { store } = await run('Glossary');
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('reads the content type after the content has loaded', async () => {
    let type = 'Document';
    const store = {
      dispatch: vi.fn(),
      getState: () => ({ content: { data: { '@type': type } } }),
    };
    const [item] = glossaryAsyncPropsExtender.extend([
      {
        key: 'content',
        promise: async () => {
          type = 'Glossary';
        },
      },
    ]);
    await item.promise({ store, location: { pathname: '/en/glossary' } });
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });

  it('does not fail the content item when loading the terms fails', async () => {
    const { result } = await run(
      'Glossary',
      vi.fn().mockRejectedValue(new Error('boom')),
    );
    expect(result).toBe('content-result');
  });

  it('lets a failing content item fail', async () => {
    const [item] = glossaryAsyncPropsExtender.extend([
      {
        key: 'content',
        promise: async () => {
          throw new Error('no content');
        },
      },
    ]);
    const store = { dispatch: vi.fn(), getState: () => ({}) };
    await expect(
      item.promise({ store, location: { pathname: '/x' } }),
    ).rejects.toThrow('no content');
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('copes with a store without content data', async () => {
    const [item] = glossaryAsyncPropsExtender.extend([
      { key: 'content', promise: async () => 1 },
    ]);
    const store = { dispatch: vi.fn(), getState: () => ({}) };
    await item.promise({ store, location: { pathname: '/x' } });
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('leaves other items and a missing content item alone', () => {
    const other = { key: 'other', promise: async () => 1 };
    expect(glossaryAsyncPropsExtender.extend([other])[0]).toBe(other);
    expect(glossaryAsyncPropsExtender.extend([])).toEqual([]);
  });

  it('is registered for all routes', () => {
    expect(glossaryAsyncPropsExtender.path).toBe('/');
  });
});
