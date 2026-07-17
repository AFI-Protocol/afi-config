import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * FACTORY-CONTRACT — afi.composition-ref.v1 + afi.scored-signal-evidence.v2.
 *
 * Covers the composition provenance stamp and the v2 evidence contract
 * (v1 copied EXACTLY + required composition), their canonical examples, and
 * the vectors under examples/composition-ref/v1/vectors/ and
 * examples/scored-signal-evidence/v2/vectors/. Authorized by
 * afi-governance/decisions/factory-configurable-pipelines-v1.
 *
 * SUPERSESSION: v2 is the active write contract; v1 stays FROZEN (no
 * dual-write). This suite pins the v2-vs-v1 delta to exactly {schema const,
 * required composition} and reuses the v1 identifier-continuity layer
 * unchanged (admissible = schema-valid AND continuity-clean).
 */

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

function loadJSON(relativePath: string): any {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf-8'));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const PROVENANCE_DIR = 'schemas/provenance/v1';
const DEP_SCHEMAS = [
  `${PROVENANCE_DIR}/canonical-hash.schema.json`,
  `${PROVENANCE_DIR}/evidence-ref.schema.json`,
  `${PROVENANCE_DIR}/source-disclosure-profile.schema.json`,
  `${PROVENANCE_DIR}/enrichment-provenance.schema.json`,
  `${PROVENANCE_DIR}/scored-signal.schema.json`,
  `${PROVENANCE_DIR}/provenance-record.schema.json`,
  'schemas/composition-ref/v1/composition-ref.schema.json',
];

const COMPOSITION_SCHEMA = 'schemas/composition-ref/v1/composition-ref.schema.json';
const COMPOSITION_EXAMPLE = 'examples/composition-ref/v1/composition-ref.example.json';
const C_VALID = 'examples/composition-ref/v1/vectors/valid';
const C_INVALID = 'examples/composition-ref/v1/vectors/invalid';

const V1_SCHEMA = 'schemas/scored-signal-evidence/v1/scored-signal-evidence.schema.json';
const V2_SCHEMA = 'schemas/scored-signal-evidence/v2/scored-signal-evidence.schema.json';
const V2_EXAMPLE = 'examples/scored-signal-evidence/v2/scored-signal-evidence.example.json';
const E_VALID = 'examples/scored-signal-evidence/v2/vectors/valid';
const E_INVALID = 'examples/scored-signal-evidence/v2/vectors/invalid';

const COMPOSITION_HASH_FIELDS = [
  'manifestHash',
  'analystConfigHash',
  'pluginSetHash',
  'executionSummaryHash',
  'enrichmentHash',
];
const COMPOSITION_REQUIRED = [
  'schema',
  'pipelineId',
  'pipelineVersion',
  'manifestHash',
  'analystConfigHash',
  'scorerPluginId',
  'scorerPluginVersion',
  'pluginSetHash',
  'executionSummaryHash',
  'enrichmentHash',
];

function compileCompositionSchema() {
  const ajv = createAjv();
  ajv.addSchema(loadJSON(`${PROVENANCE_DIR}/canonical-hash.schema.json`));
  return ajv.compile(loadJSON(COMPOSITION_SCHEMA));
}

function compileEvidenceV2Schema() {
  const ajv = createAjv();
  DEP_SCHEMAS.forEach(dep => ajv.addSchema(loadJSON(dep)));
  return ajv.compile(loadJSON(V2_SCHEMA));
}

// The v1 governed identifier-continuity layer, reused UNCHANGED for v2
// (x-afiConstraints.identifierContinuity — OBJ-GOV D-OBJ-1/D-OBJ-3/D-OBJ-6,
// LIFE-GOV D-LIFE-5).
function continuityViolations(r: any): string[] {
  const v: string[] = [];
  if (!r || typeof r !== 'object') return ['record is not an object'];
  if (r.scoredSignal?.signalId !== r.signalId) v.push('signalId != scoredSignal.signalId');
  if (r.provenanceRecord?.signalId !== r.signalId) v.push('signalId != provenanceRecord.signalId');
  if (r.scoredSignal?.analystId !== r.analystId) v.push('analystId != scoredSignal.analystId');
  if (r.scoredSignal?.strategyId !== r.strategyId) v.push('strategyId != scoredSignal.strategyId');
  if (r.strategyVersion !== undefined && r.scoredSignal?.strategyVersion !== r.strategyVersion) {
    v.push('strategyVersion != scoredSignal.strategyVersion');
  }
  if (r.provenanceRecord?.canonicalizationVersion !== r.canonicalizationVersion) {
    v.push('canonicalizationVersion != provenanceRecord.canonicalizationVersion');
  }
  return v;
}

function admit(validate: any, record: any) {
  const schemaValid = validate(record) as boolean;
  const violations = continuityViolations(record);
  return {
    schemaValid,
    continuityOk: violations.length === 0,
    violations,
    ok: schemaValid && violations.length === 0,
  };
}

describe('FACTORY-CONTRACT — afi.composition-ref.v1', () => {
  describe('Schema Compilation & Governed Metadata', () => {
    it('should compile without errors (reusing the governed CanonicalHash shape)', () => {
      expect(() => compileCompositionSchema()).not.toThrow();
    });

    it('should require ALL fields with additionalProperties:false (all-or-nothing provenance)', () => {
      const schema = loadJSON(COMPOSITION_SCHEMA);
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema.properties.schema.const).toBe('afi.composition-ref.v1');
      expect(schema.additionalProperties).toBe(false);
      expect([...schema.required].sort()).toEqual([...COMPOSITION_REQUIRED].sort());
      expect(Object.keys(schema.properties).sort()).toEqual([...COMPOSITION_REQUIRED].sort());
      expect(Object.keys(schema['x-afiConstraints'])).toContain('allOrNothing');
    });

    it('every hash field should $ref the governed CanonicalHash v1 (never redefined)', () => {
      const schema = loadJSON(COMPOSITION_SCHEMA);
      COMPOSITION_HASH_FIELDS.forEach(field => {
        expect(schema.properties[field].$ref, `${field} $ref`).toBe(
          'https://afi-protocol.org/schemas/provenance/v1/canonical-hash.schema.json'
        );
      });
    });
  });

  describe('Canonical Example & Vectors', () => {
    it('canonical example should validate, with the expected per-field domain tags', () => {
      const validate = compileCompositionSchema();
      const example = loadJSON(COMPOSITION_EXAMPLE);
      const valid = validate(example);
      if (!valid) console.error('composition example failure:', validate.errors);
      expect(valid).toBe(true);
      expect(example.manifestHash.domainTag).toBe('afi.factory.pipeline-manifest');
      expect(example.analystConfigHash.domainTag).toBe('afi.factory.analyst-config');
      expect(example.pluginSetHash.domainTag).toBe('afi.factory.plugin-set');
      expect(example.executionSummaryHash.domainTag).toBe('afi.reactor.execution-summary');
      expect(example.enrichmentHash.domainTag).toBe('afi.d2.enrichment-bundle');
    });

    it('the example agrees with the analyst-strategy-config example (x-afiConstraints.agreementWithConfig)', () => {
      const example = loadJSON(COMPOSITION_EXAMPLE);
      const config = loadJSON('examples/analyst-strategy-config/v1/analyst-strategy-config.example.json');
      expect(example.pipelineId).toBe(config.pipelineRef.pipelineId);
      expect(example.pipelineVersion).toBe(config.pipelineRef.pipelineVersion);
      expect(example.manifestHash.value).toBe(config.pipelineRef.manifestHash.value);
      expect(example.scorerPluginId).toBe(config.scorerRef.pluginId);
      expect(example.scorerPluginVersion).toBe(config.scorerRef.pluginVersion);
    });

    it('every valid vector should validate (drift-guarded)', () => {
      const files = readdirSync(join(rootDir, C_VALID)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(['alternate-pipeline.json', 'complete.json']);
      const validate = compileCompositionSchema();
      files.forEach(f => {
        const valid = validate(loadJSON(`${C_VALID}/${f}`));
        if (!valid) console.error(`${f} failure:`, validate.errors);
        expect(valid, `${f} should validate`).toBe(true);
      });
    });

    it('every invalid vector should be rejected (drift-guarded)', () => {
      const EXPECTED_FILES = [
        'bad-hash-value.json',
        'bad-scorer-version.json',
        'extra-properties.json',
        'missing-execution-summary-hash.json',
        'wrong-schema-const.json',
      ];
      const files = readdirSync(join(rootDir, C_INVALID)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(EXPECTED_FILES);
      const validate = compileCompositionSchema();
      EXPECTED_FILES.forEach(file => {
        expect(validate(loadJSON(`${C_INVALID}/${file}`)), `${file} must be rejected`).toBe(false);
      });
    });

    it('should reject a record missing ANY hash field (all-or-nothing, clone-and-mutate)', () => {
      const validate = compileCompositionSchema();
      const BASE = loadJSON(COMPOSITION_EXAMPLE);
      COMPOSITION_REQUIRED.forEach(field => {
        const invalid: any = clone(BASE);
        delete invalid[field];
        expect(validate(invalid), `missing ${field} should be rejected`).toBe(false);
      });
    });
  });
});

describe('FACTORY-CONTRACT — afi.scored-signal-evidence.v2', () => {
  describe('Schema Compilation & Supersession Pins', () => {
    it('should compile the v2 evidence contract without errors', () => {
      expect(() => compileEvidenceV2Schema()).not.toThrow();
    });

    it('v2 delta over v1 is EXACTLY {schema const, required composition} (copy-exactly drift guard)', () => {
      const v1 = loadJSON(V1_SCHEMA);
      const v2 = loadJSON(V2_SCHEMA);
      expect(v2.properties.schema.const).toBe('afi.scored-signal-evidence.v2');
      // Property set: v1's 13 + composition.
      expect(Object.keys(v2.properties).sort()).toEqual(
        [...Object.keys(v1.properties), 'composition'].sort()
      );
      // Required set: v1's 11 + composition.
      expect([...v2.required].sort()).toEqual([...v1.required, 'composition'].sort());
      // Every v1 property except the schema const is carried with IDENTICAL
      // structural keywords ($ref/type/enum/pattern/const) — copied exactly.
      const structural = (p: any) =>
        JSON.stringify({ $ref: p.$ref, type: p.type, enum: p.enum, pattern: p.pattern, const: p.const, minLength: p.minLength, minimum: p.minimum });
      Object.keys(v1.properties)
        .filter(k => k !== 'schema' && k !== 'uwrProfile')
        .forEach(k => {
          expect(structural(v2.properties[k]), `property ${k} must be structurally identical to v1`).toBe(
            structural(v1.properties[k])
          );
        });
      // The governed UWR stamp is reused VERBATIM (same shape, same RC-6 values).
      const stampSurface = (s: any) => ({
        required: [...s.required].sort(),
        props: Object.keys(s.properties).sort(),
        source: s.properties.source.enum,
        additionalProperties: s.additionalProperties,
      });
      expect(stampSurface(v2.properties.uwrProfile)).toEqual(stampSurface(v1.properties.uwrProfile));
      // The lifecycle/finality binder is identical.
      expect(v2.if).toEqual(v1.if);
      expect(v2.then).toEqual(v1.then);
      expect(v2.else).toEqual(v1.else);
    });

    it('composition is carried BY REUSE of afi.composition-ref.v1', () => {
      const v2 = loadJSON(V2_SCHEMA);
      expect(v2.properties.composition.$ref).toBe(
        'https://afi-protocol.org/schemas/composition-ref/v1/composition-ref.schema.json'
      );
      expect(Object.keys(v2['x-afiConstraints'])).toContain('compositionBinding');
    });

    it('v1 stays FROZEN as the prior version (const + status unchanged; no composition back-port)', () => {
      const v1 = loadJSON(V1_SCHEMA);
      expect(v1.properties.schema.const).toBe('afi.scored-signal-evidence.v1');
      expect(v1['x-afiStatus']).toBe('governed-contract');
      expect(Object.keys(v1.properties)).not.toContain('composition');
    });
  });

  describe('Canonical Example & Valid Vectors', () => {
    it('canonical v2 example should be admissible (schema-valid + continuity-clean)', () => {
      const validate = compileEvidenceV2Schema();
      const result = admit(validate, loadJSON(V2_EXAMPLE));
      if (!result.ok) console.error('v2 example failure:', validate.errors, result.violations);
      expect(result.ok).toBe(true);
    });

    it('every valid vector should be admissible (drift-guarded), carrying a full composition', () => {
      const files = readdirSync(join(rootDir, E_VALID)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual([
        'alternate-analyst-profile.json',
        'epoch-eligible-superseded.json',
        'minimal-scored.json',
        'qualified-mid-lifecycle.json',
      ]);
      const validate = compileEvidenceV2Schema();
      files.forEach(f => {
        const record = loadJSON(`${E_VALID}/${f}`);
        const result = admit(validate, record);
        if (!result.ok) console.error(`${f} failure:`, validate.errors, result.violations);
        expect(result.ok, `${f} should be admissible`).toBe(true);
        expect(record.schema, `${f} schema const`).toBe('afi.scored-signal-evidence.v2');
        expect(record.composition?.schema, `${f} composition`).toBe('afi.composition-ref.v1');
      });
    });
  });

  describe('Invalid Vectors (the required negative surface)', () => {
    const EXPECTED: Record<string, { schemaValid: boolean; continuityOk: boolean }> = {
      'missing-composition.json': { schemaValid: false, continuityOk: true },
      'v1-schema-const-with-composition.json': { schemaValid: false, continuityOk: true },
      'composition-bad-hash.json': { schemaValid: false, continuityOk: true },
      'composition-missing-hash.json': { schemaValid: false, continuityOk: true },
      'extra-top-level-property.json': { schemaValid: false, continuityOk: true },
      'composition-extra-property.json': { schemaValid: false, continuityOk: true },
    };

    it('invalid vector set should be exactly the authorized files (drift guard)', () => {
      const files = readdirSync(join(rootDir, E_INVALID)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(Object.keys(EXPECTED).sort());
    });

    it('every invalid vector should be inadmissible, at the expected layer', () => {
      const validate = compileEvidenceV2Schema();
      Object.entries(EXPECTED).forEach(([file, expected]) => {
        const result = admit(validate, loadJSON(`${E_INVALID}/${file}`));
        expect(result.ok, `${file} must NOT be admissible`).toBe(false);
        expect(result.schemaValid, `${file} schema layer`).toBe(expected.schemaValid);
        expect(result.continuityOk, `${file} continuity layer`).toBe(expected.continuityOk);
      });
    });
  });

  describe('Structural Negatives (clone-and-mutate the canonical v2 example)', () => {
    const BASE = loadJSON(V2_EXAMPLE);

    it('should reject a missing required field — including composition', () => {
      const validate = compileEvidenceV2Schema();
      loadJSON(V2_SCHEMA).required.forEach((field: string) => {
        const invalid: any = clone(BASE);
        delete invalid[field];
        expect(validate(invalid), `missing ${field} should be rejected`).toBe(false);
      });
    });

    it('should reject the v1 schema const on a v2 record (no dual-write shape)', () => {
      const validate = compileEvidenceV2Schema();
      const invalid: any = clone(BASE);
      invalid.schema = 'afi.scored-signal-evidence.v1';
      expect(validate(invalid)).toBe(false);
    });

    it('should reject a composition whose hashes are malformed', () => {
      const validate = compileEvidenceV2Schema();
      ['manifestHash', 'analystConfigHash', 'pluginSetHash', 'executionSummaryHash', 'enrichmentHash'].forEach(field => {
        const invalid: any = clone(BASE);
        invalid.composition[field].value = 'DEADBEEF';
        expect(validate(invalid), `composition.${field} bad digest must be rejected`).toBe(false);
      });
    });

    it('should keep the v1 finality binder intact on v2 (FINALIZED requires finalized:true)', () => {
      const validate = compileEvidenceV2Schema();
      const invalid: any = clone(BASE); // BASE is FINALIZED
      invalid.finalized = false;
      expect(validate(invalid)).toBe(false);
    });

    it('should keep the v1 continuity layer intact on v2 (drift caught by the continuity layer)', () => {
      const validate = compileEvidenceV2Schema();
      const drifted: any = clone(BASE);
      drifted.scoredSignal.signalId = 'sig-DIFFERENT';
      const result = admit(validate, drifted);
      expect(result.schemaValid, 'drift is schema-valid in isolation').toBe(true);
      expect(result.continuityOk, 'drift must be caught by the continuity layer').toBe(false);
    });
  });
});
