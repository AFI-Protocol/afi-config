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
 * FACTORY-CONTRACT — afi.pipeline.v1 + afi.pipeline-template.v1 validation.
 *
 * Covers the governed pipeline topology contract (schemas/pipeline/v1/), the
 * parameterized template contract (schemas/pipeline-template/v1/), their
 * canonical examples, and the positive/negative vectors under
 * examples/pipeline/v1/vectors/ and examples/pipeline-template/v1/vectors/.
 * Authorized by afi-governance/decisions/factory-configurable-pipelines-v1.
 *
 * BOUNDARY: schema/contract only. Graph-semantic invariants JSON Schema
 * draft-07 cannot express (unique node ids, known endpoints, acyclicity,
 * exactly-one non-bypassable scorer sink, join-declaration rules) are governed
 * contract constraints (x-afiConstraints), checked here in code — the same
 * two-layer admission pattern as the scored-signal-evidence contract:
 * admissible = schema-valid AND graph-clean.
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

const PIPELINE_SCHEMA = 'schemas/pipeline/v1/pipeline.schema.json';
const TEMPLATE_SCHEMA = 'schemas/pipeline-template/v1/pipeline-template.schema.json';
const PIPELINE_EXAMPLE = 'examples/pipeline/v1/pipeline.example.json';
const TEMPLATE_EXAMPLE = 'examples/pipeline-template/v1/pipeline-template.example.json';
const P_VALID = 'examples/pipeline/v1/vectors/valid';
const P_INVALID = 'examples/pipeline/v1/vectors/invalid';
const T_VALID = 'examples/pipeline-template/v1/vectors/valid';
const T_INVALID = 'examples/pipeline-template/v1/vectors/invalid';

const CATEGORIES = ['technical', 'pattern', 'sentiment', 'news', 'aiMl', 'merge', 'scorer'];

function compilePipelineSchema() {
  return createAjv().compile(loadJSON(PIPELINE_SCHEMA));
}
function compileTemplateSchema() {
  return createAjv().compile(loadJSON(TEMPLATE_SCHEMA));
}

// ---------------------------------------------------------------------------
// Governed graph constraints JSON Schema draft-07 cannot express
// (x-afiConstraints: uniqueNodeIds, knownEndpoints, acyclicity, singleScorer,
// scorerTerminality, joinDeclaration).
// ---------------------------------------------------------------------------
function pipelineGraphViolations(p: any): string[] {
  const v: string[] = [];
  if (!p || typeof p !== 'object' || !Array.isArray(p.nodes) || !Array.isArray(p.edges)) {
    return ['manifest is not structurally readable'];
  }
  const nodes = p.nodes.filter((n: any) => n && typeof n === 'object');
  const ids: string[] = nodes.map((n: any) => n.id);
  const idSet = new Set<string>(ids);
  if (idSet.size !== ids.length) v.push('duplicate node id');
  const uniqueIds = [...idSet];

  const edges = p.edges.filter((e: any) => e && typeof e === 'object');
  for (const e of edges) {
    if (!idSet.has(e.from)) v.push(`edge.from names unknown node '${e.from}'`);
    if (!idSet.has(e.to)) v.push(`edge.to names unknown node '${e.to}'`);
    if (e.from === e.to) v.push(`self-edge on '${e.from}'`);
  }
  if (!idSet.has(p.entry)) v.push(`entry names unknown node '${p.entry}'`);

  const out = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  uniqueIds.forEach(id => {
    out.set(id, []);
    parents.set(id, []);
  });
  for (const e of edges) {
    if (idSet.has(e.from) && idSet.has(e.to) && e.from !== e.to) {
      out.get(e.from)!.push(e.to);
      parents.get(e.to)!.push(e.from);
    }
  }

  // Acyclicity (Kahn)
  const indeg = new Map<string, number>();
  uniqueIds.forEach(id => indeg.set(id, parents.get(id)!.length));
  const queue = uniqueIds.filter(id => indeg.get(id) === 0);
  let visited = 0;
  while (queue.length) {
    const n = queue.shift()!;
    visited++;
    for (const m of out.get(n)!) {
      indeg.set(m, indeg.get(m)! - 1);
      if (indeg.get(m) === 0) queue.push(m);
    }
  }
  if (visited < uniqueIds.length) v.push('cycle detected');

  // Exactly one scorer (schema already enforces >= 1 via `contains`)
  const scorers = nodes.filter((n: any) => n.category === 'scorer');
  if (scorers.length === 0) v.push('zero scorer nodes');
  if (scorers.length > 1) v.push('multiple scorer nodes');

  // Reachability + scorer terminality / non-bypassability
  if (idSet.has(p.entry)) {
    const reachable = new Set<string>([p.entry]);
    const stack: string[] = [p.entry];
    while (stack.length) {
      for (const m of out.get(stack.pop()!)!) {
        if (!reachable.has(m)) {
          reachable.add(m);
          stack.push(m);
        }
      }
    }
    uniqueIds.forEach(id => {
      if (!reachable.has(id)) v.push(`node '${id}' unreachable from entry`);
    });
    if (scorers.length === 1) {
      const scorerId = scorers[0].id;
      if ((out.get(scorerId) ?? []).length > 0) v.push('scorer is not a sink');
      if (!reachable.has(scorerId)) v.push('scorer not reachable from entry');
      [...reachable]
        .filter(id => (out.get(id) ?? []).length === 0)
        .forEach(sink => {
          if (sink !== scorerId) v.push(`non-scorer sink '${sink}' reachable from entry (scorer bypass)`);
        });
    }
  }

  // Join declaration rules: in-degree > 1 <=> join declared; prefer: names a parent
  for (const n of nodes) {
    const indegree = (parents.get(n.id) ?? []).length;
    if (indegree > 1 && !n.join) v.push(`node '${n.id}' has ${indegree} parents but declares no join`);
    if (indegree <= 1 && n.join) v.push(`node '${n.id}' declares join with ${indegree} parent(s)`);
    const rule = n.join?.merge?.conflictRule;
    if (typeof rule === 'string' && rule.startsWith('prefer:')) {
      const target = rule.slice('prefer:'.length);
      if (!(parents.get(n.id) ?? []).includes(target)) {
        v.push(`join conflictRule '${rule}' does not name a parent of '${n.id}'`);
      }
    }
  }
  return v;
}

