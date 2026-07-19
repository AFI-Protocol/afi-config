import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * EV3-CONTRACT (AFI-GOV-EVIDENCE-V3-PROVIDER-PROVENANCE-v0.1) — canonical
 * scored-signal evidence contract validation, v3.
 *
 * Covers the governed schema schemas/scored-signal-evidence/v3/ (the SOLE
 * current canonical evidence contract, EV3-GOV D-EV3-1), the per-lane
 * provider invocation proof (schemas/provider-invocation-proof/v1/, D-EV3-2),
 * the nested Tiny Brains invocation proof (schemas/aiml-invocation-proof/v1/,
 * D-EV3-3), the canonical example, and the positive/negative vectors under
 * examples/scored-signal-evidence/v3/vectors/.
 *
 * BOUNDARY: schema/contract only. Nothing here stands up a store, an index, or
 * an API. Store-layer + cross-object constraints that JSON Schema draft-07
 * cannot enforce (signalId uniqueness, identifier continuity, the D-EV3-5(3)
 * builder cross-checks) are governed contract constraints; the two that ARE
 * checkable from committed data — identifier continuity and the D-EV3-7
 * recordHash/replayHash recomputation — are checked here in code, per the
 * schema's x-afiConstraints. v3 admission is therefore THREE layers:
 * schema-valid AND continuity-clean AND record/replay hashes recompute.
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

const SCHEMA_DIR = 'schemas/scored-signal-evidence/v3';
const EXAMPLE_DIR = 'examples/scored-signal-evidence/v3';
const VALID_DIR = `${EXAMPLE_DIR}/vectors/valid`;
const INVALID_DIR = `${EXAMPLE_DIR}/vectors/invalid`;

const EVIDENCE_SCHEMA = `${SCHEMA_DIR}/scored-signal-evidence.schema.json`;
const CANONICAL_EXAMPLE = `${EXAMPLE_DIR}/scored-signal-evidence.example.json`;

const PROOF_SCHEMA = 'schemas/provider-invocation-proof/v1/provider-invocation-proof.schema.json';
const AIML_PROOF_SCHEMA = 'schemas/aiml-invocation-proof/v1/aiml-invocation-proof.schema.json';

const PROVENANCE_DIR = 'schemas/provenance/v1';
/** Governed shapes this contract reuses via $ref (dependency closure). */
const DEP_SCHEMAS = [
  `${PROVENANCE_DIR}/canonical-hash.schema.json`,
  `${PROVENANCE_DIR}/evidence-ref.schema.json`,
  `${PROVENANCE_DIR}/source-disclosure-profile.schema.json`,
  `${PROVENANCE_DIR}/scored-signal.schema.json`,
  `${PROVENANCE_DIR}/provenance-record.schema.json`,
  'schemas/composition-ref/v1/composition-ref.schema.json',
  AIML_PROOF_SCHEMA,
  PROOF_SCHEMA,
];

/** Compile the v3 evidence contract, preloading the reused governed shapes. */
function compileEvidenceSchema() {
  const ajv = createAjv();
  DEP_SCHEMAS.forEach(depFile => ajv.addSchema(loadJSON(depFile)));
  return ajv.compile(loadJSON(EVIDENCE_SCHEMA));
}

/** Compile the per-lane proof contract standalone. */
function compileProofSchema() {
  const ajv = createAjv();
  ajv.addSchema(loadJSON(`${PROVENANCE_DIR}/canonical-hash.schema.json`));
  ajv.addSchema(loadJSON(AIML_PROOF_SCHEMA));
  return ajv.compile(loadJSON(PROOF_SCHEMA));
}

/** Compile the nested aiMl proof contract standalone. */
function compileAimlProofSchema() {
  const ajv = createAjv();
  return ajv.compile(loadJSON(AIML_PROOF_SCHEMA));
}

// ---------------------------------------------------------------------------
// canonical-json-hashing.v1 reference implementation (spec §2) — the same
// implementation tests/canonical-hashing-kat.test.ts proves against the KATs.
// Used here to realize the D-EV3-7 recomputation-verified admission on the
// committed example + valid vectors (x-afiConstraints.recordHashLaw /
// replayHashLaw).
// ---------------------------------------------------------------------------
function canonicalize(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  return (
    '{' +
    Object.keys(v as object)
      .sort()
      .map(k => JSON.stringify(k) + ':' + canonicalize((v as any)[k]))
      .join(',') +
    '}'
  );
}
function canonicalSha256(obj: any, excluded: string[] = []): string {
  const stripped: any = {};
  Object.keys(obj).forEach(k => {
    if (!excluded.includes(k)) stripped[k] = obj[k];
  });
  return createHash('sha256').update(Buffer.from(canonicalize(stripped), 'utf-8')).digest('hex');
}
const RECORD_HASH_EXCLUDED = ['recordHash', 'replayHash'];
const REPLAY_HASH_EXCLUDED = [
  'recordHash',
  'replayHash',
  'lifecycleState',
  'finalized',
  'recordVersion',
  'supersedesRecordHash',
];
function hashViolations(r: any): string[] {
  const v: string[] = [];
  if (r?.recordHash?.value !== canonicalSha256(r, RECORD_HASH_EXCLUDED)) {
    v.push('recordHash does not recompute (D-EV3-7)');
  }
  if (r?.replayHash?.value !== canonicalSha256(r, REPLAY_HASH_EXCLUDED)) {
    v.push('replayHash does not recompute (D-EV3-7)');
  }
  return v;
}

