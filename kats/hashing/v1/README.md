# Canonical JSON Hashing v1 — KAT vectors

Known-answer-test vectors for the canonical manifest-hashing rules specified in
[`schemas/hashing/canonical-json-hashing.v1.md`](../../../schemas/hashing/canonical-json-hashing.v1.md)
(FACTORY-CONTRACT; `afi-governance/decisions/factory-configurable-pipelines-v1`).

- **File:** [`canonical-json-hashing.kat.json`](./canonical-json-hashing.kat.json)
- **Rule under test:** sha256 over UTF-8 of the canonically serialized JSON (recursively sorted keys by UTF-16 code units, arrays in authored order, no insignificant whitespace, numbers in shortest ECMAScript round-trip form), after removing the artifact type's excluded **top-level** fields.
- Each vector carries `input` (+ optional `excludedFields`/`artifactType`/`domainTag`), the `expectedCanonicalForm` string, and the `expectedSha256` hex digest.
- Two vectors are the **real hashes of the example chain**: `pipeline-manifest-excludes` is the exact `manifestHash` pinned by the analyst-strategy-config/composition-ref examples; `analyst-config-excludes` is the exact `analystConfigHash` pinned by the registration/composition-ref examples.

**Conformance:** `afi-factory` and `afi-reactor` MUST both pass every vector byte-exactly. In this repo the vectors are executed by `tests/canonical-hashing-kat.test.ts` against the spec's reference implementation.

Pure data: nothing in afi-config executes production hashing code. Changing any vector requires a new canonicalization version per the spec's change-control rule.
