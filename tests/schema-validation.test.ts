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
 * Create a fresh AJV instance for each test to avoid schema caching issues
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

/**
 * Load a JSON file from the repository
 */
function loadJSON(relativePath: string): any {
  const fullPath = join(rootDir, relativePath);
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get all schema files from the schemas directory (recursively)
 */
function getAllSchemaFiles(dir: string = 'schemas', prefix: string = ''): string[] {
  const fullDir = join(rootDir, dir);
  const entries = readdirSync(fullDir, { withFileTypes: true });

  let files: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      // Recursively get files from subdirectories
      files = files.concat(getAllSchemaFiles(join(dir, entry.name), relativePath));
    } else if (entry.name.endsWith('.schema.json')) {
      files.push(join('schemas', relativePath));
    }
  }

  return files;
}

describe('Schema Validation Tests', () => {
  describe('Schema Compilation', () => {
    it('should compile .afi-codex.schema.json without errors', () => {
      const ajv = createAjv();
      const schema = loadJSON('.afi-codex.schema.json');

      expect(() => {
        ajv.compile(schema);
      }).not.toThrow();

      const validate = ajv.compile(schema);
      expect(validate).toBeDefined();
      expect(typeof validate).toBe('function');
    });

    it('should compile all schemas in schemas/ directory without errors', () => {
      const ajv = createAjv();
      const schemaFiles = getAllSchemaFiles();

      expect(schemaFiles.length).toBeGreaterThan(0);

      // Preload schemas that other schemas reference via $ref, so cross-file
      // references resolve regardless of directory read order.
      const preloadSchemaFiles = [
        'schemas/provenance/v1/canonical-hash.schema.json',
        'schemas/provenance/v1/evidence-ref.schema.json',
        'schemas/provenance/v1/source-disclosure-profile.schema.json',
        'schemas/provenance/v1/enrichment-provenance.schema.json',
        // Composite provenance shapes reused by afi.scored-signal-evidence.v1/v2
        // (MONGO-CONTRACT / FACTORY-CONTRACT); preloaded so cross-file $refs
        // resolve regardless of directory read order.
        'schemas/provenance/v1/scored-signal.schema.json',
        'schemas/provenance/v1/provenance-record.schema.json',
        // Composition provenance stamp reused by afi.scored-signal-evidence.v2
        // (FACTORY-CONTRACT).
        'schemas/composition-ref/v1/composition-ref.schema.json',
      ];
      const preloadedSchemaFiles = new Set<string>();
      preloadSchemaFiles.forEach(schemaFile => {
        try {
          const schema = loadJSON(schemaFile);
          ajv.addSchema(schema);
          preloadedSchemaFiles.add(schemaFile);
        } catch (error) {
          // Schema might not exist yet, that's okay
        }
      });

      schemaFiles.forEach(schemaFile => {
        // Skip schemas that were already preloaded above
        if (preloadedSchemaFiles.has(schemaFile)) {
          return;
        }

        const schema = loadJSON(schemaFile);

        expect(() => {
          ajv.compile(schema);
        }, `Schema ${schemaFile} should compile without errors`).not.toThrow();
      });
    });
  });

  describe('Schema Structure', () => {
    it('all schemas should have required JSON Schema fields', () => {
      const schemaFiles = ['.afi-codex.schema.json', ...getAllSchemaFiles()];
      
      schemaFiles.forEach(schemaFile => {
        const schema = loadJSON(schemaFile);
        
        // Check for $schema field
        expect(schema.$schema, `${schemaFile} should have $schema field`).toBeDefined();
        expect(schema.$schema).toContain('json-schema.org');
        
        // Check for title
        expect(schema.title, `${schemaFile} should have title field`).toBeDefined();
        expect(typeof schema.title).toBe('string');
        
        // Check for type
        expect(schema.type, `${schemaFile} should have type field`).toBeDefined();
      });
    });

    it('all schemas should have $id field for proper referencing', () => {
      const schemaFiles = getAllSchemaFiles();
      
      schemaFiles.forEach(schemaFile => {
        const schema = loadJSON(schemaFile);
        
        // $id is recommended for schema referencing
        if (schema.$id) {
          expect(typeof schema.$id).toBe('string');
          expect(schema.$id.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Metadata Validation', () => {
    it('should validate .afi-codex.json against repo-metadata.schema.json', () => {
      const ajv = createAjv();
      const schema = loadJSON('schemas/repo-metadata.schema.json');
      const codex = loadJSON('.afi-codex.json');

      const validate = ajv.compile(schema);
      const valid = validate(codex);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, '.afi-codex.json should be valid according to repo-metadata.schema.json').toBe(true);
    });

    it('.afi-codex.json should have required AFI metadata fields', () => {
      const codex = loadJSON('.afi-codex.json');
      
      expect(codex.module).toBeDefined();
      expect(codex.module.name).toBe('afi-config');
      expect(codex.module.role).toBeDefined();
      expect(codex.entrypoints).toBeDefined();
      expect(Array.isArray(codex.entrypoints)).toBe(true);
      expect(codex.provides).toBeDefined();
      expect(Array.isArray(codex.provides)).toBe(true);
      expect(codex.dependsOn).toBeDefined();
      expect(Array.isArray(codex.dependsOn)).toBe(true);
    });
  });

  describe('Schema Content Validation', () => {
    it('character.schema.json should define required character fields', () => {
      const schema = loadJSON('schemas/character.schema.json');
      
      expect(schema.properties).toBeDefined();
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.name).toBeDefined();
      expect(schema.properties.role).toBeDefined();
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('role');
    });

    it('plugin-manifest.schema.json should define required plugin fields', () => {
      const schema = loadJSON('schemas/plugin-manifest.schema.json');
      
      expect(schema.properties).toBeDefined();
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.type).toBeDefined();
      expect(schema.properties.entrypoint).toBeDefined();
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('type');
      expect(schema.required).toContain('entrypoint');
    });

    it('vault.schema.json should define required vault fields', () => {
      const schema = loadJSON('schemas/vault.schema.json');

      expect(schema.properties).toBeDefined();
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.engine).toBeDefined();
      expect(schema.properties.database).toBeDefined();
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('engine');
      expect(schema.required).toContain('database');
    });
  });

  describe('USS Schema Validation', () => {
    it('should compile USS core schema without errors', () => {
      const ajv = createAjv();
      const schema = loadJSON('schemas/usignal/v1/core.schema.json');

      expect(() => {
        ajv.compile(schema);
      }).not.toThrow();

      const validate = ajv.compile(schema);
      expect(validate).toBeDefined();
    });

    it('should compile USS index schema without errors', () => {
      const ajv = createAjv();
      // Load core schema first so $ref can resolve
      const coreSchema = loadJSON('schemas/usignal/v1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1/index.schema.json');

      expect(() => {
        ajv.compile(schema);
      }).not.toThrow();
    });

    it('should compile all USS lens schemas without errors', () => {
      const ajv = createAjv();
      const lensSchemas = [
        'schemas/usignal/v1/lenses/equity.lens.schema.json',
        'schemas/usignal/v1/lenses/strategy.lens.schema.json',
        'schemas/usignal/v1/lenses/macro.lens.schema.json',
        'schemas/usignal/v1/lenses/onchain.lens.schema.json',
      ];

      lensSchemas.forEach(schemaFile => {
        const schema = loadJSON(schemaFile);

        expect(() => {
          ajv.compile(schema);
        }, `Lens schema ${schemaFile} should compile without errors`).not.toThrow();
      });
    });

    it('should validate basic-core-only.example.json against USS index schema', () => {
      const ajv = createAjv();
      // Load core schema first
      const coreSchema = loadJSON('schemas/usignal/v1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1/index.schema.json');
      const example = loadJSON('examples/usignal/basic-core-only.example.json');

      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, 'basic-core-only.example.json should be valid USS').toBe(true);
    });

    it('should validate equity-lens.example.json against USS index schema', () => {
      const ajv = createAjv();
      // Load core schema first
      const coreSchema = loadJSON('schemas/usignal/v1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1/index.schema.json');
      const example = loadJSON('examples/usignal/equity-lens.example.json');

      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, 'equity-lens.example.json should be valid USS').toBe(true);
    });

    it('should validate strategy-lens.example.json against USS index schema', () => {
      const ajv = createAjv();
      // Load core schema first
      const coreSchema = loadJSON('schemas/usignal/v1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1/index.schema.json');
      const example = loadJSON('examples/usignal/strategy-lens.example.json');

      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, 'strategy-lens.example.json should be valid USS').toBe(true);
    });

    it('should validate multi-lens.example.json against USS index schema', () => {
      const ajv = createAjv();
      // Load core schema first
      const coreSchema = loadJSON('schemas/usignal/v1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1/index.schema.json');
      const example = loadJSON('examples/usignal/multi-lens.example.json');

      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, 'multi-lens.example.json should be valid USS').toBe(true);
    });

    it('USS core schema should have expected fields', () => {
      const schema = loadJSON('schemas/usignal/v1/core.schema.json');

      expect(schema.properties).toBeDefined();
      expect(schema.properties.cashProxy).toBeDefined();
      expect(schema.properties.measurement).toBeDefined();
      expect(schema.properties.frictions).toBeDefined();
      expect(schema.properties.telemetry).toBeDefined();
      expect(schema.properties.telemetry.properties.decay).toBeDefined();
      expect(schema.properties.telemetry.properties.greeks).toBeDefined();
    });

    it('USS index schema should require schema and provenance', () => {
      const schema = loadJSON('schemas/usignal/v1/index.schema.json');

      expect(schema.required).toBeDefined();
      expect(schema.required).toContain('schema');
      expect(schema.required).toContain('provenance');
      expect(schema.properties.lens).toBeDefined();
      expect(schema.properties.lens.enum).toContain('equity');
      expect(schema.properties.lens.enum).toContain('strategy');
      expect(schema.properties.lens.enum).toContain('macro');
      expect(schema.properties.lens.enum).toContain('onchain');
    });
  });

  describe('USS v1.1 Runtime Canon Validation', () => {
    it('should compile USS v1.1 core schema without errors', () => {
      const ajv = createAjv();
      const schema = loadJSON('schemas/usignal/v1_1/core.schema.json');

      expect(() => {
        ajv.compile(schema);
      }).not.toThrow();

      const validate = ajv.compile(schema);
      expect(validate).toBeDefined();
    });

    it('should compile USS v1.1 index schema without errors', () => {
      const ajv = createAjv();
      // Load core schema first so $ref can resolve
      const coreSchema = loadJSON('schemas/usignal/v1_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1_1/index.schema.json');

      expect(() => {
        ajv.compile(schema);
      }).not.toThrow();
    });

    it('should validate minimal-runtime.example.json against USS v1.1 index schema', () => {
      const ajv = createAjv();
      // Load core schema first
      const coreSchema = loadJSON('schemas/usignal/v1_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1_1/index.schema.json');
      const example = loadJSON('examples/usignal/v1_1/minimal-runtime.example.json');

      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, 'minimal-runtime.example.json should be valid USS v1.1').toBe(true);
    });

    it('should validate tradingview-ingest.example.json against USS v1.1 index schema', () => {
      const ajv = createAjv();
      // Load core schema first
      const coreSchema = loadJSON('schemas/usignal/v1_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1_1/index.schema.json');
      const example = loadJSON('examples/usignal/v1_1/tradingview-ingest.example.json');

      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, 'tradingview-ingest.example.json should be valid USS v1.1').toBe(true);
    });

    it('USS v1.1 index schema should require providerId and signalId in provenance', () => {
      const schema = loadJSON('schemas/usignal/v1_1/index.schema.json');

      expect(schema.properties.provenance).toBeDefined();
      expect(schema.properties.provenance.required).toBeDefined();
      expect(schema.properties.provenance.required).toContain('source');
      expect(schema.properties.provenance.required).toContain('providerId');
      expect(schema.properties.provenance.required).toContain('signalId');
      expect(schema.properties.provenance.properties.providerId).toBeDefined();
      expect(schema.properties.provenance.properties.signalId).toBeDefined();
      expect(schema.properties.provenance.properties.ingestedAt).toBeDefined();
      expect(schema.properties.provenance.properties.ingestHash).toBeDefined();
    });

    it('should reject USS v1.1 payload missing providerId', () => {
      const ajv = createAjv();
      const coreSchema = loadJSON('schemas/usignal/v1_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1_1/index.schema.json');
      const validate = ajv.compile(schema);

      const invalidPayload = {
        schema: 'afi.usignal.v1.1',
        provenance: {
          source: 'test',
          signalId: 'test-123'
          // Missing providerId
        }
      };

      const valid = validate(invalidPayload);
      expect(valid).toBe(false);
      expect(validate.errors).toBeDefined();
      expect(validate.errors!.some(e => e.message?.includes('providerId'))).toBe(true);
    });

    it('should reject USS v1.1 payload missing signalId', () => {
      const ajv = createAjv();
      const coreSchema = loadJSON('schemas/usignal/v1_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/usignal/v1_1/index.schema.json');
      const validate = ajv.compile(schema);

      const invalidPayload = {
        schema: 'afi.usignal.v1.1',
        provenance: {
          source: 'test',
          providerId: 'provider-123'
          // Missing signalId
        }
      };

      const valid = validate(invalidPayload);
      expect(valid).toBe(false);
      expect(validate.errors).toBeDefined();
      expect(validate.errors!.some(e => e.message?.includes('signalId'))).toBe(true);
    });
  });

  describe('CPJ v0.1 Schema Validation', () => {
    it('should compile CPJ v0.1 core schema without errors', () => {
      const ajv = createAjv();
      const schema = loadJSON('schemas/cpj/v0_1/core.schema.json');

      expect(() => {
        ajv.compile(schema);
      }).not.toThrow();

      const validate = ajv.compile(schema);
      expect(validate).toBeDefined();
    });

    it('should compile CPJ v0.1 index schema without errors', () => {
      const ajv = createAjv();
      // Load core schema first so $ref can resolve
      const coreSchema = loadJSON('schemas/cpj/v0_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/cpj/v0_1/index.schema.json');

      expect(() => {
        ajv.compile(schema);
      }).not.toThrow();
    });

    it('should validate telegram-blofin-perp.example.json against CPJ v0.1 schema', () => {
      const ajv = createAjv();
      const coreSchema = loadJSON('schemas/cpj/v0_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/cpj/v0_1/index.schema.json');
      const example = loadJSON('examples/cpj/v0_1/telegram-blofin-perp.example.json');

      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, 'telegram-blofin-perp.example.json should be valid CPJ v0.1').toBe(true);
    });

    it('should validate telegram-coinbase-spot.example.json against CPJ v0.1 schema', () => {
      const ajv = createAjv();
      const coreSchema = loadJSON('schemas/cpj/v0_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/cpj/v0_1/index.schema.json');
      const example = loadJSON('examples/cpj/v0_1/telegram-coinbase-spot.example.json');

      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, 'telegram-coinbase-spot.example.json should be valid CPJ v0.1').toBe(true);
    });

    it('should validate discord-signal.example.json against CPJ v0.1 schema', () => {
      const ajv = createAjv();
      const coreSchema = loadJSON('schemas/cpj/v0_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/cpj/v0_1/index.schema.json');
      const example = loadJSON('examples/cpj/v0_1/discord-signal.example.json');

      const validate = ajv.compile(schema);
      const valid = validate(example);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid, 'discord-signal.example.json should be valid CPJ v0.1').toBe(true);
    });

    it('CPJ v0.1 schema should require provenance, extracted, and parse fields', () => {
      const schema = loadJSON('schemas/cpj/v0_1/core.schema.json');

      expect(schema.required).toBeDefined();
      expect(schema.required).toContain('schema');
      expect(schema.required).toContain('provenance');
      expect(schema.required).toContain('extracted');
      expect(schema.required).toContain('parse');
    });

    it('should reject CPJ v0.1 payload missing required provenance fields', () => {
      const ajv = createAjv();
      const coreSchema = loadJSON('schemas/cpj/v0_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/cpj/v0_1/index.schema.json');
      const validate = ajv.compile(schema);

      const invalidPayload = {
        schema: 'afi.cpj.v0.1',
        provenance: {
          providerType: 'telegram',
          // Missing providerId, messageId, postedAt
        },
        extracted: {
          symbolRaw: 'BTCUSDT',
          side: 'long'
        },
        parse: {
          parserId: 'test-parser',
          parserVersion: '1.0.0',
          confidence: 0.9
        }
      };

      const valid = validate(invalidPayload);
      expect(valid).toBe(false);
      expect(validate.errors).toBeDefined();
    });

    it('should reject CPJ v0.1 payload with invalid side value', () => {
      const ajv = createAjv();
      const coreSchema = loadJSON('schemas/cpj/v0_1/core.schema.json');
      ajv.addSchema(coreSchema);

      const schema = loadJSON('schemas/cpj/v0_1/index.schema.json');
      const validate = ajv.compile(schema);

      const invalidPayload = {
        schema: 'afi.cpj.v0.1',
        provenance: {
          providerType: 'telegram',
          providerId: 'test-channel',
          messageId: 'msg-123',
          postedAt: '2024-12-16T10:00:00Z'
        },
        extracted: {
          symbolRaw: 'BTCUSDT',
          side: 'invalid-side' // Invalid value
        },
        parse: {
          parserId: 'test-parser',
          parserVersion: '1.0.0',
          confidence: 0.9
        }
      };

      const valid = validate(invalidPayload);
      expect(valid).toBe(false);
      expect(validate.errors).toBeDefined();
    });
  });
});

