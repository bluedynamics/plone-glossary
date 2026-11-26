import { GET_GLOSSARY_TERMS, GET_GLOSSARY_TOOLTIP_TERMS } from './constants';
import { glossaryTerms, glossaryTooltipTerms } from './reducers';

const pending = (navroot: string) => ({
  type: `${GET_GLOSSARY_TOOLTIP_TERMS}_PENDING`,
  navroot,
});
const success = (navroot: string, result: unknown) => ({
  type: `${GET_GLOSSARY_TOOLTIP_TERMS}_SUCCESS`,
  navroot,
  result,
});
const fail = (navroot: string) => ({
  type: `${GET_GLOSSARY_TOOLTIP_TERMS}_FAIL`,
  navroot,
  error: new Error('x'),
});
const items = [{ term: 'Klima', definition: ['<p>d</p>'] }];

describe('glossaryTooltipTerms', () => {
  it('starts empty', () => {
    expect(glossaryTooltipTerms(undefined, { type: '@@INIT' })).toEqual({
      navroot: null,
      items: [],
      loading: false,
      loaded: false,
      error: null,
    });
  });

  it('remembers the navroot while loading and drops items of another navroot (F4)', () => {
    const s1 = glossaryTooltipTerms(
      glossaryTooltipTerms(undefined, pending('/de')),
      success('/de', { items }),
    );
    const s2 = glossaryTooltipTerms(s1, pending('/en'));
    expect(s2).toMatchObject({
      navroot: '/en',
      items: [],
      loading: true,
      loaded: false,
    });
  });

  it('stores items on success', () => {
    const s = glossaryTooltipTerms(
      glossaryTooltipTerms(undefined, pending('/de')),
      success('/de', { items }),
    );
    expect(s).toEqual({
      navroot: '/de',
      items,
      loading: false,
      loaded: true,
      error: null,
    });
  });

  it('ignores a late answer for an earlier navroot', () => {
    const s = glossaryTooltipTerms(
      glossaryTooltipTerms(undefined, pending('/de')),
      pending('/en'),
    );
    expect(glossaryTooltipTerms(s, success('/de', { items }))).toEqual(s);
    expect(glossaryTooltipTerms(s, fail('/de'))).toEqual(s);
  });

  it.each([
    [{}],
    [{ error: { type: 'NotFound' } }],
    [null],
    [{ items: 'nope' }],
  ])('treats the answer %j as an empty list', (result) => {
    const s = glossaryTooltipTerms(
      glossaryTooltipTerms(undefined, pending('/de')),
      success('/de', result),
    );
    expect(s).toEqual({
      navroot: '/de',
      items: [],
      loading: false,
      loaded: true,
      error: null,
    });
  });

  it('ends empty and loaded on failure', () => {
    const s = glossaryTooltipTerms(
      glossaryTooltipTerms(undefined, pending('/de')),
      fail('/de'),
    );
    expect(s).toMatchObject({
      navroot: '/de',
      items: [],
      loaded: true,
      loading: false,
    });
    expect(s.error).toBeInstanceOf(Error);
  });

  it('marks a failure without error object as failed', () => {
    const s = glossaryTooltipTerms(
      glossaryTooltipTerms(undefined, pending('/de')),
      { type: `${GET_GLOSSARY_TOOLTIP_TERMS}_FAIL`, navroot: '/de' },
    );
    expect(s.error).toBeTruthy();
  });

  it('keeps the state on unrelated actions', () => {
    const s = glossaryTooltipTerms(undefined, { type: 'OTHER' });
    expect(glossaryTooltipTerms(s, { type: 'OTHER' })).toBe(s);
  });

  it('tolerates a pending action without navroot', () => {
    expect(
      glossaryTooltipTerms(undefined, {
        type: `${GET_GLOSSARY_TOOLTIP_TERMS}_PENDING`,
      }).navroot,
    ).toBeNull();
  });
});

const gPending = (path: string) => ({
  type: `${GET_GLOSSARY_TERMS}_PENDING`,
  path,
});
const gSuccess = (path: string, result: unknown) => ({
  type: `${GET_GLOSSARY_TERMS}_SUCCESS`,
  path,
  result,
});
const gFail = (path: string) => ({
  type: `${GET_GLOSSARY_TERMS}_FAIL`,
  path,
  error: new Error('x'),
});
const byLetter = {
  K: [
    {
      '@id': '/de/glossar/klima',
      id: 'klima',
      title: 'Klima',
      terms: ['Klima'],
      definition: '<p>d</p>',
      description: '',
    },
  ],
};

describe('glossaryTerms', () => {
  it('starts empty', () => {
    expect(glossaryTerms(undefined, { type: '@@INIT' })).toEqual({
      path: null,
      items: {},
      loading: false,
      loaded: false,
      error: null,
    });
  });

  it('remembers the path while loading and drops items of another path', () => {
    const s1 = glossaryTerms(
      glossaryTerms(undefined, gPending('/de/glossar')),
      gSuccess('/de/glossar', { items: byLetter }),
    );
    const s2 = glossaryTerms(s1, gPending('/en/glossary'));
    expect(s2).toMatchObject({
      path: '/en/glossary',
      items: {},
      loading: true,
      loaded: false,
    });
  });

  it('stores items on success', () => {
    const s = glossaryTerms(
      glossaryTerms(undefined, gPending('/de/glossar')),
      gSuccess('/de/glossar', { items: byLetter }),
    );
    expect(s).toEqual({
      path: '/de/glossar',
      items: byLetter,
      loading: false,
      loaded: true,
      error: null,
    });
  });

  it('ignores a late answer for an earlier path', () => {
    const s = glossaryTerms(
      glossaryTerms(undefined, gPending('/de/glossar')),
      gPending('/en/glossary'),
    );
    expect(
      glossaryTerms(s, gSuccess('/de/glossar', { items: byLetter })),
    ).toEqual(s);
    expect(glossaryTerms(s, gFail('/de/glossar'))).toEqual(s);
  });

  it.each([
    [{}],
    [{ error: { type: 'NotFound' } }],
    [null],
    [{ items: 'nope' }],
    [{ items: [] }],
  ])('treats the answer %j as an empty list', (result) => {
    const s = glossaryTerms(
      glossaryTerms(undefined, gPending('/de/glossar')),
      gSuccess('/de/glossar', result),
    );
    expect(s).toEqual({
      path: '/de/glossar',
      items: {},
      loading: false,
      loaded: true,
      error: null,
    });
  });

  it('ends empty and loaded on failure', () => {
    const s = glossaryTerms(
      glossaryTerms(undefined, gPending('/de/glossar')),
      gFail('/de/glossar'),
    );
    expect(s).toMatchObject({
      path: '/de/glossar',
      items: {},
      loaded: true,
      loading: false,
    });
    expect(s.error).toBeInstanceOf(Error);
  });

  it('marks a failure without error object as failed', () => {
    const s = glossaryTerms(glossaryTerms(undefined, gPending('/p')), {
      type: `${GET_GLOSSARY_TERMS}_FAIL`,
      path: '/p',
    });
    expect(s.error).toBeTruthy();
  });

  it('keeps the state on unrelated actions', () => {
    const s = glossaryTerms(undefined, { type: 'OTHER' });
    expect(glossaryTerms(s, { type: 'OTHER' })).toBe(s);
  });

  it('tolerates a pending action without path', () => {
    expect(
      glossaryTerms(undefined, { type: `${GET_GLOSSARY_TERMS}_PENDING` }).path,
    ).toBeNull();
  });
});
