import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * CAL-GOV CAL-SCHEMA — afi.analyst-calibration.v1 (D-CAL-1 … D-CAL-5).
 *
 * Three sections (house pattern): (1) strict compilation + governed metadata
 * pins; (2) canonical example + drift-guarded vectors with a semantic layer
 * (seal reproduction, the six-decimal round-half-even law, sorted sets, the
 * status/claim presence rules, bin completeness, n-consistency, and the
 * no-scalar / no-PoI-PoInsight rule — the x-afiConstraints draft-07 cannot
 * express); (3) named negatives. The valid vectors double as THE GOVERNED
 * SEALING VECTORS: every seal.value reproduces under the canonical-json
 * reference implementation with the top-level 'seal' member excluded —
 * the D-CAL-1(5) sealing answer, proven, not asserted.
 */

function loadJSON(relativePath: string): any {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf-8'));
}

const SCHEMA_FILE = 'schemas/analyst-calibration/v1/analyst-calibration.schema.json';
const HASH_SCHEMA_FILE = 'schemas/provenance/v1/canonical-hash.schema.json';
const EXAMPLE_FILE = 'examples/analyst-calibration/v1/analyst-calibration.example.json';
const VALID_DIR = 'examples/analyst-calibration/v1/vectors/valid';
const INVALID_DIR = 'examples/analyst-calibration/v1/vectors/invalid';
const DOMAIN_TAG = 'afi.calibration.analyst';
const FRACTIONS = ['0.25', '0.5', '1'];
const GROUP_MIN_N = 100;
const RANK_CLAIM_MIN_N = 200;
const BIN_MIN_N = 20;

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
    'x-afiOpenItems',
    'x-afiProposedNotAccepted',
    'x-afiConstraints',
  ]);
  ajv.addSchema(loadJSON(HASH_SCHEMA_FILE));
  return ajv;
}

// canonical-json-hashing.v1 reference implementation (spec §2)
function canonicalize(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  return (
    '{' +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonicalize(v[k]))
      .join(',') +
    '}'
  );
}
function sealOf(doc: any): string {
  const stripped: any = {};
  for (const k of Object.keys(doc)) if (k !== 'seal') stripped[k] = doc[k];
  return createHash('sha256')
    .update(Buffer.from(canonicalize(stripped), 'utf-8'))
    .digest('hex');
}
/** Round-half-even to 6 dp on the exact binary value (decimal-string arithmetic). */
function round6(x: number): number {
  const neg = x < 0;
  const s = Math.abs(x).toFixed(100);
  const [ip, fp] = s.split('.');
  const digits = (ip + fp.slice(0, 6)).split('').map((c) => c.charCodeAt(0) - 48);
  const rest = fp.slice(6);
  const first = rest.charCodeAt(0) - 48;
  const tailNonZero = /[1-9]/.test(rest.slice(1));
  let up = false;
  if (first > 5 || (first === 5 && tailNonZero)) up = true;
  else if (first === 5 && !tailNonZero) up = digits[digits.length - 1] % 2 === 1;
  if (up) {
    for (let i = digits.length - 1; i >= 0; i--) {
      if (digits[i] === 9) digits[i] = 0;
      else {
        digits[i]++;
        break;
      }
      if (i === 0) digits.unshift(1);
    }
  }
  const str = digits.join('');
  const val = Number((str.slice(0, str.length - 6) || '0') + '.' + str.slice(-6));
  return neg && val !== 0 ? -val : val;
}
const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const isSortedUnique = (arr: string[]) => arr.every((v, i) => i === 0 || cmpStr(arr[i - 1], v) < 0);

