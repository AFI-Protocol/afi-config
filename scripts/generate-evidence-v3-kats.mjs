#!/usr/bin/env node
/**
 * EV3-GOV (evidence-v3-provider-provenance-v0.1) — Evidence V3 KAT generator.
 *
 * Deterministically (re)generates:
 *   1. every hash-bearing field of the governed Evidence V3 example and valid
 *      vectors under examples/scored-signal-evidence/v3/, and
 *   2. the known-answer vectors in kats/evidence/v3/evidence-v3-hashes.kat.json
 *      for the NEW D-EV3-4 projections: recordHash (afi.d2.evidence-record),
 *      replayHash (afi.d2.evidence-replay), categoryResultHash
 *      (afi.d2.lane-output) and providerResultHash (afi.d2.provider-result).
 *
 * Hash law: EVERY value computed here uses the composition canonicalization
 * law canonical-json-hashing.v1 (schemas/hashing/canonical-json-hashing.v1.md)
 * — sha256 over UTF-8 of the canonically serialized JSON, domain tag CARRIED
 * in the CanonicalHash object and NEVER part of the hash material — via the
 * same reference implementation tests/canonical-hashing-kat.test.ts proves
 * against the governed hashing KATs (D-EV3-4(2)).
 *
 * Preimages (D-EV3-4(3)/(6)):
 *   recordHash   = record minus {recordHash, replayHash}
 *   replayHash   = record minus {recordHash, replayHash, lifecycleState,
 *                                finalized, recordVersion, supersedesRecordHash}
 *   categoryResultHash = the FULL category result consumed by the join
 *   providerResultHash = the category result minus its `category` property
 *
 * The per-lane CategoryResult fixtures are the governed enrichment contract
 * valid vectors themselves (examples/enrichment/<lane>/v1/vectors/valid/) —
 * no duplicated fixture can drift.
 *
 * CREDENTIAL SAFETY (D-EV3-6): every identity/opaque hash value that is not a
 * real projection digest is a PLACEHOLDER derived as
 * sha256("afi-evidence-v3-placeholder:" + <descriptive label>) — descriptive
 * strings only, never secret material, never secret-derived.
 *
 * Idempotent: running it twice produces byte-identical output.
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- canonical-json-hashing.v1 reference implementation (spec §2) -----------
function canonicalize(v) {
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
function canonicalSha256(obj, excluded = []) {
  const stripped = {};
  Object.keys(obj).forEach((k) => {
    if (!excluded.includes(k)) stripped[k] = obj[k];
  });
  return createHash('sha256')
    .update(Buffer.from(canonicalize(stripped), 'utf-8'))
    .digest('hex');
}
function placeholderHex(label) {
  return createHash('sha256')
    .update('afi-evidence-v3-placeholder:' + label, 'utf-8')
    .digest('hex');
}

function loadJSON(rel) {
  return JSON.parse(readFileSync(join(rootDir, rel), 'utf-8'));
}
function writeJSON(rel, obj) {
  writeFileSync(join(rootDir, rel), JSON.stringify(obj, null, 2) + '\n');
}

// --- governed per-lane CategoryResult fixtures (the enrichment contract's own
// valid vectors; category casing is the runtime marker, e.g. camelCase aiMl) --
const CATEGORY_FIXTURE_FILES = {
  aiMl: 'examples/enrichment/aiml/v1/vectors/valid/aiml-result.json',
  news: 'examples/enrichment/news/v1/vectors/valid/news-result.json',
  pattern: 'examples/enrichment/pattern/v1/vectors/valid/pattern-result.json',
  sentiment: 'examples/enrichment/sentiment/v1/vectors/valid/sentiment-result.json',
  technical: 'examples/enrichment/technical/v1/vectors/valid/technical-result.json',
};

const EXAMPLE_FILE = 'examples/scored-signal-evidence/v3/scored-signal-evidence.example.json';
const VALID_VECTOR_FILES = [
  'examples/scored-signal-evidence/v3/vectors/valid/minimal-scored.json',
  'examples/scored-signal-evidence/v3/vectors/valid/credential-bound-news-lane.json',
];

const RECORD_HASH_EXCLUDED = ['recordHash', 'replayHash'];
const REPLAY_HASH_EXCLUDED = [
  'recordHash',
  'replayHash',
  'lifecycleState',
  'finalized',
  'recordVersion',
  'supersedesRecordHash',
];

// Real projection digests for the canonical example's five lanes.
const laneDigests = {};
for (const [category, file] of Object.entries(CATEGORY_FIXTURE_FILES)) {
  const fixture = loadJSON(file);
  laneDigests[category] = {
    fixtureFile: file,
    fixture,
    categoryResultSha256: canonicalSha256(fixture),
    providerResultSha256: canonicalSha256(fixture, ['category']),
  };
}

/** Fill every hash-bearing field of one v3 record in place. */
function fillRecord(record, { realLaneHashes }) {
  const signalId = record.signalId;
  for (const proof of record.providerInvocations) {
    const category = proof.category;
    proof.provider.recordFingerprint.value = placeholderHex(
      `provider-record:${proof.provider.providerId}@${proof.provider.recordVersion}`,
    );
    proof.providerInstance.recordFingerprint.value = placeholderHex(
      `provider-instance-record:${proof.providerInstance.providerInstanceId}@${proof.providerInstance.recordVersion}`,
    );
    proof.invocationInputHash.value = placeholderHex(
      `provider-invocation-input:${signalId}:${category}`,
    );
    if (realLaneHashes) {
      proof.providerResultHash.value = laneDigests[category].providerResultSha256;
      proof.categoryResultHash.value = laneDigests[category].categoryResultSha256;
    } else {
      proof.providerResultHash.value = placeholderHex(`provider-result:${signalId}:${category}`);
      proof.categoryResultHash.value = placeholderHex(`lane-output:${signalId}:${category}`);
    }
    if (proof.aimlInvocation) {
      const inv = proof.aimlInvocation;
      inv.codeConfigFingerprint = placeholderHex(
        `tiny-brains:code-config:${inv.profileId}@${inv.profileVersion}`,
      );
      inv.inputHash = placeholderHex(`tiny-brains:input:${signalId}`);
      inv.outputHash = placeholderHex(`tiny-brains:output:${signalId}`);
      for (const expert of inv.experts) {
        expert.outputHash = placeholderHex(
          `tiny-brains:expert-output:${expert.expertId}@${expert.expertVersion}:${signalId}`,
        );
        if (expert.artifactFingerprints) {
          for (const artifact of Object.keys(expert.artifactFingerprints)) {
            expert.artifactFingerprints[artifact] = placeholderHex(
              `tiny-brains:artifact:${artifact}`,
            );
          }
        }
      }
    }
  }
  record.recordHash.value = canonicalSha256(record, RECORD_HASH_EXCLUDED);
  record.replayHash.value = canonicalSha256(record, REPLAY_HASH_EXCLUDED);
  return record;
}

