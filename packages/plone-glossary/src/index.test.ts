import applyConfig from './index';

describe('applyConfig', () => {
  it('returns the given config unchanged', () => {
    const config = { settings: {}, blocks: {} } as never;
    expect(applyConfig(config)).toBe(config);
  });
});
