#!/usr/bin/env node
/**
 * Minimum dependency release-age gate.
 *
 * Compares package-lock.json on the current branch against origin/main, finds
 * dependency version bumps, queries the npm registry for each target version's
 * publish date, and fails if any bumped version was published fewer than
 * AFI_MIN_RELEASE_AGE_DAYS (default 7) days ago.
 *
 * Designed to run on Dependabot / Renovate PRs in CI. Skips gracefully when
 * there is no base to diff against or no dependency changes.
 */
/* global fetch */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MIN_DAYS = Number.parseInt(process.env.AFI_MIN_RELEASE_AGE_DAYS ?? '7', 10);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const REGISTRY = 'https://registry.npmjs.org';

function loadLockfile(source) {
  try {
    if (source.startsWith('git:')) {
      const ref = source.slice(4);
      const out = execSync(`git show "${ref}"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return JSON.parse(out);
    }
    return JSON.parse(readFileSync(source, 'utf8'));
  } catch {
    return null;
  }
}

/** Extract package name from a lockfile v3 packages key like "node_modules/@vitest/coverage-v8". */
function nameFromKey(key) {
  if (!key || key === '') return null;
  const stripped = key.replace(/^node_modules\//, '');
  // Scoped packages keep their leading "@" segment.
  return stripped;
}

/** Fetch the publish date of a specific version from the npm registry. */
async function publishDate(name, version) {
  const url = `${REGISTRY}/${encodeURIComponent(name).replace('%40', '@')}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const time = data?.time?.[version];
    return time ? new Date(time) : null;
  } catch {
    return null;
  }
}

/** Diff lockfile packages sections and return bumped entries. */
function diffBumps(headPkgs, basePkgs) {
  const bumps = [];
  for (const [key, headEntry] of Object.entries(headPkgs)) {
    if (key === '') continue; // root package
    if (headEntry.link === true || String(headEntry.resolved ?? '').startsWith('file:')) continue;
    const name = nameFromKey(key);
    if (!name) continue;
    const baseVersion = basePkgs[key]?.version;
    const headVersion = headEntry.version;
    if (!headVersion || headVersion === baseVersion) continue;
    bumps.push({ name, from: baseVersion ?? '(new)', to: headVersion });
  }
  return bumps;
}

/** Check one bump against the registry; return a violation object if too fresh. */
async function checkBump(b, now) {
  const date = await publishDate(b.name, b.to);
  if (!date) {
    console.log(`  - ${b.name}: ${b.from} -> ${b.to} (publish date unavailable; skipping)`);
    return null;
  }
  const ageDays = (now - date.getTime()) / MS_PER_DAY;
  const flag = ageDays < MIN_DAYS ? 'FAIL' : 'ok';
  console.log(
    `  - ${b.name}: ${b.from} -> ${b.to} (published ${date.toISOString()}, age ${ageDays.toFixed(1)} days) [${flag}]`,
  );
  if (ageDays < MIN_DAYS) {
    return { ...b, ageDays: ageDays.toFixed(1), published: date.toISOString() };
  }
  return null;
}

async function main() {
  const headLock = loadLockfile('package-lock.json');
  if (!headLock) {
    console.log('min-release-age: no package-lock.json found; skipping.');
    return;
  }

  let baseLock = null;
  try {
    baseLock = loadLockfile('git:origin/main:package-lock.json');
  } catch {
    // ignore
  }
  if (!baseLock) {
    console.log('min-release-age: no origin/main package-lock.json to diff; skipping.');
    return;
  }

  const bumps = diffBumps(headLock.packages ?? {}, baseLock.packages ?? {});
  if (bumps.length === 0) {
    console.log('min-release-age: no dependency version bumps detected; passing.');
    return;
  }

  console.log(
    `min-release-age: checking ${bumps.length} bumped package(s) against a ${MIN_DAYS}-day minimum release age.`,
  );
  const now = Date.now();
  const violations = [];
  for (const b of bumps) {
    const v = await checkBump(b, now);
    if (v) violations.push(v);
  }

  if (violations.length > 0) {
    console.error(
      `\nmin-release-age: ${violations.length} package(s) were published fewer than ${MIN_DAYS} days ago:`,
    );
    for (const v of violations) {
      console.error(`  - ${v.name} ${v.to} (age ${v.ageDays} days, published ${v.published})`);
    }
    console.error(`Set AFI_MIN_RELEASE_AGE_DAYS to adjust the threshold, or wait before merging.`);
    process.exit(1);
  }
  console.log('min-release-age: all bumped packages meet the minimum release age.');
}

main().catch((e) => {
  console.error('min-release-age: error:', e.message);
  process.exit(1);
});
