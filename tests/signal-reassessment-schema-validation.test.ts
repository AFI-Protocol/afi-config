import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * DLC-CHECKPOINT — afi.signal-reassessment.v1 (DLC-GOV D-DLC-4).
 *
 * Three sections (house pattern): (1) strict compilation + governed metadata
 * pins; (2) canonical example + drift-guarded vectors with a semantic layer
 * (checkpoint eligibility, horizon alignment, reading determinism, seal
 * reproduction — the x-afiConstraints rules draft-07 cannot express); (3)
 * clone-and-mutate negatives. The valid vectors double as THE GOVERNED
 * SEALING VECTORS: every seal.value reproduces under the canonical-json
 * reference implementation with the top-level 'seal' member excluded —
 * the D-DLC-4(3) sealing answer, proven, not asserted.
 */

function loadJSON(relativePath: string): any {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf-8'));
}

const SCHEMA_FILE = 'schemas/signal-reassessment/v1/signal-reassessment.schema.json';
const EXAMPLE_FILE = 'examples/signal-reassessment/v1/signal-reassessment.example.json';
const VALID_DIR = 'examples/signal-reassessment/v1/vectors/valid';
const INVALID_DIR = 'examples/signal-reassessment/v1/vectors/invalid';
const DOMAIN_TAG = 'afi.checkpoint.signal-reassessment';

function createAjv(): Ajv {
  const ajv = new Ajv({
    strict: true,
    allowUnionTypes: true,
    strictRequired: false,
    allErrors: true,
    verbose: true,
  });
  addFormats(ajv);
  ajv.addVocabulary([
    'x-afiStatus',
    'x-afiPartOf',
    'x-afiDoctrineRefs',
    'x-afiOpenItems',
    'x-afiProposedNotAccepted',
    'x-afiConstraints',
  ]);
  return ajv;
}

function compileWithHash(schemaFile: string) {
  const ajv = createAjv();
  ajv.addSchema(loadJSON('schemas/provenance/v1/canonical-hash.schema.json'));
  return ajv.compile(loadJSON(schemaFile));
}

// --- canonical-json-hashing.v1 reference implementation (spec §2) -----------
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
function canonicalSha256(obj: any, excluded: string[]): string {
  const stripped: any = {};
  Object.keys(obj).forEach((k) => {
    if (!excluded.includes(k)) stripped[k] = obj[k];
  });
  return createHash('sha256')
    .update(Buffer.from(canonicalize(stripped), 'utf-8'))
    .digest('hex');
}

// --- the semantic layer (x-afiConstraints rules draft-07 cannot express) ----
function classify(signedReturnPct: number | null): string {
  if (signedReturnPct === null) return 'indeterminate';
  if (signedReturnPct > 0) return 'favorable';
  if (signedReturnPct < 0) return 'adverse';
  return 'flat';
}
function overallOf(outcomes: string[]): string {
  const determinate = outcomes.filter((o) => o !== 'indeterminate');
  if (determinate.length === 0) return 'indeterminate';
  if (determinate.every((o) => o === 'favorable')) return 'confirmed';
  if (determinate.every((o) => o === 'adverse')) return 'contradicted';
  return 'mixed';
}
function semanticViolations(doc: any): string[] {
  const out: string[] = [];
  // horizon labels are unique within each array — a duplicate would let the
  // determinism check silently verify only the LAST row (Map semantics)
  for (const [name, labels] of [
    ['horizonsRead', doc.horizonsRead.map((h: any) => h.horizon)],
    ['realizedFigures', doc.realizedFigures.map((f: any) => f.horizon)],
    ['perHorizon', doc.reassessmentReading.perHorizon.map((p: any) => p.horizon)],
  ] as Array<[string, string[]]>) {
    if (new Set(labels).size !== labels.length) {
      out.push(`duplicate horizon labels in ${name}`);
    }
  }
  // checkpointEligibility (D-DLC-4(1))
  if (!(doc.checkpointTime.elapsedMinutes >= doc.checkpointTime.halfLifeMinutes)) {
    out.push('checkpoint before the stamped half-life (eligibility)');
  }
  // horizonAlignment
  const read = doc.horizonsRead.map((h: any) => h.horizon).sort();
  const figures = doc.realizedFigures.map((f: any) => f.horizon).sort();
  const readOut = doc.reassessmentReading.perHorizon.map((p: any) => p.horizon).sort();
  if (JSON.stringify(read) !== JSON.stringify(figures)) {
    out.push('horizonsRead vs realizedFigures misalignment');
  }
  if (JSON.stringify(read) !== JSON.stringify(readOut)) {
    out.push('horizonsRead vs perHorizon misalignment');
  }
  // readingDeterminism (rule signedReturnPct-sign-v1)
  const byHorizon = new Map<string, number | null>(
    doc.realizedFigures.map((f: any) => [f.horizon, f.signedReturnPct]),
  );
  const recomputed: string[] = [];
  for (const p of doc.reassessmentReading.perHorizon) {
    if (!byHorizon.has(p.horizon)) continue; // alignment already flagged
    const expected = classify(byHorizon.get(p.horizon)!);
    recomputed.push(expected);
    if (p.outcome !== expected) {
      out.push(`perHorizon ${p.horizon}: ${p.outcome} != deterministic ${expected}`);
    }
  }
  if (recomputed.length === doc.reassessmentReading.perHorizon.length) {
    const expectedOverall = overallOf(recomputed);
    if (doc.reassessmentReading.overall !== expectedOverall) {
      out.push(`overall ${doc.reassessmentReading.overall} != deterministic ${expectedOverall}`);
    }
  }
  // sealingDiscipline (the D-DLC-4(3) answer)
  if (doc.seal?.value !== canonicalSha256(doc, ['seal'])) {
    out.push('seal.value does not reproduce under canonical-json-hashing.v1');
  }
  return out;
}