/** Full governed admission = schema-valid AND graph-clean. */
function admit(validate: any, manifest: any) {
  const schemaValid = validate(manifest) as boolean;
  const violations = pipelineGraphViolations(manifest);
  return { schemaValid, graphOk: violations.length === 0, violations, ok: schemaValid && violations.length === 0 };
}

// ---------------------------------------------------------------------------
// Template tooling constraints (x-afiConstraints.declaredSlots) + the
// instantiation contract (README): parameters -> concrete afi.pipeline.v1.
// ---------------------------------------------------------------------------
function collectSlots(x: any, found: string[] = []): string[] {
  if (Array.isArray(x)) {
    x.forEach(item => collectSlots(item, found));
    return found;
  }
  if (x && typeof x === 'object') {
    const keys = Object.keys(x);
    if (keys.length === 1 && keys[0] === '$param' && typeof x.$param === 'string') {
      found.push(x.$param);
      return found;
    }
    keys.forEach(k => collectSlots(x[k], found));
  }
  return found;
}

function templateViolations(t: any): string[] {
  const v: string[] = [];
  if (!t || typeof t !== 'object') return ['template is not structurally readable'];
  const names: string[] = (Array.isArray(t.parameters) ? t.parameters : []).map((p: any) => p?.name);
  if (new Set(names).size !== names.length) v.push('duplicate parameter names');
  const declared = new Set(names);
  collectSlots({ nodes: t.nodes, edges: t.edges }).forEach(slot => {
    if (!declared.has(slot)) v.push(`slot references undeclared parameter '${slot}'`);
  });
  return v;
}

function admitTemplate(validate: any, template: any) {
  const schemaValid = validate(template) as boolean;
  const violations = templateViolations(template);
  return { schemaValid, slotsOk: violations.length === 0, violations, ok: schemaValid && violations.length === 0 };
}

