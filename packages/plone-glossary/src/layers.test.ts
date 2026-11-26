// @vitest-environment node
import path from 'node:path';
import { ESLint } from 'eslint';

const srcRoot = path.resolve(__dirname);

const lint = async (file: string, code: string) => {
  const [result] = await new ESLint().lintText(code, {
    filePath: path.join(srcRoot, file),
  });
  return result.messages.filter((m) => m.ruleId === 'no-restricted-imports')
    .length;
};

it.each([
  ['core/x.ts', "import React from 'react';", 1],
  ['core/x.ts', "import { a } from '../react/a';", 1],
  ['core/x.ts', "import { a } from './types';", 0],
  ['react/x.tsx', "import config from '@plone/volto/registry';", 1],
  ['react/x.tsx', "import { useSelector } from 'react-redux';", 1],
  ['react/x.tsx', "import { a } from '../volto/a';", 1],
  ['react/x.tsx', "import React from 'react';", 0],
  ['react/x.tsx', "import { Popover } from 'react-aria-components';", 0],
  ['react/x.tsx', "import { createMatcher } from '../core';", 0],
  ['volto/x.tsx', "import config from '@plone/volto/registry';", 0],
  ['core/x.test.ts', "import React from 'react';", 0],
  ['react/test-utils.ts', "import config from '@plone/volto/registry';", 0],
])('%s: %s -> %i layer violations', async (file, code, expected) => {
  expect(await lint(file, code)).toBe(expected);
});
