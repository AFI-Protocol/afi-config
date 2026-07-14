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
 * MONGO-CONTRACT (Slot 1 of AFI-GOV-PERSISTENCE-IMPL-v0.1) — canonical
 * scored-signal evidence contract validation.
 *
 * Covers the governed schema schemas/scored-signal-evidence/v1/, its canonical
 * example, and the positive/negative vectors under
 * examples/scored-signal-evidence/v1/vectors/. Authorized by
 * afi-governance/decisions/persistence-impl-v0.1.md (MONGO-IMPL) Slot 1, which
 * consumes OBJ-GOV / LIFE-GOV / MONGO-GOV exactly.
 *
 * BOUNDARY: schema/contract only. Nothing here stands up a store, an index, or
 * an API. Store-layer + cross-object constraints that JSON Schema draft-07
 * cannot enforce (signalId uniqueness, identifier continuity) are governed
 * contract constraints, checked here in code, per the schema's x-afiConstraints.
 */

/**
 * Fresh strict AJV instance. Mirrors tests/schema-validation.test.ts, plus the
 * x-afiConstraints keyword this contract uses to carry governed store-layer
 * constraints JSON Schema cannot enforce.
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

/** Deep-clone a fixture so mutations never leak between tests. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const SCHEMA_DIR = 'schemas/scored-signal-evidence/v1';
const EXAMPLE_DIR = 'examples/scored-signal-evidence/v1';
const VALID_DIR = `${EXAMPLE_DIR}/vectors/valid`;
const INVALID_DIR = `${EXAMPLE_DIR}/vectors/invalid`;

const EVIDENCE_SCHEMA = `${SCHEMA_DIR}/scored-signal-evidence.schema.json`;
const CANONICAL_EXAMPLE = `${EXAMPLE_DIR}/scored-signal-evidence.example.json`;

const PROVENANCE_DIR = 'schemas/provenance/v1';
/** District-2 governed shapes this contract reuses via $ref (dependency closure). */
const DEP_SCHEMAS = [
  `${PROVENANCE_DIR}/canonical-hash.schema.json`,
  `${PROVENANCE_DIR}/evidence-ref.schema.json`,
  `${PROVENANCE_DIR}/source-disclosure-profile.schema.json`,
  `${PROVENANCE_DIR}/enrichment-provenance.schema.json`,
  `${PROVENANCE_DIR}/scored-signal.schema.json`,
  `${PROVENANCE_DIR}/provenance-record.schema.json`,
];

/** Compile the evidence contract, preloading the reused District-2 shapes. */
function compileEvidenceSchema() {
  const ajv = createAjv();
  DEP_SCHEMAS.forEach(depFile => ajv.addSchema(loadJSON(depFile)));
  return ajv.compile(loadJSON(EVIDENCE_SCHEMA));
}

// ---------------------------------------------------------------------------
// Governed contract constraints that JSON Schema draft-07 cannot express.
// These realize the schema's x-afiConstraints.identifierContinuity clause
// (OBJ-GOV D-OBJ-1 / D-OBJ-3 / D-OBJ-6, LIFE-GOV D-LIFE-5).
// ---------------------------------------------------------------------------

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

/** Full governed admission = schema-valid AND identifier-continuity-clean. */
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

// LIFE-GOV D-LIFE-1 canonical states, restricted to the PERSISTABLE (post-scoring)
// subset per LIFE-GOV D-LIFE-6 (a record only exists after VALIDATED + SCORED).
const PERSISTABLE_STATES = [
  'SCORED',
  'CERTIFIED',
  'DECERTIFIED',
  'QUALIFIED',
  'UNQUALIFIED',
  'CHALLENGE_OPEN',
  'CONTESTED',
  'FINALIZED',
  'FINAL_REJECTED',
  'EPOCH_ELIGIBLE',
];
const FINALIZED_STATES = ['FINALIZED', 'FINAL_REJECTED', 'EPOCH_ELIGIBLE'];
// States that must NOT be persistable here (pre-scoring / at-validation).
const PRE_SCORING_STATES = ['INGESTED', 'VALIDATED', 'SCHEMA_REJECTED'];
// Demoted tier-4 shipped vocabularies (LIFE-GOV §1) — never the canonical machine.
const LEGACY_VOCAB_STATES = [
  'pending',
  'qualified',
  'minted',
  'rejected_final',
  'RAW',
  'ENRICHED',
  'ANALYZED',
  'MINTED',
  'REPLAYED',
  'decay_pass',
  'challenge_open',
  'voting_complete',
];

