import { vi } from 'vitest';

// Volto's setup files assume a DOM. Test files that opt into the node
// environment (`// @vitest-environment node`) skip them.
if (typeof window !== 'undefined') {
  await import('../../core/packages/volto/test-setup-globals.js');
  await import('../../core/packages/volto/test-setup-config.jsx');
  await import('../../core/packages/volto/test-addons-loader.js');
}

// Volto's setup defines a minimal global `jest` object. With fake timers
// active, Testing Library takes it for Jest and advances time through
// `jest.advanceTimersByTime`, which that object lacks (user-event calls it
// after every interaction).
if (globalThis.jest && !globalThis.jest.advanceTimersByTime) {
  globalThis.jest.advanceTimersByTime = (ms) => vi.advanceTimersByTime(ms);
}
