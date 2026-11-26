import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import voltoVitestConfig from '@plone/volto/vitest.config.mjs';

// Reuse the plugins and aliases of Volto's own "volto" test
// project, but run only this package's tests (Volto's config also lists a
// `volto-slate` project that does not exist here).
const voltoProject = voltoVitestConfig.test.projects.find(
  (project) => project.test.name === 'volto',
);

export default defineConfig({
  plugins: voltoProject.plugins,
  resolve: voltoProject.resolve,
  test: {
    name: 'plone-glossary',
    globals: true,
    environment: 'jsdom',
    isolate: true,
    setupFiles: [fileURLToPath(new URL('./vitest.setup.mjs', import.meta.url))],
    globalSetup: voltoProject.test.globalSetup,
    snapshotFormat: voltoVitestConfig.test.snapshotFormat,
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/test-utils.ts'],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
        'src/core/**': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
});
