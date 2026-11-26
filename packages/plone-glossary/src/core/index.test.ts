import * as core from './index';
import { createMatcher } from './matcher';

describe('core index', () => {
  it('exports createMatcher', () => {
    expect(core.createMatcher).toBe(createMatcher);
  });
});
