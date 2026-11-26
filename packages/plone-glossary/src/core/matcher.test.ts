import { createMatcher } from './matcher';
import type { GlossaryTerm, Segment } from './types';

const t = (term: string, ...definition: string[]): GlossaryTerm => ({
  term,
  definition: definition.length ? definition : ['<p>d</p>'],
});
const mark = (segments: Segment[]) =>
  segments.map((s) => (s.type === 'term' ? `[${s.text}]` : s.text)).join('');

describe('createMatcher: whole words and precedence', () => {
  it.each([
    [
      'whole word',
      [t('Klima')],
      'Das Klima ändert sich',
      'Das [Klima] ändert sich',
    ],
    ['not inside a word', [t('Klima')], 'Klimawandel', 'Klimawandel'],
    ['not after a letter', [t('wandel')], 'Klimawandel', 'Klimawandel'],
    [
      'a digit is a word character (F11)',
      [t('CO')],
      'CO2 steigt',
      'CO2 steigt',
    ],
    ['term with a digit', [t('CO2')], 'CO2 steigt', '[CO2] steigt'],
    [
      'punctuation is a boundary',
      [t('Klima')],
      '(Klima), "Klima". Klima-Wandel',
      '([Klima]), "[Klima]". [Klima]-Wandel',
    ],
    ['unicode letters', [t('Ökosystem')], 'Das Ökosystem.', 'Das [Ökosystem].'],
    ['an umlaut is a letter', [t('kosystem')], 'Ökosystem', 'Ökosystem'],
    [
      'a combining mark is a word character',
      [t('Cafe')],
      'Cafe\u0301 au lait',
      'Cafe\u0301 au lait',
    ],
    [
      'longest wins at the same position (F2)',
      [t('Climate'), t('Climate Change')],
      'Climate Change is real',
      '[Climate Change] is real',
    ],
    [
      'leftmost wins',
      [t('Change Agent'), t('Climate Change')],
      'Climate Change Agent',
      '[Climate Change] Agent',
    ],
    ['no overlap', [t('a b'), t('b c')], 'a b c b c', '[a b] c [b c]'],
    [
      'special characters are literal (F1)',
      [t('C++'), t('f(x)'), t('a.b')],
      'C++ und f(x) und axb und a.b',
      '[C++] und [f(x)] und axb und [a.b]',
    ],
    [
      'any whitespace matches any whitespace',
      [t('Climate Change')],
      'Climate\u00a0Change and Climate\n  Change',
      '[Climate\u00a0Change] and [Climate\n  Change]',
    ],
    [
      'windows line breaks stay untouched',
      [t('Klima')],
      'Klima\r\nWetter',
      '[Klima]\r\nWetter',
    ],
    [
      'term at start and end',
      [t('Klima')],
      'Klima und Klima',
      '[Klima] und [Klima]',
    ],
  ])('%s', (_name, terms, input, expected) => {
    expect(mark(createMatcher(terms).match(input))).toBe(expected);
  });
});

describe('createMatcher: robustness', () => {
  it('returns the input as one text segment when nothing matches', () => {
    expect(createMatcher([t('x')]).match('abc')).toEqual([
      { type: 'text', text: 'abc' },
    ]);
  });
  it('returns no segments for an empty string', () => {
    expect(createMatcher([t('x')]).match('')).toEqual([]);
  });
  it('keeps whitespace-only text as one text segment', () => {
    expect(createMatcher([t('x')]).match(' \n ')).toEqual([
      { type: 'text', text: ' \n ' },
    ]);
  });
  it('segments concatenate to the input', () => {
    const input = 'Das Klima, das CO2 und C++.\r\nEnde';
    const out = createMatcher([t('Klima'), t('CO2'), t('C++')]).match(input);
    expect(out.map((s) => s.text).join('')).toBe(input);
  });
  it('reports key and definitions of the matched entry', () => {
    expect(
      createMatcher([t('Klima', '<p>a</p>', '<p>b</p>')]).match('klima'),
    ).toEqual([
      {
        type: 'term',
        text: 'klima',
        key: 'Klima',
        definitions: ['<p>a</p>', '<p>b</p>'],
      },
    ]);
  });
  it('drops empty terms and terms without a definition (F7)', () => {
    const m = createMatcher([
      t(''),
      t('   '),
      { term: 'Leer', definition: [] },
      { term: 'Null', definition: [''] },
    ]);
    expect(mark(m.match('Leer Null'))).toBe('Leer Null');
  });
  it('removes single empty definitions and keeps the others', () => {
    const [seg] = createMatcher([
      { term: 'Klima', definition: ['', '<p>a</p>', '  '] },
    ]).match('Klima');
    expect(seg).toMatchObject({ definitions: ['<p>a</p>'] });
  });
  it('merges definitions of repeated terms in order', () => {
    const [seg] = createMatcher([
      t('Klima', '<p>1</p>'),
      t('Klima', '<p>2</p>'),
    ]).match('Klima');
    expect(seg).toMatchObject({ definitions: ['<p>1</p>', '<p>2</p>'] });
  });
  it('never throws', () => {
    const odd = [
      t('\ud800'),
      t('('),
      t('['),
      t('\\'),
      t('a'.repeat(10000)),
      t('ok'),
    ];
    expect(() => createMatcher(odd)).not.toThrow();
    expect(mark(createMatcher(odd).match('ok ( [ \\'))).toContain('[ok]');
  });
  it('returns no segments for an empty string without usable terms', () => {
    expect(createMatcher([]).match('')).toEqual([]);
  });
  it('accepts an empty term list', () => {
    expect(createMatcher([]).match('abc')).toEqual([
      { type: 'text', text: 'abc' },
    ]);
  });
});

