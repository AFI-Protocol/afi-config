#!/usr/bin/env node
/**
 * Large-file guard. Fails if any candidate file exceeds MAX_BYTES.
 *
 * Usage:
 *   node scripts/check-file-size.mjs                # scan all git-tracked files
 *   node scripts/check-file-size.mjs <file> [file]  # scan the given files (pre-commit)
 *
 * Threshold override: AFI_MAX_FILE_KB=512 node scripts/check-file-size.mjs
 */
import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';

const MAX_KB = Number(process.env.AFI_MAX_FILE_KB) || 1024;
const MAX_BYTES = MAX_KB * 1024;

function candidateFiles() {
  const args = process.argv.slice(2);
  if (args.length > 0) return args;
  return execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const offenders = [];
for (const file of candidateFiles()) {
  let size;
  try {
    size = statSync(file).size;
  } catch {
    continue; // deleted/untracked path passed by a hook — skip
  }
  if (size > MAX_BYTES) {
    offenders.push({ file, kb: Math.round(size / 1024) });
  }
}

if (offenders.length > 0) {
  console.error(`Large file check failed (limit ${MAX_KB} KB):`);
  for (const { file, kb } of offenders) {
    console.error(`  ${file} — ${kb} KB`);
  }
  console.error(
    'Reduce the file, split it, or track large binaries with Git LFS before committing.',
  );
  process.exit(1);
}

console.log(`Large file check passed (limit ${MAX_KB} KB).`);