/** Semantic-layer violations (the x-afiConstraints rules draft-07 cannot express). */
function semanticViolations(doc: any): string[] {
  const v: string[] = [];
  if (doc?.seal?.value !== sealOf(doc)) v.push('seal does not reproduce');
  // no scalar / no reserved-name members anywhere (D-CAL-1(3), D-CAL-5)
  const forbidden = /(^|[^a-z])(poi|poinsight|reputation|rep_?t)([^a-z]|$)/i;
  const walkKeys = (o: any, path: string) => {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      if (forbidden.test(k)) v.push(`reserved-name member ${path}.${k}`);
      walkKeys(o[k], `${path}.${k}`);
    }
  };
  walkKeys(doc, '$');
  const TOP = new Set([
    'schema',
    'rule',
    'readingRule',
    'groupKey',
    'n',
    'attribution',
    'provenance',
    'readings',
    'realized',
    'reliability',
    'rank',
    'strata',
    'dependence',
    'supersedes',
    'seal',
  ]);
  for (const k of Object.keys(doc ?? {}))
    if (!TOP.has(k)) v.push(`non-exhaustive top-level member ${k}`);
  // rounding law on every derived non-integer
  const walkNums = (o: any, path: string) => {
    if (o === null || typeof o !== 'object') return;
    for (const [k, val] of Object.entries(o)) {
      if (typeof val === 'number' && !Number.isInteger(val) && round6(val) !== val)
        v.push(`unrounded member ${path}.${k}=${val}`);
      walkNums(val, `${path}.${k}`);
    }
  };
  walkNums(doc, '$');
  const p = doc?.provenance ?? {};
  for (const s of ['symbols', 'timeframes', 'providers', 'analystConfigHashes']) {
    if (Array.isArray(p[s]) && !isSortedUnique(p[s])) v.push(`${s} not sorted/unique`);
  }
  if (Array.isArray(p.signalIds) && doc.n !== p.signalIds.length)
    v.push('n disagrees with provenance.signalIds');
  const d = p.directions ?? {};
  if ((d.long ?? 0) + (d.short ?? 0) + (d.neutral ?? 0) !== doc.n)
    v.push('direction counts do not sum to n');
  // status presence rules
  const checkBlock = (
    b: any,
    minN: number,
    label: string,
    hasCount: boolean,
    estimateKey: string,
  ) => {
    if (!b) return;
    const expected = b.n < minN ? 'insufficient' : b.status === 'withheld' ? 'withheld' : 'sealed';
    if (b.n < minN && b.status !== 'insufficient')
      v.push(`${label}: status ${b.status} below minimum n=${b.n}`);
    if (b.status === 'insufficient' && (b[estimateKey] !== undefined || b.interval !== undefined))
      v.push(`${label}: estimate present under insufficient`);
    if (b.status === 'withheld' && b.interval !== undefined)
      v.push(`${label}: interval present under withheld`);
    if (b.status === 'sealed' && (b[estimateKey] === undefined || b.interval === undefined))
      v.push(`${label}: sealed without estimate/interval`);
    if (hasCount && b.rate !== undefined && b.n > 0 && b.rate !== round6(b.count / b.n))
      v.push(`${label}: rate ≠ round6(count/n)`);
    void expected;
  };
  for (const f of FRACTIONS) {
    const r = doc?.realized?.[f];
    checkBlock(r?.win, GROUP_MIN_N, `realized.${f}.win`, true, 'rate');
    checkBlock(
      r?.meanSignedReturnPct,
      GROUP_MIN_N,
      `realized.${f}.meanSignedReturnPct`,
      false,
      'mean',
    );
    checkBlock(r?.meanMfePct, GROUP_MIN_N, `realized.${f}.meanMfePct`, false, 'mean');
    checkBlock(r?.meanMaePct, GROUP_MIN_N, `realized.${f}.meanMaePct`, false, 'mean');
    const bins = doc?.reliability?.[f];
    if (Array.isArray(bins)) {
      bins.forEach((b: any, i: number) => {
        if (b.k !== i) v.push(`reliability.${f}: bin ${i} has k=${b.k}`);
        if (b.rate !== undefined && b.n > 0 && b.rate !== round6(b.favorable / b.n))
          v.push(`reliability.${f}[${i}]: rate ≠ round6(favorable/n)`);
        checkBlock({ ...b, count: b.favorable }, BIN_MIN_N, `reliability.${f}[${i}]`, true, 'rate');
      });
    }
    const rk = doc?.rank?.[f];
    if (rk) {
      checkBlock(rk, GROUP_MIN_N, `rank.${f}`, false, 'rho');
      if (rk.status === 'insufficient' && rk.claim !== undefined)
        v.push(`rank.${f}: claim present under insufficient`);
      if (rk.status !== 'insufficient' && rk.claim === undefined)
        v.push(`rank.${f}: claim missing`);
      if (rk.claim === 'sealed' && rk.n < RANK_CLAIM_MIN_N)
        v.push(`rank.${f}: claim sealed below n=${RANK_CLAIM_MIN_N}`);
    }
    for (const kind of ['riskBucket', 'direction']) {
      for (const [name, st] of Object.entries<any>(doc?.strata?.[kind] ?? {})) {
        const rr = st?.realized?.[f];
        checkBlock(rr?.win, GROUP_MIN_N, `strata.${kind}.${name}.realized.${f}.win`, true, 'rate');
      }
    }
  }
  const dep = doc?.dependence;
  if (dep && doc.n > 0 && dep.pairingFraction !== round6(dep.pairedOpposite / doc.n))
    v.push('pairingFraction ≠ round6(pairedOpposite/n)');
  if (dep && dep.pairedOpposite > dep.withNeighbour) v.push('pairedOpposite > withNeighbour');
  if (doc?.seal?.domainTag !== DOMAIN_TAG) v.push('wrong domain tag');
  return v;
}

