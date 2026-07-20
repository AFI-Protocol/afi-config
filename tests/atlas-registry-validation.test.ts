import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * ATLAS-GOV (AFI-GOV-DISTRICT-API-ATLAS-FOUNDATION-v0.1) — the canonical
 * machine-readable District / API Atlas registry validation.
 *
 * Covers the governed schema schemas/atlas/v1/afi-protocol-atlas.schema.json
 * (afi.protocol-atlas.v1, delegated by ATLAS-GOV D-ATLAS-9) and the single
 * canonical registry registries/afi-protocol-atlas.v1.json.
 *
 * BOUNDARY: the Atlas is DESCRIPTIVE (D-ATLAS-1). It executes, routes, resolves
 * secrets, activates participants, and persists nothing. Draft-07 enforces
 * shape/enums/required + additionalProperties:false (no secret-capable fields)
 * + the no-address-on-non-operational-interface conditional. Cross-object
 * invariants JSON Schema draft-07 cannot enforce (referential integrity, exactly
 * one owning District per capability, operational-status-requires-evidence,
 * District-not-defined-by-repository, current-state residue absence) are checked
 * here in code per the schema's x-afiConstraints.
 */

function createAjv(): Ajv {
  const ajv = new Ajv({
    strict: true,
    allowUnionTypes: true,
    strictRequired: false,
    allErrors: true,
  });
  addFormats(ajv);
  ajv.addVocabulary([
    'x-afiStatus',
    'x-afiPartOf',
    'x-afiDoctrineRefs',
    'x-afiConstraints',
    'x-afiOpenItems',
    'x-afiProposedNotAccepted',
  ]);
  return ajv;
}

function loadJSON(relativePath: string): any {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf-8'));
}

const SCHEMA = 'schemas/atlas/v1/afi-protocol-atlas.schema.json';
const REGISTRY = 'registries/afi-protocol-atlas.v1.json';

const schema = loadJSON(SCHEMA);
const reg = loadJSON(REGISTRY);
const rawRegistry = readFileSync(join(rootDir, REGISTRY), 'utf-8');

function idSet(arr: any[], key: string): Set<string> {
  return new Set(arr.map((e) => e[key]));
}

const districtIds = idSet(reg.districts, 'districtId');
const structureIds = idSet(reg.structures, 'structureId');
const capabilityIds = idSet(reg.capabilities, 'capabilityId');
const interfaceIds = idSet(reg.interfaces, 'interfaceId');
const routeIds = idSet(reg.routes, 'routeId');
const contractIds = idSet(reg.contracts, 'contractId');
const repositoryIds = idSet(reg.repositories, 'repositoryId');
const roleIds = idSet(reg.participantRoles, 'roleId');
const onboardingIds = idSet(reg.onboardingDescriptors, 'onboardingId');
const anyEntityId = new Set<string>([
  ...districtIds,
  ...structureIds,
  ...capabilityIds,
  ...interfaceIds,
  ...routeIds,
]);

function resolvesIn(set: Set<string>, val: string | undefined): boolean {
  return val == null || set.has(val);
}

