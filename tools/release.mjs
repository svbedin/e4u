/*!
 * E4U — prepare a new version for publishing: `npm run release`
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * 1. bumps the cache name in www/sw.js (users get the update on next launch)
 * 2. rewrites the list of offline files in www/sw.js from what is in www/
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WWW = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'www');
const SKIP = [/^sw\.js$/, /maskable-512\.png$/, /apple-touch-icon\.png$/, /(^|\/)\./, /\.pdf$/];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(relative(WWW, p).split(sep).join('/'));
  }
  return out;
}

const files = (await walk(WWW)).filter(f => !SKIP.some(r => r.test(f))).sort().map(f => './' + f);
const swPath = join(WWW, 'sw.js');
let sw = await readFile(swPath, 'utf8');
let next;
sw = sw.replace(/const CACHE = 'e4u-v(\d+)';/, (_, n) => { next = Number(n) + 1; return `const CACHE = 'e4u-v${next}';`; });
sw = sw.replace(/const SHELL = \[[^\]]*\];/, `const SHELL = ${JSON.stringify(['./', ...files]).replace(/"/g, "'").replace(/,/g, ', ')};`);
await writeFile(swPath, sw);
console.log(`sw.js: cache e4u-v${next}, ${files.length + 1} files for offline use`);
