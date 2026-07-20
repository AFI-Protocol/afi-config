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
 * FACTORY-CONTRACT — afi.analysis-plugin.v1 validation.
 *
 * Covers the governed plugin manifest contract (schemas/analysis-plugin/v1/),
 * its canonical example, and the positive/negative vectors under
 * examples/analysis-plugin/v1/vectors/. Authorized by
 * afi-governance/decisions/factory-configurable-pipelines-v1.
 *
 * BOUNDARY: schema/contract only — NO plugin loading, NO registry
 * implementation. The manifest binds to code via the runtime's BUILD-TIME
 * registry by pluginId+pluginVersion; filesystem paths are structurally
 * rejected and this suite proves it.
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

const PLUGIN_SCHEMA = 'schemas/analysis-plugin/v1/analysis-plugin.schema.json';
const PLUGIN_EXAMPLE = 'examples/analysis-plugin/v1/analysis-plugin.example.json';
const VALID_DIR = 'examples/analysis-plugin/v1/vectors/valid';
const INVALID_DIR = 'examples/analysis-plugin/v1/vectors/invalid';

const CATEGORIES = ['technical', 'pattern', 'sentiment', 'news', 'aiMl', 'merge', 'scorer'];
const EXPECTED_REQUIRED = [
  'schema',
  'pluginId',
  'pluginVersion',
  'implementationVersion',
  'category',
  'inputSchemaRef',
  'outputSchemaRef',
  'deterministic',
  'paramsSchema',
  'mayFeedScorer',
];

function compilePluginSchema() {
  return createAjv().compile(loadJSON(PLUGIN_SCHEMA));
}

