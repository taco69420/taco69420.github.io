#!/usr/bin/env node
/**
 * `npm run audit` — builds the site, then runs every SEO/content check against
 * dist/. Exits non-zero if any check reports a problem.
 *
 *   npm run audit              build, then check
 *   npm run audit -- --no-build   check the existing dist/ (faster while iterating)
 *   npm run audit -- --verbose    also print each check's full table
 *   npm run audit -- titles dates   run only the named checks
 *
 * Checks live in scripts/audit/*.mjs. Each default-exports
 * { name, run() -> { problems: string[], summary: string, report?: string } }.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DIST = path.join(ROOT, 'dist');

const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const verbose = args.includes('--verbose');
const only = args.filter((a) => !a.startsWith('--'));

// run in a stable order, not whatever readdir returns
const ORDER = ['titles', 'dates', 'schema', 'breadcrumbs', 'disclosure', 'sponsored', 'products', 'claims', 'firsthand', 'figures', 'links', 'inbound'];

const available = fs
  .readdirSync(path.join(HERE, 'audit'))
  .filter((f) => f.endsWith('.mjs') && f !== 'lib.mjs')
  .map((f) => f.replace(/\.mjs$/, ''));

for (const name of available) {
  if (!ORDER.includes(name)) ORDER.push(name); // a new check still runs
}
const selected = ORDER.filter((n) => available.includes(n)).filter((n) => !only.length || only.includes(n));

if (only.length) {
  const unknown = only.filter((n) => !available.includes(n));
  if (unknown.length) {
    console.error(`Unknown check(s): ${unknown.join(', ')}\nAvailable: ${available.join(', ')}`);
    process.exit(2);
  }
}

if (!noBuild) {
  process.stdout.write('Building…  ');
  try {
    // astro's own entrypoint under the current node, so there is no shell to
    // escape and no dependence on npm being resolvable on PATH
    execFileSync(process.execPath, [path.join(ROOT, 'node_modules', 'astro', 'astro.js'), 'build'], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    console.log('ok\n');
  } catch (e) {
    console.log('FAILED\n');
    const out = String(e.stdout ?? '') + String(e.stderr ?? '');
    process.stdout.write(out || `${e.message}
`);
    console.error('\nBuild failed, so nothing was audited.');
    process.exit(1);
  }
}

if (!fs.existsSync(DIST)) {
  console.error('dist/ does not exist. Run without --no-build.');
  process.exit(1);
}

const results = [];
for (const name of selected) {
  const mod = (await import(new URL(`./audit/${name}.mjs`, import.meta.url))).default;
  let res;
  try {
    res = mod.run();
  } catch (e) {
    res = { problems: [`check threw: ${e.message}`], summary: 'errored' };
  }
  results.push({ name, label: mod.name, ...res, problems: res.problems ?? [] });
}

const pad = (s, n) => String(s).padEnd(n);
const w = Math.max(...results.map((r) => r.label.length));

console.log('─'.repeat(w + 58));
for (const r of results) {
  const ok = r.problems.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${pad(r.label, w)}  ${ok ? r.summary ?? '' : `${r.problems.length} problem(s)`}`);
}
console.log('─'.repeat(w + 58));

if (verbose) {
  for (const r of results) {
    if (!r.report) continue;
    console.log(`\n## ${r.label}\n`);
    console.log(r.report);
  }
  console.log('');
}

const failed = results.filter((r) => r.problems.length);
if (failed.length) {
  for (const r of failed) {
    console.log(`\n${r.label} — ${r.problems.length} problem(s):`);
    for (const p of r.problems) console.log(`  ${p}`);
  }
  console.log(`\n${failed.length} of ${results.length} checks failed.`);
  process.exit(1);
}

console.log(`All ${results.length} checks passed.`);
