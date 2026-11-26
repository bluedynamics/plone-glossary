import { createMatcher } from './matcher';
import type { GlossaryTerm, Segment } from './types';

const t = (term: string, ...definition: string[]): GlossaryTerm => ({
  term,
  definition: definition.length ? definition : ['<p>d</p>'],
});
const mark = (segments: Segment[]) =>
  segments.map((s) => (s.type === 'term' ? `[${s.text}]` : s.text)).join('');
type TermSegment = Extract<Segment, { type: 'term' }>;

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
  it('leaves out a term too long for the engine', () => {
    const m = createMatcher([t('x'.repeat(40_000)), t('ok')]);
    expect(mark(m.match('Das ok'))).toBe('Das [ok]');
    expect(mark(m.match('Das ok €'))).toBe('Das [ok] €');
  });
  it('leaves out a term too long for the engine on two-byte text', () => {
    const m = createMatcher([t('Ж'.repeat(40_000)), t('ok')]);
    expect(mark(m.match('Das ok €'))).toBe('Das [ok] €');
  });
  it('keeps the text when every term is too long for the engine', () => {
    const m = createMatcher([t('x'.repeat(40_000))]);
    const exec = vi.spyOn(RegExp.prototype, 'exec');
    try {
      expect(m.match('abc')).toEqual([{ type: 'text', text: 'abc' }]);
      expect(m.match('')).toEqual([]);
      // The term is left out when the matcher is created, so matching runs
      // no expression at all instead of failing on every call.
      expect(exec).not.toHaveBeenCalled();
    } finally {
      exec.mockRestore();
    }
  });
  it('compiles nothing again after leaving out an overlong term', () => {
    let built = 0;
    let failed = 0;
    vi.stubGlobal(
      'RegExp',
      class extends RealRegExp {
        constructor(source: string | RegExp, flags?: string) {
          built += 1;
          super(source, flags);
        }
        exec(text: string) {
          try {
            return super.exec(text);
          } catch (error) {
            failed += 1;
            throw error;
          }
        }
      },
    );
    const m = createMatcher([
      t('x'.repeat(40_000)),
      t('Ж'.repeat(40_000)),
      t('ok'),
    ]);
    built = 0;
    failed = 0;
    for (let i = 0; i < 3; i += 1) {
      expect(mark(m.match('Das ok'))).toBe('Das [ok]');
      expect(mark(m.match('Das ok €'))).toBe('Das [ok] €');
    }
    expect({ built, failed }).toEqual({ built: 0, failed: 0 });
  });
  it('survives a failure while building the search source', () => {
    const join = Array.prototype.join;
    const spy = vi.spyOn(Array.prototype, 'join').mockImplementation(function (
      this: unknown[],
      separator?: string,
    ) {
      if (separator === '|') throw new RangeError('Invalid string length');
      return join.call(this, separator);
    });
    let out: Segment[];
    try {
      out = createMatcher([t('a'), t('b')]).match('a b');
    } finally {
      spy.mockRestore();
    }
    expect(out).toEqual([{ type: 'text', text: 'a b' }]);
  });
});

describe('createMatcher: exact spellings and input shape', () => {
  it('matches ß and ẞ against each other in both directions', () => {
    expect(mark(createMatcher([t('Straße')]).match('STRAẞE'))).toBe('[STRAẞE]');
    expect(mark(createMatcher([t('Straẞe')]).match('STRAßE'))).toBe('[STRAßE]');
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
    const m = createMatcher([t('x')]);
    const spy = vi.spyOn(RegExp.prototype, 'exec').mockImplementation(() => {
      throw new RangeError('too large');
    });
    try {
      expect(m.match('x y')).toEqual([{ type: 'text', text: 'x y' }]);
    } finally {
      spy.mockRestore();
    }
  });
  it('merges a repeated term with very many definitions', () => {
    const many = Array.from({ length: 500_000 }, (_, i) => `<p>${i}</p>`);
    const m = createMatcher([
      t('Klima', '<p>first</p>'),
      { term: 'Klima', definition: many },
    ]);
    const [seg] = m.match('Klima');
    expect(seg).toMatchObject({ type: 'term', key: 'Klima' });
    const definitions = (seg as TermSegment).definitions;
    expect(definitions).toHaveLength(500_001);
    expect(definitions[0]).toBe('<p>first</p>');
    expect(definitions[500_000]).toBe('<p>499999</p>');
  });
  it('hands out definitions that callers can change safely', () => {
    const m = createMatcher([t('Klima', '<p>a</p>')]);
    const first = m.match('Klima')[0] as TermSegment;
    first.definitions.push('<p>x</p>');
    first.definitions[0] = '<p>changed</p>';
    expect(m.match('Klima')[0]).toMatchObject({ definitions: ['<p>a</p>'] });
  });
});

