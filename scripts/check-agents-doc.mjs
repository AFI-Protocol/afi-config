#!/usr/bin/env node
/**
 * AGENTS.md freshness validator. Keeps the doc consistent with the code by
 * asserting that:
 *   1. Every `npm run <script>` referenced in AGENTS.md maps to a real script
 *      in package.json (catches renamed/removed scripts).
 *   2. Every backticked path ending in .md / .json that AGENTS.md cites as an
 *      existing artifact is present on disk.
 *
 * Fails (exit 1) on any drift so stale documentation is caught in CI / hooks.
 */
import { readFileSync, existsSync } from 'node:fs';

const doc = readFileSync('AGENTS.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts ?? {};

const problems = [];

const runRefs = new Set();
for (const m of doc.matchAll(/npm run ([a-zA-Z][\w:-]*)/g)) runRefs.add(m[1]);
for (const name of runRefs) {
  if (!(name in scripts)) {
    problems.push(
      `AGENTS.md references \`npm run ${name}\` but no such script exists in package.json.`,
    );
  }
}
// `npm test` maps to the "test" script.
if (/\bnpm test\b/.test(doc) && !('test' in scripts)) {
  problems.push('AGENTS.md references `npm test` but package.json has no "test" script.');
}

const CITED_FILE = /`([\w./-]+\.(?:md|json))`/g;
for (const m of doc.matchAll(CITED_FILE)) {
  const p = m[1];
  if (p.includes('*') || (p.startsWith('.') === false && !p.includes('/'))) {
    // skip bare example filenames like `signal-schema.json` (no directory)
    continue;
  }
  if (!existsSync(p)) {
    problems.push(`AGENTS.md cites file \`${p}\` which does not exist.`);
  }
}

if (problems.length > 0) {
  console.error('AGENTS.md validation failed:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`AGENTS.md validation passed (${runRefs.size} script refs, all resolvable).`);
