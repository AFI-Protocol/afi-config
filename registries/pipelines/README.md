# AFI Pipeline Registry

**Entry contract:** [`afi.pipeline.v1`](../../schemas/pipeline/v1/pipeline.schema.json)
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1` (FACTORY-CONTRACT).

This directory holds the **canonical registry of pipeline manifests** — the exact, immutable topologies that `afi.analyst-strategy-config.v1` `pipelineRef`s pin by identity + canonical `manifestHash`.

## Layout

- **One JSON file per pipeline identity**, named `<pipelineId>--<pipelineVersion>.json`
  (e.g. `mean-reversion-core--v1.0.0.json`).
- Every file MUST validate against the pipeline schema **and** the graph-semantic layer (unique node ids, known endpoints, acyclicity, exactly one non-bypassable scorer sink, join declaration rules) enforced by `tests/pipeline-schema-validation.test.ts`.
- A registered manifest is **immutable**: its canonical hash (per [`canonical-json-hashing.v1.md`](../../schemas/hashing/canonical-json-hashing.v1.md), domain tag `afi.d2.composition-manifest` per FCP-GOV D-FCP-7, `description`/`metadata` excluded) is what configs pin. Any topology change is a **new `pipelineVersion`** (a new file).

## Change control (the generic administrative rule)

- Adding a manifest is an administrative registry act (owner-merged PR).
- Files are never edited in place; supersession is by new version (a new file).
- Removing a **superseded** version that no active strategy config references is an
  owner-authorized governance act, never a routine edit (FLPR-GOV D-FLPR-6 removed
  `v1.0.0` when the five-lane provider runtime superseded it, and the Mission D
  owner authorization removed `v1.1.0` when the aiMl lane moved to provider-instance
  record 1.1.0 with governed orchestration-profile selection; git history is the
  archive, and historical hash pins remain verifiable from it).
- The test suite pins this directory's contents to the authorized set (drift guard): adding a manifest requires updating the pinned list in the same PR.

## Current contents

The production default pipeline (five-lane provider runtime, FLPR-GOV):

- [`froggy-trend-pullback--v1.2.0.json`](./froggy-trend-pullback--v1.2.0.json) — the official froggy `trend_pullback` composition on the five vendor-neutral provider-instance-backed category lanes (every lane node carries an explicit `providerInstanceRef`; the committed refs form the all-five keyless/self-hosted reference profile). Its canonical hash (domain tag `afi.d2.composition-manifest`) is
  `095b55775cd32147bb29137278185d1c6a95512dfec827f4c98a3eb569b39883`, recomputed and asserted by the test suite.

A complete worked example (all seven node categories, conditions, joins) lives at
[`examples/pipeline/v1/pipeline.example.json`](../../examples/pipeline/v1/pipeline.example.json) with governed valid/invalid vectors beside it.
