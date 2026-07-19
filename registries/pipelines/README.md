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
  `v1.0.0` when the five-lane provider runtime superseded it; the Mission D
  owner authorization removed `v1.1.0` when the aiMl lane moved to provider-instance
  record 1.1.0 with governed orchestration-profile selection; and EV3-GOV D-EV3-5(1)/D-EV3-8
  removed `v1.2.0` when the fail-fast successor `v1.3.0` retired the five-lane
  degrade allowance; git history is the archive, and historical hash pins remain
  verifiable from it).
- The test suite pins this directory's contents to the authorized set (drift guard): adding a manifest requires updating the pinned list in the same PR.

## Current contents

The production default pipeline (five-lane provider runtime, FLPR-GOV):

- [`froggy-trend-pullback--v1.3.0.json`](./froggy-trend-pullback--v1.3.0.json) — the official froggy `trend_pullback` composition on the five vendor-neutral provider-instance-backed category lanes (every lane node carries an explicit `providerInstanceRef`; the committed refs form the all-five keyless/self-hosted reference profile). All five lane nodes are **fail-fast under the governed default** (`critical` defaults to true; no `failurePolicy` declared): a scored evaluation requires all five lanes to succeed (EV3-GOV D-EV3-5(1)). Graph geometry, plugin bindings, and every `providerInstanceRef` are byte-unchanged from the superseded `v1.2.0`. Its canonical hash (domain tag `afi.d2.composition-manifest`) is
  `df3372dadaca1595d0e6d2f6bad9464ccc9abb7106e9f5b7111df148a145bc4f`, recomputed and asserted by the test suite.

A complete worked example (all seven node categories, conditions, joins) lives at
[`examples/pipeline/v1/pipeline.example.json`](../../examples/pipeline/v1/pipeline.example.json) with governed valid/invalid vectors beside it.
