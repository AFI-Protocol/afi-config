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
 * W3a ADMINISTRATIVE REGISTRY SEEDING — deep validation of every seeded entry.
 *
 * Authorized by afi-governance/decisions/factory-configurable-pipelines-v1
 * (D-FCP-5 generic registration rule). The seeded artifacts are byte-identical
 * copies of the accepted afi-factory main official froggy-trend-pullback
 * artifacts (templates/official/froggy-trend-pullback/), plus the authored
 * registration entry and provider bindings.
 *
 * Three layers, per the house two-layer admission pattern plus provenance:
 *   1. AJV schema validity (strict) for EVERY seeded registry entry.
 *   2. Governed semantic constraints (graph rules, D-OBJ-3 major agreement,
 *      defaultStrategy membership, binding cross-resolution).
 *   3. Canonical hashes RECOMPUTED per canonical-json-hashing.v1 (the same
 *      reference implementation the KAT suite executes) and asserted equal to
 *      the pinned values, with the D-FCP-7 domain tags CARRIED (never hashed).
 */

// --- pinned values (five-lane provider runtime on the EV3-GOV D-EV3-5(1)
// fail-fast manifest v1.3.0; recomputed and asserted below). manifestHash and
// analystConfigHash moved through the governed composition-hash-movement
// mechanism (D-FLPR-5(5) precedent); pluginSetHash is byte-identical. ---
const PINNED_MANIFEST_HASH = 'df3372dadaca1595d0e6d2f6bad9464ccc9abb7106e9f5b7111df148a145bc4f';
const PINNED_ANALYST_CONFIG_HASH = 'e34471dec8dd3b8fcf0e5576765e469aec1a89f77af6b693ef3c06fc4200bbad';
const PINNED_PLUGIN_SET_HASH = '5384e1c08ce4bd7f533acc15487df81d7d37b6615d109d611bde968a81f2f386';

// D-FCP-7 registered composition domain tags (canonical-json-hashing.v1 §3, amended).
const TAG_COMPOSITION_MANIFEST = 'afi.d2.composition-manifest';
const TAG_ANALYST_CONFIG = 'afi.d2.analyst-config';
const TAG_PLUGIN_SET = 'afi.d2.plugin-set';

const FROGGY_TRIPLE = {
  analystId: 'froggy',
  strategyId: 'trend_pullback_v1',
  strategyVersion: '1.0.0',
};

const PLUGINS_DIR = 'registries/analysis-plugins';
const PIPELINES_DIR = 'registries/pipelines';
const STRATEGIES_DIR = 'registries/analyst-strategies';
const BINDINGS_DIR = 'registries/provider-bindings';

const REGISTRATION_FILE = `${STRATEGIES_DIR}/froggy--trend_pullback_v1--1.0.0.json`;
const CONFIG_FILE = `${STRATEGIES_DIR}/froggy--trend_pullback_v1--1.0.0.config.json`;
const PIPELINE_FILE = `${PIPELINES_DIR}/froggy-trend-pullback--v1.3.0.json`;

const EXPECTED_PLUGIN_FILES = [
  'afi-analysis-aiml--2.0.0.json',
  'afi-analysis-news--2.0.0.json',
  'afi-analysis-pattern--2.0.0.json',
  'afi-analysis-sentiment--2.0.0.json',
  'afi-analysis-technical--2.0.0.json',
  'afi-merge-enriched-view--1.1.0.json',
  'afi-scorer-froggy-trend-pullback--1.0.0.json',
];

const EXPECTED_BINDING_FILES = [
  'cpj-oracle-discord-guild-3.json',
  'cpj-oracle-telegram-channel-1.json',
  'cpj-oracle-telegram-channel-2.json',
  'example-inactive-webhook.json',
  'gateway-tenant-a.json',
  'tradingview-default-webhook.json',
];

// ---------------------------------------------------------------------------
// House AJV setup + loaders.
// ---------------------------------------------------------------------------
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

function listJSON(relativeDir: string): string[] {
  return readdirSync(join(rootDir, relativeDir)).filter(f => f.endsWith('.json')).sort();
}