// ---------------------------------------------------------------------------
// Governed contract constraints that JSON Schema draft-07 cannot express.
// These realize the schema's x-afiConstraints.identifierContinuity clause
// (OBJ-GOV D-OBJ-1 / D-OBJ-3 / D-OBJ-6, LIFE-GOV D-LIFE-5) — carried forward
// UNCHANGED from the prior contract versions.
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

/** Schema + continuity layers (mutation tests use this two-layer admit). */
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

// LIFE-GOV D-LIFE-1 canonical states, restricted to the PERSISTABLE subset.
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
const PRE_SCORING_STATES = ['INGESTED', 'VALIDATED', 'SCHEMA_REJECTED'];

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
  'uwrProfile',
  'composition',
  'providerInvocations',
  'recordHash',
  'replayHash',
  'recordVersion',
  'supersedesRecordHash',
];
const EXPECTED_REQUIRED = [
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
  'uwrProfile',
  'composition',
  'providerInvocations',
  'recordHash',
  'replayHash',
];

// D-EV3-2: ascending case-sensitive lexicographic category order, positional.
const GOVERNED_PROOF_ORDER = ['aiMl', 'news', 'pattern', 'sentiment', 'technical'];
const GOVERNED_RESULT_SCHEMAS = [
  'afi.enrichment.technical.v1',
  'afi.enrichment.pattern.v1',
  'afi.enrichment.sentiment.v1',
  'afi.enrichment.news.v1',
  'afi.enrichment.aiml.v1',
];
const CATEGORY_TO_RESULT_SCHEMA: Record<string, string> = {
  technical: 'afi.enrichment.technical.v1',
  pattern: 'afi.enrichment.pattern.v1',
  sentiment: 'afi.enrichment.sentiment.v1',
  news: 'afi.enrichment.news.v1',
  aiMl: 'afi.enrichment.aiml.v1',
};

// The retired prior-version schema-id consts, built by concatenation so the
// EV3-GOV D-EV3-8 residue grep over this tree stays empty. Rejecting them is a
// NEGATIVE-SPACE guard (assertion of absence), expressly carved out by
// D-EV3-8(3) — the tokens themselves never appear literally in the tree.
const SUPERSEDED_SCHEMA_CONSTS = ['1', '2'].map(n => 'afi.scored-signal-evidence.v' + n);

// The governed UWR profile stamp shape (PR-UWR-STAMP §7) + its RC-6 source
// discriminator values (PR-UWR-STAMP-SEMANTICS), reused VERBATIM.
const EXPECTED_STAMP_KEYS = ['profileId', 'status', 'decisionRef', 'source'];
const GOVERNED_STAMP_SOURCES = ['builtin-value-identity', 'registry-consumed'];
const STRATEGY_TRIPLE = ['analystId', 'strategyId', 'strategyVersion'];

// D-EV3-6 secret-name denylist (key-name negative space over committed data).
const SECRET_KEY_PATTERN =
  /^(apiKey|api_key|apikey|token|accessToken|secret|password|passphrase|authorization|privateKey|refreshToken|cookie|bearer|headerValue|headerName)$/i;
function collectKeys(value: any, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach(item => collectKeys(item, out));
  else if (value && typeof value === 'object') {
    Object.keys(value).forEach(k => {
      out.push(k);
      collectKeys(value[k], out);
    });
  }
  return out;
}

const ALL_COMMITTED_RECORDS = () => [
  CANONICAL_EXAMPLE,
  ...readdirSync(join(rootDir, VALID_DIR))
    .filter(f => f.endsWith('.json'))
    .map(f => `${VALID_DIR}/${f}`),
];

