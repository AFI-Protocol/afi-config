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
 * FACTORY-CONTRACT / EV3-CONTRACT — afi.composition-ref.v1 + the composition
 * binding on afi.scored-signal-evidence.v3.
 *
 * Covers the composition provenance stamp (its canonical example and the
 * vectors under examples/composition-ref/v1/vectors/) and the v3 evidence
 * record's carried-forward-unchanged composition binding. Authorized by
 * afi-governance/decisions/factory-configurable-pipelines-v1 (the composition
 * family) and afi-governance/decisions/evidence-v3-provider-provenance-v0.1
 * (EV3-GOV D-EV3-1: the composition reference rides into v3 verbatim).
 *
 * The full v3 record surface (proofs, record hashes, vectors) is covered by
 * tests/scored-signal-evidence-schema-validation.test.ts; this suite pins the
 * composition-specific layer.
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
  `${PROVENANCE_DIR}/scored-signal.schema.json`,
  `${PROVENANCE_DIR}/provenance-record.schema.json`,
  'schemas/composition-ref/v1/composition-ref.schema.json',
  'schemas/aiml-invocation-proof/v1/aiml-invocation-proof.schema.json',
  'schemas/provider-invocation-proof/v1/provider-invocation-proof.schema.json',
];

const COMPOSITION_SCHEMA = 'schemas/composition-ref/v1/composition-ref.schema.json';
const COMPOSITION_EXAMPLE = 'examples/composition-ref/v1/composition-ref.example.json';
const C_VALID = 'examples/composition-ref/v1/vectors/valid';
const C_INVALID = 'examples/composition-ref/v1/vectors/invalid';

const V3_SCHEMA = 'schemas/scored-signal-evidence/v3/scored-signal-evidence.schema.json';
const V3_EXAMPLE = 'examples/scored-signal-evidence/v3/scored-signal-evidence.example.json';

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

function compileEvidenceV3Schema() {
  const ajv = createAjv();
  DEP_SCHEMAS.forEach((dep) => ajv.addSchema(loadJSON(dep)));
  return ajv.compile(loadJSON(V3_SCHEMA));
}

// The governed identifier-continuity layer, carried forward UNCHANGED
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
      COMPOSITION_HASH_FIELDS.forEach((field) => {
        expect(schema.properties[field].$ref, `${field} $ref`).toBe(
          'https://afi-protocol.org/schemas/provenance/v1/canonical-hash.schema.json',
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
      const config = loadJSON(
        'examples/analyst-strategy-config/v1/analyst-strategy-config.example.json',
      );
      expect(example.pipelineId).toBe(config.pipelineRef.pipelineId);
      expect(example.pipelineVersion).toBe(config.pipelineRef.pipelineVersion);
      expect(example.manifestHash.value).toBe(config.pipelineRef.manifestHash.value);
      expect(example.scorerPluginId).toBe(config.scorerRef.pluginId);
      expect(example.scorerPluginVersion).toBe(config.scorerRef.pluginVersion);
    });

    it('every valid vector should validate (drift-guarded)', () => {
      const files = readdirSync(join(rootDir, C_VALID))
        .filter((f) => f.endsWith('.json'))
        .sort();
      expect(files).toEqual(['alternate-pipeline.json', 'complete.json']);
      const validate = compileCompositionSchema();
      files.forEach((f) => {
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
      const files = readdirSync(join(rootDir, C_INVALID))
        .filter((f) => f.endsWith('.json'))
        .sort();
      expect(files).toEqual(EXPECTED_FILES);
      const validate = compileCompositionSchema();
      EXPECTED_FILES.forEach((file) => {
        expect(validate(loadJSON(`${C_INVALID}/${file}`)), `${file} must be rejected`).toBe(false);
      });
    });

    it('should reject a record missing ANY hash field (all-or-nothing, clone-and-mutate)', () => {
      const validate = compileCompositionSchema();
      const BASE = loadJSON(COMPOSITION_EXAMPLE);
      COMPOSITION_REQUIRED.forEach((field) => {
        const invalid: any = clone(BASE);
        delete invalid[field];
        expect(validate(invalid), `missing ${field} should be rejected`).toBe(false);
      });
    });
  });
});

describe('EV3-CONTRACT — the composition binding on afi.scored-signal-evidence.v3', () => {
  describe('Carried forward unchanged (EV3-GOV D-EV3-1)', () => {
    it('should compile the v3 evidence contract without errors', () => {
      expect(() => compileEvidenceV3Schema()).not.toThrow();
    });

    it('composition is carried BY REUSE of afi.composition-ref.v1, REQUIRED, with the binding constraint', () => {
      const v3 = loadJSON(V3_SCHEMA);
      expect(v3.properties.composition.$ref).toBe(
        'https://afi-protocol.org/schemas/composition-ref/v1/composition-ref.schema.json',
      );
      expect(v3.required).toContain('composition');
      expect(Object.keys(v3['x-afiConstraints'])).toContain('compositionBinding');
    });

    it('canonical v3 example should be admissible (schema-valid + continuity-clean)', () => {
      const validate = compileEvidenceV3Schema();
      const result = admit(validate, loadJSON(V3_EXAMPLE));
      if (!result.ok) console.error('v3 example failure:', validate.errors, result.violations);
      expect(result.ok).toBe(true);
    });
  });

  describe('Structural Negatives (clone-and-mutate the canonical v3 example)', () => {
    const BASE = loadJSON(V3_EXAMPLE);

    it('should reject a missing composition (fail closed; no partially-pinned record)', () => {
      const validate = compileEvidenceV3Schema();
      const invalid: any = clone(BASE);
      delete invalid.composition;
      expect(validate(invalid)).toBe(false);
    });

    it('should reject a composition whose hashes are malformed', () => {
      const validate = compileEvidenceV3Schema();
      COMPOSITION_HASH_FIELDS.forEach((field) => {
        const invalid: any = clone(BASE);
        invalid.composition[field].value = 'DEADBEEF';
        expect(validate(invalid), `composition.${field} bad digest must be rejected`).toBe(false);
      });
    });

    it('should reject a composition missing ANY member (all-or-nothing rides into v3)', () => {
      const validate = compileEvidenceV3Schema();
      COMPOSITION_REQUIRED.forEach((field) => {
        const invalid: any = clone(BASE);
        delete invalid.composition[field];
        expect(validate(invalid), `composition missing ${field} must be rejected`).toBe(false);
      });
    });

    it('should keep the finality binder intact (FINALIZED requires finalized:true)', () => {
      const validate = compileEvidenceV3Schema();
      const invalid: any = clone(BASE); // BASE is FINALIZED
      invalid.finalized = false;
      expect(validate(invalid)).toBe(false);
    });

    it('should keep the continuity layer intact (drift caught by the continuity layer)', () => {
      const validate = compileEvidenceV3Schema();
      const drifted: any = clone(BASE);
      drifted.scoredSignal.signalId = 'sig-DIFFERENT';
      const result = admit(validate, drifted);
      expect(result.schemaValid, 'drift is schema-valid in isolation').toBe(true);
      expect(result.continuityOk, 'drift must be caught by the continuity layer').toBe(false);
    });
  });
});
