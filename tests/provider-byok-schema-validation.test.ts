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
 * FACTORY-CONTRACT — Provider Adapter & BYOK Foundations v0.1 (PBF-GOV).
 *
 * The three canonical non-secret objects:
 *   - afi.provider.v1          (compute/data provider identity)
 *   - afi.credential-ref.v1    (opaque, non-secret BYOK pointer)
 *   - afi.provider-instance.v1 (tenant-scoped provider configuration)
 *
 * Authorized by afi-governance/decisions/provider-byok-foundations-v0.1
 * (PBF-GOV D-PBF-4/D-PBF-5/D-PBF-6/D-PBF-7). Every object is non-secret:
 * additionalProperties:false plus explicit allowed fields leave a secret
 * value nowhere to live (the cross-reference suite adds a secret-name
 * denylist as defense in depth).
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

function listJSON(relativeDir: string): string[] {
  return readdirSync(join(rootDir, relativeDir)).filter(f => f.endsWith('.json')).sort();
}

interface Family {
  name: string;
  schema: string;
  const: string;
  example: string;
  validDir: string;
  invalidDir: string;
  validFiles: string[];
  invalidFiles: string[];
  required: string[];
}

const FAMILIES: Family[] = [
  {
    name: 'afi.provider.v1',
    schema: 'schemas/provider/v1/provider.schema.json',
    const: 'afi.provider.v1',
    example: 'examples/provider/v1/provider.example.json',
    validDir: 'examples/provider/v1/vectors/valid',
    invalidDir: 'examples/provider/v1/vectors/invalid',
    validFiles: ['aiml-probabilistic-with-models.json', 'news-credentialed.json', 'technical-keyless.json'],
    invalidFiles: [
      'adapter-path.json',
      'bad-version.json',
      'category-merge.json',
      'credentialed-missing-kind.json',
      'keyless-with-credential-kind.json',
      'secret-inline.json',
    ],
    required: [
      'schema', 'providerId', 'recordVersion', 'displayName', 'supportedCategories',
      'executionClass', 'deterministic', 'adapterId', 'requiresCredential', 'status',
    ],
  },
  {
    name: 'afi.credential-ref.v1',
    schema: 'schemas/credential-ref/v1/credential-ref.schema.json',
    const: 'afi.credential-ref.v1',
    example: 'examples/credential-ref/v1/credential-ref.example.json',
    validDir: 'examples/credential-ref/v1/vectors/valid',
    invalidDir: 'examples/credential-ref/v1/vectors/invalid',
    validFiles: ['disabled-rotated.json', 'news-key-tenant-a.json', 'news-key-tenant-b.json'],
    invalidFiles: [
      'bad-kind.json',
      'inline-api-key.json',
      'inline-authorization.json',
      'inline-token.json',
      'missing-tenant.json',
      'ref-is-backend-path.json',
    ],
    required: ['schema', 'credentialRef', 'recordVersion', 'tenant', 'providerId', 'credentialKind', 'status'],
  },
  {
    name: 'afi.provider-instance.v1',
    schema: 'schemas/provider-instance/v1/provider-instance.schema.json',
    const: 'afi.provider-instance.v1',
    example: 'examples/provider-instance/v1/provider-instance.example.json',
    validDir: 'examples/provider-instance/v1/vectors/valid',
    invalidDir: 'examples/provider-instance/v1/vectors/invalid',
    validFiles: ['news-http-tenant-a-tuned.json', 'news-http-tenant-a.json', 'technical-local-tenant-a.json'],
    invalidFiles: [
      'bad-adapter-version.json',
      'bad-category.json',
      'endpoint-profile-url.json',
      'missing-adapter.json',
      'raw-endpoint.json',
      'secret-inline.json',
    ],
    required: [
      'schema', 'providerInstanceId', 'recordVersion', 'tenant', 'category',
      'providerId', 'adapterId', 'adapterVersion', 'status',
    ],
  },
];