describe('createMatcher: case', () => {
  const keys = (segments: Segment[]) =>
    segments.filter((s) => s.type === 'term').map((s) => (s as any).key);

  it.each([
    [
      'case-insensitive by default',
      undefined,
      [t('Hello')],
      'hello HELLO hElLo',
      '[hello] [HELLO] [hElLo]',
    ],
    [
      'an all-uppercase term is exact',
      undefined,
      [t('REST')],
      'REST rest Rest',
      '[REST] rest Rest',
    ],
    [
      'caseSensitive makes every term exact',
      { caseSensitive: true },
      [t('Hello')],
      'Hello hello',
      '[Hello] hello',
    ],
    ['digits only is not uppercase', undefined, [t('2024')], '2024', '[2024]'],
  ])('%s', (_name, options, terms, input, expected) => {
    expect(mark(createMatcher(terms, options).match(input))).toBe(expected);
  });

  it('prefers the entry with the exact spelling (F10)', () => {
    const m = createMatcher([
      t('REST', '<p>api</p>'),
      t('Rest', '<p>remainder</p>'),
    ]);
    expect(keys(m.match('Rest REST rest'))).toEqual(['Rest', 'REST', 'Rest']);
  });
  it('falls back to the first entry in backend order', () => {
    const m = createMatcher([t('Wetter', '<p>1</p>'), t('wetter', '<p>2</p>')]);
    expect(keys(m.match('WETTER wetter Wetter'))).toEqual([
      'Wetter',
      'wetter',
      'Wetter',
    ]);
  });

  it('lets a shorter term match where a longer exact one does not', () => {
    const m = createMatcher([t('NEW YORK'), t('new')]);
    expect(mark(m.match('new york'))).toBe('[new] york');
  });
  it('keeps the longer exact term where it matches', () => {
    const m = createMatcher([t('NEW YORK'), t('new')]);
    expect(mark(m.match('NEW YORK'))).toBe('[NEW YORK]');
  });
  it('matches an all-uppercase term only in its own spelling', () => {
    expect(mark(createMatcher([t('REST')]).match('the rest of REST'))).toBe(
      'the rest of [REST]',
    );
  });
  it('keeps exact terms that differ only in case apart', () => {
    const m = createMatcher([t('Ems'), t('EMS')], { caseSensitive: true });
    const out = m.match('EMS Ems ems');
    expect(keys(out)).toEqual(['EMS', 'Ems']);
    expect(out.at(-1)).toEqual({ type: 'text', text: ' ems' });
  });
  it('treats an all-uppercase term with ẞ as exact', () => {
    expect(mark(createMatcher([t('STRAẞE')]).match('Straße STRAẞE'))).toBe(
      'Straße [STRAẞE]',
    );
  });
  it('is case-insensitive when caseSensitive is false', () => {
    const m = createMatcher([t('Hello')], { caseSensitive: false });
    expect(mark(m.match('hello HELLO'))).toBe('[hello] [HELLO]');
  });
  it('mixes exact and case-insensitive terms in one text', () => {
    const m = createMatcher([t('api'), t('REST')]);
    expect(mark(m.match('REST api, rest API REST'))).toBe(
      '[REST] [api], rest [API] [REST]',
    );
  });
  it('finds a shorter term after a longer exact one that cuts into it', () => {
    const m = createMatcher([t('A B'), t('b c d'), t('c')]);
    expect(mark(m.match('A B C D'))).toBe('[A B] [C] D');
  });
});