/** The Factory instantiation contract, executable (pipeline-template README). */
function instantiateTemplate(template: any, supplied: Record<string, unknown>): any {
  const ajv = createAjv();
  const resolved: Record<string, unknown> = {};
  for (const p of template.parameters) {
    let value: unknown;
    if (Object.prototype.hasOwnProperty.call(supplied, p.name)) value = supplied[p.name];
    else if (Object.prototype.hasOwnProperty.call(p, 'default')) value = p.default;
    else if (p.required) throw new Error(`missing required parameter '${p.name}'`);
    else continue;
    const validateParam = ajv.compile(p.schema);
    if (!validateParam(value)) throw new Error(`parameter '${p.name}' fails its schema fragment`);
    resolved[p.name] = value;
  }
  const substitute = (x: any): any => {
    if (Array.isArray(x)) return x.map(substitute);
    if (x && typeof x === 'object') {
      const keys = Object.keys(x);
      if (keys.length === 1 && keys[0] === '$param') {
        if (!(x.$param in resolved)) throw new Error(`unresolved slot '${x.$param}'`);
        return resolved[x.$param];
      }
      const outObj: any = {};
      keys.forEach(k => (outObj[k] = substitute(x[k])));
      return outObj;
    }
    return x;
  };
  const pipeline: any = {
    schema: 'afi.pipeline.v1',
    pipelineId: template.pipelineId,
    pipelineVersion: template.pipelineVersion,
  };
  if (template.description !== undefined) pipeline.description = template.description;
  pipeline.entry = template.entry;
  pipeline.nodes = substitute(template.nodes);
  pipeline.edges = substitute(template.edges);
  if (template.metadata !== undefined) pipeline.metadata = template.metadata;
  return pipeline;
}

