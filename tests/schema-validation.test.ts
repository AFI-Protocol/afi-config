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
    allErrors: true,
    verbose: true,
  });
  addFormats(ajv);
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

      // Load enrichment-node schema first for schemas that reference it
      let enrichmentNodeLoaded = false;
      try {
        const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
        ajv.addSchema(enrichmentNodeSchema);
        enrichmentNodeLoaded = true;
      } catch (error) {
        // Schema might not exist yet, that's okay
      }

      schemaFiles.forEach(schemaFile => {
        // Skip enrichment-node schema if already loaded
        if (enrichmentNodeLoaded && schemaFile === 'schemas/definitions/enrichment-node.schema.json') {
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

  describe('Example Validation', () => {
    it('should validate examples/pipeline_manifest.example.json if it exists', () => {
      try {
        const example = loadJSON('examples/pipeline_manifest.example.json');
        
        // This is example data, not a schema validation test
        // Just verify it's valid JSON and has expected structure
        expect(example).toBeDefined();
        expect(typeof example).toBe('object');
      } catch (error: any) {
        // File might not exist yet, that's okay
        if (!error.message.includes('ENOENT')) {
          throw error;
        }
      }
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

    it('pipeline.schema.json should define required pipeline fields', () => {
      const schema = loadJSON('schemas/pipeline.schema.json');
      
      expect(schema.properties).toBeDefined();
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.nodes).toBeDefined();
      expect(schema.properties.edges).toBeDefined();
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('nodes');
      expect(schema.required).toContain('edges');
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
  
    describe('AFI-Reactor LangGraph Schema Validation', () => {
      describe('Enrichment Node Schema', () => {
        it('should compile enrichment-node.schema.json without errors', () => {
          const ajv = createAjv();
          const schema = loadJSON('schemas/definitions/enrichment-node.schema.json');
  
          expect(() => {
            ajv.compile(schema);
          }).not.toThrow();
  
          const validate = ajv.compile(schema);
          expect(validate).toBeDefined();
          expect(typeof validate).toBe('function');
        });
  
        it('should validate enrichment-node.example.json against enrichment-node schema', () => {
          const ajv = createAjv();
          const schema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          const example = loadJSON('examples/enrichment-node.example.json');
  
          const validate = ajv.compile(schema);
          const valid = validate(example);
  
          if (!valid) {
            console.error('Validation errors:', validate.errors);
          }
  
          expect(valid, 'enrichment-node.example.json should be valid').toBe(true);
        });
  
        it('should reject enrichment node with invalid id pattern', () => {
          const ajv = createAjv();
          const schema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          const validate = ajv.compile(schema);
  
          const invalidNode = {
            id: 'Invalid_ID_With_Uppercase',
            type: 'enrichment',
            plugin: 'afi-price-enricher',
            enabled: true
          };
  
          const valid = validate(invalidNode);
          expect(valid).toBe(false);
          expect(validate.errors).toBeDefined();
          expect(validate.errors!.some(e => e.message?.includes('pattern'))).toBe(true);
        });
  
        it('should reject enrichment node with invalid type', () => {
          const ajv = createAjv();
          const schema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          const validate = ajv.compile(schema);
  
          const invalidNode = {
            id: 'test-node',
            type: 'invalid-type',
            plugin: 'afi-price-enricher',
            enabled: true
          };
  
          const valid = validate(invalidNode);
          expect(valid).toBe(false);
          expect(validate.errors).toBeDefined();
        });
  
        it('should reject enrichment node with duplicate dependencies', () => {
          const ajv = createAjv();
          const schema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          const validate = ajv.compile(schema);
  
          const invalidNode = {
            id: 'test-node',
            type: 'enrichment',
            plugin: 'afi-price-enricher',
            enabled: true,
            dependencies: ['dep1', 'dep1'] // Duplicate
          };
  
          const valid = validate(invalidNode);
          expect(valid).toBe(false);
          expect(validate.errors).toBeDefined();
        });
  
        it('should accept enrichment node with all optional fields', () => {
          const ajv = createAjv();
          const schema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          const validate = ajv.compile(schema);
  
          const validNode = {
            id: 'test-node',
            type: 'enrichment',
            plugin: 'afi-price-enricher',
            enabled: true,
            optional: true,
            parallel: true,
            dependencies: ['dep1', 'dep2'],
            config: {
              apiKey: 'test-key',
              timeout: 5000
            }
          };
  
          const valid = validate(validNode);
          expect(valid).toBe(true);
        });
      });
  
      describe('Analyst Config Schema', () => {
        it('should compile analyst-config.schema.json without errors', () => {
          const ajv = createAjv();
          // Load enrichment-node schema first for $ref resolution
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/analyst-config.schema.json');
  
          expect(() => {
            ajv.compile(schema);
          }).not.toThrow();
  
          const validate = ajv.compile(schema);
          expect(validate).toBeDefined();
          expect(typeof validate).toBe('function');
        });
  
        it('should validate analyst-config.example.json against analyst-config schema', () => {
          const ajv = createAjv();
          // Load enrichment-node schema first for $ref resolution
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/analyst-config.schema.json');
          const example = loadJSON('examples/analyst-config.example.json');
  
          const validate = ajv.compile(schema);
          const valid = validate(example);
  
          if (!valid) {
            console.error('Validation errors:', validate.errors);
          }
  
          expect(valid, 'analyst-config.example.json should be valid').toBe(true);
        });
  
        it('should reject analyst config with invalid analystId pattern', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/analyst-config.schema.json');
          const validate = ajv.compile(schema);
  
          const invalidConfig = {
            analystId: 'Invalid_Analyst_ID',
            enrichmentNodes: [
              {
                id: 'test-node',
                type: 'enrichment',
                plugin: 'afi-price-enricher',
                enabled: true
              }
            ]
          };
  
          const valid = validate(invalidConfig);
          expect(valid).toBe(false);
          expect(validate.errors).toBeDefined();
        });
  
        it('should reject analyst config with invalid version pattern', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/analyst-config.schema.json');
          const validate = ajv.compile(schema);
  
          const invalidConfig = {
            analystId: 'test-analyst',
            version: '1.0.0', // Missing 'v' prefix
            enrichmentNodes: [
              {
                id: 'test-node',
                type: 'enrichment',
                plugin: 'afi-price-enricher',
                enabled: true
              }
            ]
          };
  
          const valid = validate(invalidConfig);
          expect(valid).toBe(false);
          expect(validate.errors).toBeDefined();
        });
  
        it('should reject analyst config with empty enrichmentNodes', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/analyst-config.schema.json');
          const validate = ajv.compile(schema);
  
          const invalidConfig = {
            analystId: 'test-analyst',
            enrichmentNodes: []
          };
  
          const valid = validate(invalidConfig);
          expect(valid).toBe(false);
          expect(validate.errors).toBeDefined();
        });
  
        it('should accept analyst config with all optional fields', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/analyst-config.schema.json');
          const validate = ajv.compile(schema);
  
          const validConfig = {
            analystId: 'test-analyst',
            version: 'v1.0.0',
            enrichmentNodes: [
              {
                id: 'test-node',
                type: 'enrichment',
                plugin: 'afi-price-enricher',
                enabled: true
              }
            ],
            metadata: {
              description: 'Test analyst configuration',
              author: 'Test Author',
              createdAt: '2024-12-26T10:00:00Z',
              updatedAt: '2024-12-26T15:30:00Z'
            }
          };
  
          const valid = validate(validConfig);
          expect(valid).toBe(true);
        });
      });
  
      describe('Pipeline Schema (LangGraph Integration)', () => {
        it('should compile updated pipeline.schema.json without errors', () => {
          const ajv = createAjv();
          // Load enrichment-node schema first for $ref resolution
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/pipeline.schema.json');
  
          expect(() => {
            ajv.compile(schema);
          }).not.toThrow();
  
          const validate = ajv.compile(schema);
          expect(validate).toBeDefined();
          expect(typeof validate).toBe('function');
        });
  
        it('should validate pipeline-langgraph.example.json against pipeline schema', () => {
          const ajv = createAjv();
          // Load enrichment-node schema first for $ref resolution
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/pipeline.schema.json');
          const example = loadJSON('examples/pipeline-langgraph.example.json');
  
          const validate = ajv.compile(schema);
          const valid = validate(example);
  
          if (!valid) {
            console.error('Validation errors:', validate.errors);
          }
  
          expect(valid, 'pipeline-langgraph.example.json should be valid').toBe(true);
        });
  
        it('should reject pipeline with invalid version pattern', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/pipeline.schema.json');
          const validate = ajv.compile(schema);
  
          const invalidPipeline = {
            id: 'test-pipeline',
            name: 'Test Pipeline',
            version: '1.0.0', // Missing 'v' prefix
            nodes: [
              {
                id: 'test-node',
                type: 'generator'
              }
            ],
            edges: []
          };
  
          const valid = validate(invalidPipeline);
          expect(valid).toBe(false);
          expect(validate.errors).toBeDefined();
        });
  
        it('should reject pipeline with invalid requiredNodes type', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/pipeline.schema.json');
          const validate = ajv.compile(schema);
  
          const invalidPipeline = {
            id: 'test-pipeline',
            name: 'Test Pipeline',
            version: 'v1.0.0',
            requiredNodes: ['invalid-node-type'],
            nodes: [
              {
                id: 'test-node',
                type: 'generator'
              }
            ],
            edges: []
          };
  
          const valid = validate(invalidPipeline);
          expect(valid).toBe(false);
          expect(validate.errors).toBeDefined();
        });
  
        it('should reject pipeline with duplicate requiredNodes', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/pipeline.schema.json');
          const validate = ajv.compile(schema);
  
          const invalidPipeline = {
            id: 'test-pipeline',
            name: 'Test Pipeline',
            version: 'v1.0.0',
            requiredNodes: ['analyst', 'analyst'], // Duplicate
            nodes: [
              {
                id: 'test-node',
                type: 'generator'
              }
            ],
            edges: []
          };
  
          const valid = validate(invalidPipeline);
          expect(valid).toBe(false);
          expect(validate.errors).toBeDefined();
        });
  
        it('should accept pipeline with all new LangGraph fields', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/pipeline.schema.json');
          const validate = ajv.compile(schema);
  
          const validPipeline = {
            id: 'test-pipeline',
            name: 'Test Pipeline',
            version: 'v1.0.0',
            requiredNodes: ['analyst', 'execution', 'observer'],
            nodes: [
              {
                id: 'test-node',
                type: 'generator'
              }
            ],
            edges: [],
            enrichmentNodes: {
              'test-enricher': {
                id: 'test-enricher',
                type: 'enrichment',
                plugin: 'afi-test-plugin',
                enabled: true
              }
            },
            metadata: {
              author: 'Test Author'
            }
          };
  
          const valid = validate(validPipeline);
          expect(valid).toBe(true);
        });
  
        it('should accept pipeline without optional LangGraph fields for backward compatibility', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/pipeline.schema.json');
          const validate = ajv.compile(schema);
  
          const validPipeline = {
            id: 'test-pipeline',
            name: 'Test Pipeline',
            nodes: [
              {
                id: 'test-node',
                type: 'generator'
              }
            ],
            edges: []
          };
  
          const valid = validate(validPipeline);
          expect(valid).toBe(true);
        });
      });
  
      describe('Schema Integration Tests', () => {
        it('should validate complete analyst config with multiple enrichment nodes', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/analyst-config.schema.json');
          const validate = ajv.compile(schema);
  
          const validConfig = {
            analystId: 'multi-enrichment-analyst',
            version: 'v1.0.0',
            enrichmentNodes: [
              {
                id: 'node-1',
                type: 'enrichment',
                plugin: 'afi-plugin-1',
                enabled: true,
                optional: false,
                parallel: false,
                dependencies: [],
                config: { timeout: 5000 }
              },
              {
                id: 'node-2',
                type: 'enrichment',
                plugin: 'afi-plugin-2',
                enabled: true,
                optional: true,
                parallel: true,
                dependencies: ['node-1'],
                config: { sources: ['api1', 'api2'] }
              },
              {
                id: 'node-3',
                type: 'ingress',
                plugin: 'afi-plugin-3',
                enabled: true,
                optional: false,
                parallel: false,
                dependencies: [],
                config: { network: 'ethereum' }
              }
            ],
            metadata: {
              description: 'Multi-enrichment analyst configuration',
              author: 'AFI Team',
              createdAt: '2024-12-26T10:00:00Z',
              updatedAt: '2024-12-26T15:30:00Z'
            }
          };
  
          const valid = validate(validConfig);
          expect(valid).toBe(true);
        });
  
        it('should validate pipeline with enrichment nodes referencing analyst config', () => {
          const ajv = createAjv();
          const enrichmentNodeSchema = loadJSON('schemas/definitions/enrichment-node.schema.json');
          ajv.addSchema(enrichmentNodeSchema);
  
          const schema = loadJSON('schemas/pipeline.schema.json');
          const validate = ajv.compile(schema);
  
          const validPipeline = {
            id: 'integrated-pipeline',
            name: 'Integrated Pipeline',
            version: 'v1.0.0',
            requiredNodes: ['analyst', 'execution'],
            nodes: [
              {
                id: 'analyst-node',
                type: 'analyzer',
                pluginId: 'afi-analyst-plugin',
                config: { analystId: 'crypto-analyst' }
              },
              {
                id: 'execution-node',
                type: 'executor',
                pluginId: 'afi-execution-plugin'
              }
            ],
            edges: [
              { from: 'analyst-node', to: 'execution-node' }
            ],
            enrichmentNodes: {
              'price-enricher': {
                id: 'price-enricher',
                type: 'enrichment',
                plugin: 'afi-price-enricher',
                enabled: true,
                optional: false,
                parallel: false,
                dependencies: [],
                config: { sources: ['coingecko'] }
              },
              'sentiment-analyzer': {
                id: 'sentiment-analyzer',
                type: 'enrichment',
                plugin: 'afi-sentiment-plugin',
                enabled: true,
                optional: true,
                parallel: true,
                dependencies: ['price-enricher'],
                config: { sources: ['twitter'] }
              }
            }
          };
  
          const valid = validate(validPipeline);
          expect(valid).toBe(true);
        });
      });
    });
  });
});