describe('createMatcher: equivalent spellings in text and terms', () => {
  const decomposed = 'O\u0308kosystem';

  it('matches a composed term in decomposed text', () => {
    const out = createMatcher([t('Ökosystem')]).match(`Das ${decomposed}.`);
    expect(mark(out)).toBe(`Das [${decomposed}].`);
    expect(out[1]).toMatchObject({ text: decomposed, key: 'Ökosystem' });
  });
  it('matches a decomposed term in composed text', () => {
    const out = createMatcher([t(decomposed)]).match('Das Ökosystem.');
    expect(mark(out)).toBe('Das [Ökosystem].');
  });
  it('matches both forms case-insensitively', () => {
    const m = createMatcher([t('Ökosystem')]);
    expect(mark(m.match('ökosystem o\u0308kosystem'))).toBe(
      '[ökosystem] [o\u0308kosystem]',
    );
  });
  it('merges a term given in both forms into one entry', () => {
    const [seg] = createMatcher([
      t('Ökosystem', '<p>1</p>'),
      t(decomposed, '<p>2</p>'),
    ]).match('Ökosystem');
    expect(seg).toMatchObject({ definitions: ['<p>1</p>', '<p>2</p>'] });
  });
  it('still needs the whole word in decomposed text', () => {
    // The combining mark after "Cafe" belongs to the word.
    expect(mark(createMatcher([t('Café')]).match('Cafe\u0301s'))).toBe(
      'Cafe\u0301s',
    );
    expect(mark(createMatcher([t('Café')]).match('Cafe\u0301!'))).toBe(
      '[Cafe\u0301]!',
    );
  });

  it('matches a term across soft hyphens in the text', () => {
    const out = createMatcher([t('Klima')]).match('Das Kli\u00adma.');
    expect(mark(out)).toBe('Das [Kli\u00adma].');
    expect(out[1]).toMatchObject({ text: 'Kli\u00adma', key: 'Klima' });
  });
  it('does not match a term inside a soft-hyphenated word', () => {
    expect(mark(createMatcher([t('Klima')]).match('Klima\u00adwandel'))).toBe(
      'Klima\u00adwandel',
    );
    expect(
      mark(createMatcher([t('Klimawandel')]).match('Der Klima\u00adwandel')),
    ).toBe('Der [Klima\u00adwandel]');
  });
  it('keeps soft hyphens next to a term in the text around it', () => {
    const input = 'a\u00ad Kli\u00adma\u00ad, \u00adKlima';
    const out = createMatcher([t('Klima')]).match(input);
    expect(out).toEqual([
      { type: 'text', text: 'a\u00ad ' },
      {
        type: 'term',
        text: 'Kli\u00adma',
        key: 'Klima',
        definitions: ['<p>d</p>'],
      },
      { type: 'text', text: '\u00ad, \u00ad' },
      { type: 'term', text: 'Klima', key: 'Klima', definitions: ['<p>d</p>'] },
    ]);
    expect(out.map((s) => s.text).join('')).toBe(input);
  });
  it('keeps a text of soft hyphens only as it is', () => {
    expect(createMatcher([t('Klima')]).match('\u00ad\u00ad')).toEqual([
      { type: 'text', text: '\u00ad\u00ad' },
    ]);
  });
  it('ignores soft hyphens in a term', () => {
    expect(mark(createMatcher([t('Kli\u00adma')]).match('Das Klima'))).toBe(
      'Das [Klima]',
    );
  });
  it('drops a term that is soft hyphens only', () => {
    const m = createMatcher([t('\u00ad'), t('ok')]);
    expect(mark(m.match('\u00ad ok'))).toBe('\u00ad [ok]');
  });

  it('treats a non-breaking hyphen as a word boundary, like a hyphen', () => {
    expect(mark(createMatcher([t('Klima')]).match('Klima\u2011Wandel'))).toBe(
      '[Klima]\u2011Wandel',
    );
  });
  it('treats hyphen-minus, hyphen and non-breaking hyphen in a term alike', () => {
    const m = createMatcher([t('Klima-Wandel', '<p>w</p>')]);
    expect(
      mark(m.match('Klima-Wandel, Klima\u2010Wandel, Klima\u2011Wandel')),
    ).toBe('[Klima-Wandel], [Klima\u2010Wandel], [Klima\u2011Wandel]');
    expect(m.match('Klima\u2011Wandel')[0]).toMatchObject({
      key: 'Klima-Wandel',
      definitions: ['<p>w</p>'],
    });
    expect(
      mark(createMatcher([t('Klima\u2011Wandel')]).match('Klima-Wandel')),
    ).toBe('[Klima-Wandel]');
  });
});

describe('createMatcher: documented limits', () => {
  const RealRegExp = RegExp;
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('marks nothing, without throwing, in an engine without lookbehind', () => {
    // Safari before 16.4 rejects `(?<!…)` with a SyntaxError.
    vi.stubGlobal(
      'RegExp',
      class extends RealRegExp {
        constructor(source: string | RegExp, flags?: string) {
          if (String(source).includes('(?<')) {
            throw new SyntaxError('Invalid regular expression: invalid group');
          }
          super(source, flags);
        }
      },
    );
    const m = createMatcher([t('Klima')]);
    expect(m.match('Das Klima')).toEqual([{ type: 'text', text: 'Das Klima' }]);
  });

  it('does not match inside text written without spaces between words', () => {
    const m = createMatcher([t('气候'), t('ภูมิอากาศ')]);
    expect(mark(m.match('气候变化很重要'))).toBe('气候变化很重要');
    expect(mark(m.match('การเปลี่ยนแปลงภูมิอากาศโลก'))).toBe(
      'การเปลี่ยนแปลงภูมิอากาศโลก',
    );
    // Separated by spaces or punctuation, the same terms match.
    expect(mark(m.match('气候，变化'))).toBe('[气候]，变化');
  });

  it('compares case with simple case folding only', () => {
    // Full case folding would match ß with SS and Turkish İ with i.
    expect(mark(createMatcher([t('Straße')]).match('STRASSE'))).toBe('STRASSE');
    expect(mark(createMatcher([t('İzmir')]).match('izmir IZMIR'))).toBe(
      'izmir IZMIR',
    );
    expect(mark(createMatcher([t('Straße')]).match('STRAẞE straße'))).toBe(
      '[STRAẞE] [straße]',
    );
  });
});

describe('createMatcher: expressions', () => {
  const RealRegExp = RegExp;
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds every expression up front, none while matching', () => {
    let built = 0;
    vi.stubGlobal(
      'RegExp',
      class extends RealRegExp {
        constructor(source: string | RegExp, flags?: string) {
          built += 1;
          super(source, flags);
        }
      },
    );
    const m = createMatcher([t('Klima'), t('klima'), t('REST')]);
    built = 0;
    m.match('KLIMA klima REST rest');
    m.match('Klima KLIMA');
    expect(built).toBe(0);
  });
});
