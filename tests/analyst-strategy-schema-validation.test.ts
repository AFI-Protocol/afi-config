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
 * FACTORY-CONTRACT — afi.analyst-strategy-config.v1 +
 * afi.analyst-strategy-registration.v1 + afi.provider-strategy-binding.v1.
 *
 * Covers the three strategy-selection contracts, their canonical examples, and
 * the vectors under examples/<family>/v1/vectors/. Authorized by
 * afi-governance/decisions/factory-configurable-pipelines-v1.
 *
 * Two-layer admission (house pattern): admissible = schema-valid AND clean
 * under the governed cross-field constraints JSON Schema draft-07 cannot
 * express (D-OBJ-3 strategyId embedded-major agreement; binding
 * defaultStrategy membership).
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

const CANONICAL_HASH_SCHEMA = 'schemas/provenance/v1/canonical-hash.schema.json';
const CONFIG_SCHEMA = 'schemas/analyst-strategy-config/v1/analyst-strategy-config.schema.json';
const REGISTRATION_SCHEMA = 'schemas/analyst-strategy-registration/v1/analyst-strategy-registration.schema.json';
const BINDING_SCHEMA = 'schemas/provider-strategy-binding/v1/provider-strategy-binding.schema.json';

const CONFIG_EXAMPLE = 'examples/analyst-strategy-config/v1/analyst-strategy-config.example.json';
const REGISTRATION_EXAMPLE = 'examples/analyst-strategy-registration/v1/analyst-strategy-registration.example.json';
const BINDING_EXAMPLE = 'examples/provider-strategy-binding/v1/provider-strategy-binding.example.json';

function compileWithHash(schemaFile: string) {
  const ajv = createAjv();
  ajv.addSchema(loadJSON(CANONICAL_HASH_SCHEMA));
  return ajv.compile(loadJSON(schemaFile));
}

// ---------------------------------------------------------------------------
// Governed cross-field constraints (x-afiConstraints).
// ---------------------------------------------------------------------------

/** D-OBJ-3: strategyId's embedded major (trailing _v<major>) == strategyVersion major. */
function majorAgreementViolations(triple: { strategyId?: string; strategyVersion?: string }): string[] {
  const v: string[] = [];
  const idMajor = /_v(\d+)$/.exec(triple.strategyId ?? '')?.[1];
  const versionMajor = /^(\d+)\./.exec(triple.strategyVersion ?? '')?.[1];
  if (idMajor === undefined || versionMajor === undefined || idMajor !== versionMajor) {
    v.push(
      `strategyId embedded major (${idMajor ?? 'none'}) != strategyVersion major (${versionMajor ?? 'none'})`
    );
  }
  return v;
}

function bindingViolations(b: any): string[] {
  const v: string[] = [];
  for (const triple of b?.allowedStrategies ?? []) v.push(...majorAgreementViolations(triple));
  if (b?.defaultStrategy) {
    v.push(...majorAgreementViolations(b.defaultStrategy));
    const member = (b.allowedStrategies ?? []).some(
      (t: any) =>
        t.analystId === b.defaultStrategy.analystId &&
        t.strategyId === b.defaultStrategy.strategyId &&
        t.strategyVersion === b.defaultStrategy.strategyVersion
    );
    if (!member) v.push('defaultStrategy is not a member of allowedStrategies');
  }
  return v;
}

function admit(validate: any, record: any, semanticViolations: string[]) {
  const schemaValid = validate(record) as boolean;
  return {
    schemaValid,
    semanticOk: semanticViolations.length === 0,
    violations: semanticViolations,
    ok: schemaValid && semanticViolations.length === 0,
  };
}

/** canonical-json-hashing.v1 reference implementation (spec §2). */
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
function canonicalSha256(obj: any, excluded: string[]): string {
  const stripped: any = {};
  Object.keys(obj).forEach(k => {
    if (!excluded.includes(k)) stripped[k] = obj[k];
  });
  return createHash('sha256').update(Buffer.from(canonicalize(stripped), 'utf-8')).digest('hex');
}