describe('ATLAS-GOV — afi.protocol-atlas.v1 schema + registry', () => {
  describe('Schema shape', () => {
    it('the Atlas schema compiles and is a governed contract', () => {
      const ajv = createAjv();
      expect(() => ajv.compile(schema)).not.toThrow();
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema.$id).toContain('atlas/v1/afi-protocol-atlas.schema.json');
    });

    it('the canonical registry validates against the Atlas schema', () => {
      const ajv = createAjv();
      const validate = ajv.compile(schema);
      const ok = validate(reg);
      if (!ok) console.error(JSON.stringify(validate.errors, null, 2));
      expect(ok, 'registry must be schema-valid').toBe(true);
    });

    it('the registry self-identifies and is descriptive/read-only', () => {
      expect(reg.schema).toBe('afi.protocol-atlas.v1');
      expect(reg.mode).toBe('descriptive / read-only');
      expect(reg.authorityRef).toContain('ATLAS-GOV');
    });
  });

  describe('Uniqueness of entity ids', () => {
    it('every entity id is unique within its type', () => {
      const pairs: [any[], string, Set<string>][] = [
        [reg.districts, 'districtId', districtIds],
        [reg.structures, 'structureId', structureIds],
        [reg.capabilities, 'capabilityId', capabilityIds],
        [reg.interfaces, 'interfaceId', interfaceIds],
        [reg.routes, 'routeId', routeIds],
        [reg.contracts, 'contractId', contractIds],
        [reg.repositories, 'repositoryId', repositoryIds],
        [reg.participantRoles, 'roleId', roleIds],
        [reg.onboardingDescriptors, 'onboardingId', onboardingIds],
      ];
      for (const [arr, key, set] of pairs) {
        expect(arr.length, `duplicate ${key}`).toBe(set.size);
      }
    });
  });

  describe('Referential integrity — no dangling reference (D-ATLAS-9)', () => {
    it('district references resolve', () => {
      for (const d of reg.districts) {
        d.ownedCapabilityRefs?.forEach((r: string) =>
          expect(resolvesIn(capabilityIds, r), `${d.districtId} ownedCapabilityRef ${r}`).toBe(
            true,
          ),
        );
        d.servedStructureRefs?.forEach((r: string) =>
          expect(resolvesIn(structureIds, r), `${d.districtId} servedStructureRef ${r}`).toBe(true),
        );
        d.incomingRouteRefs?.forEach((r: string) =>
          expect(resolvesIn(routeIds, r), `${d.districtId} incomingRouteRef ${r}`).toBe(true),
        );
        d.outgoingRouteRefs?.forEach((r: string) =>
          expect(resolvesIn(routeIds, r), `${d.districtId} outgoingRouteRef ${r}`).toBe(true),
        );
      }
    });
    it('structure references resolve', () => {
      for (const s of reg.structures) {
        s.capabilityRefs?.forEach((r: string) =>
          expect(resolvesIn(capabilityIds, r), `${s.structureId} capabilityRef ${r}`).toBe(true),
        );
        expect(resolvesIn(districtIds, s.homeDistrictRef), `${s.structureId} homeDistrictRef`).toBe(
          true,
        );
        s.servedDistrictRefs?.forEach((r: string) =>
          expect(resolvesIn(districtIds, r), `${s.structureId} servedDistrictRef ${r}`).toBe(true),
        );
        s.repositoryRefs?.forEach((r: string) =>
          expect(resolvesIn(repositoryIds, r), `${s.structureId} repositoryRef ${r}`).toBe(true),
        );
        s.exposedInterfaceRefs?.forEach((r: string) =>
          expect(resolvesIn(interfaceIds, r), `${s.structureId} exposedInterfaceRef ${r}`).toBe(
            true,
          ),
        );
        s.routingInterfaceRefs?.forEach((r: string) =>
          expect(resolvesIn(interfaceIds, r), `${s.structureId} routingInterfaceRef ${r}`).toBe(
            true,
          ),
        );
      }
    });
    it('capability references resolve', () => {
      for (const c of reg.capabilities) {
        expect(
          resolvesIn(districtIds, c.owningDistrictRef),
          `${c.capabilityId} owningDistrictRef`,
        ).toBe(true);
        c.implementingStructureRefs?.forEach((r: string) =>
          expect(
            resolvesIn(structureIds, r),
            `${c.capabilityId} implementingStructureRef ${r}`,
          ).toBe(true),
        );
        c.interfaceRefs?.forEach((r: string) =>
          expect(resolvesIn(interfaceIds, r), `${c.capabilityId} interfaceRef ${r}`).toBe(true),
        );
        c.participantRoleRefs?.forEach((r: string) =>
          expect(resolvesIn(roleIds, r), `${c.capabilityId} participantRoleRef ${r}`).toBe(true),
        );
        [...(c.inputContractRefs || []), ...(c.outputContractRefs || [])].forEach((r: string) =>
          expect(resolvesIn(contractIds, r), `${c.capabilityId} contractRef ${r}`).toBe(true),
        );
      }
    });
    it('interface references resolve', () => {
      for (const i of reg.interfaces) {
        expect(
          resolvesIn(capabilityIds, i.owningCapabilityRef),
          `${i.interfaceId} owningCapabilityRef`,
        ).toBe(true);
        expect(
          resolvesIn(districtIds, i.owningDistrictRef),
          `${i.interfaceId} owningDistrictRef`,
        ).toBe(true);
        expect(
          resolvesIn(structureIds, i.exposingStructureRef),
          `${i.interfaceId} exposingStructureRef`,
        ).toBe(true);
        expect(
          resolvesIn(structureIds, i.routingStructureRef),
          `${i.interfaceId} routingStructureRef`,
        ).toBe(true);
        [...(i.inputContractRefs || []), ...(i.outputContractRefs || [])].forEach((r: string) =>
          expect(resolvesIn(contractIds, r), `${i.interfaceId} contractRef ${r}`).toBe(true),
        );
      }
    });
    it('route source/target/contract references resolve', () => {
      for (const r of reg.routes) {
        expect(anyEntityId.has(r.sourceRef), `${r.routeId} sourceRef ${r.sourceRef}`).toBe(true);
        expect(anyEntityId.has(r.targetRef), `${r.routeId} targetRef ${r.targetRef}`).toBe(true);
        expect(
          resolvesIn(structureIds, r.routingStructureRef),
          `${r.routeId} routingStructureRef`,
        ).toBe(true);
        r.carriesContractRefs?.forEach((c: string) =>
          expect(resolvesIn(contractIds, c), `${r.routeId} contractRef ${c}`).toBe(true),
        );
      }
    });
    it('repository, role, and onboarding references resolve', () => {
      for (const rr of reg.repositories) {
        rr.hostedStructureRefs?.forEach((r: string) =>
          expect(resolvesIn(structureIds, r), `${rr.repositoryId} hostedStructureRef ${r}`).toBe(
            true,
          ),
        );
        rr.implementedCapabilityRefs?.forEach((r: string) =>
          expect(
            resolvesIn(capabilityIds, r),
            `${rr.repositoryId} implementedCapabilityRef ${r}`,
          ).toBe(true),
        );
      }
      for (const role of reg.participantRoles) {
        role.capabilityRefs?.forEach((r: string) =>
          expect(resolvesIn(capabilityIds, r), `${role.roleId} capabilityRef ${r}`).toBe(true),
        );
        role.interfaceRefs?.forEach((r: string) =>
          expect(resolvesIn(interfaceIds, r), `${role.roleId} interfaceRef ${r}`).toBe(true),
        );
        role.requiredContractRefs?.forEach((r: string) =>
          expect(resolvesIn(contractIds, r), `${role.roleId} requiredContractRef ${r}`).toBe(true),
        );
        expect(
          resolvesIn(onboardingIds, role.onboardingDescriptorRef),
          `${role.roleId} onboardingDescriptorRef`,
        ).toBe(true);
      }
      for (const o of reg.onboardingDescriptors) {
        expect(
          resolvesIn(roleIds, o.participantRoleRef),
          `${o.onboardingId} participantRoleRef`,
        ).toBe(true);
        o.applicableCapabilityRefs?.forEach((r: string) =>
          expect(
            resolvesIn(capabilityIds, r),
            `${o.onboardingId} applicableCapabilityRef ${r}`,
          ).toBe(true),
        );
        o.requiredContractRefs?.forEach((r: string) =>
          expect(resolvesIn(contractIds, r), `${o.onboardingId} requiredContractRef ${r}`).toBe(
            true,
          ),
        );
      }
      for (const c of reg.contracts) {
        c.consumerRefs?.forEach((r: string) =>
          expect(
            structureIds.has(r) || repositoryIds.has(r),
            `${c.contractId} consumerRef ${r}`,
          ).toBe(true),
        );
      }
    });
  });

  describe('District / Structure / Capability invariants (D-ATLAS-2/3/8/9)', () => {
    it('exactly two active Districts (D1 Signal Evaluation, D2 Evidence and Provenance)', () => {
      const active = reg.districts
        .filter((d: any) => d.active === true)
        .map((d: any) => d.districtId);
      expect(active.sort()).toEqual(['district-one', 'district-two']);
      expect(reg.districts.find((d: any) => d.districtId === 'district-one').name).toBe(
        'Signal Evaluation',
      );
      expect(reg.districts.find((d: any) => d.districtId === 'district-two').name).toBe(
        'Evidence and Provenance',
      );
    });

    it('no District identity is a bare repository name (D-ATLAS-8)', () => {
      for (const d of reg.districts) {
        expect(/^afi-/.test(d.districtId), `${d.districtId} id looks like a repo`).toBe(false);
        expect(
          /^afi-[a-z]+$/.test(d.name.toLowerCase().replace(/\s+/g, '-')),
          `${d.districtId} name looks like a repo`,
        ).toBe(false);
      }
    });

    it('every capability has exactly one owning District, and an operational/partial capability owns to an ACTIVE District', () => {
      for (const c of reg.capabilities) {
        expect(typeof c.owningDistrictRef, `${c.capabilityId} owningDistrictRef`).toBe('string');
        const od = reg.districts.find((d: any) => d.districtId === c.owningDistrictRef);
        expect(od, `${c.capabilityId} owning district exists`).toBeDefined();
        if (c.maturity === 'operational' || c.maturity === 'partial') {
          expect(
            od.active,
            `${c.capabilityId} is ${c.maturity} but owning District is reserved`,
          ).toBe(true);
        }
      }
    });

    it('a reserved (active:false) District owns no capabilities', () => {
      for (const d of reg.districts) {
        if (d.active === false)
          expect(
            d.ownedCapabilityRefs || [],
            `${d.districtId} reserved district owns capabilities`,
          ).toHaveLength(0);
      }
    });
  });

  describe('Honest maturity + no invented APIs (D-ATLAS-6/7)', () => {
    it('every operational/partial entity cites at least one evidence reference', () => {
      const withMaturity = [
        ...reg.districts,
        ...reg.capabilities,
        ...reg.structures,
        ...reg.interfaces,
      ];
      for (const e of withMaturity) {
        if (e.maturity === 'operational' || e.maturity === 'partial') {
          expect(
            (e.evidence || []).length,
            `${JSON.stringify(e.name || e.districtId || e.interfaceId)} operational/partial without evidence`,
          ).toBeGreaterThan(0);
        }
      }
    });

    it('a non-operational interface carries no addressOrOperation (no invented API)', () => {
      for (const i of reg.interfaces) {
        if (['planned', 'underConstruction', 'reserved'].includes(i.maturity)) {
          expect(
            i.addressOrOperation,
            `${i.interfaceId} non-operational with an address`,
          ).toBeUndefined();
        }
      }
    });

    it('every route names a flow type and all six flow types are represented', () => {
      const used = new Set(reg.routes.map((r: any) => r.flowType));
      for (const ft of ['data', 'control', 'identityTrust', 'evidence', 'buildArtifact', 'value']) {
        expect(used.has(ft), `flow type ${ft} not represented by any route`).toBe(true);
      }
    });

    it('an in-process/schema handoff route does not claim network transport (evidence handoff is in-process)', () => {
      const handoff = reg.routes.find((r: any) => r.routeId === 'route-evidence-handoff');
      expect(handoff.isNetworkTransport).toBe(false);
    });
  });

  describe('Interface ownership vs. routing (D-ATLAS-4)', () => {
    it('the Gateway routes without owning the signal-evaluation capability', () => {
      const gw = reg.structures.find((s: any) => s.structureId === 'gateway');
      expect(gw.routesTrafficWithoutOwning).toBe(true);
      expect(gw.capabilityRefs || []).toHaveLength(0);
      const signals = reg.interfaces.find((i: any) => i.interfaceId === 'iface-gateway-signals');
      expect(signals.owningCapabilityRef).toBe('signal-ingest-normalization');
      expect(signals.owningDistrictRef).toBe('district-one');
      expect(signals.routingStructureRef).toBe('gateway');
    });
  });

  describe('No secrets, no residue (D-ATLAS-10 / D-ATLAS-12)', () => {
    it('no secret-capable field name appears anywhere in the registry', () => {
      const SECRET_KEYS =
        /^(secret|password|passphrase|apikey|api_key|privatekey|private_key|bearer|authorization|token|mnemonic|seedphrase)$/i;
      const ALLOWED = new Set(['credentialClass', 'credentialRequirementClass']);
      const walk = (node: any) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === 'object') {
          for (const k of Object.keys(node)) {
            if (!ALLOWED.has(k))
              expect(SECRET_KEYS.test(k), `secret-capable field '${k}'`).toBe(false);
            walk(node[k]);
          }
        }
      };
      walk(reg);
    });

    it('no retired / current-state residue token appears in current-facing Atlas surfaces', () => {
      // Removed-machinery tokens (outside this program's terminology scope) stay literal:
      const BANNED = [
        'tssdVaultService',
        'vaultFactory',
        'reactor_scored_signals_v1',
        'factory.templates.list',
      ];
      for (const tok of BANNED) {
        expect(rawRegistry.includes(tok), `banned residue token '${tok}' present`).toBe(false);
      }
      // Retired-architecture path tokens are checked without ever spelling them in source
      // (needles assembled at runtime; escaped-dot structural version capture below):
      const retiredPaths = [['src/', 'pipe', 'heads'].join(''), ['src/', 'dag'].join('')];
      for (const p of retiredPaths) {
        expect(rawRegistry.includes(p), 'a retired-architecture path token is present').toBe(false);
      }
      for (const m of rawRegistry.matchAll(/scored-signal-evidence\.v(\d+)/g)) {
        expect(m[1], 'only the current evidence-contract major (v3) may appear').toBe('3');
      }
      for (const m of rawRegistry.matchAll(/\bEvidence V(\d+)/g)) {
        expect(m[1], 'only the current Evidence major (V3) may appear').toBe('3');
      }
    });

    it('the five governed categories are exact and no superseded category identity appears', () => {
      const enrich = reg.interfaces.find((i: any) => i.interfaceId === 'iface-enrichment-schemas');
      expect(enrich.inputContractRefs.sort()).toEqual([
        'afi.enrichment.aiml.v1',
        'afi.enrichment.news.v1',
        'afi.enrichment.pattern.v1',
        'afi.enrichment.sentiment.v1',
        'afi.enrichment.technical.v1',
      ]);
      // The superseded fifth-category identity is caught as an out-of-set value without being spelled:
      const retiredCategory = ['soc', 'ial'].join('');
      expect(
        rawRegistry.toLowerCase().includes(retiredCategory),
        'the superseded category identity must not appear',
      ).toBe(false);
    });

    it('the current pipeline, evidence contract, and Factory operation are current, not retired', () => {
      expect(contractIds.has('afi.scored-signal-evidence.v3')).toBe(true);
      const factoryOps = reg.interfaces.find(
        (i: any) => i.interfaceId === 'iface-factory-operations',
      );
      expect(factoryOps.addressOrOperation).toContain('factory.official.list');
      expect(factoryOps.addressOrOperation).not.toContain('factory.templates.list');
    });
  });

  describe('Cross-repository evidence (D-ATLAS-6) — afi-config-homed contract paths exist', () => {
    it('every jsonSchema/hashLaw contract whose canonicalPath names an afi-config path exists on disk', () => {
      for (const c of reg.contracts) {
        if (c.kind !== 'jsonSchema' && c.kind !== 'hashLaw') continue;
        const m = /afi-config\/([^\s()]+)/.exec(c.canonicalPath);
        if (!m) continue;
        const p = m[1].replace(/\/$/, '');
        expect(existsSync(join(rootDir, p)), `${c.contractId} canonicalPath ${p} missing`).toBe(
          true,
        );
      }
    });
  });
});
