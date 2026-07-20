import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * FACTORY-CONTRACT — canonical-json-hashing.v1 known-answer tests.
 *
 * Executes the reference implementation from
 * schemas/hashing/canonical-json-hashing.v1.md against every governed KAT
 * vector in kats/hashing/v1/canonical-json-hashing.kat.json:
 * sha256 over UTF-8 of the canonically serialized JSON (recursively sorted
 * object keys by UTF-16 code units, arrays in authored order, no
 * insignificant whitespace, numbers in shortest ECMAScript round-trip form),
 * after removing the artifact type's excluded TOP-LEVEL fields.
 *
 * CONFORMANCE RULE: afi-factory and afi-reactor must BOTH pass these vectors
 * byte-exactly; this suite is the afi-config anchor of that agreement.
 */

function loadJSON(relativePath: string): any {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf-8'));
}

const KAT_FILE = 'kats/hashing/v1/canonical-json-hashing.kat.json';
const SPEC_FILE = 'schemas/hashing/canonical-json-hashing.v1.md';

// --- reference implementation (spec §2) --------------------------------------
function canonicalize(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  return (
    '{' +
    Object.keys(v as object)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonicalize((v as any)[k]))
      .join(',') +
    '}'
  );
}
function stripExcluded(obj: any, excluded: string[]): any {
  const out: any = {};
  Object.keys(obj).forEach((k) => {
    if (!excluded.includes(k)) out[k] = obj[k];
  });
  return out;
}
function sha256hex(s: string): string {
  return createHash('sha256').update(Buffer.from(s, 'utf-8')).digest('hex');
}

describe('FACTORY-CONTRACT — canonical-json-hashing.v1 KATs', () => {
  const kat = loadJSON(KAT_FILE);

  it('KAT file self-identifies and pins the canonicalization version', () => {
    expect(kat.schema).toBe('afi.canonical-json-hashing-kat.v1');
    expect(kat.canonicalizationVersion).toBe('afi.hash.v1');
    expect(kat.specRef).toContain('canonical-json-hashing.v1.md');
    expect(Array.isArray(kat.vectors)).toBe(true);
    expect(kat.vectors.length, 'the spec requires 3+ KAT vectors').toBeGreaterThanOrEqual(3);
  });

  it('the spec document exists and states the rule', () => {
    const spec = readFileSync(join(rootDir, SPEC_FILE), 'utf-8');
    expect(spec).toContain('SHA-256');
    expect(spec).toContain('UTF-16 code units');
    expect(spec).toContain('shortest ECMAScript round-trip form');
    expect(spec).toContain('registeredAt');
  });

  it('every vector name is unique and every expected digest is 64 lowercase hex chars', () => {
    const names = kat.vectors.map((v: any) => v.name);
    expect(new Set(names).size).toBe(names.length);
    kat.vectors.forEach((v: any) => {
      expect(v.expectedSha256, `${v.name} digest format`).toMatch(/^[a-f0-9]{64}$/);
      expect(typeof v.expectedCanonicalForm, `${v.name} canonical form present`).toBe('string');
    });
  });

  it('every vector reproduces its expected canonical form byte-exactly', () => {
    kat.vectors.forEach((v: any) => {
      const stripped = v.excludedFields ? stripExcluded(v.input, v.excludedFields) : v.input;
      expect(canonicalize(stripped), `${v.name} canonical form`).toBe(v.expectedCanonicalForm);
    });
  });

  it('every vector reproduces its expected sha256 digest', () => {
    kat.vectors.forEach((v: any) => {
      const stripped = v.excludedFields ? stripExcluded(v.input, v.excludedFields) : v.input;
      expect(sha256hex(canonicalize(stripped)), `${v.name} digest`).toBe(v.expectedSha256);
    });
  });

  it('exclusion is TOP-LEVEL only: the dedicated vector keeps its nested metadata key', () => {
    const vector = kat.vectors.find((v: any) => v.name === 'exclusion-is-top-level-only');
    expect(vector, 'exclusion-is-top-level-only vector must exist').toBeDefined();
    expect(vector.expectedCanonicalForm).toContain('semantic-nested-value');
    expect(vector.expectedCanonicalForm).not.toContain('volatile');
  });

  it('excluded/annotational fields can NEVER perturb a hash', () => {
    const manifest = loadJSON('examples/pipeline/v1/pipeline.example.json');
    const base = sha256hex(canonicalize(stripExcluded(manifest, ['description', 'metadata'])));
    const mutated = {
      ...manifest,
      description: 'totally different annotation',
      metadata: { x: 1 },
    };
    expect(sha256hex(canonicalize(stripExcluded(mutated, ['description', 'metadata'])))).toBe(base);
  });

  describe('Example-chain anchors (the KATs are the REAL hashes the examples pin)', () => {
    it('pipeline-manifest-excludes KAT == the manifestHash pinned by the config + composition examples', () => {
      const vector = kat.vectors.find((v: any) => v.name === 'pipeline-manifest-excludes');
      expect(vector).toBeDefined();
      expect(vector.input).toEqual(loadJSON('examples/pipeline/v1/pipeline.example.json'));
      const config = loadJSON(
        'examples/analyst-strategy-config/v1/analyst-strategy-config.example.json',
      );
      const composition = loadJSON('examples/composition-ref/v1/composition-ref.example.json');
      expect(config.pipelineRef.manifestHash.value).toBe(vector.expectedSha256);
      expect(composition.manifestHash.value).toBe(vector.expectedSha256);
    });

    it('analyst-config-excludes KAT == the analystConfigHash pinned by the registration + composition examples', () => {
      const vector = kat.vectors.find((v: any) => v.name === 'analyst-config-excludes');
      expect(vector).toBeDefined();
      expect(vector.input).toEqual(
        loadJSON('examples/analyst-strategy-config/v1/analyst-strategy-config.example.json'),
      );
      const registration = loadJSON(
        'examples/analyst-strategy-registration/v1/analyst-strategy-registration.example.json',
      );
      const composition = loadJSON('examples/composition-ref/v1/composition-ref.example.json');
      expect(registration.analystConfigHash.value).toBe(vector.expectedSha256);
      expect(composition.analystConfigHash.value).toBe(vector.expectedSha256);
    });
  });
});