describe('EV3-CONTRACT — afi.scored-signal-evidence.v3', () => {
  describe('Schema Compilation & Governed Metadata', () => {
    it('should compile the evidence contract without errors', () => {
      expect(() => compileEvidenceSchema()).not.toThrow();
      const validate = compileEvidenceSchema();
      expect(typeof validate).toBe('function');
    });

    it('should carry the governed-contract status marker on all three EV3 schemas', () => {
      [EVIDENCE_SCHEMA, PROOF_SCHEMA, AIML_PROOF_SCHEMA].forEach(f =>
        expect(loadJSON(f)['x-afiStatus'], f).toBe('governed-contract')
      );
    });

    it('should have the required JSON Schema surface fields ($schema, $id, title, type)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.$schema).toContain('json-schema.org');
      expect(typeof schema.$id).toBe('string');
      expect(schema.$id).toContain('scored-signal-evidence/v3');
      expect(typeof schema.title).toBe('string');
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
    });

    it('should pin the schema-id const (OBJ-GOV D-OBJ-6 axis a)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.properties.schema.const).toBe('afi.scored-signal-evidence.v3');
    });

    it('should expose exactly the governed property set and required fields (D-EV3-1: v2 core + exactly three additions)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(Object.keys(schema.properties).sort()).toEqual([...EXPECTED_PROPERTY_KEYS].sort());
      expect([...schema.required].sort()).toEqual([...EXPECTED_REQUIRED].sort());
    });

    it('should REQUIRE the complete canonical strategy identity triple incl. strategyVersion (OBJ-GOV D-OBJ-3)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      STRATEGY_TRIPLE.forEach(member =>
        expect(schema.required, `triple member '${member}' must be required`).toContain(member)
      );
      expect(schema.properties.strategyVersion.pattern).toBeUndefined();
      expect(schema.properties.strategyVersion.type).toBe('string');
    });

    it('should reuse the governed shapes by $ref (not redefine them)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.properties.scoredSignal.$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/scored-signal.schema.json'
      );
      expect(schema.properties.provenanceRecord.$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/provenance-record.schema.json'
      );
      expect(schema.properties.composition.$ref).toBe(
        'https://afi-protocol.org/schemas/composition-ref/v1/composition-ref.schema.json'
      );
      expect(schema.properties.supersedesRecordHash.$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/canonical-hash.schema.json'
      );
      expect(schema.properties.recordHash.allOf[0].$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/canonical-hash.schema.json'
      );
      expect(schema.properties.replayHash.allOf[0].$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/canonical-hash.schema.json'
      );
    });

    it('should restrict lifecycleState to the persistable canonical LIFE-GOV states', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.properties.lifecycleState.enum).toEqual(PERSISTABLE_STATES);
    });

    it('should record the governed constraints incl. the v3 hash and proof laws (x-afiConstraints)', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      const keys = Object.keys(schema['x-afiConstraints'] ?? {});
      [
        'storeUniqueness',
        'appendOnceImmutableAfterFinalized',
        'singleWriterBoundary',
        'operationalVsCanonical',
        'identifierContinuity',
        'replaySufficiency',
        'uwrProfileStamp',
        'compositionBinding',
        'providerInvocationProofs',
        'recordHashLaw',
        'replayHashLaw',
        'crossCheckLaws',
      ].forEach(k => expect(keys, `x-afiConstraints.${k} must be present`).toContain(k));
    });

    it('should cite EV3-GOV D-EV3-1..8 and the consumed decisions (x-afiDoctrineRefs)', () => {
      const refs = JSON.stringify(loadJSON(EVIDENCE_SCHEMA)['x-afiDoctrineRefs']);
      [
        'evidence-v3-provider-provenance-v0.1',
        'D-EV3-1',
        'D-EV3-2',
        'D-EV3-3',
        'D-EV3-4',
        'D-EV3-5',
        'D-EV3-6',
        'D-EV3-7',
        'D-EV3-8',
        'D-FCP-3',
        'D-MONGO-1',
        'D-MONGO-5',
        'D-MONGO-6',
        'D-OBJ-1',
        'D-OBJ-5',
        'D-OBJ-6',
        'D-LIFE-5',
        'D-LIFE-6',
        'PR-UWR-STAMP',
        'PR-UWR-STAMP-SEMANTICS',
        'RC-6',
      ].forEach(clause => expect(refs, `should cite ${clause}`).toContain(clause));
    });

    it('should pin the recordHash/replayHash domains and preimage exclusion sets (D-EV3-4(6))', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      expect(schema.properties.recordHash.allOf[1].properties.domainTag.const).toBe(
        'afi.d2.evidence-record'
      );
      expect(schema.properties.replayHash.allOf[1].properties.domainTag.const).toBe(
        'afi.d2.evidence-replay'
      );
      const constraints = schema['x-afiConstraints'];
      RECORD_HASH_EXCLUDED.forEach(f => expect(constraints.recordHashLaw).toContain(f));
      REPLAY_HASH_EXCLUDED.forEach(f => expect(constraints.replayHashLaw).toContain(f));
      expect(constraints.recordHashLaw).toContain('canonical-json-hashing.v1');
      expect(constraints.replayHashLaw).toContain('canonical-json-hashing.v1');
    });
  });

  describe('Provider Invocation Proof binder (D-EV3-2: exactly five, unique, ordered)', () => {
    const invocations = loadJSON(EVIDENCE_SCHEMA).properties.providerInvocations;

    it('is a closed positional five-tuple (count/order/uniqueness/aiMl position structural)', () => {
      expect(invocations.type).toBe('array');
      expect(invocations.minItems).toBe(5);
      expect(invocations.maxItems).toBe(5);
      expect(invocations.additionalItems).toBe(false);
      expect(Array.isArray(invocations.items)).toBe(true);
      expect(invocations.items).toHaveLength(5);
    });

    it('every position $refs the governed proof and pins its category const', () => {
      invocations.items.forEach((item: any, i: number) => {
        expect(item.allOf[0].$ref, `position ${i}`).toBe(
          'https://afi-protocol.org/schemas/provider-invocation-proof/v1/provider-invocation-proof.schema.json'
        );
        expect(item.allOf[1].properties.category.const, `position ${i}`).toBe(
          GOVERNED_PROOF_ORDER[i]
        );
        expect(item.allOf[1].required).toEqual(['category']);
      });
    });

    it('the pinned order IS ascending case-sensitive lexicographic (the D-EV3-2 law, self-checked)', () => {
      const pinned = invocations.items.map((item: any) => item.allOf[1].properties.category.const);
      expect(pinned).toEqual(GOVERNED_PROOF_ORDER);
      expect(pinned).toEqual([...pinned].sort());
    });
  });

  describe('Canonical Example & Valid Vectors (three-layer governed admission)', () => {
    it('canonical example should be admissible: schema-valid + continuity-clean + hashes recompute', () => {
      const validate = compileEvidenceSchema();
      const record = loadJSON(CANONICAL_EXAMPLE);
      const result = admit(validate, record);
      const hashProblems = hashViolations(record);
      if (!result.ok || hashProblems.length) {
        console.error('example failure:', validate.errors, result.violations, hashProblems);
      }
      expect(result.ok).toBe(true);
      expect(hashProblems).toEqual([]);
    });

    it('every valid vector should be admissible at all three layers (D-EV3-7 recomputation-verified)', () => {
      const validate = compileEvidenceSchema();
      readdirSync(join(rootDir, VALID_DIR))
        .filter(f => f.endsWith('.json'))
        .forEach(f => {
          const record = loadJSON(`${VALID_DIR}/${f}`);
          const result = admit(validate, record);
          const hashProblems = hashViolations(record);
          if (!result.ok || hashProblems.length) {
            console.error(`${f} failure:`, validate.errors, result.violations, hashProblems);
          }
          expect(result.ok, `${f} should be admissible`).toBe(true);
          expect(hashProblems, `${f} record/replay hashes must recompute`).toEqual([]);
        });
    });

    it('valid vector set should be exactly the authorized files (drift guard)', () => {
      const files = readdirSync(join(rootDir, VALID_DIR)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(['credential-bound-news-lane.json', 'minimal-scored.json']);
    });

    it('every committed record carries five proofs in the governed order with bound result schemas', () => {
      ALL_COMMITTED_RECORDS().forEach(rel => {
        const r = loadJSON(rel);
        expect(r.providerInvocations, `${rel} proof count`).toHaveLength(5);
        expect(
          r.providerInvocations.map((p: any) => p.category),
          `${rel} proof order`
        ).toEqual(GOVERNED_PROOF_ORDER);
        r.providerInvocations.forEach((p: any) => {
          expect(p.resultSchema, `${rel} ${p.category} resultSchema`).toBe(
            CATEGORY_TO_RESULT_SCHEMA[p.category]
          );
          expect(p.status, `${rel} ${p.category} status`).toBe('succeeded');
        });
        // aiMl carries the nested proof; no other lane does (D-EV3-3).
        r.providerInvocations.forEach((p: any, i: number) => {
          if (i === 0) expect(p.aimlInvocation, `${rel} aiMl nested proof`).toBeTruthy();
          else expect(p.aimlInvocation, `${rel} ${p.category} must not nest`).toBeUndefined();
        });
      });
    });

    it('the credential-bound vector exercises the governed newsdata CredentialRef identity facts', () => {
      const r = loadJSON(`${VALID_DIR}/credential-bound-news-lane.json`);
      const newsProof = r.providerInvocations[1];
      expect(newsProof.category).toBe('news');
      expect(newsProof.provider.providerId).toBe('afi-provider-news-http');
      expect(newsProof.providerInstance.providerInstanceId).toBe('afi-instance-byok-news-newsdata');
      expect(newsProof.credential).toEqual({
        mode: 'credentialRef',
        credentialKind: 'apiKeyHeader',
        credentialRef: 'credential-newsdata-reference',
        recordVersion: '1.0.0',
        status: 'active',
      });
      // The identity facts agree with the governed registry records.
      const credRecord = loadJSON('registries/credential-refs/credential-newsdata-reference--1.0.0.json');
      expect(newsProof.credential.credentialRef).toBe(credRecord.credentialRef);
      expect(newsProof.credential.credentialKind).toBe(credRecord.credentialKind);
      expect(newsProof.credential.status).toBe(credRecord.status);
      expect(credRecord.providerId).toBe(newsProof.provider.providerId);
    });

    it('every keyless proof declares the explicit keyless posture (D-EV3-6)', () => {
      ALL_COMMITTED_RECORDS().forEach(rel => {
        loadJSON(rel).providerInvocations.forEach((p: any) => {
          if (p.credential.mode === 'keyless') {
            expect(Object.keys(p.credential), `${rel} ${p.category}`).toEqual(['mode']);
          }
        });
      });
    });

    it('finalized valid records carry finalized:true iff lifecycleState is a finalized state', () => {
      ALL_COMMITTED_RECORDS().forEach(rel => {
        const r = loadJSON(rel);
        expect(r.finalized, rel).toBe(FINALIZED_STATES.includes(r.lifecycleState));
      });
    });
  });

  describe('Invalid Vectors (rejected by schema; every vector is continuity-clean)', () => {
    // Each vector is expected NOT admissible; every one is continuity-clean so
    // the SCHEMA layer is proven to be what rejects the defect.
    const EXPECTED: Record<string, { schemaValid: boolean; continuityOk: boolean }> = {
      'missing-category-proof.json': { schemaValid: false, continuityOk: true },
      'duplicate-category-proof.json': { schemaValid: false, continuityOk: true },
      'wrong-order-proofs.json': { schemaValid: false, continuityOk: true },
      'unknown-category-proof.json': { schemaValid: false, continuityOk: true },
      'proof-extra-property.json': { schemaValid: false, continuityOk: true },
      'extra-top-level-property.json': { schemaValid: false, continuityOk: true },
      'wrong-schema-const.json': { schemaValid: false, continuityOk: true },
      'missing-aiml-invocation.json': { schemaValid: false, continuityOk: true },
      'aiml-invocation-on-technical.json': { schemaValid: false, continuityOk: true },
      'price-source-on-news.json': { schemaValid: false, continuityOk: true },
      'malformed-hash-value.json': { schemaValid: false, continuityOk: true },
      'missing-record-hash.json': { schemaValid: false, continuityOk: true },
      'wrong-domain-tag-record-hash.json': { schemaValid: false, continuityOk: true },
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

    it('should reject a missing required field — including the three v3 additions', () => {
      const validate = compileEvidenceSchema();
      EXPECTED_REQUIRED.forEach(field => {
        const invalid: any = clone(BASE);
        delete invalid[field];
        expect(validate(invalid), `missing ${field} should be rejected`).toBe(false);
      });
    });

    it('should reject BOTH superseded prior-version schema consts (no dual-write shape, D-EV3-1)', () => {
      const validate = compileEvidenceSchema();
      SUPERSEDED_SCHEMA_CONSTS.forEach(superseded => {
        const invalid: any = clone(BASE);
        invalid.schema = superseded;
        expect(validate(invalid), `${superseded} must be rejected`).toBe(false);
        expect(validate.errors!.some(e => e.instancePath === '/schema')).toBe(true);
      });
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

    it('should reject volatile processing/storage timestamps at top level (D-EV3-4(7))', () => {
      const validate = compileEvidenceSchema();
      ['createdAt', 'storedAt', 'updatedAt', 'scoredAt', 'processedAt', 'ingestedAt'].forEach(ts => {
        const invalid: any = clone(BASE);
        invalid[ts] = '2026-01-15T12:00:07Z';
        expect(validate(invalid), `top-level ${ts} should be rejected`).toBe(false);
      });
    });

    it('should reject a SIXTH proof (additionalItems:false)', () => {
      const validate = compileEvidenceSchema();
      const invalid: any = clone(BASE);
      invalid.providerInvocations.push(clone(BASE.providerInvocations[4]));
      expect(validate(invalid)).toBe(false);
    });

    it('should reject a proof with status other than succeeded (D-EV3-5: no failed-lane record)', () => {
      const validate = compileEvidenceSchema();
      const invalid: any = clone(BASE);
      invalid.providerInvocations[4].status = 'failed';
      expect(validate(invalid)).toBe(false);
    });

    it('should reject a category/resultSchema mismatch (per-category binder)', () => {
      const validate = compileEvidenceSchema();
      const invalid: any = clone(BASE);
      invalid.providerInvocations[4].resultSchema = 'afi.enrichment.news.v1';
      expect(validate(invalid)).toBe(false);
    });

    it('should reject wrong domain tags on the proof fingerprints and lane hashes', () => {
      const validate = compileEvidenceSchema();
      const cases: Array<[string, (p: any) => any]> = [
        ['provider.recordFingerprint', p => p.provider.recordFingerprint],
        ['providerInstance.recordFingerprint', p => p.providerInstance.recordFingerprint],
        ['invocationInputHash', p => p.invocationInputHash],
        ['providerResultHash', p => p.providerResultHash],
        ['categoryResultHash', p => p.categoryResultHash],
      ];
      cases.forEach(([label, pick]) => {
        const invalid: any = clone(BASE);
        pick(invalid.providerInvocations[4]).domainTag = 'afi.d2.enrichment-bundle';
        expect(validate(invalid), `${label} wrong domainTag must be rejected`).toBe(false);
      });
    });

    it('should reject a credential mixing keyless and credentialRef facts (oneOf exclusivity)', () => {
      const validate = compileEvidenceSchema();
      const invalid: any = clone(BASE);
      invalid.providerInvocations[1].credential = {
        mode: 'keyless',
        credentialRef: 'credential-newsdata-reference',
      };
      expect(validate(invalid)).toBe(false);
    });

    it('should reject an incomplete credentialRef binding (all identity facts required)', () => {
      const validate = compileEvidenceSchema();
      const invalid: any = clone(BASE);
      invalid.providerInvocations[1].credential = {
        mode: 'credentialRef',
        credentialRef: 'credential-newsdata-reference',
      };
      expect(validate(invalid)).toBe(false);
    });

    it('should leave an inline secret nowhere to live — on the credential, a proof, and the record (D-EV3-6)', () => {
      const validate = compileEvidenceSchema();
      // Synthetic marker only — never a real secret.
      const MARKER = 'SYNTHETIC-MARKER-0000';
      const atCredential: any = clone(BASE);
      atCredential.providerInvocations[1].credential = { mode: 'keyless', apiKey: MARKER };
      expect(validate(atCredential), 'credential-level inline secret field').toBe(false);
      const atProof: any = clone(BASE);
      atProof.providerInvocations[1].authorization = MARKER;
      expect(validate(atProof), 'proof-level inline secret field').toBe(false);
      const atRecord: any = clone(BASE);
      atRecord.apiKey = MARKER;
      expect(validate(atRecord), 'record-level inline secret field').toBe(false);
    });

    it('should reject a non-positive recordVersion', () => {
      const validate = compileEvidenceSchema();
      const invalid: any = clone(BASE);
      invalid.recordVersion = 0;
      expect(validate(invalid)).toBe(false);
    });
  });

  describe('Nested AiMl Invocation Proof (D-EV3-3 / D-EV3-4(5))', () => {
    const BASE = loadJSON(CANONICAL_EXAMPLE);

    it('proof schema pins the service hash law and opaque hex commitments (never CanonicalHash objects)', () => {
      const schema = loadJSON(AIML_PROOF_SCHEMA);
      expect(schema.properties.schema.const).toBe('afi.aiml-invocation-proof.v1');
      expect(schema.properties.hashLaw.const).toBe('tiny-brains.hash.v1');
      ['codeConfigFingerprint', 'inputHash', 'outputHash'].forEach(f => {
        expect(schema.properties[f].type, f).toBe('string');
        expect(schema.properties[f].pattern, f).toBe('^[a-f0-9]{64}$');
        expect(schema.properties[f].$ref, `${f} must NOT be a CanonicalHash $ref`).toBeUndefined();
      });
      expect(schema.properties.status.const).toBe('succeeded');
      expect(schema.properties.experts.minItems).toBe(1);
      expect(schema.properties.experts.items.properties.posture.enum).toEqual([
        'deterministic',
        'probabilistic',
      ]);
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties.experts.items.additionalProperties).toBe(false);
    });

    it('the committed nested proof carries both reference experts, sorted ascending by expertId', () => {
      const inv = BASE.providerInvocations[0].aimlInvocation;
      expect(inv.profileId).toBe('froggy-reference-v1');
      const ids = inv.experts.map((e: any) => e.expertId);
      expect(ids).toEqual([...ids].sort());
      expect(ids).toEqual(['chronos-bolt-forecaster', 'trend-baseline']);
      const [chronos, baseline] = inv.experts;
      expect(chronos.posture).toBe('probabilistic');
      expect(chronos.artifactFingerprints).toBeTruthy();
      expect(baseline.posture).toBe('deterministic');
      expect(baseline.artifactFingerprints).toBeUndefined();
    });

    it('rejects an empty expert list, an unknown posture, and a failed status', () => {
      const validateAiml = compileAimlProofSchema();
      const inv = () => clone(BASE.providerInvocations[0].aimlInvocation);
      const empty = inv();
      empty.experts = [];
      expect(validateAiml(empty), 'empty experts').toBe(false);
      const posture = inv();
      posture.experts[0].posture = 'stochastic';
      expect(validateAiml(posture), 'unknown posture').toBe(false);
      const failed = inv();
      failed.status = 'failed';
      expect(validateAiml(failed), 'failed invocation status').toBe(false);
      const expertFailed = inv();
      expertFailed.experts[0].status = 'failed';
      expect(validateAiml(expertFailed), 'failed expert status').toBe(false);
    });

    it('structurally excludes volatile timing facts at both levels (D-EV3-3)', () => {
      const validateAiml = compileAimlProofSchema();
      ['startedAt', 'endedAt', 'durationMs'].forEach(field => {
        const atInvocation: any = clone(BASE.providerInvocations[0].aimlInvocation);
        atInvocation[field] = field === 'durationMs' ? 812 : '2026-01-15T12:00:07Z';
        expect(validateAiml(atInvocation), `invocation-level ${field}`).toBe(false);
        const atExpert: any = clone(BASE.providerInvocations[0].aimlInvocation);
        atExpert.experts[0][field] = field === 'durationMs' ? 812 : '2026-01-15T12:00:07Z';
        expect(validateAiml(atExpert), `expert-level ${field}`).toBe(false);
      });
    });

    it('rejects malformed opaque digests and malformed artifact fingerprints', () => {
      const validateAiml = compileAimlProofSchema();
      const badOutput: any = clone(BASE.providerInvocations[0].aimlInvocation);
      badOutput.outputHash = 'not-a-digest';
      expect(validateAiml(badOutput)).toBe(false);
      const badArtifact: any = clone(BASE.providerInvocations[0].aimlInvocation);
      badArtifact.experts[0].artifactFingerprints['chronos-bolt-tiny'] = 'DEADBEEF';
      expect(validateAiml(badArtifact)).toBe(false);
      const emptyArtifactName: any = clone(BASE.providerInvocations[0].aimlInvocation);
      emptyArtifactName.experts[0].artifactFingerprints[''] =
        'a'.repeat(64);
      expect(validateAiml(emptyArtifactName), 'empty artifact name (propertyNames)').toBe(false);
    });
  });

  describe('Proof contract mirrors the governed provider/credential vocabularies EXACTLY', () => {
    const proofSchema = loadJSON(PROOF_SCHEMA);
    const providerSchema = loadJSON('schemas/provider/v1/provider.schema.json');
    const credentialRefSchema = loadJSON('schemas/credential-ref/v1/credential-ref.schema.json');

    it('compiles standalone', () => {
      expect(() => compileProofSchema()).not.toThrow();
    });

    it('category enum == the governed five-category namespace (D-FCP-1, casing exact)', () => {
      expect(proofSchema.properties.category.enum).toEqual(
        providerSchema.properties.supportedCategories.items.enum
      );
    });

    it('executionClass enum mirrors afi.provider.v1 exactly', () => {
      expect(proofSchema.properties.provider.properties.executionClass.enum).toEqual(
        providerSchema.properties.executionClass.enum
      );
    });

    it('credential binding mirrors afi.credential-ref.v1 kind/status vocabularies exactly', () => {
      const credentialRefBranch = proofSchema.properties.credential.oneOf[1];
      expect(credentialRefBranch.properties.credentialKind.enum).toEqual(
        credentialRefSchema.properties.credentialKind.enum
      );
      expect(credentialRefBranch.properties.status.enum).toEqual(
        credentialRefSchema.properties.status.enum
      );
      // Both branches are closed; the keyless branch carries ONLY the mode.
      const keylessBranch = proofSchema.properties.credential.oneOf[0];
      expect(keylessBranch.additionalProperties).toBe(false);
      expect(Object.keys(keylessBranch.properties)).toEqual(['mode']);
      expect(credentialRefBranch.additionalProperties).toBe(false);
    });

    it('resultSchema enumerates exactly the five lowercase governed enrichment contract ids', () => {
      expect([...proofSchema.properties.resultSchema.enum].sort()).toEqual(
        [...GOVERNED_RESULT_SCHEMAS].sort()
      );
    });

    it('proof hashes pin the six D-EV3-4 domains (tags carried, never hashed)', () => {
      const tagOf = (node: any) => node.allOf[1].properties.domainTag.const;
      expect(tagOf(proofSchema.properties.provider.properties.recordFingerprint)).toBe(
        'afi.d2.provider-record'
      );
      expect(tagOf(proofSchema.properties.providerInstance.properties.recordFingerprint)).toBe(
        'afi.d2.provider-instance-record'
      );
      expect(tagOf(proofSchema.properties.invocationInputHash)).toBe(
        'afi.d2.provider-invocation-input'
      );
      expect(tagOf(proofSchema.properties.providerResultHash)).toBe('afi.d2.provider-result');
      expect(tagOf(proofSchema.properties.categoryResultHash)).toBe('afi.d2.lane-output');
    });

    it('technical is the ONLY lane that may declare priceSource (D-EV3-2(6))', () => {
      const validateProof = compileProofSchema();
      const BASE = loadJSON(CANONICAL_EXAMPLE);
      const technical = clone(BASE.providerInvocations[4]);
      expect(validateProof(technical), 'technical WITH priceSource').toBe(true);
      const technicalWithout = clone(BASE.providerInvocations[4]);
      delete technicalWithout.priceSource;
      expect(validateProof(technicalWithout), 'technical WITHOUT priceSource (admitted, optional)').toBe(
        true
      );
      [0, 1, 2, 3].forEach(i => {
        const other: any = clone(BASE.providerInvocations[i]);
        other.priceSource = 'blofin';
        expect(validateProof(other), `${other.category} with priceSource must be rejected`).toBe(false);
      });
    });
  });

  describe('Governed UWR Profile Stamp (PR-UWR-STAMP / RC-6 — carried forward VERBATIM)', () => {
    const BASE = loadJSON(CANONICAL_EXAMPLE);

    it('should expose exactly the governed stamp shape, all fields required (no new semantics)', () => {
      const stamp = loadJSON(EVIDENCE_SCHEMA).properties.uwrProfile;
      expect(stamp.type).toBe('object');
      expect(stamp.additionalProperties).toBe(false);
      expect(Object.keys(stamp.properties).sort()).toEqual([...EXPECTED_STAMP_KEYS].sort());
      expect([...stamp.required].sort()).toEqual([...EXPECTED_STAMP_KEYS].sort());
      expect(stamp.properties.source.enum).toEqual(GOVERNED_STAMP_SOURCES);
    });

    it('should stay analyst-/strategy-/profile-NEUTRAL: no identity is pinned as the only admissible value', () => {
      const schema = loadJSON(EVIDENCE_SCHEMA);
      const stamp = schema.properties.uwrProfile;
      ['analystId', 'strategyId', 'strategyVersion'].forEach(f => {
        expect(schema.properties[f].const, `${f} must not be const-pinned`).toBeUndefined();
        expect(schema.properties[f].enum, `${f} must not be enum-pinned`).toBeUndefined();
        expect(schema.properties[f].pattern, `${f} must not be pattern-pinned`).toBeUndefined();
      });
      ['profileId', 'status', 'decisionRef'].forEach(f => {
        expect(stamp.properties[f].type, `uwrProfile.${f} type`).toBe('string');
        expect(stamp.properties[f].const, `uwrProfile.${f} must not be const-pinned`).toBeUndefined();
        expect(stamp.properties[f].enum, `uwrProfile.${f} must not be enum-pinned`).toBeUndefined();
      });
    });

    it('should REQUIRE the stamp and REJECT a stamp with a missing or ungoverned source', () => {
      const validate = compileEvidenceSchema();
      const unstamped: any = clone(BASE);
      delete unstamped.uwrProfile;
      expect(validate(unstamped), 'an unstamped record must not be admissible').toBe(false);
      const missingSource: any = clone(BASE);
      delete missingSource.uwrProfile.source;
      expect(validate(missingSource)).toBe(false);
      ['registry', 'builtin', 'unknown', '', 'REGISTRY-CONSUMED', null].forEach(bad => {
        const invalid: any = clone(BASE);
        invalid.uwrProfile.source = bad;
        expect(validate(invalid), `source ${JSON.stringify(bad)} must be rejected`).toBe(false);
      });
    });

    it('should ADMIT both governed sources, and the committed records exercise BOTH', () => {
      const validate = compileEvidenceSchema();
      GOVERNED_STAMP_SOURCES.forEach(source => {
        const record: any = clone(BASE);
        record.uwrProfile.source = source;
        expect(admit(validate, record).ok, `source '${source}' must be admissible`).toBe(true);
      });
      const sources = ALL_COMMITTED_RECORDS().map(rel => loadJSON(rel).uwrProfile.source);
      GOVERNED_STAMP_SOURCES.forEach(s =>
        expect(sources, `committed records must exercise '${s}'`).toContain(s)
      );
    });

    it('should ADMIT any AFI-conforming profile from any analyst/strategy (neutrality)', () => {
      const validate = compileEvidenceSchema();
      const other: any = clone(BASE);
      other.analystId = 'kestrel';
      other.strategyId = 'mean_reversion_v2';
      other.strategyVersion = '3.1.4';
      other.scoredSignal.analystId = 'kestrel';
      other.scoredSignal.strategyId = 'mean_reversion_v2';
      other.scoredSignal.strategyVersion = '3.1.4';
      other.uwrProfile = {
        profileId: 'kestrel-adaptive-lifts-v2.0',
        status: 'analyst-declared',
        decisionRef: 'analysts/kestrel/profiles/adaptive-lifts-v2.0.md',
        source: 'registry-consumed',
      };
      const result = admit(validate, other);
      if (!result.ok) console.error('neutrality failure:', validate.errors, result.violations);
      expect(result.ok, 'a non-Froggy analyst with its own conforming profile must be admissible').toBe(true);
    });
  });

  describe('Credential-Safety Negative Space over committed data (D-EV3-6)', () => {
    it('no committed v3 record, vector, or KAT surface carries a secret-named key', () => {
      const surfaces = [
        ...ALL_COMMITTED_RECORDS(),
        ...readdirSync(join(rootDir, INVALID_DIR))
          .filter(f => f.endsWith('.json'))
          .map(f => `${INVALID_DIR}/${f}`),
        'kats/evidence/v3/evidence-v3-hashes.kat.json',
      ];
      surfaces.forEach(rel => {
        const offenders = collectKeys(loadJSON(rel)).filter(k => SECRET_KEY_PATTERN.test(k));
        expect(offenders, `${rel} must carry no secret-named key`).toEqual([]);
      });
    });

    it('no committed v3 record carries a credentialed URL or authorization-header shape', () => {
      ALL_COMMITTED_RECORDS().forEach(rel => {
        const raw = readFileSync(join(rootDir, rel), 'utf-8');
        expect(raw, `${rel} must carry no URL`).not.toMatch(/https?:\/\//);
        expect(raw, `${rel} must carry no Bearer material`).not.toMatch(/Bearer\s/);
      });
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

    it('should reference only governed schema families via $ref', () => {
      const refs = JSON.stringify(loadJSON(EVIDENCE_SCHEMA)).match(/"\$ref":\s*"([^"]+)"/g) ?? [];
      const ALLOWED = [
        '/schemas/provenance/v1/',
        '/schemas/composition-ref/v1/',
        '/schemas/provider-invocation-proof/v1/',
        '/schemas/aiml-invocation-proof/v1/',
      ];
      refs.forEach(ref =>
        expect(
          ALLOWED.some(prefix => ref.includes(prefix)),
          `unexpected $ref ${ref}`
        ).toBe(true)
      );
    });
  });
});
