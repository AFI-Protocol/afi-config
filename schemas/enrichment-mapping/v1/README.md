# AFI Enrichment Mapping Contract (v1)

**Family:** `afi.enrichment-mapping.v1` — declarative lane-fact-to-strategy-input bindings.
**Status:** `governed-contract` (FACTORY-CONTRACT; DEM-CONTRACT slot of the DEM-GOV program).
**Authorization:** `afi-governance/decisions/declarative-enrichment-mapping-v0.1.md` (D-DEM-2(1)(2), D-DEM-3).

A mapping document declares bindings from facts projected into the enriched view onto a strategy's declared inputs, **and nothing else**. The complete operator vocabulary is five forms — `bind`, `default` (inside a bind's `optionality` only), `band`, `recode`, `namespace-default` (the top-level `namespaceDefaults` list) — each total and each decidable from the document alone (D-DEM-3(1)). A mapping may never express computation (D-DEM-3(2)); anything computational is a registered analysis-plugin producer whose projected fact a binding then reads, referenced via `producedBy` — a reference, never code (D-DEM-3(3)).

## Shape — root `additionalProperties:false`

| Member | Required | Meaning |
|---|---|---|
| `schema` | yes | `"afi.enrichment-mapping.v1"` (const) |
| `mappingId` | yes | `^[a-z][a-z0-9-]*$`, max 64 |
| `version` | yes | semver |
| `description` | no | max 512 |
| `namespaceDefaults` | no | lanes that resolve as `{}` when absent/null (operator (e)) |
| `bindings` | yes | target-name-keyed map (collision structurally impossible), each a closed `oneOf` of the `bind` / `band` / `recode` forms |

## Governed constraints (mirrored in `x-afiConstraints`; enforced by `tests/enrichment-mapping-schema-validation.test.ts`'s semantic layer and by the afi-core interpreter)

- **No computation** — no arithmetic, composition of sources, series/window/time derivation, conditionals beyond the band/recode tables, I/O, clock, randomness, or executable expressions (D-DEM-3(2), restating FCP-GOV D-FCP-2(5)). Enforced structurally: closed `oneOf` + `additionalProperties:false`.
- **Single source per binding** (D-DEM-3(5)) — no operator combines paths or lanes; the named residue `liquiditySwept` (a two-lane read) is inexpressible by construction and stays outside the mapping.
- **Absence** — a source resolves ABSENT iff its lane namespace is missing/undefined/null, the path's own key is missing, or the resolved value is `undefined` or `null` — exactly the retired adapter's `??`/`!= null` semantics (`froggy.enrichment_adapter.ts:221-226,:232-235,:250-255`). Declared divergences: a PRESENT wrong-type value refuses (`source-type-mismatch`); a present non-finite number refuses (`non-finite-number`). DEM-BIND's byte-for-byte obligation is thereby pinned to the typed, finite reachable domain.
- **Band discipline** — ordered, exhaustive, non-overlapping threshold table (EQ-GOV D-EQ-2 form): strictly decreasing thresholds, required `otherwise` (exhaustiveness) and `absent` members.
- **Recode discipline** — explicit total table onto a closed target union with required `fallback` (unrecognized present value) and `absent` members (AR-GOV D-AR-3 form).
- **Optionality grounds** (D-DEM-5(4)) — exactly three: `composition` (a lane the analyst did not select, CFG-GOV D-CFG-3), `producer-declared` (an absence the producer's own contract declares, enumerated via `producerRef`), and `grandfather`. **The grandfather is exhaustive and non-extensible** — verbatim from D-DEM-5(4): *"the four absent-source defaults the retired seam already applies — `technical.emaDistancePct ?? 0` (froggy.enrichment_adapter.ts:225), `technical.isInValueSweetSpot ?? false` (:226), the patternConfidence absent branch (:232-235), and the atrRegime default-to-"normal" fallback (:250-255, the form AR-GOV D-AR-3 fixed) — are admitted as declared optional bindings with their existing literals so that DEM-BIND reproduces today's scored values exactly."* **Carriage:** grandfathers #1/#2 are the only lawful `ground:"grandfather"` optionality declarations, pinned to exactly `(technical, emaDistancePct, 0)` and `(technical, isInValueSweetSpot, false)`; grandfathers #3/#4 are carried structurally by the band form's required `absent` member and the recode form's `fallback`/`absent` members and appear in no optionality object. *"A fact whose producer merely does not exist yet is never optional; it is a defect. No slot may satisfy its gate by declaring a placeholder optional."*
- **Fired defaults** (D-DEM-5(3)) — a bind-optionality default firing and a band/recode `absent`-member firing (absent-source cases) are fired defaults, committed by the runtime seam (DEM-BIND) to the `executionSummaryHash` preimage. A recode `fallback` on a PRESENT unrecognized value is **not** a fired default — it is AR-GOV D-AR-3's total-table law; a value was read, no absence degradation occurred.
- **Immutability** (D-DEM-2(2), D-DEM-6(1)) — one file per identity at `registries/enrichment-mappings/<mappingId>--<version>.json`; a version any signal has been scored under is never edited; the registry pins the canonical-json hash.

## Hashing

Mapping identity hashes under [`canonical-json-hashing.v1`](../../hashing/canonical-json-hashing.v1.md) (D-DEM-6(1)). This document carries no hash fields; its hash is pinned by the registry entry (a DEM-BIND registration act).

## Validation

`tests/enrichment-mapping-schema-validation.test.ts` — strict AJV compile, canonical example + vector validation, drift-guarded vector listings, and the semantic layer (band ordering, grandfather membership). The deterministic interpreter and its totality proof live in afi-core (`validators/EnrichmentMappingInterpreter.ts`, D-DEM-2(4)).

## Change control

Shape changes require a new decision and a `.v2` family. Registry acts (add/supersede) are owner-merged administrative acts; identity never mutates; the seeding drift guard updates in the same PR.
