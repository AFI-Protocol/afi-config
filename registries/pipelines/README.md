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
- Files are never edited in place and never deleted; supersession is by new version.
- The test suite pins this directory's contents to the authorized set (drift guard): adding a manifest requires updating the pinned list in the same PR.

## Current contents

The production default pipeline (W3a administrative seeding, reactor wave):

- [`froggy-trend-pullback--v1.0.0.json`](./froggy-trend-pullback--v1.0.0.json) — the official froggy `trend_pullback` composition, a **byte-identical copy** of the accepted `afi-factory` main `templates/official/froggy-trend-pullback/pipeline.manifest.json`. Its canonical hash (domain tag `afi.d2.composition-manifest`) is
  `b8d9b73410ce8ec0d1827d75ee2a2e750aa85553fb2fc985a7a52fdb75080d49`, recomputed and asserted by the test suite.

A complete worked example (all seven node categories, conditions, joins) lives at
[`examples/pipeline/v1/pipeline.example.json`](../../examples/pipeline/v1/pipeline.example.json) with governed valid/invalid vectors beside it.