describe('FACTORY-CONTRACT — afi.analyst-strategy-config.v1', () => {
  const VALID_DIR = 'examples/analyst-strategy-config/v1/vectors/valid';
  const INVALID_DIR = 'examples/analyst-strategy-config/v1/vectors/invalid';

  describe('Schema Compilation & Governed Metadata', () => {
    it('should compile without errors (reusing the governed CanonicalHash shape)', () => {
      expect(() => compileWithHash(CONFIG_SCHEMA)).not.toThrow();
    });

    it('should pin the D-OBJ-3 triple formats structurally', () => {
      const schema = loadJSON(CONFIG_SCHEMA);
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema.properties.schema.const).toBe('afi.analyst-strategy-config.v1');
      expect(schema.properties.analystId.pattern).toBe('^[a-z0-9-]+$');
      expect(schema.properties.strategyId.pattern).toBe('^[a-z][a-z0-9]*(_[a-z0-9]+)*_v(0|[1-9]\\d*)$');
      // semver WITHOUT v prefix — the D-OBJ-3 format, unlike pipelineVersion.
      expect(schema.properties.strategyVersion.pattern).toBe(
        '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'
      );
    });

    it('should require the full selection surface and reuse CanonicalHash by $ref', () => {
      const schema = loadJSON(CONFIG_SCHEMA);
      expect([...schema.required].sort()).toEqual(
        ['schema', 'analystId', 'strategyId', 'strategyVersion', 'pipelineRef', 'scorerRef', 'uwrProfileRef', 'decayConfig'].sort()
      );
      expect(schema.properties.pipelineRef.properties.manifestHash.$ref).toBe(
        'https://afi-protocol.org/schemas/provenance/v1/canonical-hash.schema.json'
      );
      expect(Object.keys(schema['x-afiConstraints'])).toContain('strategyIdMajorAgreement');
      expect(Object.keys(schema['x-afiConstraints'])).toContain('boundedOverrides');
    });
  });

  describe('Canonical Example & Vectors', () => {
    it('canonical example should be admissible, and its manifestHash pins the canonical pipeline example', () => {
      const validate = compileWithHash(CONFIG_SCHEMA);
      const config = loadJSON(CONFIG_EXAMPLE);
      const result = admit(validate, config, majorAgreementViolations(config));
      if (!result.ok) console.error('config example failure:', validate.errors, result.violations);
      expect(result.ok).toBe(true);
      // Chain coherence: the pinned hash IS the canonical hash of the pipeline example
      // (canonical-json-hashing.v1: description/metadata excluded).
      const pipeline = loadJSON('examples/pipeline/v1/pipeline.example.json');
      expect(config.pipelineRef.manifestHash.value).toBe(
        canonicalSha256(pipeline, ['description', 'metadata'])
      );
      // Scorer agreement with the referenced pipeline's single scorer node.
      const scorerNode = pipeline.nodes.find((n: any) => n.category === 'scorer');
      expect(config.scorerRef.pluginId).toBe(scorerNode.pluginId);
      expect(config.scorerRef.pluginVersion).toBe(scorerNode.pluginVersion);
    });

    it('every valid vector should be admissible (drift-guarded), covering BOTH decayConfig forms', () => {
      const files = readdirSync(join(rootDir, VALID_DIR)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(['inline-decay.json', 'ref-decay.json']);
      const validate = compileWithHash(CONFIG_SCHEMA);
      const forms: string[] = [];
      files.forEach(f => {
        const config = loadJSON(`${VALID_DIR}/${f}`);
        const result = admit(validate, config, majorAgreementViolations(config));
        if (!result.ok) console.error(`${f} failure:`, validate.errors, result.violations);
        expect(result.ok, `${f} should be admissible`).toBe(true);
        forms.push(Object.keys(config.decayConfig)[0]);
      });
      expect(forms.sort()).toEqual(['inline', 'ref']);
    });

    it('every invalid vector should be inadmissible, at the expected layer', () => {
      const EXPECTED: Record<string, { schemaValid: boolean; semanticOk: boolean }> = {
        'strategy-version-v-prefix.json': { schemaValid: false, semanticOk: false },
        'strategy-id-major-mismatch.json': { schemaValid: true, semanticOk: false },
        'bad-analyst-id.json': { schemaValid: false, semanticOk: true },
        'bad-strategy-id-format.json': { schemaValid: false, semanticOk: false },
        'decay-both-forms.json': { schemaValid: false, semanticOk: true },
        'decay-bad-halflife.json': { schemaValid: false, semanticOk: true },
        'missing-manifest-hash.json': { schemaValid: false, semanticOk: true },
        'node-override-bad-shape.json': { schemaValid: false, semanticOk: true },
        'extra-properties.json': { schemaValid: false, semanticOk: true },
      };
      const files = readdirSync(join(rootDir, INVALID_DIR)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(Object.keys(EXPECTED).sort());
      const validate = compileWithHash(CONFIG_SCHEMA);
      Object.entries(EXPECTED).forEach(([file, expected]) => {
        const config = loadJSON(`${INVALID_DIR}/${file}`);
        const result = admit(validate, config, majorAgreementViolations(config));
        expect(result.ok, `${file} must NOT be admissible`).toBe(false);
        expect(result.schemaValid, `${file} schema layer`).toBe(expected.schemaValid);
        expect(result.semanticOk, `${file} semantic layer`).toBe(expected.semanticOk);
      });
    });

    it('should reject a missing required field (clone-and-mutate)', () => {
      const validate = compileWithHash(CONFIG_SCHEMA);
      const BASE = loadJSON(CONFIG_EXAMPLE);
      loadJSON(CONFIG_SCHEMA).required.forEach((field: string) => {
        const invalid: any = clone(BASE);
        delete invalid[field];
        expect(validate(invalid), `missing ${field} should be rejected`).toBe(false);
      });
    });
  });
});

describe('FACTORY-CONTRACT — afi.analyst-strategy-registration.v1', () => {
  const VALID_DIR = 'examples/analyst-strategy-registration/v1/vectors/valid';
  const INVALID_DIR = 'examples/analyst-strategy-registration/v1/vectors/invalid';

  describe('Schema Compilation & Governed Metadata', () => {
    it('should compile without errors and pin the entry surface', () => {
      expect(() => compileWithHash(REGISTRATION_SCHEMA)).not.toThrow();
      const schema = loadJSON(REGISTRATION_SCHEMA);
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema.properties.schema.const).toBe('afi.analyst-strategy-registration.v1');
      expect([...schema.required].sort()).toEqual(
        [
          'schema',
          'analystId',
          'strategyId',
          'strategyVersion',
          'analystConfigHash',
          'configRef',
          'providerBindingPolicy',
          'status',
          'registeredAt',
          'registrationRef',
        ].sort()
      );
      expect(schema.properties.status.enum).toEqual(['active', 'inactive']);
      expect(schema.properties.providerBindingPolicy.properties.mode.enum).toEqual([
        'explicit',
        'any-authenticated',
      ]);
    });

    it('registeredAt is declared administrative and excluded from canonical hash material', () => {
      const schema = loadJSON(REGISTRATION_SCHEMA);
      expect(schema.properties.registeredAt.format).toBe('date');
      expect(JSON.stringify(schema['x-afiConstraints'].hashExclusions)).toContain('registeredAt');
    });
  });

  describe('Canonical Example & Vectors', () => {
    it('canonical example should be admissible, and its analystConfigHash pins the exact config example (configRef resolution)', () => {
      const validate = compileWithHash(REGISTRATION_SCHEMA);
      const reg = loadJSON(REGISTRATION_EXAMPLE);
      const result = admit(validate, reg, majorAgreementViolations(reg));
      if (!result.ok) console.error('registration example failure:', validate.errors, result.violations);
      expect(result.ok).toBe(true);
      // configRef resolution (x-afiConstraints.configResolution), realized here:
      // the referenced config artifact's canonical hash (metadata excluded) must
      // equal analystConfigHash.value, and the triples must agree.
      const configRel = reg.configRef.replace(/^afi-config\//, '');
      const config = loadJSON(configRel);
      expect(reg.analystConfigHash.value).toBe(canonicalSha256(config, ['metadata']));
      expect(config.analystId).toBe(reg.analystId);
      expect(config.strategyId).toBe(reg.strategyId);
      expect(config.strategyVersion).toBe(reg.strategyVersion);
    });

    it('every valid vector should be admissible (drift-guarded), covering BOTH binding-policy modes, with resolving configRefs', () => {
      const files = readdirSync(join(rootDir, VALID_DIR)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(['any-authenticated.json', 'explicit-bindings.json']);
      const validate = compileWithHash(REGISTRATION_SCHEMA);
      const modes: string[] = [];
      files.forEach(f => {
        const reg = loadJSON(`${VALID_DIR}/${f}`);
        const result = admit(validate, reg, majorAgreementViolations(reg));
        if (!result.ok) console.error(`${f} failure:`, validate.errors, result.violations);
        expect(result.ok, `${f} should be admissible`).toBe(true);
        modes.push(reg.providerBindingPolicy.mode);
        const config = loadJSON(reg.configRef.replace(/^afi-config\//, ''));
        expect(reg.analystConfigHash.value, `${f} hash pin`).toBe(canonicalSha256(config, ['metadata']));
      });
      expect(modes.sort()).toEqual(['any-authenticated', 'explicit']);
    });

    it('every invalid vector should be inadmissible, at the expected layer', () => {
      const EXPECTED: Record<string, { schemaValid: boolean; semanticOk: boolean }> = {
        'unknown-status.json': { schemaValid: false, semanticOk: true },
        'explicit-without-allowed-bindings.json': { schemaValid: false, semanticOk: true },
        'bad-config-hash.json': { schemaValid: false, semanticOk: true },
        'bad-registered-at.json': { schemaValid: false, semanticOk: true },
        'strategy-id-major-mismatch.json': { schemaValid: true, semanticOk: false },
        'extra-properties.json': { schemaValid: false, semanticOk: true },
      };
      const files = readdirSync(join(rootDir, INVALID_DIR)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(Object.keys(EXPECTED).sort());
      const validate = compileWithHash(REGISTRATION_SCHEMA);
      Object.entries(EXPECTED).forEach(([file, expected]) => {
        const reg = loadJSON(`${INVALID_DIR}/${file}`);
        const result = admit(validate, reg, majorAgreementViolations(reg));
        expect(result.ok, `${file} must NOT be admissible`).toBe(false);
        expect(result.schemaValid, `${file} schema layer`).toBe(expected.schemaValid);
        expect(result.semanticOk, `${file} semantic layer`).toBe(expected.semanticOk);
      });
    });
  });

  describe('Analyst Strategy Registry Scope Guard', () => {
    it('registries/analyst-strategies should contain EXACTLY the seeded froggy registration (drift guard)', () => {
      // Seeded under the FLPR-GOV five-lane provider runtime (D-FCP-5 generic
      // registration rule); validated in depth by
      // tests/registries-seeding-validation.test.ts.
      const files = readdirSync(join(rootDir, 'registries/analyst-strategies')).sort();
      expect(files).toEqual([
        'README.md',
        'froggy--trend_pullback_v1--1.1.0.config.json',
        'froggy--trend_pullback_v1--1.1.0.json',
      ]);
    });
  });
});

describe('FACTORY-CONTRACT — afi.provider-strategy-binding.v1', () => {
  const VALID_DIR = 'examples/provider-strategy-binding/v1/vectors/valid';
  const INVALID_DIR = 'examples/provider-strategy-binding/v1/vectors/invalid';

  describe('Schema Compilation & Governed Metadata', () => {
    it('should compile without errors and pin the routing surface', () => {
      expect(() => compileWithHash(BINDING_SCHEMA)).not.toThrow();
      const schema = loadJSON(BINDING_SCHEMA);
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema.properties.schema.const).toBe('afi.provider-strategy-binding.v1');
      expect(schema.properties.providerType.enum).toEqual(['webhook', 'cpj', 'gateway']);
      expect(schema.properties.authenticatedBy.enum).toEqual([
        'route-secret',
        'gateway-tenant',
        'integration-key',
      ]);
      expect(schema.properties.allowedStrategies.minItems).toBe(1);
      expect(Object.keys(schema['x-afiConstraints'])).toContain('defaultMembership');
      expect(Object.keys(schema['x-afiConstraints'])).toContain('noSecretMaterial');
    });
  });

  describe('Canonical Example & Vectors', () => {
    it('canonical example should be admissible and cross-link the registration example', () => {
      const validate = compileWithHash(BINDING_SCHEMA);
      const binding = loadJSON(BINDING_EXAMPLE);
      const result = admit(validate, binding, bindingViolations(binding));
      if (!result.ok) console.error('binding example failure:', validate.errors, result.violations);
      expect(result.ok).toBe(true);
      // Cross-artifact coherence with the registration example (bindingResolution):
      const reg = loadJSON(REGISTRATION_EXAMPLE);
      expect(reg.providerBindingPolicy.allowedBindings).toContain(binding.bindingId);
      expect(
        binding.allowedStrategies.some(
          (t: any) =>
            t.analystId === reg.analystId &&
            t.strategyId === reg.strategyId &&
            t.strategyVersion === reg.strategyVersion
        )
      ).toBe(true);
    });

    it('every valid vector should be admissible (drift-guarded), with and without defaultStrategy', () => {
      const files = readdirSync(join(rootDir, VALID_DIR)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(['gateway-no-default.json', 'webhook-default.json']);
      const validate = compileWithHash(BINDING_SCHEMA);
      files.forEach(f => {
        const binding = loadJSON(`${VALID_DIR}/${f}`);
        const result = admit(validate, binding, bindingViolations(binding));
        if (!result.ok) console.error(`${f} failure:`, validate.errors, result.violations);
        expect(result.ok, `${f} should be admissible`).toBe(true);
      });
      expect(loadJSON(`${VALID_DIR}/webhook-default.json`).defaultStrategy).toBeDefined();
      expect(loadJSON(`${VALID_DIR}/gateway-no-default.json`).defaultStrategy).toBeUndefined();
    });

    it('every invalid vector should be inadmissible, at the expected layer', () => {
      const EXPECTED: Record<string, { schemaValid: boolean; semanticOk: boolean }> = {
        'default-not-in-allowed.json': { schemaValid: true, semanticOk: false },
        'unknown-provider-type.json': { schemaValid: false, semanticOk: true },
        'unknown-auth-class.json': { schemaValid: false, semanticOk: true },
        'empty-allowed-strategies.json': { schemaValid: false, semanticOk: false },
        'bad-triple-version.json': { schemaValid: false, semanticOk: false },
        'secret-material-extra-property.json': { schemaValid: false, semanticOk: true },
      };
      const files = readdirSync(join(rootDir, INVALID_DIR)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(Object.keys(EXPECTED).sort());
      const validate = compileWithHash(BINDING_SCHEMA);
      Object.entries(EXPECTED).forEach(([file, expected]) => {
        const binding = loadJSON(`${INVALID_DIR}/${file}`);
        const result = admit(validate, binding, bindingViolations(binding));
        expect(result.ok, `${file} must NOT be admissible`).toBe(false);
        expect(result.schemaValid, `${file} schema layer`).toBe(expected.schemaValid);
        expect(result.semanticOk, `${file} semantic layer`).toBe(expected.semanticOk);
      });
    });

    it('should reject a missing required field (clone-and-mutate)', () => {
      const validate = compileWithHash(BINDING_SCHEMA);
      const BASE = loadJSON(BINDING_EXAMPLE);
      loadJSON(BINDING_SCHEMA).required.forEach((field: string) => {
        const invalid: any = clone(BASE);
        delete invalid[field];
        expect(validate(invalid), `missing ${field} should be rejected`).toBe(false);
      });
    });
  });
});