describe('createMatcher: failure paths', () => {
  const RealRegExp = RegExp;
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const failWhen = (marker: string) => {
    vi.stubGlobal(
      'RegExp',
      class extends RealRegExp {
        constructor(source: string | RegExp, flags?: string) {
          if (String(source).includes(marker)) throw new SyntaxError('boom');
          super(source, flags);
        }
      },
    );
  };

  it('leaves out a term whose expression cannot be built', () => {
    failWhen('BOOM');
    const m = createMatcher([t('BOOM'), t('ok')]);
    expect(mark(m.match('BOOM ok'))).toBe('BOOM [ok]');
  });
  it('falls back to plain text when the search expression fails', () => {
    failWhen('|');
    const m = createMatcher([t('a'), t('b')]);
    expect(m.match('a b')).toEqual([{ type: 'text', text: 'a b' }]);
  });
});

describe('createMatcher: exact spellings and input shape', () => {
  it('matches ß and ẞ against each other in both directions', () => {
    expect(mark(createMatcher([t('Straße')]).match('STRAẞE'))).toBe('[STRAẞE]');
    expect(mark(createMatcher([t('STRAẞE')]).match('Straße'))).toBe('[Straße]');
  });
  it('keeps Masse and Maße apart', () => {
    const out = createMatcher([
      t('Masse', '<p>m</p>'),
      t('Maße', '<p>s</p>'),
    ]).match('Masse Maße');
    expect(out.filter((s) => s.type === 'term')).toEqual([
      { type: 'term', text: 'Masse', key: 'Masse', definitions: ['<p>m</p>'] },
      { type: 'term', text: 'Maße', key: 'Maße', definitions: ['<p>s</p>'] },
    ]);
  });
  it('keeps terms that differ only in case as separate entries', () => {
    const [seg] = createMatcher([
      t('Ems', '<p>1</p>'),
      t('EMS', '<p>2</p>'),
    ]).match('Ems');
    expect(seg).toMatchObject({ key: 'Ems', definitions: ['<p>1</p>'] });
  });
  it('survives malformed entries from the backend', () => {
    const bad = [
      { term: null, definition: ['<p>d</p>'] },
      { term: 'A', definition: null },
      { term: 'B', definition: [null, '<p>d</p>', 42] },
      null,
    ] as unknown as GlossaryTerm[];
    const m = createMatcher([...bad, t('ok')]);
    const out = m.match('A B ok');
    expect(mark(out)).toBe('A [B] [ok]');
    expect(out[1]).toMatchObject({ definitions: ['<p>d</p>'] });
  });
  it('treats a non-array term list as empty', () => {
    expect(createMatcher(null as never).match('abc')).toEqual([
      { type: 'text', text: 'abc' },
    ]);
  });
  it('returns no segments for non-string text', () => {
    expect(createMatcher([t('x')]).match(null as never)).toEqual([]);
    expect(createMatcher([]).match(undefined as never)).toEqual([]);
  });
  it('returns the text unchanged when the search itself throws', () => {
    const spy = vi
      .spyOn(RegExp.prototype, Symbol.matchAll)
      .mockImplementation(() => {
        throw new RangeError('too large');
      });
    try {
      expect(createMatcher([t('x')]).match('x y')).toEqual([
        { type: 'text', text: 'x y' },
      ]);
    } finally {
      spy.mockRestore();
    }
  });
});