describe('PBF-GOV — provider / credential-ref / provider-instance schemas', () => {
  for (const fam of FAMILIES) {
    describe(fam.name, () => {
      const compile = () => createAjv().compile(loadJSON(fam.schema));

      it('compiles under AJV strict draft-07', () => {
        expect(() => compile()).not.toThrow();
      });

      it('carries the governed-contract envelope (status, $id, const, additionalProperties:false, required)', () => {
        const schema = loadJSON(fam.schema);
        expect(schema['x-afiStatus']).toBe('governed-contract');
        expect(schema.$schema).toContain('json-schema.org');
        expect(schema.title).toBeDefined();
        expect(schema.type).toBe('object');
        expect(schema.additionalProperties).toBe(false);
        expect(schema.properties.schema.const).toBe(fam.const);
        expect([...schema.required].sort()).toEqual([...fam.required].sort());
        // Every governed object cites the PBF-GOV decision.
        expect(JSON.stringify(schema['x-afiDoctrineRefs'])).toContain('provider-byok-foundations-v0.1');
        // No filesystem/code-binding surface exists.
        ['entrypoint', 'path', 'module', 'file', 'main', 'endpoint', 'url'].forEach(p =>
          expect(Object.keys(schema.properties), `${fam.name} must not define '${p}'`).not.toContain(p)
        );
      });

      it('the canonical example validates', () => {
        const validate = compile();
        const ok = validate(loadJSON(fam.example));
        if (!ok) console.error(`${fam.name} example failure:`, validate.errors);
        expect(ok).toBe(true);
      });

      it('every valid vector validates (drift-guarded)', () => {
        expect(listJSON(fam.validDir)).toEqual([...fam.validFiles].sort());
        const validate = compile();
        fam.validFiles.forEach(f => {
          const ok = validate(loadJSON(`${fam.validDir}/${f}`));
          if (!ok) console.error(`${fam.name}/${f} failure:`, validate.errors);
          expect(ok, `${fam.name} valid vector ${f}`).toBe(true);
        });
      });

      it('every invalid vector is rejected (drift-guarded)', () => {
        expect(listJSON(fam.invalidDir)).toEqual([...fam.invalidFiles].sort());
        const validate = compile();
        fam.invalidFiles.forEach(f => {
          expect(validate(loadJSON(`${fam.invalidDir}/${f}`)), `${fam.name} invalid vector ${f} must be rejected`).toBe(false);
        });
      });

      it('rejects any missing required field (clone-and-delete)', () => {
        const validate = compile();
        const base = loadJSON(fam.example);
        fam.required.forEach(field => {
          const invalid: any = clone(base);
          delete invalid[field];
          expect(validate(invalid), `${fam.name} missing ${field} must be rejected`).toBe(false);
        });
      });

      it('rejects an inline secret-named field (additionalProperties:false)', () => {
        const validate = compile();
        ['apiKey', 'api_key', 'apikey', 'token', 'accessToken', 'secret', 'password', 'authorization', 'privateKey'].forEach(secretField => {
          const invalid: any = clone(loadJSON(fam.example));
          invalid[secretField] = 'zzTOPSECRETzz-do-not-log';
          expect(validate(invalid), `${fam.name} inline '${secretField}' must be rejected`).toBe(false);
        });
      });
    });
  }

  describe('afi.provider.v1 — credentialKind presence (structural)', () => {
    const validate = createAjv().compile(loadJSON('schemas/provider/v1/provider.schema.json'));
    const keyless = loadJSON('examples/provider/v1/vectors/valid/technical-keyless.json');
    const credentialed = loadJSON('examples/provider/v1/vectors/valid/news-credentialed.json');

    it('a keyless provider (requiresCredential:false) MUST NOT declare credentialKind', () => {
      expect(validate(keyless)).toBe(true);
      expect(validate({ ...keyless, credentialKind: 'apiKeyHeader' })).toBe(false);
    });

    it('a credentialed provider (requiresCredential:true) MUST declare credentialKind', () => {
      expect(validate(credentialed)).toBe(true);
      const { credentialKind, ...withoutKind } = credentialed;
      expect(validate(withoutKind)).toBe(false);
    });
  });

  describe('afi.provider-instance.v1 — anti-SSRF endpoint discipline (structural)', () => {
    const validate = createAjv().compile(loadJSON('schemas/provider-instance/v1/provider-instance.schema.json'));
    const base = loadJSON('examples/provider-instance/v1/vectors/valid/news-http-tenant-a.json');

    it('accepts the named allow-listed endpointProfile "default" but rejects any raw URL / arbitrary endpoint', () => {
      expect(validate({ ...base, invocation: { endpointProfile: 'default' } })).toBe(true);
      // Raw endpoint field is not allowed (additionalProperties:false on invocation).
      expect(validate({ ...base, invocation: { endpoint: 'http://169.254.169.254/' } })).toBe(false);
      // endpointProfile is an enum — a URL value is rejected.
      expect(validate({ ...base, invocation: { endpointProfile: 'http://evil.example' } })).toBe(false);
    });
  });
});