function compileWithHash(schemaFile: string) {
  const ajv = createAjv();
  ajv.addSchema(loadJSON('schemas/provenance/v1/canonical-hash.schema.json'));
  return ajv.compile(loadJSON(schemaFile));
}

// ---------------------------------------------------------------------------
// canonical-json-hashing.v1 reference implementation (spec §2) — the same
// implementation tests/canonical-hashing-kat.test.ts proves against the KATs.
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
/** pluginSetHash rule (D-FCP-7, canonical-json-hashing.v1 §3 amended). */
function pluginSetSha256(manifests: any[]): string {
  const plugins = manifests
    .map(m => ({
      pluginId: m.pluginId,
      pluginVersion: m.pluginVersion,
      implementationVersion: m.implementationVersion,
    }))
    .sort(
      (a, b) =>
        (a.pluginId < b.pluginId ? -1 : a.pluginId > b.pluginId ? 1 : 0) ||
        (a.pluginVersion < b.pluginVersion ? -1 : a.pluginVersion > b.pluginVersion ? 1 : 0)
    );
  return canonicalSha256({ schema: 'afi.plugin-set.v1', plugins });
}

/** D-OBJ-3: strategyId's embedded major (trailing _v<major>) == strategyVersion major. */
function majorAgrees(triple: { strategyId?: string; strategyVersion?: string }): boolean {
  const idMajor = /_v(\d+)$/.exec(triple.strategyId ?? '')?.[1];
  const versionMajor = /^(\d+)\./.exec(triple.strategyVersion ?? '')?.[1];
  return idMajor !== undefined && versionMajor !== undefined && idMajor === versionMajor;
}

function tripleEquals(a: any, b: any): boolean {
  return (
    a.analystId === b.analystId &&
    a.strategyId === b.strategyId &&
    a.strategyVersion === b.strategyVersion
  );
}

describe('W3a SEEDING — registries/analysis-plugins', () => {
  it('directory contains EXACTLY the seven official froggy plugin manifests + README (drift guard)', () => {
    const files = readdirSync(join(rootDir, PLUGINS_DIR)).sort();
    expect(files).toEqual(['README.md', ...EXPECTED_PLUGIN_FILES]);
  });

  it('every seeded plugin manifest is schema-valid, and filename matches pluginId--pluginVersion', () => {
    const validate = createAjv().compile(loadJSON('schemas/analysis-plugin/v1/analysis-plugin.schema.json'));
    EXPECTED_PLUGIN_FILES.forEach(f => {
      const manifest = loadJSON(`${PLUGINS_DIR}/${f}`);
      const valid = validate(manifest);
      if (!valid) console.error(`${f} failure:`, validate.errors);
      expect(valid, `${f} must be schema-valid`).toBe(true);
      expect(f).toBe(`${manifest.pluginId}--${manifest.pluginVersion}.json`);
    });
  });

  it('the seeded set covers all seven governed categories exactly once', () => {
    const categories = EXPECTED_PLUGIN_FILES.map(f => loadJSON(`${PLUGINS_DIR}/${f}`).category).sort();
    expect(categories).toEqual(
      ['aiMl', 'merge', 'news', 'pattern', 'scorer', 'sentiment', 'technical']
    );
  });

  it('recomputed pluginSetHash over the seeded manifests equals the pinned value (tag carried, not hashed)', () => {
    const manifests = EXPECTED_PLUGIN_FILES.map(f => loadJSON(`${PLUGINS_DIR}/${f}`));
    expect(pluginSetSha256(manifests)).toBe(PINNED_PLUGIN_SET_HASH);
    // Order-insensitive by construction:
    expect(pluginSetSha256([...manifests].reverse())).toBe(PINNED_PLUGIN_SET_HASH);
    // The domain tag afi.d2.plugin-set is CARRIED in CanonicalHash objects,
    // never part of hash material — recomputation above used no tag at all.
    expect(TAG_PLUGIN_SET).toBe('afi.d2.plugin-set');
  });
});