describe('FACTORY-CONTRACT — afi.pipeline.v1', () => {
  describe('Schema Compilation & Governed Metadata', () => {
    it('should compile the pipeline contract without errors', () => {
      expect(() => compilePipelineSchema()).not.toThrow();
      expect(typeof compilePipelineSchema()).toBe('function');
    });

    it('should carry the governed-contract status and required surface fields', () => {
      const schema = loadJSON(PIPELINE_SCHEMA);
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema.$schema).toContain('json-schema.org');
      expect(schema.$id).toBe('https://afi-protocol.org/schemas/pipeline/v1/pipeline.schema.json');
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties.schema.const).toBe('afi.pipeline.v1');
    });

    it('should fix the node category vocabulary EXACTLY (five analysis categories + merge + scorer)', () => {
      const schema = loadJSON(PIPELINE_SCHEMA);
      expect(schema.definitions.node.properties.category.enum).toEqual(CATEGORIES);
    });

    it('should structurally require at least one scorer node (nodes contains)', () => {
      const schema = loadJSON(PIPELINE_SCHEMA);
      expect(schema.properties.nodes.contains.properties.category.const).toBe('scorer');
    });

    it('should be the ONE topology representation: no enrichmentNodes map, no requiredNodes', () => {
      const schema = loadJSON(PIPELINE_SCHEMA);
      expect(Object.keys(schema.properties)).not.toContain('enrichmentNodes');
      expect(Object.keys(schema.properties)).not.toContain('requiredNodes');
      expect([...schema.required].sort()).toEqual(
        ['schema', 'pipelineId', 'pipelineVersion', 'entry', 'nodes', 'edges'].sort()
      );
    });

    it('should make join merges deterministic by construction (strategy + conflictRule both required)', () => {
      const schema = loadJSON(PIPELINE_SCHEMA);
      const merge = schema.definitions.join.properties.merge;
      expect([...merge.required].sort()).toEqual(['conflictRule', 'strategy']);
      expect(merge.properties.strategy.enum).toEqual(['namespace-by-node', 'declared-fields']);
      expect(merge.properties.conflictRule.pattern).toBe('^(error|prefer:[a-z0-9-]+)$');
    });

    it('should record the graph constraints JSON Schema cannot enforce (x-afiConstraints)', () => {
      const keys = Object.keys(loadJSON(PIPELINE_SCHEMA)['x-afiConstraints'] ?? {});
      [
        'uniqueNodeIds',
        'knownEndpoints',
        'acyclicity',
        'singleScorer',
        'scorerTerminality',
        'joinDeclaration',
        'deterministicConditions',
        'configValidatedDownstream',
        'pluginBinding',
        'oneRepresentation',
      ].forEach(k => expect(keys, `x-afiConstraints.${k} must be present`).toContain(k));
    });
  });

  describe('Canonical Example & Valid Vectors', () => {
    it('canonical example should be admissible (schema-valid + graph-clean)', () => {
      const validate = compilePipelineSchema();
      const result = admit(validate, loadJSON(PIPELINE_EXAMPLE));
      if (!result.ok) console.error('example failure:', validate.errors, result.violations);
      expect(result.ok).toBe(true);
    });

    it('every valid vector should be admissible', () => {
      const validate = compilePipelineSchema();
      readdirSync(join(rootDir, P_VALID))
        .filter(f => f.endsWith('.json'))
        .forEach(f => {
          const result = admit(validate, loadJSON(`${P_VALID}/${f}`));
          if (!result.ok) console.error(`${f} failure:`, validate.errors, result.violations);
          expect(result.ok, `${f} should be admissible`).toBe(true);
        });
    });

    it('valid vector set should be exactly the authorized files (drift guard)', () => {
      const files = readdirSync(join(rootDir, P_VALID)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual([
        'conditional-branch.json',
        'full-surface.json',
        'minimal-linear.json',
        'parallel-join.json',
      ]);
    });

    it('every valid vector has exactly one scorer, and it is the only reachable sink', () => {
      readdirSync(join(rootDir, P_VALID))
        .filter(f => f.endsWith('.json'))
        .forEach(f => {
          const p = loadJSON(`${P_VALID}/${f}`);
          const scorers = p.nodes.filter((n: any) => n.category === 'scorer');
          expect(scorers.length, `${f} scorer count`).toBe(1);
          const outs = new Set(p.edges.map((e: any) => e.from));
          const sinks = p.nodes.filter((n: any) => !outs.has(n.id));
          expect(sinks.map((n: any) => n.id), `${f} sinks`).toEqual([scorers[0].id]);
        });
    });
  });

  describe('Invalid Vectors (rejected by schema and/or governed graph constraints)', () => {
    // Each vector is expected NOT admissible; the map pins WHICH layer catches it.
    const EXPECTED: Record<string, { schemaValid: boolean; graphOk: boolean }> = {
      'cycle.json': { schemaValid: true, graphOk: false },
      'duplicate-node-id.json': { schemaValid: true, graphOk: false },
      'unknown-category.json': { schemaValid: false, graphOk: true },
      'bad-plugin-ref.json': { schemaValid: false, graphOk: true },
      'bad-pipeline-version.json': { schemaValid: false, graphOk: true },
      'multiple-scorers.json': { schemaValid: true, graphOk: false },
      'zero-scorers.json': { schemaValid: false, graphOk: false },
      'scorer-bypass-sink.json': { schemaValid: true, graphOk: false },
      'condition-unknown-operator.json': { schemaValid: false, graphOk: true },
      'condition-code-string.json': { schemaValid: false, graphOk: true },
      'join-on-single-parent.json': { schemaValid: true, graphOk: false },
      'missing-join-on-multi-parent.json': { schemaValid: true, graphOk: false },
      'merge-missing-conflict-rule.json': { schemaValid: false, graphOk: true },
      'invalid-timeout-retry.json': { schemaValid: false, graphOk: true },
      'extra-properties.json': { schemaValid: false, graphOk: true },
      'edge-to-unknown-node.json': { schemaValid: true, graphOk: false },
      'entry-unknown-node.json': { schemaValid: true, graphOk: false },
      'degrade-on-critical-node.json': { schemaValid: false, graphOk: true },
      'prefer-unknown-parent.json': { schemaValid: true, graphOk: false },
    };

    it('invalid vector set should be exactly the authorized files (drift guard)', () => {
      const files = readdirSync(join(rootDir, P_INVALID)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(Object.keys(EXPECTED).sort());
    });

    it('every invalid vector should be inadmissible, at the expected layer', () => {
      const validate = compilePipelineSchema();
      Object.entries(EXPECTED).forEach(([file, expected]) => {
        const result = admit(validate, loadJSON(`${P_INVALID}/${file}`));
        expect(result.ok, `${file} must NOT be admissible`).toBe(false);
        expect(result.schemaValid, `${file} schema layer`).toBe(expected.schemaValid);
        expect(result.graphOk, `${file} graph layer`).toBe(expected.graphOk);
      });
    });
  });

  describe('Structural Negatives (clone-and-mutate the canonical example)', () => {
    const BASE = loadJSON(PIPELINE_EXAMPLE);

    it('should reject a missing required field', () => {
      const validate = compilePipelineSchema();
      ['schema', 'pipelineId', 'pipelineVersion', 'entry', 'nodes', 'edges'].forEach(field => {
        const invalid: any = clone(BASE);
        delete invalid[field];
        expect(validate(invalid), `missing ${field} should be rejected`).toBe(false);
      });
    });

    it('should reject a wrong schema-id const', () => {
      const validate = compilePipelineSchema();
      const invalid: any = clone(BASE);
      invalid.schema = 'afi.pipeline.v2';
      expect(validate(invalid)).toBe(false);
    });

    it('should accept every governed condition operator and reject non-predicate shapes', () => {
      const validate = compilePipelineSchema();
      const goodConditions = [
        { exists: '/context/symbol' },
        { eq: { path: '/context/assetClass', value: 'perp' } },
        { ne: { path: '/context/assetClass', value: null } },
        { gt: { path: '/nodes/tech-indicators/output/technical/atrPct', value: 1 } },
        { gte: { path: '/context/conviction', value: 0.5 } },
        { lt: { path: '/context/spreadBps', value: 20 } },
        { lte: { path: '/context/spreadBps', value: 20 } },
        { in: { path: '/context/timeframe', values: ['1h', '4h'] } },
        { not: { exists: '/context/halted' } },
        { all: [{ exists: '/context/symbol' }, { any: [{ eq: { path: '/context/tf', value: '1h' } }] }] },
      ];
      goodConditions.forEach(condition => {
        const record: any = clone(BASE);
        record.edges[0] = { ...record.edges[0], condition };
        expect(validate(record), `${JSON.stringify(condition)} should be accepted`).toBe(true);
      });
      const badConditions = [
        'x > 1',
        { gte: { path: '/context/conviction', value: 'high' } }, // ordered comparison needs a number
        { eq: { path: 'context.conviction', value: 1 } }, // not a JSON-pointer-style path
        { all: [] }, // empty conjunction
        { exists: '/context/symbol', eq: { path: '/x', value: 1 } }, // two operators in one predicate
      ];
      badConditions.forEach(condition => {
        const record: any = clone(BASE);
        record.edges[0] = { ...record.edges[0], condition };
        expect(validate(record), `${JSON.stringify(condition)} should be rejected`).toBe(false);
      });
    });

    it('should bind failurePolicy degrade to critical:false structurally', () => {
      const validate = compilePipelineSchema();
      const degradeWithoutCritical: any = clone(BASE);
      const news = degradeWithoutCritical.nodes.find((n: any) => n.id === 'market-news');
      delete news.critical; // default true => degrade must be rejected
      expect(validate(degradeWithoutCritical), 'degrade without explicit critical:false').toBe(false);
    });

    it('should reject unknown node/edge properties (additionalProperties:false everywhere)', () => {
      const validate = compilePipelineSchema();
      const nodeExtra: any = clone(BASE);
      nodeExtra.nodes[0].plugin = 'legacy-enrichment-plugin-field';
      expect(validate(nodeExtra), 'legacy node.plugin field must be rejected').toBe(false);
      const edgeExtra: any = clone(BASE);
      edgeExtra.edges[0].weight = 1;
      expect(validate(edgeExtra), 'unknown edge property must be rejected').toBe(false);
    });
  });

  describe('Pipeline Registry Scope Guard', () => {
    it('registries/pipelines should contain EXACTLY the W3a-seeded froggy manifest (drift guard)', () => {
      // Seeded by the W3a administrative registry seeding PR (D-FCP-5 generic
      // registration rule); validated in depth by
      // tests/registries-seeding-validation.test.ts.
      const files = readdirSync(join(rootDir, 'registries/pipelines')).sort();
      expect(files).toEqual(['README.md', 'froggy-trend-pullback--v1.0.0.json']);
    });
  });
});

