# District 2 Provenance Schema Drafts (v1)

**Status:** `draft-non-implementation` — schema/spec surface only.
**Authorization:** District 2 **D-17**, which authorizes **D2 M1 only**: afi-config schema drafts and tests.
**Part of:** AFI District 2 — Canonical Data & Provenance Boundary.

These schemas are drafts for District 2 implementation. They are **not production wiring**: nothing in this directory deploys, persists, hashes, scores, settles, or rewards anything, and nothing here may be referenced by runtime configuration until a later District 2 phase authorizes it.

## Schemas

| Schema | File | Purpose |
|---|---|---|
| CanonicalHash v1 | `canonical-hash.schema.json` | Structural spec for off-chain canonical hash references (sha256, `afi.hash.v1` canonicalization, domain tags, optional `legacyHashRef`). Explicitly separated from on-chain keccak256 domains. |
| EvidenceRef v1 | `evidence-ref.schema.json` | Hash-only evidence reference (id, source ref, CanonicalHash, normalized evidence timestamps, optional uri/media type/redaction indicators). Structurally cannot require raw payload disclosure. |
| SourceDisclosureProfile v1 | `source-disclosure-profile.schema.json` | Descriptive source metadata: source class, disclosure level, withheld reason, license constraint, replayability, attestation, analyst/validator summaries, optional quality claim. |
| EnrichmentProvenance v1 | `enrichment-provenance.schema.json` | Per-lane enrichment provenance: lane/engine ids and versions, provisional flag/status, replayability, evidence/source refs, optional lane output hash. Generic lane concept — no strategy-specific fields canonized. |
| AnalystInputEnvelope v1 | `analyst-input-envelope.schema.json` | Strict wrapper around an intentionally opaque `strategyLocalView`. The view must be declared (`strategyViewType` and/or `enrichedViewSchemaRef`) and only participates in hashing via the explicit `strategyLocalViewHash` pin. |
| ScoredSignal v1 projection | `scored-signal.schema.json` | Thin canonical scored-signal projection (identity, direction, risk bucket, conviction, UWR score/axes, provenance links). Structurally excludes `rawUss`, `lenses`, `_priceFeedMetadata`, `rawPayload`, storage fields, and volatile processing timestamps. |
| ProvenanceRecord v1 | `provenance-record.schema.json` | Generalized per-pass provenance record (input/enrichment/output hashes, evidence + source-disclosure refs, replay pins, domain tags, stage schema versions, optional storage profile ref). No demoOnly fields. |
| ReplayProfile v1 | `replay-profile.schema.json` | Stricter D2-conformant replay metadata (factsRequired, dataset/code/seed pins, evidence hashes/refs, source refs, lane versions) without breaking broad USS v1.1. |
| TradePlan v1 / SignalLevels v1 | `trade-plan.schema.json` | Preserves CPJ trade intent (entry range, stop loss, take profits, leverage/venue/market-type hints) that is currently dropped at CPJ→USS mapping. All prices are **decimal strings, never floats**. |

Valid examples live in `examples/provenance/v1/`; positive and negative validation tests live in `tests/provenance-schema-validation.test.ts` (AJV strict, same conventions as the existing harness).

## Timestamp policy (District 2 hash doctrine)

District 2 distinguishes **volatile processing timestamps** from **normalized evidence/domain timestamps**:

- Storage/runtime timestamps (`scoredAt`, `createdAt`, `updatedAt`, `storedAt`, `processedAt`, `ingestedAt`, …) are **not canonical hash material by default** and are structurally rejected inside canonical objects (`additionalProperties: false` + negative tests).
- Normalized evidence/domain timestamps (`asOf`, `fetchedAt`, `postedAt`, `observedAt`) describe the evidence itself and are admissible.
- The only canonical time field on the ScoredSignal projection is the optional, domain-declared `evaluatedAt`, included only when supplied as deterministic/domain evidence — never generated from wall-clock runtime.

## Boundaries (what these drafts deliberately do NOT do)

- **No weighting/evaluation policy** — District 2 defines descriptive, computable metadata; **BenchKit owns weighting**. No reward weights, transparency bonuses, payout logic, or reputation effects are encoded (and such fields are rejected by tests).
- **No settlement, rewards, vaults, claims, or validator-decision schemas** — those fields are structurally rejected on ProvenanceRecord.
- **No L1 anchoring / on-chain domains** — CanonicalHash v1 covers off-chain sha256 domains only; keccak256 on-chain domains are a separate family.
- **No hashing code** — CanonicalHash fixes the reference shape only; canonicalization/hashing implementations live elsewhere and later.
- **MongoDB/storage remains an implementation profile, not protocol canon** — records may reference a `storageProfileRef`, but no storage fields appear inline.
- **No strategy-view canonization** — `strategyLocalView` (e.g. Froggy views) stays opaque, declared, and strategy-owned.
- **Agents/droids remain protocol participants/tooling, not canon** — nothing here grants agents schema-level authority.