describe('SEEDING — registries/pipelines (froggy-trend-pullback v1.3.0, FLPR-GOV + EV3-GOV)', () => {
  const pipeline = loadJSON(PIPELINE_FILE);

  it('seeded manifest is schema-valid and self-identifies as froggy-trend-pullback v1.3.0', () => {
    const validate = createAjv().compile(loadJSON('schemas/pipeline/v1/pipeline.schema.json'));
    const valid = validate(pipeline);
    if (!valid) console.error('pipeline failure:', validate.errors);
    expect(valid).toBe(true);
    expect(pipeline.pipelineId).toBe('froggy-trend-pullback');
    expect(pipeline.pipelineVersion).toBe('v1.3.0');
  });

  it('all five category lane nodes are FAIL-FAST under the governed default (EV3-GOV D-EV3-5(1))', () => {
    const LANES = new Set(['technical', 'pattern', 'sentiment', 'news', 'aiMl']);
    const laneNodes = pipeline.nodes.filter((n: any) => LANES.has(n.category));
    expect(laneNodes).toHaveLength(5);
    for (const n of laneNodes) {
      // The v1.3.0 amendment REMOVED critical:false / failurePolicy:"degrade"
      // from every lane node: critical defaults to true and 'degrade' is
      // structurally allowed only when critical is explicitly false, so a
      // failed lane now aborts the run — a scored evaluation requires all
      // five lanes to succeed. Nothing else changed (same nodes/edges/join/
      // providerInstanceRefs/plugins).
      expect(n.critical, `lane '${n.id}' must not declare critical`).toBeUndefined();
      expect(n.failurePolicy, `lane '${n.id}' must not declare a failurePolicy`).toBeUndefined();
    }
  });

  it('graph-semantic layer: unique ids, known endpoints, acyclic, single scorer sink, joins declared', () => {
    const ids = pipeline.nodes.map((n: any) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    const idSet = new Set<string>(ids);
    expect(idSet.has(pipeline.entry)).toBe(true);

    const parents = new Map<string, string[]>(ids.map((id: string) => [id, []]));
    const out = new Map<string, string[]>(ids.map((id: string) => [id, []]));
    for (const e of pipeline.edges) {
      expect(idSet.has(e.from), `edge.from '${e.from}' must exist`).toBe(true);
      expect(idSet.has(e.to), `edge.to '${e.to}' must exist`).toBe(true);
      expect(e.from).not.toBe(e.to);
      out.get(e.from)!.push(e.to);
      parents.get(e.to)!.push(e.from);
    }

    // Acyclicity (Kahn) + full reachability from entry.
    const indeg = new Map<string, number>(ids.map((id: string) => [id, parents.get(id)!.length]));
    const queue = ids.filter((id: string) => indeg.get(id) === 0);
    let visited = 0;
    while (queue.length) {
      const n = queue.shift()!;
      visited++;
      for (const m of out.get(n)!) {
        indeg.set(m, indeg.get(m)! - 1);
        if (indeg.get(m) === 0) queue.push(m);
      }
    }
    expect(visited).toBe(ids.length);

    // Exactly one scorer, terminal, non-bypassable.
    const scorers = pipeline.nodes.filter((n: any) => n.category === 'scorer');
    expect(scorers).toHaveLength(1);
    expect(out.get(scorers[0].id)).toEqual([]);
    const sinks = ids.filter((id: string) => out.get(id)!.length === 0);
    expect(sinks).toEqual([scorers[0].id]);

    // Join declaration rule: in-degree > 1 <=> join declared.
    for (const n of pipeline.nodes) {
      const indegree = parents.get(n.id)!.length;
      if (indegree > 1) expect(n.join, `'${n.id}' needs a join`).toBeDefined();
      else expect(n.join, `'${n.id}' must not declare a join`).toBeUndefined();
    }
  });

  it('cross-ref: every node pluginId@pluginVersion resolves to a seeded analysis-plugins entry of the SAME category', () => {
    const registry = new Map<string, any>(
      listJSON(PLUGINS_DIR).map(f => {
        const m = loadJSON(`${PLUGINS_DIR}/${f}`);
        return [`${m.pluginId}@${m.pluginVersion}`, m];
      })
    );
    for (const n of pipeline.nodes) {
      const bound = registry.get(`${n.pluginId}@${n.pluginVersion}`);
      expect(bound, `node '${n.id}' plugin ${n.pluginId}@${n.pluginVersion} must be registered`).toBeDefined();
      expect(bound.category, `node '${n.id}' category agreement`).toBe(n.category);
    }
  });

  it('cross-ref: node configs validate against their plugin paramsSchema (paramsSchemaAuthority)', () => {
    const registry = new Map<string, any>(
      listJSON(PLUGINS_DIR).map(f => {
        const m = loadJSON(`${PLUGINS_DIR}/${f}`);
        return [`${m.pluginId}@${m.pluginVersion}`, m];
      })
    );
    for (const n of pipeline.nodes) {
      const bound = registry.get(`${n.pluginId}@${n.pluginVersion}`);
      const validate = new Ajv({ strict: false, allErrors: true }).compile(bound.paramsSchema);
      expect(validate(n.config ?? {}), `node '${n.id}' config must satisfy its paramsSchema`).toBe(true);
    }
  });

  it('recomputed manifestHash (description/metadata excluded) equals the pinned value', () => {
    expect(canonicalSha256(pipeline, ['description', 'metadata'])).toBe(PINNED_MANIFEST_HASH);
  });
});

describe('W3a SEEDING — registries/analyst-strategies (froggy registration)', () => {
  const registration = loadJSON(REGISTRATION_FILE);
  const config = loadJSON(CONFIG_FILE);

  it('registration entry is schema-valid with D-OBJ-3 major agreement, active, explicit binding policy', () => {
    const validate = compileWithHash('schemas/analyst-strategy-registration/v1/analyst-strategy-registration.schema.json');
    const valid = validate(registration);
    if (!valid) console.error('registration failure:', validate.errors);
    expect(valid).toBe(true);
    expect(majorAgrees(registration)).toBe(true);
    expect(tripleEquals(registration, FROGGY_TRIPLE)).toBe(true);
    expect(registration.status).toBe('active');
    expect(registration.providerBindingPolicy.mode).toBe('explicit');
    expect(registration.registrationRef).toContain('factory-configurable-pipelines-v1');
  });

  it('co-located config artifact is schema-valid and identity-agrees with the registration', () => {
    const validate = compileWithHash('schemas/analyst-strategy-config/v1/analyst-strategy-config.schema.json');
    const valid = validate(config);
    if (!valid) console.error('config failure:', validate.errors);
    expect(valid).toBe(true);
    expect(majorAgrees(config)).toBe(true);
    expect(tripleEquals(config, registration)).toBe(true);
  });

  it('configRef resolves to the co-located config file, and its RECOMPUTED canonical hash (metadata excluded) equals analystConfigHash', () => {
    expect(registration.configRef).toBe(`afi-config/${CONFIG_FILE}`);
    const resolved = loadJSON(registration.configRef.replace(/^afi-config\//, ''));
    expect(resolved).toEqual(config);
    expect(canonicalSha256(resolved, ['metadata'])).toBe(registration.analystConfigHash.value);
    expect(registration.analystConfigHash.value).toBe(PINNED_ANALYST_CONFIG_HASH);
    // D-FCP-7 domain tag is carried, not hashed.
    expect(registration.analystConfigHash.domainTag).toBe(TAG_ANALYST_CONFIG);
    expect(registration.analystConfigHash.algorithm).toBe('sha256');
    expect(registration.analystConfigHash.canonicalizationVersion).toBe('afi.hash.v1');
  });

  it('pipelineRef matches the seeded pipeline registry entry, and its pinned manifestHash RECOMPUTES from it', () => {
    const pipeline = loadJSON(PIPELINE_FILE);
    expect(config.pipelineRef.pipelineId).toBe(pipeline.pipelineId);
    expect(config.pipelineRef.pipelineVersion).toBe(pipeline.pipelineVersion);
    expect(config.pipelineRef.manifestHash.value).toBe(PINNED_MANIFEST_HASH);
    expect(config.pipelineRef.manifestHash.value).toBe(
      canonicalSha256(pipeline, ['description', 'metadata'])
    );
    expect(config.pipelineRef.manifestHash.domainTag).toBe(TAG_COMPOSITION_MANIFEST);
  });

  it('scorerRef agrees with the seeded pipeline scorer node and the seeded scorer plugin manifest', () => {
    const pipeline = loadJSON(PIPELINE_FILE);
    const scorerNode = pipeline.nodes.find((n: any) => n.category === 'scorer');
    expect(config.scorerRef.pluginId).toBe(scorerNode.pluginId);
    expect(config.scorerRef.pluginVersion).toBe(scorerNode.pluginVersion);
    expect(config.scorerRef).toEqual({
      pluginId: 'afi-scorer-froggy-trend-pullback',
      pluginVersion: '1.0.0',
    });
    const scorerManifest = loadJSON(
      `${PLUGINS_DIR}/${config.scorerRef.pluginId}--${config.scorerRef.pluginVersion}.json`
    );
    expect(scorerManifest.category).toBe('scorer');
    expect(scorerManifest.mayFeedScorer).toBe(false);
  });

  it('uwrProfileRef resolves to the registered UWR profile; decayConfig pins the decay-swing-v1 ref', () => {
    expect(config.uwrProfileRef.profileId).toBe('uwr-weighted-lifts-v0.1');
    const profile = loadJSON('registries/uwr-profiles/uwr-weighted-lifts-v0.1.json');
    expect(profile.profileId).toBe(config.uwrProfileRef.profileId);
    expect(config.decayConfig).toEqual({ ref: { templateId: 'decay-swing-v1' } });
  });
});

describe('FLPR-GOV SEEDING — manifest providerInstanceRefs cross-resolve', () => {
  it('every lane node ref in the registered manifest resolves to an ACTIVE seeded instance of the same category and version', () => {
    const pipeline = loadJSON(PIPELINE_FILE);
    const LANES = new Set(['technical', 'pattern', 'sentiment', 'news', 'aiMl']);
    const laneNodes = pipeline.nodes.filter((n: any) => LANES.has(n.category));
    expect(laneNodes).toHaveLength(5);
    for (const node of laneNodes) {
      expect(node.providerInstanceRef, `${node.id} must select explicitly`).toBeDefined();
      const { providerInstanceId, recordVersion } = node.providerInstanceRef;
      const inst = loadJSON(
        `registries/provider-instances/${providerInstanceId}--${recordVersion}.json`
      );
      expect(inst.status, `${providerInstanceId} must be active`).toBe('active');
      expect(inst.category, `${providerInstanceId} category`).toBe(node.category);
      expect(inst.recordVersion).toBe(recordVersion);
    }
  });
});

describe('W3a SEEDING — registries/provider-bindings', () => {
  const registration = loadJSON(REGISTRATION_FILE);

  it('directory contains EXACTLY the five seeded bindings + README (drift guard)', () => {
    const files = readdirSync(join(rootDir, BINDINGS_DIR)).sort();
    expect(files).toEqual(['README.md', ...EXPECTED_BINDING_FILES]);
  });

  it('every seeded binding is schema-valid, filename matches bindingId, defaults are members, majors agree', () => {
    const validate = compileWithHash('schemas/provider-strategy-binding/v1/provider-strategy-binding.schema.json');
    EXPECTED_BINDING_FILES.forEach(f => {
      const binding = loadJSON(`${BINDINGS_DIR}/${f}`);
      const valid = validate(binding);
      if (!valid) console.error(`${f} failure:`, validate.errors);
      expect(valid, `${f} must be schema-valid`).toBe(true);
      expect(f).toBe(`${binding.bindingId}.json`);
      binding.allowedStrategies.forEach((t: any) =>
        expect(majorAgrees(t), `${f} triple major agreement`).toBe(true)
      );
      expect(
        binding.allowedStrategies.some((t: any) => tripleEquals(t, binding.defaultStrategy)),
        `${f} defaultStrategy membership`
      ).toBe(true);
      expect(['route-secret', 'gateway-tenant', 'integration-key']).toContain(
        binding.authenticatedBy
      );
      // Every seeded binding routes (only) the registered froggy triple.
      expect(binding.allowedStrategies).toEqual([FROGGY_TRIPLE]);
      expect(binding.defaultStrategy).toEqual(FROGGY_TRIPLE);
    });
  });

  it('the webhook default binding and the three CPJ oracle-fixture bindings are ACTIVE with the exact provider pairs', () => {
    const byId = (id: string) => loadJSON(`${BINDINGS_DIR}/${id}.json`);
    const tv = byId('tradingview-default-webhook');
    expect(tv.providerType).toBe('webhook');
    expect(tv.providerId).toBe('tradingview-default');
    expect(tv.status).toBe('active');
    // CPJ bindings — one per provider pair used by the afi-reactor oracle CPJ
    // fixtures (test/oracle/fixtures/cpj/): telegram channel 1 & 2, discord guild 3.
    const cpjPairs = [
      ['cpj-oracle-telegram-channel-1', 'oracle-telegram-channel-1'],
      ['cpj-oracle-telegram-channel-2', 'oracle-telegram-channel-2'],
      ['cpj-oracle-discord-guild-3', 'oracle-discord-guild-3'],
    ] as const;
    cpjPairs.forEach(([bindingId, providerId]) => {
      const b = byId(bindingId);
      expect(b.providerType, bindingId).toBe('cpj');
      expect(b.providerId, bindingId).toBe(providerId);
      expect(b.status, bindingId).toBe('active');
    });
  });

  it('EXACTLY one inactive example binding exists (negative-testing fixture)', () => {
    const inactive = EXPECTED_BINDING_FILES.map(f => loadJSON(`${BINDINGS_DIR}/${f}`)).filter(
      b => b.status === 'inactive'
    );
    expect(inactive).toHaveLength(1);
    expect(inactive[0].bindingId).toBe('example-inactive-webhook');
  });

  it('cross-resolution: registration allowedBindings name existing ACTIVE bindings that whitelist the froggy triple, and exclude the inactive example', () => {
    const allowed: string[] = registration.providerBindingPolicy.allowedBindings;
    expect([...allowed].sort()).toEqual([
      'cpj-oracle-discord-guild-3',
      'cpj-oracle-telegram-channel-1',
      'cpj-oracle-telegram-channel-2',
      'gateway-tenant-a',
      'tradingview-default-webhook',
    ]);
    allowed.forEach(bindingId => {
      const binding = loadJSON(`${BINDINGS_DIR}/${bindingId}.json`);
      expect(binding.status, `${bindingId} must be ACTIVE (bindingResolution)`).toBe('active');
      expect(
        binding.allowedStrategies.some((t: any) => tripleEquals(t, registration)),
        `${bindingId} must whitelist the registered triple`
      ).toBe(true);
    });
    expect(allowed).not.toContain('example-inactive-webhook');
    // Reverse direction: every ACTIVE binding's triples resolve to the ACTIVE
    // registration whose explicit policy admits that binding.
    EXPECTED_BINDING_FILES.map(f => loadJSON(`${BINDINGS_DIR}/${f}`))
      .filter(b => b.status === 'active')
      .forEach(b => expect(allowed, `${b.bindingId} admitted by the registration`).toContain(b.bindingId));
  });
});

describe('W3a SEEDING — byte-level provenance of the copied official artifacts', () => {
  it('the three D-FCP-7 pinned hashes all RECOMPUTE from the seeded bytes (one-truth check)', () => {
    const pipeline = loadJSON(PIPELINE_FILE);
    const config = loadJSON(CONFIG_FILE);
    const manifests = EXPECTED_PLUGIN_FILES.map(f => loadJSON(`${PLUGINS_DIR}/${f}`));
    expect(canonicalSha256(pipeline, ['description', 'metadata'])).toBe(PINNED_MANIFEST_HASH);
    expect(canonicalSha256(config, ['metadata'])).toBe(PINNED_ANALYST_CONFIG_HASH);
    expect(pluginSetSha256(manifests)).toBe(PINNED_PLUGIN_SET_HASH);
  });

  it('the amended hashing spec states the D-FCP-7 tags and the afi.plugin-set.v1 rule (one truth)', () => {
    const spec = readFileSync(join(rootDir, 'schemas/hashing/canonical-json-hashing.v1.md'), 'utf-8');
    expect(spec).toContain('afi.d2.composition-manifest');
    expect(spec).toContain('afi.d2.analyst-config');
    expect(spec).toContain('afi.d2.plugin-set');
    expect(spec).toContain('afi.plugin-set.v1');
    expect(spec).toContain('implementationVersion');
    expect(spec).toContain('D-FCP-7');
  });
});
