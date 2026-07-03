import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * District 2 M1 — provenance schema draft validation.
 *
 * Covers the DRAFT schemas under schemas/provenance/v1/ (authorized by
 * District 2 D-17 as D2 M1: afi-config schema drafts and tests only).
 * Uses the same strict AJV conventions as tests/schema-validation.test.ts.
 */

/**
 * Create a fresh AJV instance for each test to avoid schema caching issues.
 * Mirrors the strict setup in schema-validation.test.ts exactly.
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
  ]);
  return ajv;
}

/**
 * Load a JSON file from the repository
 */
function loadJSON(relativePath: string): any {
  const fullPath = join(rootDir, relativePath);
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

const PROVENANCE_SCHEMA_DIR = 'schemas/provenance/v1';
const PROVENANCE_EXAMPLE_DIR = 'examples/provenance/v1';

/** Leaf schemas that other provenance schemas reference via $ref. */
const PROVENANCE_DEPENDENCY_SCHEMAS = [
  `${PROVENANCE_SCHEMA_DIR}/canonical-hash.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/evidence-ref.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/source-disclosure-profile.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/enrichment-provenance.schema.json`,
];

const ALL_PROVENANCE_SCHEMAS = [
  `${PROVENANCE_SCHEMA_DIR}/canonical-hash.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/evidence-ref.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/source-disclosure-profile.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/enrichment-provenance.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/analyst-input-envelope.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/scored-signal.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/provenance-record.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/replay-profile.schema.json`,
  `${PROVENANCE_SCHEMA_DIR}/trade-plan.schema.json`,
];

/**
 * Compile one provenance schema on a fresh strict AJV instance, preloading
 * the leaf dependency schemas (except the target itself) so cross-file
 * $refs resolve deterministically.
 */
function compileProvenanceSchema(schemaFile: string) {
  const ajv = createAjv();
  PROVENANCE_DEPENDENCY_SCHEMAS.forEach(depFile => {
    if (depFile !== schemaFile) {
      ajv.addSchema(loadJSON(depFile));
    }
  });
  return ajv.compile(loadJSON(schemaFile));
}

/** Deep-clone a fixture so mutations never leak between tests. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Deterministic base fixtures (valid objects; negative tests mutate clones)
// ---------------------------------------------------------------------------

const VALID_CANONICAL_HASH = {
  algorithm: 'sha256',
  canonicalizationVersion: 'afi.hash.v1',
  domainTag: 'afi.d2.signal-input',
  value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
};

const VALID_EVIDENCE_REF = {
  evidenceId: 'ev-price-context-000123-001',
  sourceRef: 'src-exchange-blofin-api',
  evidenceHash: {
    algorithm: 'sha256',
    canonicalizationVersion: 'afi.hash.v1',
    domainTag: 'afi.d2.evidence',
    value: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
  },
};

const VALID_SOURCE_DISCLOSURE_PROFILE = {
  sourceId: 'src-exchange-blofin-api',
  sourceClass: 'exchange-api',
  disclosureLevel: 'partial',
  replayabilityLevel: 'pinned-inputs',
};

const VALID_ENRICHMENT_PROVENANCE = {
  laneId: 'price-context',
  engineId: 'enrich-engine-a',
  laneVersion: 'v0.3.0',
  replayabilityLevel: 'pinned-inputs',
};

const VALID_ANALYST_INPUT_ENVELOPE = {
  schema: 'afi.analyst-input-envelope.v1',
  signalId: 'sig-d2-20260115-000123',
  strategyViewType: 'trend-pullback-local-view',
  strategyLocalView: {
    momentumState: 'pullback-in-uptrend',
    pullbackDepthPct: 3.2,
  },
};

const VALID_SCORED_SIGNAL = {
  schema: 'afi.scored-signal.v1',
  signalId: 'sig-d2-20260115-000123',
  analystId: 'analyst-uwr-01',
  strategyId: 'trend-pullback',
  direction: 'long',
  uwrScore: 0.81,
  provenanceRecordRef: 'provenance-record:sig-d2-20260115-000123',
};

const VALID_PROVENANCE_RECORD = {
  schema: 'afi.provenance-record.v1',
  signalId: 'sig-d2-20260115-000123',
  canonicalizationVersion: 'afi.hash.v1',
  inputHash: {
    algorithm: 'sha256',
    canonicalizationVersion: 'afi.hash.v1',
    domainTag: 'afi.d2.signal-input',
    value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  outputHash: {
    algorithm: 'sha256',
    canonicalizationVersion: 'afi.hash.v1',
    domainTag: 'afi.d2.scored-output',
    value: '3f79bb7b435b05321651daefd374cdc681dc06faa65e374e38337b88ca046dea',
  },
};

const VALID_REPLAY_PROFILE = {
  schema: 'afi.replay-profile.v1',
  replayabilityLevel: 'pinned-inputs',
  factsRequired: true,
};

const VALID_TRADE_PLAN = {
  schema: 'afi.trade-plan.v1',
  levels: {
    entry: { min: '42000', max: '42250.50' },
    stopLoss: '41200',
    takeProfits: [{ price: '43500', sizePct: '50' }],
  },
};

describe('District 2 M1 Provenance Schema Drafts (v1)', () => {
  describe('Schema Compilation', () => {
    ALL_PROVENANCE_SCHEMAS.forEach(schemaFile => {
      it(`should compile ${schemaFile} without errors`, () => {
        expect(() => {
          compileProvenanceSchema(schemaFile);
        }).not.toThrow();

        const validate = compileProvenanceSchema(schemaFile);
        expect(validate).toBeDefined();
        expect(typeof validate).toBe('function');
      });
    });

    it('all provenance draft schemas should be marked draft-non-implementation', () => {
      ALL_PROVENANCE_SCHEMAS.forEach(schemaFile => {
        const schema = loadJSON(schemaFile);
        expect(
          schema['x-afiStatus'],
          `${schemaFile} should carry x-afiStatus draft marker`
        ).toBe('draft-non-implementation');
      });
    });
  });

  describe('Example Validation', () => {
    const examplePairs: Array<[string, string]> = [
      [`${PROVENANCE_SCHEMA_DIR}/canonical-hash.schema.json`, `${PROVENANCE_EXAMPLE_DIR}/canonical-hash.example.json`],
      [`${PROVENANCE_SCHEMA_DIR}/evidence-ref.schema.json`, `${PROVENANCE_EXAMPLE_DIR}/evidence-ref.example.json`],
      [`${PROVENANCE_SCHEMA_DIR}/source-disclosure-profile.schema.json`, `${PROVENANCE_EXAMPLE_DIR}/source-disclosure-profile.example.json`],
      [`${PROVENANCE_SCHEMA_DIR}/enrichment-provenance.schema.json`, `${PROVENANCE_EXAMPLE_DIR}/enrichment-provenance.example.json`],
      [`${PROVENANCE_SCHEMA_DIR}/analyst-input-envelope.schema.json`, `${PROVENANCE_EXAMPLE_DIR}/analyst-input-envelope.example.json`],
      [`${PROVENANCE_SCHEMA_DIR}/scored-signal.schema.json`, `${PROVENANCE_EXAMPLE_DIR}/scored-signal.example.json`],
      [`${PROVENANCE_SCHEMA_DIR}/provenance-record.schema.json`, `${PROVENANCE_EXAMPLE_DIR}/provenance-record.example.json`],
      [`${PROVENANCE_SCHEMA_DIR}/replay-profile.schema.json`, `${PROVENANCE_EXAMPLE_DIR}/replay-profile.example.json`],
      [`${PROVENANCE_SCHEMA_DIR}/trade-plan.schema.json`, `${PROVENANCE_EXAMPLE_DIR}/trade-plan.example.json`],
    ];

    examplePairs.forEach(([schemaFile, exampleFile]) => {
      it(`should validate ${exampleFile} against ${schemaFile}`, () => {
        const validate = compileProvenanceSchema(schemaFile);
        const example = loadJSON(exampleFile);

        const valid = validate(example);

        if (!valid) {
          console.error('Validation errors:', validate.errors);
        }

        expect(valid, `${exampleFile} should be valid`).toBe(true);
      });
    });
  });

  describe('Shared Enum Consistency', () => {
    it('replayabilityLevel enum should be identical across all schemas that use it', () => {
      const sourceDisclosure = loadJSON(`${PROVENANCE_SCHEMA_DIR}/source-disclosure-profile.schema.json`);
      const enrichment = loadJSON(`${PROVENANCE_SCHEMA_DIR}/enrichment-provenance.schema.json`);
      const replay = loadJSON(`${PROVENANCE_SCHEMA_DIR}/replay-profile.schema.json`);

      const expected = ['deterministic', 'pinned-inputs', 'best-effort', 'non-replayable'];

      expect(sourceDisclosure.properties.replayabilityLevel.enum).toEqual(expected);
      expect(enrichment.properties.replayabilityLevel.enum).toEqual(expected);
      expect(replay.properties.replayabilityLevel.enum).toEqual(expected);
    });
  });

  describe('CanonicalHash v1', () => {
    const schemaFile = `${PROVENANCE_SCHEMA_DIR}/canonical-hash.schema.json`;

    it('should accept a minimal valid canonical hash (no legacyHashRef)', () => {
      const validate = compileProvenanceSchema(schemaFile);
      expect(validate(clone(VALID_CANONICAL_HASH))).toBe(true);
    });

    it('should reject on-chain keccak256 algorithm (off-chain sha256 domain separation)', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_CANONICAL_HASH);
      invalid.algorithm = 'keccak256';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors).toBeDefined();
      expect(validate.errors!.some(e => e.instancePath === '/algorithm')).toBe(true);
    });

    it('should reject a domain tag outside the afi.* namespace', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_CANONICAL_HASH);
      invalid.domainTag = 'keccak.settlement.claims';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/domainTag')).toBe(true);
    });

    it('should reject a malformed (uppercase) domain tag', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_CANONICAL_HASH);
      invalid.domainTag = 'afi.D2.SignalInput';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/domainTag')).toBe(true);
    });

    it('should reject a missing canonicalizationVersion', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_CANONICAL_HASH);
      delete invalid.canonicalizationVersion;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.message?.includes('canonicalizationVersion'))).toBe(true);
    });

    it('should reject an invalid canonicalizationVersion format', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_CANONICAL_HASH);
      invalid.canonicalizationVersion = 'sha256-canonical-v1';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/canonicalizationVersion')).toBe(true);
    });

    it('should reject a digest that is not 64 lowercase hex characters', () => {
      const validate = compileProvenanceSchema(schemaFile);

      const tooShort: any = clone(VALID_CANONICAL_HASH);
      tooShort.value = 'e3b0c442';
      expect(validate(tooShort)).toBe(false);

      const uppercase: any = clone(VALID_CANONICAL_HASH);
      uppercase.value = 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';
      expect(validate(uppercase)).toBe(false);
    });
  });

  describe('EvidenceRef v1', () => {
    const schemaFile = `${PROVENANCE_SCHEMA_DIR}/evidence-ref.schema.json`;

    it('should accept a hash-only evidence ref (no payload, no uri)', () => {
      const validate = compileProvenanceSchema(schemaFile);
      expect(validate(clone(VALID_EVIDENCE_REF))).toBe(true);
    });

    it('should reject inline raw payload fields (no raw payload disclosure)', () => {
      const validate = compileProvenanceSchema(schemaFile);

      ['rawPayload', 'payload', 'rawText'].forEach(forbiddenField => {
        const invalid: any = clone(VALID_EVIDENCE_REF);
        invalid[forbiddenField] = '{"open":42000,"close":42100}';

        expect(
          validate(invalid),
          `EvidenceRef should reject inline '${forbiddenField}' field`
        ).toBe(false);
      });
    });

    it('should reject a missing evidenceHash', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_EVIDENCE_REF);
      delete invalid.evidenceHash;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.message?.includes('evidenceHash'))).toBe(true);
    });

    it('should reject an invalid redactionStatus', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_EVIDENCE_REF);
      invalid.redactionStatus = 'partially-visible';

      expect(validate(invalid)).toBe(false);
    });
  });

  describe('SourceDisclosureProfile v1', () => {
    const schemaFile = `${PROVENANCE_SCHEMA_DIR}/source-disclosure-profile.schema.json`;

    it('should accept a minimal valid profile', () => {
      const validate = compileProvenanceSchema(schemaFile);
      expect(validate(clone(VALID_SOURCE_DISCLOSURE_PROFILE))).toBe(true);
    });

    it('should reject an invalid disclosureLevel', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_SOURCE_DISCLOSURE_PROFILE);
      invalid.disclosureLevel = 'everything';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/disclosureLevel')).toBe(true);
    });

    it('should reject an invalid replayabilityLevel', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_SOURCE_DISCLOSURE_PROFILE);
      invalid.replayabilityLevel = 'sometimes';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/replayabilityLevel')).toBe(true);
    });

    it('should reject an invalid withheldReason', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_SOURCE_DISCLOSURE_PROFILE);
      invalid.withheldReason = 'because';

      expect(validate(invalid)).toBe(false);
    });

    it('should reject weighting/reward/reputation fields (BenchKit owns evaluation policy)', () => {
      const validate = compileProvenanceSchema(schemaFile);

      ['rewardWeight', 'transparencyBonus', 'payoutMultiplier', 'reputationBoost'].forEach(
        forbiddenField => {
          const invalid: any = clone(VALID_SOURCE_DISCLOSURE_PROFILE);
          invalid[forbiddenField] = 1.5;

          expect(
            validate(invalid),
            `SourceDisclosureProfile should reject '${forbiddenField}' field`
          ).toBe(false);
        }
      );
    });
  });

  describe('EnrichmentProvenance v1', () => {
    const schemaFile = `${PROVENANCE_SCHEMA_DIR}/enrichment-provenance.schema.json`;

    it('should accept a minimal valid lane record', () => {
      const validate = compileProvenanceSchema(schemaFile);
      expect(validate(clone(VALID_ENRICHMENT_PROVENANCE))).toBe(true);
    });

    it('should reject a missing laneId', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_ENRICHMENT_PROVENANCE);
      delete invalid.laneId;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.message?.includes('laneId'))).toBe(true);
    });

    it('should reject an invalid replayabilityLevel', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_ENRICHMENT_PROVENANCE);
      invalid.replayabilityLevel = 'sometimes';

      expect(validate(invalid)).toBe(false);
    });

    it('should reject an invalid status', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_ENRICHMENT_PROVENANCE);
      invalid.status = 'in-flight';

      expect(validate(invalid)).toBe(false);
    });

    it('should reject runtime/storage timestamps on the lane record', () => {
      const validate = compileProvenanceSchema(schemaFile);

      ['startedAt', 'finishedAt', 'storedAt'].forEach(forbiddenField => {
        const invalid: any = clone(VALID_ENRICHMENT_PROVENANCE);
        invalid[forbiddenField] = '2026-01-15T12:00:07Z';

        expect(
          validate(invalid),
          `EnrichmentProvenance should reject runtime timestamp '${forbiddenField}'`
        ).toBe(false);
      });
    });
  });

  describe('AnalystInputEnvelope v1', () => {
    const schemaFile = `${PROVENANCE_SCHEMA_DIR}/analyst-input-envelope.schema.json`;

    it('should accept a declared opaque strategyLocalView with arbitrary contents', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const envelope: any = clone(VALID_ANALYST_INPUT_ENVELOPE);
      envelope.strategyLocalView = {
        anyStrategyLocalField: true,
        nested: { deeply: { opaque: [1, 2, 3] } },
      };

      expect(validate(envelope)).toBe(true);
    });

    it('should accept a view declared via enrichedViewSchemaRef only', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const envelope: any = clone(VALID_ANALYST_INPUT_ENVELOPE);
      delete envelope.strategyViewType;
      envelope.enrichedViewSchemaRef = 'strategy://trend-pullback/enriched-view.schema.json#v1';

      expect(validate(envelope)).toBe(true);
    });

    it('should reject an undeclared strategyLocalView (no strategyViewType or enrichedViewSchemaRef)', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_ANALYST_INPUT_ENVELOPE);
      delete invalid.strategyViewType;
      // no enrichedViewSchemaRef either -> anonymous opaque payload is invalid

      expect(validate(invalid)).toBe(false);
      expect(validate.errors).toBeDefined();
    });

    it('should reject a missing schema field', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_ANALYST_INPUT_ENVELOPE);
      delete invalid.schema;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.message?.includes('schema'))).toBe(true);
    });

    it('should reject a wrong schema version const', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_ANALYST_INPUT_ENVELOPE);
      invalid.schema = 'afi.analyst-input-envelope.v2';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/schema')).toBe(true);
    });

    it('should reject a missing signalId', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_ANALYST_INPUT_ENVELOPE);
      delete invalid.signalId;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.message?.includes('signalId'))).toBe(true);
    });

    it('should reject unknown envelope-level fields (opacity is confined to strategyLocalView)', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_ANALYST_INPUT_ENVELOPE);
      invalid.froggyInternals = { lilyPadIndex: 7 };

      expect(validate(invalid)).toBe(false);
    });
  });

  describe('ScoredSignal v1 Projection', () => {
    const schemaFile = `${PROVENANCE_SCHEMA_DIR}/scored-signal.schema.json`;

    it('should accept a minimal scored signal without any timestamp', () => {
      const validate = compileProvenanceSchema(schemaFile);
      expect(validate(clone(VALID_SCORED_SIGNAL))).toBe(true);
    });

    it('should accept a domain-declared evaluatedAt timestamp', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const scored: any = clone(VALID_SCORED_SIGNAL);
      scored.evaluatedAt = '2026-01-15T12:00:00Z';

      expect(validate(scored)).toBe(true);
    });

    it('should reject volatile processing/storage timestamps (District 2 hash doctrine)', () => {
      const validate = compileProvenanceSchema(schemaFile);

      ['scoredAt', 'createdAt', 'updatedAt', 'storedAt', 'processedAt', 'ingestedAt'].forEach(
        forbiddenField => {
          const invalid: any = clone(VALID_SCORED_SIGNAL);
          invalid[forbiddenField] = '2026-01-15T12:00:07Z';

          expect(
            validate(invalid),
            `ScoredSignal should reject runtime/storage timestamp '${forbiddenField}'`
          ).toBe(false);
        }
      );
    });

    it('should reject runtime/storage/debug fields excluded from the projection', () => {
      const validate = compileProvenanceSchema(schemaFile);

      const forbiddenFields: Record<string, unknown> = {
        rawUss: { schema: 'afi.usignal.v1.1' },
        lenses: [{ lens: 'strategy' }],
        _priceFeedMetadata: { feed: 'blofin' },
        rawPayload: 'BUY BTCUSDT NOW',
        _id: '65fd0a1b2c3d4e5f60718293',
        __v: 0,
        debug: { trace: true },
      };

      Object.entries(forbiddenFields).forEach(([field, value]) => {
        const invalid: any = clone(VALID_SCORED_SIGNAL);
        invalid[field] = value;

        expect(
          validate(invalid),
          `ScoredSignal should reject forbidden field '${field}'`
        ).toBe(false);
      });
    });

    it('should reject a scored signal with no provenance link at all', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_SCORED_SIGNAL);
      delete invalid.provenanceRecordRef;
      // neither provenanceRecordRef nor provenanceRecordHash present

      expect(validate(invalid)).toBe(false);
    });

    it('should accept a provenance link supplied as a canonical hash instead of a ref', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const scored: any = clone(VALID_SCORED_SIGNAL);
      delete scored.provenanceRecordRef;
      scored.provenanceRecordHash = {
        algorithm: 'sha256',
        canonicalizationVersion: 'afi.hash.v1',
        domainTag: 'afi.d2.provenance-record',
        value: '18ac3e7343f016890c510e93f935261169d9e3f565436429830faf0934f4f8e4',
      };

      expect(validate(scored)).toBe(true);
    });

    it('should reject a missing schema version field', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_SCORED_SIGNAL);
      delete invalid.schema;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject an invalid direction', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_SCORED_SIGNAL);
      invalid.direction = 'sideways';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/direction')).toBe(true);
    });

    it('should reject conviction outside [0, 1]', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_SCORED_SIGNAL);
      invalid.conviction = 1.5;

      expect(validate(invalid)).toBe(false);
    });
  });

  describe('ProvenanceRecord v1', () => {
    const schemaFile = `${PROVENANCE_SCHEMA_DIR}/provenance-record.schema.json`;

    it('should accept a minimal valid record', () => {
      const validate = compileProvenanceSchema(schemaFile);
      expect(validate(clone(VALID_PROVENANCE_RECORD))).toBe(true);
    });

    it('should reject settlement/reward/vault/validator/anchoring/demo fields', () => {
      const validate = compileProvenanceSchema(schemaFile);

      const forbiddenFields: Record<string, unknown> = {
        claimRoot: '0xabc123',
        rewardAmount: '1000000',
        vaultAddress: '0x0000000000000000000000000000000000000001',
        validatorDecision: { verdict: 'approve' },
        anchorTxHash: '0xdeadbeef',
        epochId: 42,
        settlementVersion: 'v1',
        demoOnly: true,
      };

      Object.entries(forbiddenFields).forEach(([field, value]) => {
        const invalid: any = clone(VALID_PROVENANCE_RECORD);
        invalid[field] = value;

        expect(
          validate(invalid),
          `ProvenanceRecord should reject forbidden field '${field}'`
        ).toBe(false);
      });
    });

    it('should reject runtime/storage timestamps on the record', () => {
      const validate = compileProvenanceSchema(schemaFile);

      ['createdAt', 'storedAt', 'updatedAt'].forEach(forbiddenField => {
        const invalid: any = clone(VALID_PROVENANCE_RECORD);
        invalid[forbiddenField] = '2026-01-15T12:00:07Z';

        expect(
          validate(invalid),
          `ProvenanceRecord should reject runtime timestamp '${forbiddenField}'`
        ).toBe(false);
      });
    });

    it('should reject a missing canonicalizationVersion', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_PROVENANCE_RECORD);
      delete invalid.canonicalizationVersion;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.message?.includes('canonicalizationVersion'))).toBe(true);
    });

    it('should reject an invalid canonicalizationVersion format', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_PROVENANCE_RECORD);
      invalid.canonicalizationVersion = 'v1';

      expect(validate(invalid)).toBe(false);
    });

    it('should reject a domainTags entry outside the afi.* namespace', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_PROVENANCE_RECORD);
      invalid.domainTags = ['afi.d2.signal-input', 'keccak.onchain.anchor'];

      expect(validate(invalid)).toBe(false);
    });

    it('should reject an inputHash with an invalid algorithm', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_PROVENANCE_RECORD);
      invalid.inputHash.algorithm = 'keccak256';

      expect(validate(invalid)).toBe(false);
    });
  });

  describe('ReplayProfile v1', () => {
    const schemaFile = `${PROVENANCE_SCHEMA_DIR}/replay-profile.schema.json`;

    it('should accept a minimal valid profile', () => {
      const validate = compileProvenanceSchema(schemaFile);
      expect(validate(clone(VALID_REPLAY_PROFILE))).toBe(true);
    });

    it('should reject an invalid replayabilityLevel', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_REPLAY_PROFILE);
      invalid.replayabilityLevel = 'sometimes';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.instancePath === '/replayabilityLevel')).toBe(true);
    });

    it('should reject a missing factsRequired flag', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_REPLAY_PROFILE);
      delete invalid.factsRequired;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.message?.includes('factsRequired'))).toBe(true);
    });

    it('should reject a missing schema version field', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_REPLAY_PROFILE);
      delete invalid.schema;

      expect(validate(invalid)).toBe(false);
    });

    it('should accept seed as string, number, or null (USS v1.1 compatibility)', () => {
      const validate = compileProvenanceSchema(schemaFile);

      const seeds: Array<string | number | null> = ['42', 42, null];
      seeds.forEach(seed => {
        const profile: any = clone(VALID_REPLAY_PROFILE);
        profile.seed = seed;

        expect(validate(profile), `seed ${JSON.stringify(seed)} should be accepted`).toBe(true);
      });
    });

    it('should reject a boolean seed', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_REPLAY_PROFILE);
      invalid.seed = true;

      expect(validate(invalid)).toBe(false);
    });
  });

  describe('TradePlan v1 / SignalLevels v1', () => {
    const schemaFile = `${PROVENANCE_SCHEMA_DIR}/trade-plan.schema.json`;

    it('should accept a valid trade plan with decimal strings', () => {
      const validate = compileProvenanceSchema(schemaFile);
      expect(validate(clone(VALID_TRADE_PLAN))).toBe(true);
    });

    it('should accept a single decimal-string entry (non-range)', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const plan: any = clone(VALID_TRADE_PLAN);
      plan.levels.entry = '42100.25';

      expect(validate(plan)).toBe(true);
    });

    it('should reject a raw float entry (decimal strings required)', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_TRADE_PLAN);
      invalid.levels.entry = 42000.5;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject raw float range bounds', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_TRADE_PLAN);
      invalid.levels.entry = { min: 42000, max: 42250.5 };

      expect(validate(invalid)).toBe(false);
    });

    it('should reject a raw float stopLoss', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_TRADE_PLAN);
      invalid.levels.stopLoss = 41200;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject a raw float take-profit price', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_TRADE_PLAN);
      invalid.levels.takeProfits[0].price = 43500.1;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject malformed decimal strings', () => {
      const validate = compileProvenanceSchema(schemaFile);

      ['42_000', '42,000', '-100', '.5', '42.', 'fortytwo'].forEach(badDecimal => {
        const invalid: any = clone(VALID_TRADE_PLAN);
        invalid.levels.stopLoss = badDecimal;

        expect(
          validate(invalid),
          `TradePlan should reject malformed decimal string '${badDecimal}'`
        ).toBe(false);
      });
    });

    it('should reject a raw float leverageHint', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_TRADE_PLAN);
      invalid.leverageHint = 3;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject missing levels', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_TRADE_PLAN);
      delete invalid.levels;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some(e => e.message?.includes('levels'))).toBe(true);
    });

    it('should reject an invalid marketTypeHint', () => {
      const validate = compileProvenanceSchema(schemaFile);
      const invalid: any = clone(VALID_TRADE_PLAN);
      invalid.marketTypeHint = 'options';

      expect(validate(invalid)).toBe(false);
    });
  });
});
