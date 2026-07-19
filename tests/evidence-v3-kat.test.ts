import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * EV3-CONTRACT — Evidence V3 hash-projection known-answer tests (EV3-GOV
 * D-EV3-4, proof obligations D-EV3-4(8)).
 *
 * Executes the reference implementation from
 * schemas/hashing/canonical-json-hashing.v1.md against every governed KAT
 * vector in kats/evidence/v3/evidence-v3-hashes.kat.json:
 *
 *   recordHash          = record minus {recordHash, replayHash}
 *   replayHash          = record minus {recordHash, replayHash, lifecycleState,
 *                                       finalized, recordVersion,
 *                                       supersedesRecordHash}
 *   categoryResultHash  = the FULL category result consumed by the join
 *   providerResultHash  = the category result minus its `category` property
 *
 * All under the COMPOSITION canonicalization law (sha256 over UTF-8 of the
 * canonically serialized JSON; domain tag CARRIED, never hashed).
 *
 * CONFORMANCE RULE: the District Two Evidence V3 builder and the canonical
 * store's recomputation-verified admission (D-EV3-7) MUST reproduce these
 * vectors byte-exactly; this suite is the afi-config anchor of that agreement.
 */

function loadJSON(relativePath: string): any {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf-8'));
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const KAT_FILE = 'kats/evidence/v3/evidence-v3-hashes.kat.json';
const EXAMPLE_FILE = 'examples/scored-signal-evidence/v3/scored-signal-evidence.example.json';
const VALID_DIR = 'examples/scored-signal-evidence/v3/vectors/valid';

// --- reference implementation (canonical-json-hashing.v1 §2) -----------------
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
function stripExcluded(obj: any, excluded: string[]): any {
  const out: any = {};
  Object.keys(obj).forEach(k => {
    if (!excluded.includes(k)) out[k] = obj[k];
  });
  return out;
}
function sha256hex(s: string): string {
  return createHash('sha256').update(Buffer.from(s, 'utf-8')).digest('hex');
}
function digestOf(input: any, excluded: string[] = []): string {
  return sha256hex(canonicalize(stripExcluded(input, excluded)));
}

// The governed preimage exclusion sets (D-EV3-4(6)).
const RECORD_HASH_EXCLUDED = ['recordHash', 'replayHash'];
const REPLAY_HASH_EXCLUDED = [
  'recordHash',
  'replayHash',
  'lifecycleState',
  'finalized',
  'recordVersion',
  'supersedesRecordHash',
];

const CATEGORY_FIXTURE_FILES: Record<string, string> = {
  aiMl: 'examples/enrichment/aiml/v1/vectors/valid/aiml-result.json',
  news: 'examples/enrichment/news/v1/vectors/valid/news-result.json',
  pattern: 'examples/enrichment/pattern/v1/vectors/valid/pattern-result.json',
  sentiment: 'examples/enrichment/sentiment/v1/vectors/valid/sentiment-result.json',
  technical: 'examples/enrichment/technical/v1/vectors/valid/technical-result.json',
};
// Proof positions on the v3 record: 0 aiMl, 1 news, 2 pattern, 3 sentiment, 4 technical.
const PROOF_POSITION: Record<string, number> = {
  aiMl: 0,
  news: 1,
  pattern: 2,
  sentiment: 3,
  technical: 4,
};

describe('EV3-CONTRACT — Evidence V3 hash-projection KATs', () => {
  const kat = loadJSON(KAT_FILE);

  it('KAT file self-identifies and pins the canonicalization version and decision', () => {
    expect(kat.schema).toBe('afi.evidence-v3-hash-kat.v1');
    expect(kat.canonicalizationVersion).toBe('afi.hash.v1');
    expect(kat.specRef).toContain('canonical-json-hashing.v1.md');
    expect(kat.decisionRef).toContain('evidence-v3-provider-provenance-v0.1');
    expect(Array.isArray(kat.vectors)).toBe(true);
    // Two record-level vectors + one per governed lane.
    expect(kat.vectors).toHaveLength(7);
    const names = kat.vectors.map((v: any) => v.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('the record vectors pin the governed exclusion sets EXACTLY (D-EV3-4(6))', () => {
    const record = kat.vectors.find((v: any) => v.name === 'record-hash-full-record');
    const replay = kat.vectors.find((v: any) => v.name === 'replay-hash-projection');
    expect(record.domainTag).toBe('afi.d2.evidence-record');
    expect(record.excludedFields).toEqual(RECORD_HASH_EXCLUDED);
    expect(replay.domainTag).toBe('afi.d2.evidence-replay');
    expect(replay.excludedFields).toEqual(REPLAY_HASH_EXCLUDED);
  });

  it('every record-level vector reproduces its expected digest byte-exactly', () => {
    ['record-hash-full-record', 'replay-hash-projection'].forEach(name => {
      const vector = kat.vectors.find((v: any) => v.name === name);
      expect(vector, `${name} must exist`).toBeDefined();
      expect(vector.expectedSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(digestOf(vector.input, vector.excludedFields), name).toBe(vector.expectedSha256);
    });
  });

  it('every lane vector reproduces BOTH expected digests byte-exactly', () => {
    Object.keys(CATEGORY_FIXTURE_FILES).forEach(category => {
      const vector = kat.vectors.find((v: any) => v.name === `category-result-${category}`);
      expect(vector, `category-result-${category} must exist`).toBeDefined();
      expect(vector.categoryResultDomainTag).toBe('afi.d2.lane-output');
      expect(vector.providerResultDomainTag).toBe('afi.d2.provider-result');
      expect(vector.providerResultExcludedFields).toEqual(['category']);
      expect(digestOf(vector.input), `${category} full result`).toBe(
        vector.expectedCategoryResultSha256
      );
      expect(digestOf(vector.input, ['category']), `${category} minus category`).toBe(
        vector.expectedProviderResultSha256
      );
    });
  });

  describe('Example-chain anchors (the KATs are the REAL hashes the example pins)', () => {
    const example = loadJSON(EXAMPLE_FILE);

    it('the record vectors embed the governed v3 canonical example byte-exactly', () => {
      const record = kat.vectors.find((v: any) => v.name === 'record-hash-full-record');
      const replay = kat.vectors.find((v: any) => v.name === 'replay-hash-projection');
      expect(record.input).toEqual(example);
      expect(replay.input).toEqual(example);
    });

    it('the example recordHash/replayHash == the KAT digests', () => {
      const record = kat.vectors.find((v: any) => v.name === 'record-hash-full-record');
      const replay = kat.vectors.find((v: any) => v.name === 'replay-hash-projection');
      expect(example.recordHash.value).toBe(record.expectedSha256);
      expect(example.recordHash.domainTag).toBe('afi.d2.evidence-record');
      expect(example.replayHash.value).toBe(replay.expectedSha256);
      expect(example.replayHash.domainTag).toBe('afi.d2.evidence-replay');
    });

    it('the lane vectors embed the governed enrichment valid vectors byte-exactly', () => {
      Object.entries(CATEGORY_FIXTURE_FILES).forEach(([category, file]) => {
        const vector = kat.vectors.find((v: any) => v.name === `category-result-${category}`);
        expect(vector.fixtureRef).toBe(file);
        expect(vector.input, `${category} fixture bytes`).toEqual(loadJSON(file));
        expect(vector.input.category, `${category} runtime marker`).toBe(category);
      });
    });

    it("the example's five proofs pin the lane KAT digests (categoryResultHash + providerResultHash)", () => {
      Object.entries(PROOF_POSITION).forEach(([category, position]) => {
        const vector = kat.vectors.find((v: any) => v.name === `category-result-${category}`);
        const proof = example.providerInvocations[position];
        expect(proof.category, `position ${position}`).toBe(category);
        expect(proof.categoryResultHash.value, `${category} categoryResultHash`).toBe(
          vector.expectedCategoryResultSha256
        );
        expect(proof.providerResultHash.value, `${category} providerResultHash`).toBe(
          vector.expectedProviderResultSha256
        );
      });
    });

    it('every committed valid vector ALSO recomputes its record/replay hashes (D-EV3-7)', () => {
      ['minimal-scored.json', 'credential-bound-news-lane.json'].forEach(f => {
        const record = loadJSON(`${VALID_DIR}/${f}`);
        expect(record.recordHash.value, `${f} recordHash`).toBe(
          digestOf(record, RECORD_HASH_EXCLUDED)
        );
        expect(record.replayHash.value, `${f} replayHash`).toBe(
          digestOf(record, REPLAY_HASH_EXCLUDED)
        );
      });
    });
  });

  describe('Mutation obligations (D-EV3-4(8): each field moves exactly the correct hashes)', () => {
    const example = loadJSON(EXAMPLE_FILE);

    it('lifecycle/custody fields move recordHash but NEVER replayHash (the replay separation)', () => {
      const mutated: any = clone(example);
      mutated.lifecycleState = 'EPOCH_ELIGIBLE';
      mutated.finalized = true;
      mutated.recordVersion = 2;
      expect(digestOf(mutated, RECORD_HASH_EXCLUDED)).not.toBe(example.recordHash.value);
      expect(digestOf(mutated, REPLAY_HASH_EXCLUDED)).toBe(example.replayHash.value);
    });

    it('a load-bearing proof identity fact moves BOTH record and replay hashes', () => {
      const mutated: any = clone(example);
      mutated.providerInvocations[4].provider.recordVersion = '9.9.9';
      expect(digestOf(mutated, RECORD_HASH_EXCLUDED)).not.toBe(example.recordHash.value);
      expect(digestOf(mutated, REPLAY_HASH_EXCLUDED)).not.toBe(example.replayHash.value);
    });

    it('a categoryResultHash value moves BOTH hashes (the lane commitment is load-bearing)', () => {
      const mutated: any = clone(example);
      mutated.providerInvocations[0].categoryResultHash.value = 'a'.repeat(64);
      expect(digestOf(mutated, RECORD_HASH_EXCLUDED)).not.toBe(example.recordHash.value);
      expect(digestOf(mutated, REPLAY_HASH_EXCLUDED)).not.toBe(example.replayHash.value);
    });

    it('each lane digest moves when any payload field moves (mutation over the fixtures)', () => {
      Object.entries(CATEGORY_FIXTURE_FILES).forEach(([category, file]) => {
        const fixture: any = clone(loadJSON(file));
        const vector = kat.vectors.find((v: any) => v.name === `category-result-${category}`);
        fixture.syntheticMutation = 1;
        expect(digestOf(fixture), `${category} full`).not.toBe(
          vector.expectedCategoryResultSha256
        );
        expect(digestOf(fixture, ['category']), `${category} minus category`).not.toBe(
          vector.expectedProviderResultSha256
        );
      });
    });

    it('the domain tag is CARRIED, never hashed: retagging alone cannot be detected in the digest (which is WHY the schema consts pin the tags)', () => {
      // Composition-law property (canonical-json-hashing.v1 §3): tags separate
      // domains at the OBJECT layer, not the preimage layer. The digest over
      // the same input is tag-independent; the CanonicalHash object's
      // domainTag const in the schemas is the structural guard.
      const vector = kat.vectors.find((v: any) => v.name === 'category-result-technical');
      expect(digestOf(vector.input)).toBe(vector.expectedCategoryResultSha256);
    });
  });
});
