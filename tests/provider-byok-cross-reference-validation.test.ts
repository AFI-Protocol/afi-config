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
 * PBF-GOV — provider/BYOK cross-reference + secret-denylist validation.
 *
 * The semantic layer JSON-Schema draft-07 cannot express (D-PBF-4/D-PBF-5/D-PBF-7):
 * provider existence, category/adapter compatibility, credential coherence, tenant
 * scope, model authority — plus a secret-name DENYLIST scanner (defense in depth
 * beyond additionalProperties:false, per the mission's "do not rely only on
 * field-name checks; use strict schemas AND explicit allowed fields").
 */

function createAjv(): Ajv {
  const ajv = new Ajv({ strict: true, allowUnionTypes: true, strictRequired: false, allErrors: true, verbose: true });
  addFormats(ajv);
  ajv.addVocabulary(['x-afiStatus', 'x-afiPartOf', 'x-afiDoctrineRefs', 'x-afiOpenItems', 'x-afiProposedNotAccepted', 'x-afiConstraints']);
  return ajv;
}
function loadJSON(rel: string): any {
  return JSON.parse(readFileSync(join(rootDir, rel), 'utf-8'));
}

const PROVIDERS_DIR = 'registries/providers';
const EXPECTED_PROVIDER_FILES = [
  'afi-provider-news-http--1.0.0.json',
  'afi-provider-technical-local--1.0.0.json',
];

// -----------------------------------------------------------------------------
// Secret-name DENYLIST scanner (defense in depth). Normalizes each key
// (lowercase, strip '-'/'_') and rejects EXACT matches — so legitimate fields
// like credentialRef / credentialKind are never flagged.
// -----------------------------------------------------------------------------
const SECRET_NAME_DENYLIST = new Set([
  'apikey', 'token', 'accesstoken', 'secret', 'secretvalue', 'password', 'authorization',
  'privatekey', 'refreshtoken', 'oauthrefreshtoken', 'oauth', 'cookie', 'sessiontoken',
  'bearer', 'headervalue', 'credential', 'credentials',
]);
function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[-_]/g, '');
}
function secretFieldViolations(obj: unknown, path = '$'): string[] {
  const out: string[] = [];
  if (obj === null || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...secretFieldViolations(v, `${path}[${i}]`)));
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SECRET_NAME_DENYLIST.has(normalizeKey(k))) out.push(`${path}.${k} is a secret-named field`);
    out.push(...secretFieldViolations(v, `${path}.${k}`));
  }
  return out;
}

// -----------------------------------------------------------------------------
// Provider-instance cross-reference semantic rules (house string[] style).
// -----------------------------------------------------------------------------
interface Ctx {
  providers: Record<string, any>;
  credRefs: Record<string, any>;
}
function providerInstanceViolations(inst: any, ctx: Ctx): string[] {
  const v: string[] = [];
  const provider = ctx.providers[inst.providerId];
  if (!provider) {
    v.push('unknown-provider');
    return v;
  }
  if (!provider.supportedCategories.includes(inst.category)) v.push('category-not-supported');
  if (provider.adapterId !== inst.adapterId) v.push('adapter-mismatch');
  if (provider.requiresCredential) {
    if (!inst.credentialRef) {
      v.push('missing-required-credential');
    } else {
      const ref = ctx.credRefs[inst.credentialRef];
      if (!ref) v.push('unknown-credential-ref');
      else {
        if (ref.status !== 'active') v.push('credential-ref-disabled');
        if (ref.tenant !== inst.tenant) v.push('credential-ref-tenant-mismatch');
        if (ref.providerId !== inst.providerId) v.push('credential-ref-provider-mismatch');
        if (ref.credentialKind !== provider.credentialKind) v.push('credential-kind-mismatch');
      }
    }
  } else if (inst.credentialRef) {
    v.push('unauthorized-credential-on-keyless-provider');
  }
  if (inst.model !== undefined) {
    if (!Array.isArray(provider.supportedModels) || !provider.supportedModels.includes(inst.model)) {
      v.push('unsupported-model');
    }
  }
  return v;
}