describe('FACTORY-CONTRACT — afi.analysis-plugin.v1', () => {
  describe('Schema Compilation & Governed Metadata', () => {
    it('should compile the plugin manifest contract without errors', () => {
      expect(() => compilePluginSchema()).not.toThrow();
    });

    it('should carry the governed-contract status and required surface fields', () => {
      const schema = loadJSON(PLUGIN_SCHEMA);
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema.$id).toBe(
        'https://afi-protocol.org/schemas/analysis-plugin/v1/analysis-plugin.schema.json',
      );
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties.schema.const).toBe('afi.analysis-plugin.v1');
      expect([...schema.required].sort()).toEqual([...EXPECTED_REQUIRED].sort());
    });

    it('should fix the category vocabulary EXACTLY (matching the pipeline node categories)', () => {
      const schema = loadJSON(PLUGIN_SCHEMA);
      expect(schema.properties.category.enum).toEqual(CATEGORIES);
      const pipelineCategories = loadJSON('schemas/pipeline/v1/pipeline.schema.json').definitions
        .node.properties.category.enum;
      expect(schema.properties.category.enum).toEqual(pipelineCategories);
    });

    it('should expose NO filesystem/code-binding surface (build-time registry binding)', () => {
      const schema = loadJSON(PLUGIN_SCHEMA);
      ['entrypoint', 'path', 'module', 'file', 'main', 'dist', 'src'].forEach((p) =>
        expect(Object.keys(schema.properties), `must not define '${p}'`).not.toContain(p),
      );
      expect(Object.keys(schema['x-afiConstraints'])).toContain('buildTimeBinding');
    });
  });

  describe('Canonical Example & Valid Vectors', () => {
    it('canonical example should validate', () => {
      const validate = compilePluginSchema();
      const valid = validate(loadJSON(PLUGIN_EXAMPLE));
      if (!valid) console.error('example failure:', validate.errors);
      expect(valid).toBe(true);
    });

    it('every valid vector should validate (drift-guarded), covering analysis, merge, and scorer categories', () => {
      const files = readdirSync(join(rootDir, VALID_DIR))
        .filter((f) => f.endsWith('.json'))
        .sort();
      expect(files).toEqual([
        'merge-plugin.json',
        'provider-sentiment.json',
        'pure-technical.json',
        'scorer-plugin.json',
      ]);
      const validate = compilePluginSchema();
      const categories: string[] = [];
      files.forEach((f) => {
        const manifest = loadJSON(`${VALID_DIR}/${f}`);
        const valid = validate(manifest);
        if (!valid) console.error(`${f} failure:`, validate.errors);
        expect(valid, `${f} should validate`).toBe(true);
        categories.push(manifest.category);
      });
      ['sentiment', 'technical', 'merge', 'scorer'].forEach((c) =>
        expect(categories, `vectors must exercise category '${c}'`).toContain(c),
      );
    });

    it('the scorer plugin vector declares mayFeedScorer:false (a scorer is the sink, never a feeder)', () => {
      expect(loadJSON(`${VALID_DIR}/scorer-plugin.json`).mayFeedScorer).toBe(false);
    });
  });

  describe('Invalid Vectors', () => {
    const EXPECTED_FILES = [
      'bad-capability.json',
      'bad-plugin-version.json',
      'bad-retry-policy.json',
      'entrypoint-extra-property.json',
      'filesystem-path-ref.json',
      'missing-params-schema.json',
      'unknown-category.json',
    ];

    it('invalid vector set should be exactly the authorized files (drift guard)', () => {
      const files = readdirSync(join(rootDir, INVALID_DIR))
        .filter((f) => f.endsWith('.json'))
        .sort();
      expect(files).toEqual(EXPECTED_FILES);
    });

    it('every invalid vector should be rejected by the schema', () => {
      const validate = compilePluginSchema();
      EXPECTED_FILES.forEach((file) => {
        expect(validate(loadJSON(`${INVALID_DIR}/${file}`)), `${file} must be rejected`).toBe(
          false,
        );
      });
    });
  });

  describe('Structural Negatives (clone-and-mutate the canonical example)', () => {
    const BASE = loadJSON(PLUGIN_EXAMPLE);

    it('should reject a missing required field', () => {
      const validate = compilePluginSchema();
      EXPECTED_REQUIRED.forEach((field) => {
        const invalid: any = clone(BASE);
        delete invalid[field];
        expect(validate(invalid), `missing ${field} should be rejected`).toBe(false);
      });
    });

    it('should reject filesystem-path-like schema refs and accept governed identifiers', () => {
      const validate = compilePluginSchema();
      [
        './dist/plugin.js',
        'src/plugins/x.ts',
        '../afi-core/analysts/froggy.ts',
        'file:///etc/passwd',
        'C:\\plugins\\x.dll',
      ].forEach((bad) => {
        const invalid: any = clone(BASE);
        invalid.outputSchemaRef = bad;
        expect(validate(invalid), `outputSchemaRef ${bad} must be rejected`).toBe(false);
      });
      [
        'afi.usignal.v1.1',
        'afi.enrichment-bundle.v1',
        'https://afi-protocol.org/schemas/provenance/v1/scored-signal.schema.json',
      ].forEach((good) => {
        const record: any = clone(BASE);
        record.outputSchemaRef = good;
        expect(validate(record), `outputSchemaRef ${good} must be accepted`).toBe(true);
      });
    });

    it('should reject malformed capability grammar and permittedFailurePolicies values', () => {
      const validate = compilePluginSchema();
      const badCap: any = clone(BASE);
      badCap.capabilities = ['provider coinalyze'];
      expect(validate(badCap)).toBe(false);
      const dupCap: any = clone(BASE);
      dupCap.capabilities = ['provider:coinalyze', 'provider:coinalyze'];
      expect(validate(dupCap), 'duplicate capabilities must be rejected').toBe(false);
      const badPolicy: any = clone(BASE);
      badPolicy.permittedFailurePolicies = ['degrade', 'retry-forever'];
      expect(validate(badPolicy)).toBe(false);
      const emptyPolicy: any = clone(BASE);
      emptyPolicy.permittedFailurePolicies = [];
      expect(validate(emptyPolicy)).toBe(false);
    });

    it('should reject invalid orderingConstraints categories', () => {
      const validate = compilePluginSchema();
      const invalid: any = clone(BASE);
      invalid.orderingConstraints = { mustRunBefore: ['enrichment'] };
      expect(validate(invalid)).toBe(false);
    });

    it('should reject invalid defaultTimeoutMs and defaultRetryPolicy shapes', () => {
      const validate = compilePluginSchema();
      const badTimeout: any = clone(BASE);
      badTimeout.defaultTimeoutMs = 0;
      expect(validate(badTimeout)).toBe(false);
      const badRetry: any = clone(BASE);
      badRetry.defaultRetryPolicy = { retryDelayMs: 500 }; // maxRetries required
      expect(validate(badRetry)).toBe(false);
    });
  });
});
