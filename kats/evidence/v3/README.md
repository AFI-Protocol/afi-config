# Evidence V3 hash projections — KAT vectors

Known-answer-test vectors for the Evidence V3 hash projections registered by
`afi-governance/decisions/evidence-v3-provider-provenance-v0.1` (EV3-GOV **D-EV3-4**),
computed under the composition canonicalization law
[`schemas/hashing/canonical-json-hashing.v1.md`](../../../schemas/hashing/canonical-json-hashing.v1.md)
(sha256 over UTF-8 of the canonically serialized JSON; the domain tag is **carried**
in the `CanonicalHash` object and **never** part of the hash material).

- **File:** [`evidence-v3-hashes.kat.json`](./evidence-v3-hashes.kat.json)
- **Projections under test (D-EV3-4(3)/(6)):**
  - `recordHash` (`afi.d2.evidence-record`) — the v3 record minus `{recordHash, replayHash}` (top-level exclusion).
  - `replayHash` (`afi.d2.evidence-replay`) — the record minus `{recordHash, replayHash, lifecycleState, finalized, recordVersion, supersedesRecordHash}` (the deterministic semantic/replay projection; lifecycle progression and supersession custody never move it).
  - `categoryResultHash` (`afi.d2.lane-output`) — the **full** category result consumed by the join, one vector per governed lane.
  - `providerResultHash` (`afi.d2.provider-result`) — the category result minus its `category` property.
- **The vectors are the REAL hashes of the example chain:** the two record vectors embed the governed v3 canonical example ([`examples/scored-signal-evidence/v3/`](../../../examples/scored-signal-evidence/v3/)) byte-exactly and pin its committed `recordHash`/`replayHash` values; the five lane vectors embed the governed enrichment contract valid vectors (`examples/enrichment/<lane>/v1/vectors/valid/`) byte-exactly and pin the `categoryResultHash`/`providerResultHash` values carried by the example's five invocation proofs.
- **Generation:** [`scripts/generate-evidence-v3-kats.mjs`](../../../scripts/generate-evidence-v3-kats.mjs) — deterministic and idempotent; placeholder identity digests are sha256 over descriptive strings, never secret material (D-EV3-6).

**Conformance:** the District Two Evidence V3 builder and the canonical store's
recomputation-verified admission (D-EV3-7) MUST reproduce every vector
byte-exactly. In this repo the vectors are executed by
`tests/evidence-v3-kat.test.ts` against the spec's reference implementation.

Pure data: nothing in afi-config executes production hashing code. Changing any
vector requires regenerating via the script under a governing decision — never
a hand edit.
