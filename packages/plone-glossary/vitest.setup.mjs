// Volto's setup files assume a DOM. Test files that opt into the node
// environment (`// @vitest-environment node`) skip them.
if (typeof window !== 'undefined') {
  await import('../../core/packages/volto/test-setup-globals.js');
  await import('../../core/packages/volto/test-setup-config.jsx');
  await import('../../core/packages/volto/test-addons-loader.js');
}
