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
 * FACTORY-CONTRACT / DEM-CONTRACT — afi.enrichment-mapping.v1.
 *
 * The declarative lane-fact-to-strategy-input mapping contract. Authorized by
 * afi-governance/decisions/declarative-enrichment-mapping-v0.1.md
 * (D-DEM-2(1)(2), D-DEM-3; slot DEM-CONTRACT, owner-authorized 2026-08-12).
 *
 * Three sections (house pattern): (1) strict compilation + governed metadata
 * pins; (2) canonical example + drift-guarded vectors with a semantic layer
 * (band ordering, grandfather membership — the x-afiConstraints rules
 * draft-07 cannot express); (3) clone-and-mutate negatives. The deterministic
 * interpreter and its totality proof live in afi-core
 * (validators/EnrichmentMappingInterpreter.ts, D-DEM-2(4)).
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

const SCHEMA_PATH = 'schemas/enrichment-mapping/v1/enrichment-mapping.schema.json';
const EXAMPLE_PATH = 'examples/enrichment-mapping/v1/enrichment-mapping.example.json';
const VALID_DIR = 'examples/enrichment-mapping/v1/vectors/valid';
const INVALID_DIR = 'examples/enrichment-mapping/v1/vectors/invalid';

/** {schemaValid, semanticOk} per invalid vector (analyst-strategy idiom). */
const EXPECTED: Record<string, { schemaValid: boolean; semanticOk: boolean }> = {
  'extra-properties.json': { schemaValid: false, semanticOk: false },
  'wrong-schema-const.json': { schemaValid: false, semanticOk: false },
  'empty-bindings.json': { schemaValid: false, semanticOk: false },
  'unknown-operator.json': { schemaValid: false, semanticOk: false },
  'expression-smuggle.json': { schemaValid: false, semanticOk: false },
  'optionality-missing-default.json': { schemaValid: false, semanticOk: false },
  'producer-ground-without-ref.json': { schemaValid: false, semanticOk: false },
  'band-missing-absent.json': { schemaValid: false, semanticOk: false },
  'recode-missing-fallback.json': { schemaValid: false, semanticOk: false },
  'bad-source-path.json': { schemaValid: false, semanticOk: false },
  // The schema alone cannot reject these two; the semantic layer must.
  'band-overlapping-rows.json': { schemaValid: true, semanticOk: false },
  'grandfather-nonmember.json': { schemaValid: true, semanticOk: false },
};

/**
 * Semantic layer — local implementations of the two x-afiConstraints rules
 * the AJV grammar cannot carry, mirroring their enforcement claims:
 * (i) bandTableDiscipline: strictly decreasing thresholds top-to-bottom;
 * (ii) optionalityGrounds: every ground:'grandfather' declaration must be one
 *      of exactly {(technical, emaDistancePct, 0), (technical,
 *      isInValueSweetSpot, false)} — D-DEM-5(4)'s exhaustive, non-extensible
 *      grandfather as carried by the two optionality declarations
 *      (grandfathers #3/#4 live in the band absent / recode fallback+absent
 *      members and appear in no optionality object).
 */
function semanticOk(doc: any): boolean {
  const GRANDFATHERS = [
    { lane: 'technical', path: 'emaDistancePct', default: 0 },
    { lane: 'technical', path: 'isInValueSweetSpot', default: false },
  ];
  const bindings = doc?.bindings ?? {};
  for (const target of Object.keys(bindings)) {
    const b = bindings[target];
    if (b?.operator === 'band' && Array.isArray(b.rows)) {
      const thresholds = b.rows.map((r: any) => r?.when?.gte ?? r?.when?.gt);
      for (let i = 1; i < thresholds.length; i += 1) {
        if (!(thresholds[i] < thresholds[i - 1])) return false;
      }
    }
    if (b?.optionality?.ground === 'grandfather') {
      const hit = GRANDFATHERS.some(
        (g) =>
          b.source?.lane === g.lane &&
          b.source?.path === g.path &&
          b.optionality.default === g.default,
      );
      if (!hit) return false;
    }
  }
  return true;
}