describe('FACTORY-CONTRACT — afi.pipeline-template.v1', () => {
  describe('Schema Compilation & Governed Metadata', () => {
    it('should compile the template contract without errors', () => {
      expect(() => compileTemplateSchema()).not.toThrow();
    });

    it('should carry the governed-contract status, schema const, and template identity fields', () => {
      const schema = loadJSON(TEMPLATE_SCHEMA);
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema.properties.schema.const).toBe('afi.pipeline-template.v1');
      expect(schema.additionalProperties).toBe(false);
      ['templateId', 'templateVersion', 'parameters'].forEach(f =>
        expect(schema.required, `${f} must be required`).toContain(f)
      );
    });

    it('should define the {"$param": name} slot shape exactly (one key, no extras)', () => {
      const slot = loadJSON(TEMPLATE_SCHEMA).definitions.paramSlot;
      expect(slot.additionalProperties).toBe(false);
      expect(slot.required).toEqual(['$param']);
      expect(Object.keys(slot.properties)).toEqual(['$param']);
    });
  });

  describe('Canonical Example & Vectors', () => {
    it('canonical template example should be admissible (schema-valid + slots declared)', () => {
      const validate = compileTemplateSchema();
      const result = admitTemplate(validate, loadJSON(TEMPLATE_EXAMPLE));
      if (!result.ok) console.error('template example failure:', validate.errors, result.violations);
      expect(result.ok).toBe(true);
    });

    it('every valid vector should be admissible (drift-guarded)', () => {
      const validate = compileTemplateSchema();
      const files = readdirSync(join(rootDir, T_VALID)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(['no-parameters.json', 'parameterized-full.json']);
      files.forEach(f => {
        const result = admitTemplate(validate, loadJSON(`${T_VALID}/${f}`));
        if (!result.ok) console.error(`${f} failure:`, validate.errors, result.violations);
        expect(result.ok, `${f} should be admissible`).toBe(true);
      });
    });

    it('every invalid vector should be inadmissible, at the expected layer', () => {
      const EXPECTED: Record<string, { schemaValid: boolean; slotsOk: boolean }> = {
        'bad-param-name.json': { schemaValid: false, slotsOk: false }, // pattern violation; slots reference now-undeclared params too
        'slot-extra-keys.json': { schemaValid: false, slotsOk: true }, // a slot with extra keys is not a slot: schema rejects; walker sees no slot
        'undeclared-param-slot.json': { schemaValid: true, slotsOk: false },
        'missing-template-version.json': { schemaValid: false, slotsOk: true },
        'wrong-schema-const.json': { schemaValid: false, slotsOk: true },
        'duplicate-param-names.json': { schemaValid: true, slotsOk: false },
      };
      const files = readdirSync(join(rootDir, T_INVALID)).filter(f => f.endsWith('.json')).sort();
      expect(files).toEqual(Object.keys(EXPECTED).sort());
      const validate = compileTemplateSchema();
      Object.entries(EXPECTED).forEach(([file, expected]) => {
        const result = admitTemplate(validate, loadJSON(`${T_INVALID}/${file}`));
        expect(result.ok, `${file} must NOT be admissible`).toBe(false);
        expect(result.schemaValid, `${file} schema layer`).toBe(expected.schemaValid);
        expect(result.slotsOk, `${file} slot layer`).toBe(expected.slotsOk);
      });
    });
  });

  describe('Instantiation Contract (Factory resolves params -> concrete afi.pipeline.v1)', () => {
    it('instantiating the canonical template reproduces the canonical pipeline example EXACTLY', () => {
      const template = loadJSON(TEMPLATE_EXAMPLE);
      const pipeline = instantiateTemplate(template, { aiMlTimeoutMs: 1500 });
      expect(pipeline).toEqual(loadJSON(PIPELINE_EXAMPLE));
    });

    it('the instantiated pipeline is fully admissible under the pipeline contract (schema + graph)', () => {
      const pipeline = instantiateTemplate(loadJSON(TEMPLATE_EXAMPLE), { aiMlTimeoutMs: 1500 });
      const result = admit(compilePipelineSchema(), pipeline);
      if (!result.ok) console.error('instantiation admission failure:', result.violations);
      expect(result.ok).toBe(true);
    });

    it('fails closed when a required parameter (no default) is absent', () => {
      expect(() => instantiateTemplate(loadJSON(TEMPLATE_EXAMPLE), {})).toThrow(/aiMlTimeoutMs/);
    });

    it('fails closed when a supplied value violates its parameter schema fragment', () => {
      expect(() => instantiateTemplate(loadJSON(TEMPLATE_EXAMPLE), { aiMlTimeoutMs: 0 })).toThrow(
        /aiMlTimeoutMs/
      );
    });

    it('applies declared defaults for absent optional parameters', () => {
      const pipeline = instantiateTemplate(loadJSON(TEMPLATE_EXAMPLE), { aiMlTimeoutMs: 1500 });
      const news = pipeline.nodes.find((n: any) => n.id === 'market-news');
      expect(news.config.windowHours).toBe(24);
      const conditionEdge = pipeline.edges.find((e: any) => e.to === 'market-news');
      expect(conditionEdge.condition.all[1].gte.value).toBe(0);
    });
  });
});