describe('afi.analyst-calibration.v1 — CAL-GOV CAL-SCHEMA (D-CAL-1 … D-CAL-5)', () => {
  const schema = loadJSON(SCHEMA_FILE);
  const ajv = createAjv();
  const validate = ajv.compile(schema);

  describe('1. strict compilation + governed metadata pins', () => {
    it('compiles under strict AJV with the canonical-hash sibling', () => {
      expect(typeof validate).toBe('function');
    });
    it('is a governed contract of CAL-GOV', () => {
      expect(schema['x-afiStatus']).toBe('governed-contract');
      expect(schema['x-afiPartOf']).toContain('CAL-GOV');
      expect(schema.properties.schema.const).toBe('afi.analyst-calibration.v1');
      expect(schema.properties.rule.const).toBe('analyst-calibration-v1');
      expect(schema.properties.readingRule.const).toBe('signedReturnPct-sign-v1');
      expect(schema.additionalProperties).toBe(false);
    });
    it('closes every object level (D-CAL-1(3) exhaustive members)', () => {
      const open: string[] = [];
      const walk = (o: any, path: string) => {
        if (!o || typeof o !== 'object') return;
        // objects inside an allOf branch inherit closure from the referenced schema (the seal's canonical-hash sibling)
        if (
          o.type === 'object' &&
          o.additionalProperties !== false &&
          !o.allOf &&
          !path.includes('.allOf.')
        )
          open.push(path);
        for (const [k, val] of Object.entries(o)) walk(val, `${path}.${k}`);
      };
      walk(schema, '$');
      expect(open).toEqual([]);
    });
    it('names no PoI / PoInsight / reputation member (D-CAL-5)', () => {
      const keys: string[] = [];
      const walk = (o: any) => {
        if (!o || typeof o !== 'object') return;
        for (const [k, val] of Object.entries(o)) {
          if (k === 'properties' && val && typeof val === 'object') keys.push(...Object.keys(val));
          walk(val);
        }
      };
      walk(schema);
      expect(
        keys.filter((k) => /(^|[^a-z])(poi|poinsight|reputation|rep_?t)([^a-z]|$)/i.test(k)),
      ).toEqual([]);
    });
  });

  describe('2. canonical example + governed vectors + semantic layer', () => {
    it('example validates and reproduces its seal', () => {
      const ex = loadJSON(EXAMPLE_FILE);
      expect(validate(ex), JSON.stringify(validate.errors)).toBe(true);
      expect(semanticViolations(ex)).toEqual([]);
    });
    const validFiles = readdirSync(join(rootDir, VALID_DIR))
      .filter((f) => f.endsWith('.json'))
      .sort();
    it('has at least three valid vectors (two corpus keys + a second run)', () => {
      expect(validFiles.length).toBeGreaterThanOrEqual(3);
    });
    for (const f of validFiles) {
      it(`valid vector ${f}: schema-valid, seal reproduces, semantic layer clean`, () => {
        const doc = loadJSON(join(VALID_DIR, f));
        expect(validate(doc), JSON.stringify(validate.errors)).toBe(true);
        expect(semanticViolations(doc)).toEqual([]);
      });
    }
    it('the corpus vectors carry the CAL-BUILDER gate figures (2026-08-24)', () => {
      const h60 = loadJSON(join(VALID_DIR, 'froggy-h60-2026-08-24.json'));
      const h180 = loadJSON(join(VALID_DIR, 'froggy-h180-2026-08-24.json'));
      expect(h60.n).toBe(141);
      expect(h60.provenance.directions).toEqual({ long: 71, short: 70, neutral: 0 });
      expect(h60.readings.overall).toEqual({
        confirmed: 41,
        contradicted: 43,
        mixed: 57,
        indeterminate: 0,
      });
      expect(h60.realized['1'].win.count).toBe(69);
      expect(h60.realized['1'].win.rate).toBe(0.489362);
      expect(h60.realized['1'].win.se).toBe(0.029567);
      expect(h60.rank['1'].rho).toBe(0.037435);
      expect(h60.rank['1'].interval).toEqual([-0.118875, 0.191934]);
      expect(h60.rank['1'].claim).toBe('insufficient-for-claim');
      expect(
        h60.reliability['1'].filter((b: any) => b.status === 'sealed').map((b: any) => b.k),
      ).toEqual([7, 8, 10, 11]);
      expect(h60.dependence.clusters).toBe(57);
      expect(h60.dependence.withNeighbour).toBe(107);
      expect(h60.dependence.pairedOpposite).toBe(107);
      expect(h60.dependence.greedyNonOverlap).toBe(69);
      expect(h60.dependence.perFraction['1'].lag1Autocorrelation.value).toBe(-0.549906);
      expect(h60.attribution).toBe('corpus');
      expect(h180.n).toBe(45);
      expect(h180.provenance.directions).toEqual({ long: 45, short: 0, neutral: 0 });
      expect(h180.readings.overall).toEqual({
        confirmed: 10,
        contradicted: 15,
        mixed: 20,
        indeterminate: 0,
      });
      expect(h180.realized['1'].win.status).toBe('insufficient');
      expect(h180.rank['1'].status).toBe('insufficient');
      expect(h180.reliability['1'].every((b: any) => b.status === 'insufficient')).toBe(true);
      expect(h180.dependence.clusters).toBe(20);
      expect(h180.dependence.greedyNonOverlap).toBe(23);
      expect(h180.dependence.perFraction['1'].designEffect.value).toBe(1.28692);
    });
    it('the second-run vector supersedes the first by seal', () => {
      const first = loadJSON(join(VALID_DIR, 'froggy-h60-2026-08-24.json'));
      const second = loadJSON(join(VALID_DIR, 'froggy-h60-second-run.json'));
      expect(second.supersedes).toBe(first.seal.value);
      expect(second.provenance.exclusions.supersededSinceCalibration).toBe(0);
    });
  });

  describe('3. named negatives (the CAL-SCHEMA gate list)', () => {
    const invalidFiles = readdirSync(join(rootDir, INVALID_DIR))
      .filter((f) => f.endsWith('.json'))
      .sort();
    const REQUIRED = [
      'scalar-member',
      'poi-named-member',
      'poinsight-named-nested-member',
      'cross-key-member',
      'rate-sealed-below-minimum',
      'bin-rate-under-20',
      'interval-under-withheld',
      'missing-record-hash',
      'negative-magnitude-mean',
      'unrounded-derived-member',
      'half-up-dyadic-tie',
      'unsorted-set-member',
      'broken-seal',
      'wrong-domain-tag',
      'wrong-schema-const',
      'rank-claim-below-200',
      'missing-bin',
      'n-disagrees-with-provenance',
    ];
    it('carries every gate-required negative', () => {
      for (const name of REQUIRED) expect(invalidFiles).toContain(`${name}.json`);
    });
    for (const f of invalidFiles) {
      it(`invalid vector ${f} is rejected by the schema or the semantic layer`, () => {
        const doc = loadJSON(join(INVALID_DIR, f));
        const schemaValid = validate(doc);
        const violations = semanticViolations(doc);
        expect(schemaValid && violations.length === 0).toBe(false);
      });
    }
  });
});
