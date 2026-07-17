# AFI Pipeline Registry

**Entry contract:** [`afi.pipeline.v1`](../../schemas/pipeline/v1/pipeline.schema.json)
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1` (FACTORY-CONTRACT).

This directory holds the **canonical registry of pipeline manifests** — the exact, immutable topologies that `afi.analyst-strategy-config.v1` `pipelineRef`s pin by identity + canonical `manifestHash`.

## Layout

- **One JSON file per pipeline identity**, named `<pipelineId>--<pipelineVersion>.json`
  (e.g. `mean-reversion-core--v1.0.0.json`).
- Every file MUST validate against the pipeline schema **and** the graph-semantic layer (unique node ids, known endpoints, acyclicity, exactly one non-bypassable scorer sink, join declaration rules) enforced by `tests/pipeline-schema-validation.test.ts`.
- A registered manifest is **immutable**: its canonical hash (per [`canonical-json-hashing.v1.md`](../../schemas/hashing/canonical-json-hashing.v1.md), domain tag `afi.factory.pipeline-manifest`, `description`/`metadata` excluded) is what configs pin. Any topology change is a **new `pipelineVersion`** (a new file).

## Change control (the generic administrative rule)

- Adding a manifest is an administrative registry act (owner-merged PR).
- Files are never edited in place and never deleted; supersession is by new version.
- The test suite pins this directory's contents to the authorized set (drift guard): adding a manifest requires updating the pinned list in the same PR.

## Current contents

**Empty by design.** The production default pipeline (the froggy `trend_pullback` composition) lands with the **reactor wave**, translated from the live `FROGGY_TREND_PULLBACK_PIPELINE` constant under that wave's equivalence gate — not seeded here.

A complete worked example (all seven node categories, conditions, joins) lives at
[`examples/pipeline/v1/pipeline.example.json`](../../examples/pipeline/v1/pipeline.example.json) with governed valid/invalid vectors beside it.