describe('PBF-GOV — registries/providers seeding', () => {
  it('directory contains EXACTLY the two seeded provider records + README (drift guard)', () => {
    const files = readdirSync(join(rootDir, PROVIDERS_DIR)).sort();
    expect(files).toEqual(['README.md', ...EXPECTED_PROVIDER_FILES]);
  });

  it('every seeded provider is schema-valid and filename matches providerId--recordVersion', () => {
    const validate = createAjv().compile(loadJSON('schemas/provider/v1/provider.schema.json'));
    EXPECTED_PROVIDER_FILES.forEach(f => {
      const p = loadJSON(`${PROVIDERS_DIR}/${f}`);
      const ok = validate(p);
      if (!ok) console.error(`${f} failure:`, validate.errors);
      expect(ok, `${f} must be schema-valid`).toBe(true);
      expect(f).toBe(`${p.providerId}--${p.recordVersion}.json`);
    });
  });

  it('the seeded providers cover the two mission proofs: one keyless technical, one credentialed news', () => {
    const tech = loadJSON(`${PROVIDERS_DIR}/afi-provider-technical-local--1.0.0.json`);
    const news = loadJSON(`${PROVIDERS_DIR}/afi-provider-news-http--1.0.0.json`);
    expect(tech.supportedCategories).toEqual(['technical']);
    expect(tech.requiresCredential).toBe(false);
    expect(tech.credentialKind).toBeUndefined();
    expect(news.supportedCategories).toEqual(['news']);
    expect(news.requiresCredential).toBe(true);
    expect(news.credentialKind).toBe('apiKeyHeader');
  });
});

describe('PBF-GOV — secret-name denylist (defense in depth)', () => {
  it('flags secret-named fields regardless of additionalProperties, but never legitimate credentialRef/credentialKind', () => {
    expect(secretFieldViolations({ apiKey: 'x' })).toHaveLength(1);
    expect(secretFieldViolations({ nested: { authorization: 'Bearer x' } })).toHaveLength(1);
    expect(secretFieldViolations({ api_key: 'x', token: 'y' })).toHaveLength(2);
    // legitimate BYOK fields are NOT secrets
    expect(secretFieldViolations({ credentialRef: 'ref-1', credentialKind: 'apiKeyHeader' })).toEqual([]);
  });

  it('no seeded provider record, credential-ref, or provider-instance fixture contains a secret-named field', () => {
    const providerFiles = EXPECTED_PROVIDER_FILES.map(f => `${PROVIDERS_DIR}/${f}`);
    const fixtureDirs = [
      'examples/provider/v1/vectors/valid',
      'examples/credential-ref/v1/vectors/valid',
      'examples/provider-instance/v1/vectors/valid',
    ];
    const fixtureFiles = fixtureDirs.flatMap(d =>
      readdirSync(join(rootDir, d)).filter(f => f.endsWith('.json')).map(f => `${d}/${f}`)
    );
    [...providerFiles, ...fixtureFiles].forEach(rel => {
      expect(secretFieldViolations(loadJSON(rel)), `${rel} must carry no secret-named field`).toEqual([]);
    });
  });
});

