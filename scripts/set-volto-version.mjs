#!/usr/bin/env node
// Set the Volto tag that mrs-developer checks out into `core/`.
// Usage: node scripts/set-volto-version.mjs <tag>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const tag = process.argv[2];
if (!tag) {
  console.error('Usage: node scripts/set-volto-version.mjs <tag>');
  process.exit(1);
}

const file = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'mrs.developer.json');
const config = JSON.parse(readFileSync(file, 'utf8'));
config.core.tag = tag;
writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