describe('DLC-CHECKPOINT — afi.signal-reassessment.v1', () => {
  describe('Schema Compilation & Governed Metadata', () => {
    it('compiles under strict AJV (CanonicalHash by $ref)', () => {
      expect(() => compileWithHash(SCHEMA_FILE)).not.toThrow();
    });

    it('pins the governed metadata', () => {
      const schema = loadJSON(SCHEMA_FILE);
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema.properties.schema.const).toBe('afi.signal-reassessment.v1');
      // D-DLC-4(3): the member set is EXHAUSTIVE — content members plus the
      // artifact form (schema, seal). Nothing more without a further filing.
      expect([...schema.required].sort()).toEqual(
        [
          'schema',
          'signalId',
          'checkpointTime',
          'horizonsRead',
          'realizedFigures',
          'reassessmentReading',
          'seal',
        ].sort(),
      );
      expect(Object.keys(schema.properties).sort()).toEqual([...schema.required].sort());
      expect(schema.additionalProperties).toBe(false);
      expect(Object.keys(schema['x-afiConstraints'])).toEqual([
        'sealingDiscipline',
        'checkpointEligibility',
        'horizonAlignment',
        'readingDeterminism',
        'verbatimRealization',
        'immutability',
      ]);
    });

    it('pins the closed sub-shapes, the rule const, and the seal domain tag', () => {
      const schema = loadJSON(SCHEMA_FILE);
      expect(schema.properties.checkpointTime.additionalProperties).toBe(false);
      expect(schema.properties.horizonsRead.items.additionalProperties).toBe(false);
      expect(schema.properties.realizedFigures.items.additionalProperties).toBe(false);
      expect(schema.properties.reassessmentReading.additionalProperties).toBe(false);
      expect(schema.properties.reassessmentReading.properties.rule.const).toBe(
        'signedReturnPct-sign-v1',
      );
      expect(schema.properties.reassessmentReading.properties.overall.enum).toEqual([
        'confirmed',
        'contradicted',
        'mixed',
        'indeterminate',
      ]);
      expect(
        schema.properties.reassessmentReading.properties.perHorizon.items.properties.outcome.enum,
      ).toEqual(['favorable', 'adverse', 'flat', 'indeterminate']);
      expect(schema.properties.seal.allOf[0].$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/canonical-hash.schema.json',
      );
      expect(schema.properties.seal.allOf[1].properties.domainTag.const).toBe(DOMAIN_TAG);
    });
  });

  describe('Canonical Example & Vectors (the governed sealing vectors)', () => {
    it('canonical example is admissible, semantically clean, and its seal reproduces', () => {
      const validate = compileWithHash(SCHEMA_FILE);
      const example = loadJSON(EXAMPLE_FILE);
      const ok = validate(example);
      if (!ok) console.error('example failure:', validate.errors);
      expect(ok).toBe(true);
      expect(semanticViolations(example)).toEqual([]);
      expect(example.seal.value).toBe(canonicalSha256(example, ['seal']));
      expect(example.seal.domainTag).toBe(DOMAIN_TAG);
    });

    it('vector listings are drift-guarded', () => {
      const valid = readdirSync(join(rootDir, VALID_DIR))
        .filter((f) => f.endsWith('.json'))
        .sort();
      expect(valid).toEqual([
        'complete.json',
        'neutral-indeterminate.json',
        'short-contradicted.json',
      ]);
      const invalid = readdirSync(join(rootDir, INVALID_DIR))
        .filter((f) => f.endsWith('.json'))
        .sort();
      expect(invalid).toEqual(Object.keys(INVALID_EXPECTED).sort());
    });

    it('complete.json deep-equals the canonical example', () => {
      expect(loadJSON(`${VALID_DIR}/complete.json`)).toEqual(loadJSON(EXAMPLE_FILE));
    });

    it('every valid vector is admissible, semantically clean, and SEALS reproduce (D-DLC-4(3))', () => {
      const validate = compileWithHash(SCHEMA_FILE);
      for (const f of readdirSync(join(rootDir, VALID_DIR)).filter((x) => x.endsWith('.json'))) {
        const doc = loadJSON(`${VALID_DIR}/${f}`);
        const ok = validate(doc);
        if (!ok) console.error(`${f} failure:`, validate.errors);
        expect(ok, `${f} schema`).toBe(true);
        expect(semanticViolations(doc), `${f} semantics`).toEqual([]);
        expect(doc.seal.value, `${f} seal`).toBe(canonicalSha256(doc, ['seal']));
      }
    });

    it('the valid set covers all three overall classes reachable from honest readings', () => {
      const overalls = readdirSync(join(rootDir, VALID_DIR))
        .filter((f) => f.endsWith('.json'))
        .map((f) => loadJSON(`${VALID_DIR}/${f}`).reassessmentReading.overall)
        .sort();
      expect(overalls).toEqual(['contradicted', 'indeterminate', 'mixed']);
    });

    const INVALID_EXPECTED: Record<string, { schemaValid: boolean }> = {
      'wrong-schema-const.json': { schemaValid: false },
      // documents that validator identity is NOT a member (D-DLC-4(4))
      'extra-properties.json': { schemaValid: false },
      'missing-seal.json': { schemaValid: false },
      'bad-seal-domain-tag.json': { schemaValid: false },
      'missing-reading.json': { schemaValid: false },
      'bad-overall-enum.json': { schemaValid: false },
      'empty-horizons.json': { schemaValid: false },
      'bad-horizon-label.json': { schemaValid: false },
      // The schema alone cannot reject these four; the semantic layer must.
      'duplicate-horizon.json': { schemaValid: true },
      'ineligible-checkpoint.json': { schemaValid: true },
      'misaligned-horizons.json': { schemaValid: true },
      'nondeterministic-reading.json': { schemaValid: true },
      'broken-seal.json': { schemaValid: true },
    };

    it('every invalid vector is inadmissible at the expected layer', () => {
      const validate = compileWithHash(SCHEMA_FILE);
      for (const [f, expected] of Object.entries(INVALID_EXPECTED)) {
        const doc = loadJSON(`${INVALID_DIR}/${f}`);
        const schemaValid = Boolean(validate(doc));
        expect(schemaValid, `${f} schema layer`).toBe(expected.schemaValid);
        if (schemaValid) {
          expect(
            semanticViolations(doc).length,
            `${f} must fail the semantic layer`,
          ).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('clone-and-mutate negatives', () => {
    it('rejects a missing required field, for every required field', () => {
      const validate = compileWithHash(SCHEMA_FILE);
      const BASE = loadJSON(EXAMPLE_FILE);
      for (const field of loadJSON(SCHEMA_FILE).required) {
        const mutant = JSON.parse(JSON.stringify(BASE));
        delete mutant[field];
        expect(validate(mutant), `missing ${field} must be rejected`).toBe(false);
      }
    });

    it('rejects a foreign domain tag and a malformed seal value', () => {
      const validate = compileWithHash(SCHEMA_FILE);
      const BASE = loadJSON(EXAMPLE_FILE);
      const foreign = JSON.parse(JSON.stringify(BASE));
      foreign.seal.domainTag = 'afi.d2.execution-summary';
      expect(validate(foreign)).toBe(false);
      const malformed = JSON.parse(JSON.stringify(BASE));
      malformed.seal.value = 'not-a-hash';
      expect(validate(malformed)).toBe(false);
    });
  });
});