const EXPECTED_PROPERTY_KEYS = [
  'schema',
  'signalId',
  'analystId',
  'strategyId',
  'strategyVersion',
  'canonicalizationVersion',
  'lifecycleState',
  'finalized',
  'scoredSignal',
  'provenanceRecord',
  'recordVersion',
  'supersedesRecordHash',
];
const EXPECTED_REQUIRED = [
  'schema',
  'signalId',
  'analystId',
  'strategyId',
  'canonicalizationVersion',
  'lifecycleState',
  'finalized',
  'scoredSignal',
  'provenanceRecord',
];

describe('MONGO-CONTRACT — afi.scored-signal-evidence.v1', () => {
  describe('Schema Compilation & Governed Metadata', () => {
    it('should compile the evidence contract without errors', () => {
      expect(() => compileEvidenceSchema()).not.toThrow();
      const validate = compileEvidenceSchema();
      expect(typeof validate).toBe('function');
    });

    it('should carry the governed-contract status marker (not draft-non-implementation)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema['x-afiStatus']).toBe('governed-contract');
    });

    it('should have the required JSON Schema surface fields ($schema, $id, title, type)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.$schema).toContain('json-schema.org');
      expect(typeof schema.$id).toBe('string');
      expect(schema.$id).toContain('scored-signal-evidence/v1');
      expect(typeof schema.title).toBe('string');
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
    });

    it('should pin the schema-id const (OBJ-GOV D-OBJ-6 axis a)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.properties.schema.const).toBe('afi.scored-signal-evidence.v1');
    });

    it('should expose exactly the governed property set and required fields', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(Object.keys(schema.properties).sort()).toEqual([...EXPECTED_PROPERTY_KEYS].sort());
      expect([...schema.required].sort()).toEqual([...EXPECTED_REQUIRED].sort());
    });

    it('should reuse the governed District-2 shapes by $ref (not redefine them)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.properties.scoredSignal.$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/scored-signal.schema.json'
      );
      expect(schema.properties.provenanceRecord.$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/provenance-record.schema.json'
      );
      expect(schema.properties.supersedesRecordHash.$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/canonical-hash.schema.json'
      );
    });

    it('should restrict lifecycleState to the persistable canonical LIFE-GOV states', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.properties.lifecycleState.enum).toEqual(PERSISTABLE_STATES);
    });

    it('should carry the two-axis version fields distinct from the schema-id (OBJ-GOV D-OBJ-6)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.properties.canonicalizationVersion.pattern).toBe('^afi\\.hash\\.v[0-9]+$');
      expect(schema.required).toContain('canonicalizationVersion');
    });

    it('should record the store-layer constraints JSON Schema cannot enforce (x-afiConstraints)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      const keys = Object.keys(schema['x-afiConstraints'] ?? {});
      [
        'storeUniqueness',
        'appendOnceImmutableAfterFinalized',
        'singleWriterBoundary',
        'operationalVsCanonical',
        'identifierContinuity',
        'replaySufficiency',
      ].forEach(k => expect(keys, `x-afiConstraints.${k} must be present`).toContain(k));
    });

    it('should cite the governing decisions it consumes (x-afiDoctrineRefs)', () => {
      const refs = JSON.stringify(loadJSON(EVIDENCE_SCHEMA)['x-afiDoctrineRefs']);
      ['MONGO-IMPL', 'D-MONGO-1', 'D-MONGO-5', 'D-MONGO-6', 'D-OBJ-1', 'D-OBJ-5', 'D-OBJ-6', 'D-LIFE-5', 'D-LIFE-6'].forEach(
        clause => expect(refs, `should cite ${clause}`).toContain(clause)
      );
    });
  });

  describe('Canonical Example & Valid Vectors', () => {
    it('canonical example should be admissible (schema-valid + continuity-clean)', () => {
      const validate = compileEvidenceSchema();
      const result = admit(validate, loadJSON(CANONICAL_EXAMPLE));
      if (!result.ok) console.error('example failure:', validate.errors, result.violations);
      expect(result.ok).toBe(true);
    });

    it('every valid vector should be admissible', () => {
      const validate = compileEvidenceSchema();
      readdirSync(join(rootDir, VALID_DIR))
        .filter(f => f.endsWith('.json'))
        .forEach(f => {
          const result = admit(validate, loadJSON(`${VALID_DIR}/${f}`));
          if (!result.ok) console.error(`${f} failure:`, validate.errors, result.violations);
          expect(result.ok, `${f} should be admissible`).toBe(true);
        });
    });

    it('valid vector set should be exactly the authorized files (drift guard)', () => {
      const files = readdirSync(join(rootDir, VALID_DIR)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual([
        'epoch-eligible-superseded.json',
        'minimal-scored.json',
        'qualified-mid-lifecycle.json',
      ]);
    });

    it('finalized valid vectors should carry finalized:true iff lifecycleState is a finalized state', () => {
      readdirSync(join(rootDir, VALID_DIR))
        .filter(f => f.endsWith('.json'))
        .forEach(f => {
          const r = loadJSON(`${VALID_DIR}/${f}`);
          expect(r.finalized, `${f}`).toBe(FINALIZED_STATES.includes(r.lifecycleState));
        });
    });
  });

  describe('Invalid Vectors (rejected by schema and/or governed continuity)', () => {
    // Each vector is expected NOT admissible; the map pins WHICH layer catches it.
    const EXPECTED: Record<string, { schemaValid: boolean; continuityOk: boolean }> = {
      'signalid-discontinuity.json': { schemaValid: true, continuityOk: false },
      'provenance-signalid-discontinuity.json': { schemaValid: true, continuityOk: false },
      'strategy-triple-mismatch.json': { schemaValid: true, continuityOk: false },
      'canonicalization-version-mismatch.json': { schemaValid: true, continuityOk: false },
      'missing-provenance-record.json': { schemaValid: false, continuityOk: false },
      'pre-scoring-lifecycle-state.json': { schemaValid: false, continuityOk: true },
      'legacy-vocabulary-state.json': { schemaValid: false, continuityOk: true },
      'finality-marker-mismatch.json': { schemaValid: false, continuityOk: true },
      'heavy-carrier-substitution.json': { schemaValid: false, continuityOk: true },
      'vaulted-lifecycle-brain.json': { schemaValid: false, continuityOk: true },
      'volatile-timestamp.json': { schemaValid: false, continuityOk: true },
    };

    it('invalid vector set should be exactly the authorized files (drift guard)', () => {
      const files = readdirSync(join(rootDir, INVALID_DIR)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(Object.keys(EXPECTED).sort());
    });

    it('every invalid vector should be inadmissible, at the expected layer', () => {
      const validate = compileEvidenceSchema();
      Object.entries(EXPECTED).forEach(([file, expected]) => {
        const result = admit(validate, loadJSON(`${INVALID_DIR}/${file}`));
        expect(result.ok, `${file} must NOT be admissible`).toBe(false);
        expect(result.schemaValid, `${file} schema layer`).toBe(expected.schemaValid);
        expect(result.continuityOk, `${file} continuity layer`).toBe(expected.continuityOk);
      });
    });
  });

  describe('Structural Negatives (clone-and-mutate the canonical example)', () => {
    const BASE = loadJSON(CANONICAL_EXAMPLE);

    it('should reject a missing required field', () => {
      const validate = compileEvidenceSchema();
      EXPECTED_REQUIRED.forEach(field => {
        const invalid: any = clone(BASE);
        delete invalid[field];
        expect(validate(invalid), `missing ${field} should be rejected`).toBe(false);
      });
    });

    it('should reject a wrong schema-id const', () => {
      const validate = compileEvidenceSchema();
      const invalid: any = clone(BASE);
      invalid.schema = 'afi.scored-signal-evidence.v2';
      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/schema')).toBe(true);
    });

    it('should reject a malformed canonicalizationVersion', () => {
      const validate = compileEvidenceSchema();
      const invalid: any = clone(BASE);
      invalid.canonicalizationVersion = 'v1';
      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/canonicalizationVersion')).toBe(true);
    });

    it('should reject pre-scoring lifecycle states (not persistable per D-LIFE-6)', () => {
      const validate = compileEvidenceSchema();
      PRE_SCORING_STATES.forEach(state => {
        const invalid: any = clone(BASE);
        invalid.lifecycleState = state;
        invalid.finalized = false;
        expect(validate(invalid), `${state} should be rejected`).toBe(false);
        expect(validate.errors!.some(e => e.instancePath === '/lifecycleState')).toBe(true);
      });
    });

    it('should reject demoted tier-4 vocabulary states (consumes the canonical machine, not legacy enums)', () => {
      const validate = compileEvidenceSchema();
      LEGACY_VOCAB_STATES.forEach(state => {
        const invalid: any = clone(BASE);
        invalid.lifecycleState = state;
        expect(validate(invalid), `legacy state '${state}' should be rejected`).toBe(false);
      });
    });

    it('should accept every persistable canonical state with a consistent finality marker', () => {
      const validate = compileEvidenceSchema();
      PERSISTABLE_STATES.forEach(state => {
        const record: any = clone(BASE);
        record.lifecycleState = state;
        record.finalized = FINALIZED_STATES.includes(state);
        expect(admit(validate, record).ok, `${state} should be admissible`).toBe(true);
      });
    });

    it('should reject a finality marker inconsistent with lifecycleState (if/then/else binding)', () => {
      const validate = compileEvidenceSchema();

      const finalizedButFalse: any = clone(BASE); // BASE is FINALIZED
      finalizedButFalse.finalized = false;
      expect(validate(finalizedButFalse), 'FINALIZED + finalized:false').toBe(false);

      const scoredButTrue: any = clone(BASE);
      scoredButTrue.lifecycleState = 'SCORED';
      scoredButTrue.finalized = true;
      expect(validate(scoredButTrue), 'SCORED + finalized:true').toBe(false);
    });

    it('should reject a heavy ReactorScoredSignalDocument substituted for the thin projection', () => {
      const validate = compileEvidenceSchema();
      ['rawUss', 'lenses', '_priceFeedMetadata', 'rawPayload'].forEach(heavyField => {
        const invalid: any = clone(BASE);
        invalid.scoredSignal[heavyField] = heavyField === 'lenses' ? [{ lens: 'x' }] : { any: 1 };
        expect(validate(invalid), `scoredSignal.${heavyField} should be rejected`).toBe(false);
      });
    });

    it('should reject VaultedSignalRecord lifecycle-brain fields at top level', () => {
      const validate = compileEvidenceSchema();
      ['validator', 'minted', 'replayed', 'training', 'proprietary'].forEach(brainField => {
        const invalid: any = clone(BASE);
        invalid[brainField] = { any: 1 };
        expect(validate(invalid), `top-level ${brainField} should be rejected`).toBe(false);
      });
    });

    it('should reject volatile processing/storage timestamps at top level', () => {
      const validate = compileEvidenceSchema();
      ['createdAt', 'storedAt', 'updatedAt', 'scoredAt', 'processedAt', 'ingestedAt'].forEach(ts => {
        const invalid: any = clone(BASE);
        invalid[ts] = '2026-01-15T12:00:07Z';
        expect(validate(invalid), `top-level ${ts} should be rejected`).toBe(false);
      });
    });

    it('should reject a non-positive recordVersion', () => {
      const validate = compileEvidenceSchema();
      const invalid: any = clone(BASE);
      invalid.recordVersion = 0;
      expect(validate(invalid)).toBe(false);
    });
  });

  describe('Scope Fence (schema/contract only — no storage/API surface)', () => {
    it('should not define any storage-engine, index, collection, or API property', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      const forbiddenProps = [
        'collection',
        'collectionName',
        'index',
        'indexes',
        'db',
        'database',
        'connectionString',
        'endpoint',
        'url',
        'route',
        'httpStatus',
        'storageEngine',
        'topology',
        'shardKey',
        '_id',
      ];
      forbiddenProps.forEach(p =>
        expect(Object.keys(schema.properties), `must not define '${p}'`).not.toContain(p)
      );
    });

    it('should not reference any external ($ref) shape outside the governed provenance family', () => {
      const refs = JSON.stringify(loadJSON(EVIDENCE_SCHEMA)).match(/"\$ref":\s*"([^"]+)"/g) ?? [];
      refs.forEach(ref =>
        expect(ref, `unexpected $ref ${ref}`).toContain('/schemas/provenance/v1/')
      );
    });
  });
});