describe('DEM-CONTRACT: Schema Compilation & Governed Metadata', () => {
  const schema = loadJSON(SCHEMA_PATH);

  it('compiles under strict AJV with no external $refs', () => {
    const validate = createAjv().compile(schema);
    expect(typeof validate).toBe('function');
  });

  it('pins the governed metadata', () => {
    expect(schema['x-afiStatus']).toBe('governed-contract');
    expect(schema.properties.schema.const).toBe('afi.enrichment-mapping.v1');
    expect(schema.required).toEqual(['schema', 'mappingId', 'version', 'bindings']);
    expect(Object.keys(schema.properties)).toEqual([
      'schema',
      'mappingId',
      'version',
      'description',
      'namespaceDefaults',
      'bindings',
    ]);
    expect(Object.keys(schema['x-afiConstraints'])).toEqual([
      'noComputation',
      'singleSource',
      'registrationTimePathResolution',
      'absenceSemantics',
      'bandTableDiscipline',
      'recodeTableDiscipline',
      'optionalityGrounds',
      'defaultLiteralIdentity',
      'immutability',
    ]);
  });

  it('closes every named object form (additionalProperties:false) and the operator vocabulary', () => {
    expect(schema.additionalProperties).toBe(false);
    const defs = schema.definitions;
    for (const name of [
      'sourceRef',
      'producerRef',
      'optionality',
      'bandRow',
      'bindBinding',
      'bandBinding',
      'recodeBinding',
    ]) {
      expect(defs[name].additionalProperties, `${name} must be closed`).toBe(false);
    }
    expect(defs.bandRow.properties.when.additionalProperties).toBe(false);
    // Value-subschema members are schema-shaped by design, not closed objects:
    expect(schema.properties.bindings.additionalProperties).toEqual({
      $ref: '#/definitions/binding',
    });
    expect(defs.recodeBinding.properties.table.additionalProperties).toEqual({
      type: ['string', 'integer', 'boolean'],
    });
    // The closed operator vocabulary (D-DEM-3(1)):
    expect([
      defs.bindBinding.properties.operator.const,
      defs.bandBinding.properties.operator.const,
      defs.recodeBinding.properties.operator.const,
    ]).toEqual(['bind', 'band', 'recode']);
    expect(defs.lane.enum).toEqual(['technical', 'pattern', 'sentiment', 'news', 'aiMl']);
  });
});

describe('DEM-CONTRACT: Canonical Example & Vectors', () => {
  const validate = createAjv().compile(loadJSON(SCHEMA_PATH));
  const example = loadJSON(EXAMPLE_PATH);

  it('the canonical example validates and passes the semantic layer', () => {
    const valid = validate(example);
    if (!valid) console.error('example failure:', validate.errors);
    expect(valid).toBe(true);
    expect(semanticOk(example)).toBe(true);
  });

  it('vector listings are drift-guarded', () => {
    expect(readdirSync(join(rootDir, VALID_DIR)).sort()).toEqual([
      'all-operators.json',
      'complete.json',
      'minimal-bind.json',
      'optionality-grounds.json',
    ]);
    expect(readdirSync(join(rootDir, INVALID_DIR)).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('every valid vector validates and passes the semantic layer', () => {
    for (const f of readdirSync(join(rootDir, VALID_DIR)).sort()) {
      const doc = loadJSON(`${VALID_DIR}/${f}`);
      const valid = validate(doc);
      if (!valid) console.error(`${f} failure:`, validate.errors);
      expect(valid, `${f} must be schema-valid`).toBe(true);
      expect(semanticOk(doc), `${f} must pass the semantic layer`).toBe(true);
    }
  });

  it('complete.json deep-equals the canonical example', () => {
    expect(loadJSON(`${VALID_DIR}/complete.json`)).toEqual(example);
  });

  it('the valid set exercises all three operator forms and all three optionality grounds', () => {
    const docs = readdirSync(join(rootDir, VALID_DIR)).map((f) => loadJSON(`${VALID_DIR}/${f}`));
    const operators = new Set<string>();
    const grounds = new Set<string>();
    for (const doc of docs) {
      for (const target of Object.keys(doc.bindings)) {
        operators.add(doc.bindings[target].operator);
        const g = doc.bindings[target].optionality?.ground;
        if (g) grounds.add(g);
      }
    }
    expect([...operators].sort()).toEqual(['band', 'bind', 'recode']);
    expect([...grounds].sort()).toEqual(['composition', 'grandfather', 'producer-declared']);
  });

  it('every invalid vector behaves per its EXPECTED {schemaValid, semanticOk} entry', () => {
    for (const [f, expected] of Object.entries(EXPECTED)) {
      const doc = loadJSON(`${INVALID_DIR}/${f}`);
      expect(validate(doc), `${f} schemaValid`).toBe(expected.schemaValid);
      if (expected.schemaValid) {
        expect(semanticOk(doc), `${f} semanticOk`).toBe(expected.semanticOk);
      }
    }
  });
});

describe('DEM-CONTRACT: clone-and-mutate negatives', () => {
  const validate = createAjv().compile(loadJSON(SCHEMA_PATH));
  const example = loadJSON(EXAMPLE_PATH);

  for (const member of ['schema', 'mappingId', 'version', 'bindings']) {
    it(`rejects the canonical example with "${member}" deleted`, () => {
      const doc = clone<any>(example);
      delete doc[member];
      expect(validate(doc)).toBe(false);
    });
  }
});
