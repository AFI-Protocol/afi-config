#!/usr/bin/env node
/**
 * Technical-debt tracker. Scans code comments for debt markers
 * (TODO / FIXME / HACK / XXX) and enforces that each one links to a tracking
 * issue, e.g. `// TODO(#123): ...` or `// FIXME(AFI-42): ...`.
 *
 * Unlinked markers fail the check so debt is always traceable to an issue.
 * Linked markers are listed as an inventory of known, tracked debt.
 *
 * Usage:
 *   node scripts/check-tech-debt.mjs                # scan all git-tracked code
 *   node scripts/check-tech-debt.mjs <file> [file]  # scan given files (hooks)
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
// A marker counts only inside a comment; the issue reference is (#123) or (AFI-123).
const MARKER = /(?:\/\/|\/\*|\*|#)[^\n]*?\b(TODO|FIXME|HACK|XXX)\b(\(([^)]*)\))?/;
const ISSUE_REF = /^(#\d+|[A-Z][A-Z0-9]+-\d+)$/;

function targetFiles() {
  const args = process.argv.slice(2);
  const list = args.length > 0 ? args : execSync('git ls-files', { encoding: 'utf8' }).split('\n');
  return list.map((f) => f.trim()).filter((f) => f && CODE_EXT.test(f) && !SELF.endsWith(f));
}

const tracked = [];
const untracked = [];
for (const file of targetFiles()) {
  let lines;
  try {
    lines = readFileSync(file, 'utf8').split('\n');
  } catch {
    continue;
  }
  lines.forEach((line, i) => {
    const m = MARKER.exec(line);
    if (!m) return;
    const ref = m[3]?.trim();
    const entry = `${file}:${i + 1}  ${line.trim()}`;
    if (ref && ISSUE_REF.test(ref)) tracked.push(entry);
    else untracked.push(entry);
  });
}

if (tracked.length > 0) {
  console.log(`Tracked technical debt (${tracked.length}):`);
  for (const e of tracked) console.log(`  ${e}`);
}

if (untracked.length > 0) {
  console.error(`\nUntracked debt markers (${untracked.length}):`);
  for (const e of untracked) console.error(`  ${e}`);
  console.error(
    '\nEach TODO/FIXME/HACK/XXX must link to an issue, e.g. TODO(#123) or FIXME(AFI-42).',
  );
  process.exit(1);
}

console.log(`Tech-debt check passed (${tracked.length} tracked, 0 untracked).`);