describe('PBF-GOV — provider-instance cross-reference (D-PBF-4/D-PBF-5/D-PBF-7)', () => {
  const providers: Record<string, any> = {};
  ['afi-provider-technical-local--1.0.0.json', 'afi-provider-news-http--1.0.0.json'].forEach(f => {
    const p = loadJSON(`${PROVIDERS_DIR}/${f}`);
    providers[p.providerId] = p;
  });
  const credRefs: Record<string, any> = {};
  ['news-key-tenant-a.json', 'news-key-tenant-b.json', 'disabled-rotated.json'].forEach(f => {
    const c = loadJSON(`examples/credential-ref/v1/vectors/valid/${f}`);
    credRefs[c.credentialRef] = c;
  });
  const ctx: Ctx = { providers, credRefs };

  const techInstance = loadJSON('examples/provider-instance/v1/vectors/valid/technical-local-tenant-a.json');
  const newsInstance = loadJSON('examples/provider-instance/v1/vectors/valid/news-http-tenant-a.json');

  it('keyless technical instance resolves with ZERO violations and no credential', () => {
    expect(providerInstanceViolations(techInstance, ctx)).toEqual([]);
    expect(techInstance.credentialRef).toBeUndefined();
  });

  it('credentialed news instance resolves with ZERO violations and a compatible tenant-scoped credential', () => {
    expect(providerInstanceViolations(newsInstance, ctx)).toEqual([]);
    const ref = credRefs[newsInstance.credentialRef];
    expect(ref.tenant).toBe(newsInstance.tenant);
    expect(ref.providerId).toBe(newsInstance.providerId);
    expect(ref.credentialKind).toBe(providers[newsInstance.providerId].credentialKind);
  });

  it('rejects an unknown provider', () => {
    expect(providerInstanceViolations({ ...techInstance, providerId: 'afi-provider-nope' }, ctx)).toContain('unknown-provider');
  });

  it('rejects a category the provider does not support', () => {
    expect(providerInstanceViolations({ ...techInstance, category: 'news' }, ctx)).toContain('category-not-supported');
  });

  it('rejects an adapter that is not the provider adapter', () => {
    expect(providerInstanceViolations({ ...techInstance, adapterId: 'afi-adapter-wrong' }, ctx)).toContain('adapter-mismatch');
  });

  it('rejects a credentialed provider with NO credentialRef (fail closed)', () => {
    const { credentialRef, ...noCred } = newsInstance;
    expect(providerInstanceViolations(noCred, ctx)).toContain('missing-required-credential');
  });

  it('rejects a KEYLESS provider that carries an (unauthorized) credentialRef', () => {
    expect(providerInstanceViolations({ ...techInstance, credentialRef: 'newsdata-key-tenant-a' }, ctx)).toContain('unauthorized-credential-on-keyless-provider');
  });

  it('rejects a cross-tenant credential reference (tenant isolation)', () => {
    // tenant-a instance referencing tenant-b's credential ref
    expect(providerInstanceViolations({ ...newsInstance, credentialRef: 'newsdata-key-tenant-b' }, ctx)).toContain('credential-ref-tenant-mismatch');
  });

  it('rejects a disabled credential reference', () => {
    expect(providerInstanceViolations({ ...newsInstance, credentialRef: 'newsdata-key-tenant-a-old' }, ctx)).toContain('credential-ref-disabled');
  });

  it('rejects an unknown credential reference', () => {
    expect(providerInstanceViolations({ ...newsInstance, credentialRef: 'does-not-exist' }, ctx)).toContain('unknown-credential-ref');
  });

  it('rejects an unsupported model on a provider that declares none', () => {
    expect(providerInstanceViolations({ ...techInstance, model: 'gpt-99' }, ctx)).toContain('unsupported-model');
  });
});

describe('PBF-GOV — pipeline node providerInstanceRef (non-secret, optional)', () => {
  const validate = createAjv().compile(loadJSON('schemas/pipeline/v1/pipeline.schema.json'));

  function pipelineWithNode(node: any) {
    return {
      schema: 'afi.pipeline.v1',
      pipelineId: 'provider-backed-probe',
      pipelineVersion: 'v1.0.0',
      entry: 'enrich',
      nodes: [
        { id: 'enrich', category: 'technical', pluginId: 'afi-analysis-technical', pluginVersion: '1.0.0', ...node },
        { id: 'scorer', category: 'scorer', pluginId: 'afi-scorer-froggy-trend-pullback', pluginVersion: '1.0.0' },
      ],
      edges: [{ from: 'enrich', to: 'scorer' }],
    };
  }

  it('a node may carry a versioned providerInstanceRef and still validate', () => {
    const ok = validate(pipelineWithNode({ providerInstanceRef: { providerInstanceId: 'pi-technical-local-tenant-a', recordVersion: '1.0.0' } }));
    if (!ok) console.error('providerInstanceRef pipeline failure:', validate.errors);
    expect(ok).toBe(true);
  });

  it('rejects a providerInstanceRef carrying any credential/secret field (additionalProperties:false)', () => {
    expect(validate(pipelineWithNode({ providerInstanceRef: { providerInstanceId: 'pi-x', recordVersion: '1.0.0', apiKey: 'zzTOPSECRETzz' } }))).toBe(false);
    expect(validate(pipelineWithNode({ providerInstanceRef: { providerInstanceId: 'pi-x', recordVersion: '1.0.0', credentialRef: 'ref-1' } }))).toBe(false);
  });

  it('rejects a providerInstanceRef missing its version pin', () => {
    expect(validate(pipelineWithNode({ providerInstanceRef: { providerInstanceId: 'pi-x' } }))).toBe(false);
  });

  it('the froggy-shaped node WITHOUT a providerInstanceRef still validates (optional; backward compatible)', () => {
    expect(validate(pipelineWithNode({}))).toBe(true);
  });
});
