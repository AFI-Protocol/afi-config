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
 * PR-UWR-CONFIG — version-pinned UWR profile registration validation.
 *
 * Covers the DRAFT schemas under schemas/uwr-profile/v0/, the registry
 * instance (registries/uwr-profiles/), the example, and the KAT vector
 * files (kats/uwr-profile/v0/), authorized by
 * afi-governance/decisions/uwr-profile-pin-v0.1.md UP-12 (PR-UWR-CONFIG only).
 *
 * IMPORTANT BOUNDARY: these tests compare DATA against decision-anchored
 * literals. Nothing here evaluates computeUwrScore or applyTimeDecay —
 * KAT execution against afi-core code is the separately-authorized
 * PR-UWR-KAT-EXEC.
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

/** Deep-clone a fixture so mutations never leak between tests. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const UWR_SCHEMA_DIR = 'schemas/uwr-profile/v0';
const UWR_EXAMPLE_DIR = 'examples/uwr-profile/v0';
const UWR_KAT_DIR = 'kats/uwr-profile/v0';
const UWR_REGISTRY_DIR = 'registries/uwr-profiles';

const PROFILE_SCHEMA = `${UWR_SCHEMA_DIR}/uwr-profile.schema.json`;
const SCORE_KAT_SCHEMA = `${UWR_SCHEMA_DIR}/uwr-score-kat.schema.json`;
const DECAY_KAT_SCHEMA = `${UWR_SCHEMA_DIR}/uwr-decay-kat.schema.json`;

const ALL_UWR_SCHEMAS = [PROFILE_SCHEMA, SCORE_KAT_SCHEMA, DECAY_KAT_SCHEMA];

const REGISTRY_FILE = `${UWR_REGISTRY_DIR}/uwr-weighted-lifts-v0.1.json`;
const EXAMPLE_FILE = `${UWR_EXAMPLE_DIR}/uwr-weighted-lifts-v0.1.example.json`;
const SCORE_KAT_FILE = `${UWR_KAT_DIR}/compute-uwr-score.kat.json`;
const DECAY_KAT_FILE = `${UWR_KAT_DIR}/apply-time-decay.kat.json`;

const PROFILE_ID = 'uwr-weighted-lifts-v0.1';
const HUMAN_ALIAS = 'Testnet Scoring Profile v0';
const PINNED_AXES = ['structure', 'execution', 'risk', 'insight'];
const PINNED_TAXONOMY = ['low', 'medium', 'high', 'extreme'];
const PINNED_TEMPLATES = [
  { templateId: 'decay-scalp-v1', halfLifeMinutes: 8, thetaBias: 0.8 },
  { templateId: 'decay-intraday-v1', halfLifeMinutes: 60, thetaBias: 0.6 },
  { templateId: 'decay-swing-v1', halfLifeMinutes: 720, thetaBias: 0.4 },
  { templateId: 'decay-position-v1', halfLifeMinutes: 5040, thetaBias: 0.2 },
];
const MANDATED_SCORE_ANCHORS = [0.1875, 0.5, 0.65, 0.375, 0.625, 0.825, 0.55];

/** Compile one self-contained UWR schema on a fresh strict AJV instance. */
function compileUwrSchema(schemaFile: string) {
  const ajv = createAjv();
  return ajv.compile(loadJSON(schemaFile));
}