// 1. The canonical example carries the REAL lane projection digests (the KATs
//    are the real hashes the example pins — the house example-chain rule).
const example = fillRecord(loadJSON(EXAMPLE_FILE), { realLaneHashes: true });
writeJSON(EXAMPLE_FILE, example);

// 2. The valid vectors carry deterministic placeholders on the lane hashes
//    (schema-validation vectors) but REAL, recomputable recordHash/replayHash.
for (const file of VALID_VECTOR_FILES) {
  writeJSON(file, fillRecord(loadJSON(file), { realLaneHashes: false }));
}

// 3. Emit the governed known-answer vectors.
const kat = {
  schema: 'afi.evidence-v3-hash-kat.v1',
  'x-afiStatus': 'governed-contract',
  canonicalizationVersion: 'afi.hash.v1',
  description:
    'Known-answer-test vectors for the Evidence V3 hash projections (EV3-GOV D-EV3-4): recordHash = the v3 record minus {recordHash, replayHash}; replayHash = the record minus {recordHash, replayHash, lifecycleState, finalized, recordVersion, supersedesRecordHash}; categoryResultHash = the FULL category result consumed by the join; providerResultHash = the category result minus its category property. Every digest is sha256 over UTF-8 of the canonically serialized JSON per canonical-json-hashing.v1, with the domain tag CARRIED in the CanonicalHash object and NEVER part of the hash material. The record vectors embed the governed v3 canonical example byte-exactly; the lane vectors embed the governed enrichment contract valid vectors byte-exactly.',
  specRef: 'afi-config/schemas/hashing/canonical-json-hashing.v1.md',
  decisionRef: 'afi-governance/decisions/evidence-v3-provider-provenance-v0.1',
  generatedBy: 'afi-config/scripts/generate-evidence-v3-kats.mjs',
  vectors: [
    {
      name: 'record-hash-full-record',
      description:
        'recordHash preimage: the governed v3 canonical example minus {recordHash, replayHash} (top-level exclusion; D-EV3-4(6)). This is the exact recordHash.value the example pins.',
      domainTag: 'afi.d2.evidence-record',
      excludedFields: RECORD_HASH_EXCLUDED,
      input: example,
      expectedSha256: example.recordHash.value,
    },
    {
      name: 'replay-hash-projection',
      description:
        'replayHash preimage: the governed v3 canonical example minus {recordHash, replayHash, lifecycleState, finalized, recordVersion, supersedesRecordHash} (the deterministic semantic/replay projection; D-EV3-4(6)/(7)). This is the exact replayHash.value the example pins. Lifecycle progression and supersession custody never move this digest.',
      domainTag: 'afi.d2.evidence-replay',
      excludedFields: REPLAY_HASH_EXCLUDED,
      input: example,
      expectedSha256: example.replayHash.value,
    },
    ...Object.entries(laneDigests).map(([category, d]) => ({
      name: `category-result-${category}`,
      description: `Per-lane projections for the ${category} lane over the governed enrichment valid vector (${d.fixtureFile}): categoryResultHash commits to the FULL category result consumed by the join (domain afi.d2.lane-output); providerResultHash commits to the result minus its category property (domain afi.d2.provider-result). These are the exact values the v3 canonical example's ${category} proof pins.`,
      category,
      fixtureRef: d.fixtureFile,
      input: d.fixture,
      categoryResultDomainTag: 'afi.d2.lane-output',
      expectedCategoryResultSha256: d.categoryResultSha256,
      providerResultDomainTag: 'afi.d2.provider-result',
      providerResultExcludedFields: ['category'],
      expectedProviderResultSha256: d.providerResultSha256,
    })),
  ],
};
mkdirSync(join(rootDir, 'kats/evidence/v3'), { recursive: true });
writeJSON('kats/evidence/v3/evidence-v3-hashes.kat.json', kat);

console.log('example recordHash:', example.recordHash.value);
console.log('example replayHash:', example.replayHash.value);
for (const [category, d] of Object.entries(laneDigests)) {
  console.log(`${category} categoryResultHash: ${d.categoryResultSha256}`);
  console.log(`${category} providerResultHash: ${d.providerResultSha256}`);
}
console.log('Evidence V3 KATs + example/vector hashes regenerated.');