describe('Version-Pinned UWR Profile v0 (PR-UWR-CONFIG)', () => {
  describe('Schema Compilation', () => {
    ALL_UWR_SCHEMAS.forEach((schemaFile) => {
      it(`should compile ${schemaFile} without errors`, () => {
        expect(() => {
          compileUwrSchema(schemaFile);
        }).not.toThrow();

        const validate = compileUwrSchema(schemaFile);
        expect(validate).toBeDefined();
        expect(typeof validate).toBe('function');
      });
    });

    it('all uwr-profile draft schemas should be marked draft-non-implementation', () => {
      ALL_UWR_SCHEMAS.forEach((schemaFile) => {
        const schema = loadJSON(schemaFile);
        expect(schema['x-afiStatus'], `${schemaFile} should carry x-afiStatus draft marker`).toBe(
          'draft-non-implementation',
        );
      });
    });
  });

  describe('Registration and Example', () => {
    it('registry instance should validate against uwr-profile.schema.json', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const registry = loadJSON(REGISTRY_FILE);

      const valid = validate(registry);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, `${REGISTRY_FILE} should be a valid version-pinned UWR profile`).toBe(true);
    });

    it('example should validate against uwr-profile.schema.json', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const example = loadJSON(EXAMPLE_FILE);

      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, `${EXAMPLE_FILE} should be a valid version-pinned UWR profile`).toBe(true);
    });

    it('example should be byte-identical to the registry instance (drift guard)', () => {
      const registryRaw = readFileSync(join(rootDir, REGISTRY_FILE), 'utf-8');
      const exampleRaw = readFileSync(join(rootDir, EXAMPLE_FILE), 'utf-8');

      expect(exampleRaw).toBe(registryRaw);
    });

    it('registries/uwr-profiles should contain exactly the one authorized profile (UP-12 scope guard)', () => {
      const files = readdirSync(join(rootDir, UWR_REGISTRY_DIR)).sort();
      expect(files).toEqual(['uwr-weighted-lifts-v0.1.json']);
    });
  });

  describe('KAT File Validation', () => {
    it('compute-uwr-score.kat.json should validate against uwr-score-kat.schema.json', () => {
      const validate = compileUwrSchema(SCORE_KAT_SCHEMA);
      const kat = loadJSON(SCORE_KAT_FILE);

      const valid = validate(kat);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, `${SCORE_KAT_FILE} should be valid`).toBe(true);
    });

    it('apply-time-decay.kat.json should validate against uwr-decay-kat.schema.json', () => {
      const validate = compileUwrSchema(DECAY_KAT_SCHEMA);
      const kat = loadJSON(DECAY_KAT_FILE);

      const valid = validate(kat);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, `${DECAY_KAT_FILE} should be valid`).toBe(true);
    });
  });

  describe('Decision-Value Pins (uwr-profile-pin-v0.1.md, data comparison only)', () => {
    const registry = loadJSON(REGISTRY_FILE);

    it('should pin the profile id (UP-2)', () => {
      expect(registry.profileId).toBe(PROFILE_ID);
      expect(registry.supersedes).toBe('uwr-default-stub');
    });

    it('should carry the draft-non-implementation marker on the instance (UP-12)', () => {
      expect(registry['x-afiStatus']).toBe('draft-non-implementation');
      expect(registry.status).toBe('testnet-provisional');
    });

    it('should pin the engine (UP-3)', () => {
      expect(registry.engine.function).toBe('computeUwrScore');
      expect(registry.engine.sourceModule).toBe('afi-core/validators/UniversalWeightingRule.ts');
    });

    it('should pin the axes in order (UP-4)', () => {
      expect(registry.axes).toEqual(PINNED_AXES);
    });

    it('should pin all four weights to 0.25 with UniversalWeightingRuleConfig field names (UP-5)', () => {
      expect(Object.keys(registry.weights)).toEqual([
        'structureWeight',
        'executionWeight',
        'riskWeight',
        'insightWeight',
      ]);
      Object.values(registry.weights).forEach((weight) => {
        expect(weight).toBe(0.25);
      });
    });

    it('should pin the output surface (UP-6)', () => {
      expect(registry.outputSurface.uwrScoreRange).toEqual({ min: 0, max: 1 });
      expect(registry.outputSurface.riskBucketTaxonomy).toEqual(PINNED_TAXONOMY);
      expect(registry.outputSurface.convictionRange).toEqual({ min: 0, max: 1 });
    });

    it('should pin the decay surface (UP-7)', () => {
      expect(registry.decaySurface.family).toBe('GreeksDecayTemplate');
      expect(registry.decaySurface.version).toBe('v1');
      expect(registry.decaySurface.unit).toBe('minutes');
      expect(registry.decaySurface.decayModel).toBe('exp');
      expect(registry.decaySurface.templates).toEqual(PINNED_TEMPLATES);
      expect(registry.decaySurface.horizonSelection).toEqual({
        scalp: 'decay-scalp-v1',
        intraday: 'decay-intraday-v1',
        swing: 'decay-swing-v1',
        position: 'decay-position-v1',
        longTerm: 'decay-position-v1',
        unknownOrMissing: 'decay-swing-v1',
      });
    });

    it('should record the testnet-provisional qualification values without wiring them (UP-9)', () => {
      expect(registry.qualification.minDecayScoreThreshold).toBe(0.5);
      expect(registry.qualification.challengeWindowDurationHours).toBe(24);
      expect(registry.qualification.rule).toBe('decayedScore >= minDecayScoreThreshold');
    });

    it('should pin the scorer identity (UP-10)', () => {
      expect(registry.scorerIdentity.analystId).toBe('froggy');
      expect(registry.scorerIdentity.strategyId).toBe('trend_pullback_v1');
      expect(registry.scorerIdentity.invokedAs).toBe('scoreFroggyTrendPullbackFromEnriched');
    });

    it('should reference both KAT vector files (UP-11)', () => {
      expect(registry.katRefs.computeUwrScore).toBe(SCORE_KAT_FILE);
      expect(registry.katRefs.applyTimeDecay).toBe(DECAY_KAT_FILE);
    });

    it('should use the alias only as humanAlias, exactly once (UP-1)', () => {
      expect(registry.humanAlias).toBe(HUMAN_ALIAS);
      const occurrences = JSON.stringify(registry).split(HUMAN_ALIAS).length - 1;
      expect(occurrences, 'alias must appear exactly once, as the humanAlias value').toBe(1);
    });

    it('should never use the alias inside KAT files (UP-1)', () => {
      const scoreKatRaw = readFileSync(join(rootDir, SCORE_KAT_FILE), 'utf-8');
      const decayKatRaw = readFileSync(join(rootDir, DECAY_KAT_FILE), 'utf-8');

      expect(scoreKatRaw.includes(HUMAN_ALIAS)).toBe(false);
      expect(decayKatRaw.includes(HUMAN_ALIAS)).toBe(false);
    });
  });

  describe('KAT Anchor Coverage (UP-11, literal data assertions)', () => {
    const scoreKat = loadJSON(SCORE_KAT_FILE);
    const decayKat = loadJSON(DECAY_KAT_FILE);

    it('should contain the D2 M2 golden anchor verbatim (uwrScore 0.1875)', () => {
      const golden = scoreKat.vectors.find(
        (v: any) => v.vectorId === 'uwr-score-d2m2-golden-anchor',
      );

      expect(golden).toBeDefined();
      expect(golden.axes).toEqual({ structure: 0.15, execution: 0, risk: 0.2, insight: 0.4 });
      expect(golden.expected.uwrScore).toBe(0.1875);
    });

    it('should cover every mandated uwrScore anchor', () => {
      const expectedScores = scoreKat.vectors.map((v: any) => v.expected.uwrScore);

      MANDATED_SCORE_ANCHORS.forEach((anchor) => {
        expect(expectedScores, `anchor ${anchor} must be present`).toContain(anchor);
      });
    });

    it('every score vector should serialize axes in the pinned order (UP-4)', () => {
      scoreKat.vectors.forEach((v: any) => {
        expect(Object.keys(v.axes), `vector ${v.vectorId} axes must be in pinned order`).toEqual(
          PINNED_AXES,
        );
      });
    });

    it('decay vectors should cover all four pinned half-lives with the full grid', () => {
      const halfLives = new Set(decayKat.vectors.map((v: any) => v.halfLifeMinutes));
      expect([...halfLives].sort((a: any, b: any) => a - b)).toEqual([8, 60, 720, 5040]);
      expect(decayKat.vectors.length).toBe(32);

      PINNED_TEMPLATES.forEach((template) => {
        const templateVectors = decayKat.vectors.filter(
          (v: any) => v.templateId === template.templateId,
        );
        expect(
          templateVectors.length,
          `${template.templateId} should carry 8 vectors (2 bases x 4 grid points)`,
        ).toBe(8);
      });
    });

    it('should include the golden-base swing anchor row verbatim (unknown-horizon default template)', () => {
      const anchorRow = decayKat.vectors.find((v: any) => v.vectorId === 'decay-swing-b01875-k1');

      expect(anchorRow).toBeDefined();
      expect(anchorRow.baseScore).toBe(0.1875);
      expect(anchorRow.elapsedMinutes).toBe(720);
      expect(anchorRow.expected.decayedScore).toBe(0.09375);
    });
  });

  describe('Profile Negative Tests (clone-and-mutate)', () => {
    const VALID_PROFILE = loadJSON(REGISTRY_FILE);

    it('should reject the superseded placeholder id as profileId (UP-2)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      invalid.profileId = 'uwr-default-stub';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.instancePath === '/profileId')).toBe(true);
    });

    it('should reject the human alias used as an identifier (UP-1)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      invalid.profileId = HUMAN_ALIAS;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.instancePath === '/profileId')).toBe(true);
    });

    it('should reject a missing profileId (UP-2)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      delete invalid.profileId;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.message?.includes('profileId'))).toBe(true);
    });

    it('should reject a wrong schema format version', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      invalid.schema = 'afi.uwr-profile.v1';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.instancePath === '/schema')).toBe(true);
    });

    it('should reject a wrong or missing x-afiStatus marker (UP-12)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      const wrongStatus: any = clone(VALID_PROFILE);
      wrongStatus['x-afiStatus'] = 'approved';
      expect(validate(wrongStatus)).toBe(false);

      const missingStatus: any = clone(VALID_PROFILE);
      delete missingStatus['x-afiStatus'];
      expect(validate(missingStatus)).toBe(false);
    });

    it('should reject a non-provisional status claim', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      invalid.status = 'production';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.instancePath === '/status')).toBe(true);
    });

    it('should reject any weight other than 0.25, including near-misses (UP-5)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      ['structureWeight', 'executionWeight', 'riskWeight', 'insightWeight'].forEach((weightKey) => {
        const invalid: any = clone(VALID_PROFILE);
        invalid.weights[weightKey] = 0.3;

        expect(validate(invalid), `weights.${weightKey} = 0.3 should be rejected`).toBe(false);
        expect(validate.errors!.some((e) => e.instancePath === `/weights/${weightKey}`)).toBe(true);
      });

      const nearMiss: any = clone(VALID_PROFILE);
      nearMiss.weights.insightWeight = 0.2499;
      expect(validate(nearMiss), 'near-miss weight 0.2499 should be rejected').toBe(false);
    });

    it('should reject a missing weight (UP-5)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      delete invalid.weights.insightWeight;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.message?.includes('insightWeight'))).toBe(true);
    });

    it('should reject an added fifth weight (UP-4 closed axis set)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      invalid.weights.momentumWeight = 0.25;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject axis-set mutations: drop, reorder, drift, extend (UP-4)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      const mutations: Record<string, string[]> = {
        'dropped insight': ['structure', 'execution', 'risk'],
        reordered: ['execution', 'structure', 'risk', 'insight'],
        'afi-gateway drift': ['utility', 'workQuality', 'rarity', 'insight'],
        'appended fifth axis': ['structure', 'execution', 'risk', 'insight', 'momentum'],
      };

      Object.entries(mutations).forEach(([label, axes]) => {
        const invalid: any = clone(VALID_PROFILE);
        invalid.axes = axes;

        expect(validate(invalid), `axes mutation '${label}' should be rejected`).toBe(false);
        expect(validate.errors!.some((e) => e.instancePath === '/axes')).toBe(true);
      });
    });

    it('should reject riskBucket taxonomy mutations, including the D2 example drift value (UP-6)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      const withModerate: any = clone(VALID_PROFILE);
      withModerate.outputSurface.riskBucketTaxonomy = ['low', 'moderate', 'high', 'extreme'];
      expect(validate(withModerate), `taxonomy containing 'moderate' should be rejected`).toBe(
        false,
      );

      const extended: any = clone(VALID_PROFILE);
      extended.outputSurface.riskBucketTaxonomy = [...PINNED_TAXONOMY, 'extreme-plus'];
      expect(validate(extended), 'extended taxonomy should be rejected').toBe(false);
    });

    it('should reject output-range mutations (UP-6)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      const badScoreMax: any = clone(VALID_PROFILE);
      badScoreMax.outputSurface.uwrScoreRange.max = 2;
      expect(validate(badScoreMax)).toBe(false);
      expect(
        validate.errors!.some((e) => e.instancePath === '/outputSurface/uwrScoreRange/max'),
      ).toBe(true);

      const badConvictionMin: any = clone(VALID_PROFILE);
      badConvictionMin.outputSurface.convictionRange.min = -1;
      expect(validate(badConvictionMin)).toBe(false);
    });

    it('should reject an engine swap (UP-3: whitepaper §7.3 combiner stays deferred)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      invalid.engine.function = 'whitepaperCombiner';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.instancePath === '/engine/function')).toBe(true);
    });

    it('should reject decay template mutations: half-life, id, thetaBias (UP-7)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      const halfLifeMutations: Array<[number, number]> = [
        [0, 9],
        [1, 90],
        [2, 480],
        [3, 10080],
      ];
      halfLifeMutations.forEach(([index, halfLife]) => {
        const invalid: any = clone(VALID_PROFILE);
        invalid.decaySurface.templates[index].halfLifeMinutes = halfLife;

        expect(
          validate(invalid),
          `templates[${index}].halfLifeMinutes = ${halfLife} should be rejected`,
        ).toBe(false);
        expect(validate.errors!.some((e) => e.instancePath === '/decaySurface/templates')).toBe(
          true,
        );
      });

      const badId: any = clone(VALID_PROFILE);
      badId.decaySurface.templates[0].templateId = 'decay-scalp-v2';
      expect(validate(badId)).toBe(false);

      const badTheta: any = clone(VALID_PROFILE);
      badTheta.decaySurface.templates[0].thetaBias = 0.9;
      expect(validate(badTheta)).toBe(false);
    });

    it('should reject non-pinned decay models and unit drift (UP-7)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      ['linear', 'cliff'].forEach((model) => {
        const invalid: any = clone(VALID_PROFILE);
        invalid.decaySurface.decayModel = model;

        expect(validate(invalid), `decayModel '${model}' should be rejected`).toBe(false);
        expect(validate.errors!.some((e) => e.instancePath === '/decaySurface/decayModel')).toBe(
          true,
        );
      });

      const hours: any = clone(VALID_PROFILE);
      hours.decaySurface.unit = 'hours';
      expect(validate(hours), `unit 'hours' should be rejected (pinned unit is minutes)`).toBe(
        false,
      );
      expect(validate.errors!.some((e) => e.instancePath === '/decaySurface/unit')).toBe(true);
    });

    it('should reject horizon-selection mutations (UP-7)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      const badLongTerm: any = clone(VALID_PROFILE);
      badLongTerm.decaySurface.horizonSelection.longTerm = 'decay-swing-v1';
      expect(validate(badLongTerm)).toBe(false);
      expect(
        validate.errors!.some((e) => e.instancePath === '/decaySurface/horizonSelection/longTerm'),
      ).toBe(true);

      const badUnknown: any = clone(VALID_PROFILE);
      badUnknown.decaySurface.horizonSelection.unknownOrMissing = 'decay-scalp-v1';
      expect(validate(badUnknown)).toBe(false);
    });

    it('should reject qualification value mutations (UP-9)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      const badThreshold: any = clone(VALID_PROFILE);
      badThreshold.qualification.minDecayScoreThreshold = 0.6;
      expect(validate(badThreshold)).toBe(false);
      expect(
        validate.errors!.some((e) => e.instancePath === '/qualification/minDecayScoreThreshold'),
      ).toBe(true);

      const badWindow: any = clone(VALID_PROFILE);
      badWindow.qualification.challengeWindowDurationHours = 48;
      expect(validate(badWindow)).toBe(false);
    });

    it(`should reject the 'challenge period' terminology variant as a field (UP-9)`, () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      invalid.qualification.challengePeriodDurationHours = 24;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject scorer identity mutations (UP-10)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      const badAnalyst: any = clone(VALID_PROFILE);
      badAnalyst.scorerIdentity.analystId = 'kermit';
      expect(validate(badAnalyst)).toBe(false);
      expect(validate.errors!.some((e) => e.instancePath === '/scorerIdentity/analystId')).toBe(
        true,
      );

      const badStrategy: any = clone(VALID_PROFILE);
      badStrategy.scorerIdentity.strategyId = 'trend_pullback_v2';
      expect(validate(badStrategy)).toBe(false);
    });

    it('should reject reputation/reward/learned-weight fields (§6: UWR MUST NOT be modified by reputation)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);

      const forbiddenFields: Record<string, unknown> = {
        rewardWeight: 2,
        reputationAdjustment: 1.1,
        analystWeightOverrides: { structureWeight: 0.4 },
        mintEligible: true,
        baselineRoleWeight: 0.5,
        learnedWeights: { structure: 0.4, execution: 0.2, risk: 0.2, insight: 0.2 },
      };

      Object.entries(forbiddenFields).forEach(([field, value]) => {
        const invalid: any = clone(VALID_PROFILE);
        invalid[field] = value;

        expect(validate(invalid), `profile should reject forbidden field '${field}'`).toBe(false);
      });
    });

    it('should reject a missing katRefs block (UP-11 gate)', () => {
      const validate = compileUwrSchema(PROFILE_SCHEMA);
      const invalid: any = clone(VALID_PROFILE);
      delete invalid.katRefs;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.message?.includes('katRefs'))).toBe(true);
    });
  });

  describe('KAT Negative Tests (clone-and-mutate)', () => {
    const VALID_SCORE_KAT = loadJSON(SCORE_KAT_FILE);
    const VALID_DECAY_KAT = loadJSON(DECAY_KAT_FILE);

    it('should reject the human alias as the KAT profileId (UP-1)', () => {
      const validate = compileUwrSchema(SCORE_KAT_SCHEMA);
      const invalid: any = clone(VALID_SCORE_KAT);
      invalid.profileId = HUMAN_ALIAS;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.instancePath === '/profileId')).toBe(true);
    });

    it('should reject score vectors with a missing or extra axis (UP-4)', () => {
      const validate = compileUwrSchema(SCORE_KAT_SCHEMA);

      const missingAxis: any = clone(VALID_SCORE_KAT);
      delete missingAxis.vectors[0].axes.insight;
      expect(validate(missingAxis)).toBe(false);

      const extraAxis: any = clone(VALID_SCORE_KAT);
      extraAxis.vectors[0].axes.momentum = 0.5;
      expect(validate(extraAxis)).toBe(false);
    });

    it('should reject an expected uwrScore outside [0, 1] (UP-6)', () => {
      const validate = compileUwrSchema(SCORE_KAT_SCHEMA);
      const invalid: any = clone(VALID_SCORE_KAT);
      invalid.vectors[0].expected.uwrScore = 1.5;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject a score vector without an expected block (UP-11)', () => {
      const validate = compileUwrSchema(SCORE_KAT_SCHEMA);
      const invalid: any = clone(VALID_SCORE_KAT);
      delete invalid.vectors[0].expected;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject tolerance fields at file and vector level (comparison policy is PR-UWR-KAT-EXEC scope)', () => {
      const validate = compileUwrSchema(SCORE_KAT_SCHEMA);

      const fileLevel: any = clone(VALID_SCORE_KAT);
      fileLevel.tolerance = 1e-9;
      expect(validate(fileLevel), 'file-level tolerance should be rejected').toBe(false);

      const vectorLevel: any = clone(VALID_SCORE_KAT);
      vectorLevel.vectors[0].tolerance = 1e-9;
      expect(validate(vectorLevel), 'vector-level tolerance should be rejected').toBe(false);
    });

    it('should reject decay vectors with an unknown template id (UP-7)', () => {
      const validate = compileUwrSchema(DECAY_KAT_SCHEMA);
      const invalid: any = clone(VALID_DECAY_KAT);
      invalid.vectors[0].templateId = 'decay-scalp-v2';

      expect(validate(invalid)).toBe(false);
    });

    it('should reject a template-id/half-life mismatch (UP-7)', () => {
      const validate = compileUwrSchema(DECAY_KAT_SCHEMA);
      const invalid: any = clone(VALID_DECAY_KAT);
      invalid.vectors[0].halfLifeMinutes = 60;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject an off-grid elapsedMinutes (dyadic exactness rule)', () => {
      const validate = compileUwrSchema(DECAY_KAT_SCHEMA);
      const invalid: any = clone(VALID_DECAY_KAT);
      invalid.vectors[0].elapsedMinutes = 12;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject an expected decayedScore outside [0, 1]', () => {
      const validate = compileUwrSchema(DECAY_KAT_SCHEMA);
      const invalid: any = clone(VALID_DECAY_KAT);
      invalid.vectors[0].expected.decayedScore = 1.5;

      expect(validate(invalid)).toBe(false);
    });

    it('should reject a non-exp decay model in the KAT engine block (UP-7)', () => {
      const validate = compileUwrSchema(DECAY_KAT_SCHEMA);
      const invalid: any = clone(VALID_DECAY_KAT);
      invalid.engine.decayModel = 'linear';

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.instancePath === '/engine/decayModel')).toBe(true);
    });

    it('should reject a thetaBias-consumed claim (UP-7: declared-but-not-consumed)', () => {
      const validate = compileUwrSchema(DECAY_KAT_SCHEMA);
      const invalid: any = clone(VALID_DECAY_KAT);
      invalid.templates[0].thetaBiasConsumed = true;

      expect(validate(invalid)).toBe(false);
      expect(validate.errors!.some((e) => e.instancePath === '/templates')).toBe(true);
    });
  });

  describe('District 2 Example Reconciliation (UP-6, example-only change)', () => {
    it('reconciled scored-signal example should still validate against the UNTOUCHED D2 schema', () => {
      const ajv = createAjv();
      // scored-signal.schema.json $refs canonical-hash.schema.json (D2 M1 family)
      ajv.addSchema(loadJSON('schemas/provenance/v1/canonical-hash.schema.json'));
      const validate = ajv.compile(loadJSON('schemas/provenance/v1/scored-signal.schema.json'));

      const example = loadJSON('examples/provenance/v1/scored-signal.example.json');
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid).toBe(true);
    });

    it('reconciled example riskBucket should be a member of the pinned taxonomy', () => {
      const example = loadJSON('examples/provenance/v1/scored-signal.example.json');
      expect(PINNED_TAXONOMY).toContain(example.riskBucket);
    });
  });
});
