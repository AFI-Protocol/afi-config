# AFI Analysis Plugin Registry

**Entry contract:** [`afi.analysis-plugin.v1`](../../schemas/analysis-plugin/v1/analysis-plugin.schema.json)
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1` (D-FCP-5 generic registration rule).

This directory holds the **canonical registry of analysis plugin manifests** — the declarative contracts pipeline nodes bind by `pluginId`+`pluginVersion`. A manifest declares category, I/O schema refs, determinism, capabilities, execution defaults, permitted failure policies, its inline `paramsSchema`, and scorer-feed admissibility. It contains **no filesystem paths and no code references**: binding to code happens in the consuming runtime's build-time plugin registry.

## Layout

- **One JSON file per plugin identity**, named `<pluginId>--<pluginVersion>.json`
  (e.g. `afi-analysis-technical--1.0.0.json`).
- Every file MUST validate against the plugin manifest schema (AJV strict) —
  enforced by `tests/registries-seeding-validation.test.ts`.
- Registered manifests are **immutable**: any contract change is a new
  `pluginVersion` (a new file). The plugin-set hash rule
  (`pluginSetHash`, [`canonical-json-hashing.v1.md`](../../schemas/hashing/canonical-json-hashing.v1.md) §3, domain tag
  `afi.d2.plugin-set`) is computed over
  `{schema:'afi.plugin-set.v1', plugins:[{pluginId,pluginVersion,implementationVersion}]}`
  sorted by `pluginId` — so every identity axis registered here is hash-pinned
  by consuming compositions.

## Change control (the generic administrative rule)

- Adding a manifest is an administrative registry act (owner-merged PR, schema-validated).
- Files are never edited in place; supersession is by new version (a new file).
- Removing a **superseded** version that no registered pipeline references is an
  owner-authorized governance act, never a routine edit (FLPR-GOV D-FLPR-6 removed the
  five 1.0.0 lane manifests and the 1.0.0 merge manifest when the five-lane provider
  runtime superseded them; git history is the archive).
- The test suite pins this directory's contents to the authorized set (drift guard): adding a manifest requires updating the pinned list in the same PR.
- Moving a manifest's `implementationVersion` in place (the contract-preserving
  code axis, `analysis-plugin.schema.json` §`implementationVersion`) is an
  owner-authorized governance act, never a routine edit (EQ-GOV D-EQ-3(2) moved
  the scorer's `implementationVersion` `1.0.0 → 1.1.0` for the execution-axis
  trigger-quantisation rubric era; AR-GOV D-AR-4(2) moved it `1.1.0 → 1.2.0`
  for the ATR-regime rubric era; the identity axes and contract surface are
  untouched; git history is the archive).

## Current contents

The **seven official froggy-trend-pullback plugin manifests** (five-lane provider runtime, FLPR-GOV — the five lane plugins are vendor-neutral and provider-instance-backed):

| pluginId | pluginVersion | implementationVersion | category |
|---|---|---|---|
| `afi-analysis-technical` | 2.0.0 | 2.1.0 | technical |
| `afi-analysis-pattern` | 2.0.0 | 2.0.0 | pattern |
| `afi-analysis-sentiment` | 2.0.0 | 2.0.0 | sentiment |
| `afi-analysis-news` | 2.0.0 | 2.0.0 | news |
| `afi-analysis-aiml` | 2.0.0 | 2.0.0 | aiMl |
| `afi-merge-enriched-view` | 1.1.0 | 1.2.0 | merge |
| `afi-scorer-froggy-trend-pullback` | 1.0.0 | 1.4.0 | scorer |

Their canonical plugin-set hash (`afi.d2.plugin-set`) is
`36f911f4fd37eb0d161ab4df7a9650fd1c477bf6dbd71de4a82e0f73c71c4c93`, recomputed
and asserted by the test suite (DEM-PRODUCER-PLAN era — technical `2.1.0`,
merge `1.2.0`, scorer `1.4.0`; prior eras — DEM-BIND scorer `1.3.0`
`220c004ed615c58bd3f4187256568bfcc6ea375e49ce467ff06a2467b405c0b6`, AR-GOV
scorer `1.2.0` `f63c6f21beb20834c76bc392373746db520828802e7797e84085a831572629d5`,
EQ-GOV scorer `1.1.0` `e10cf9eeaa0b1878e970dddfcccce7371a946bd0a4079141ed70a857815bfb9f`,
seeding `1.0.0` `5384e1c08ce4bd7f533acc15487df81d7d37b6615d109d611bde968a81f2f386`).

Worked examples (schema-valid vectors, including negatives) live under
[`examples/analysis-plugin/v1/`](../../examples/analysis-plugin/v1/).

## Change control — implementationVersion 1.3.0 (DEM-BIND)

`afi-scorer-froggy-trend-pullback--1.0.0` `implementationVersion` `1.2.0 → 1.3.0` under DEM-GOV D-DEM-7(4) (the EQ-GOV D-EQ-3(2) precedent class): the scorer node's realizing code changes in the DEM-BIND wave — it now composes its input from the registered mapping's interpreter fragment plus the residual builder. **Sequencing:** this bump records the era of the DEM-BIND wave (AR-GOV D-AR-4(2) precedent) and lands with the registration, before the reactor's fixture/golden wave consumes it — it must never be read as premature. `pluginVersion` stays `1.0.0` (the contract surface is unchanged); `pluginSetHash` rotates (`f63c6f21… → 220c004e…`).


## Change control — implementationVersion moves (DEM-PRODUCER-PLAN)

Under DEM-GOV D-DEM-7(4) (owner-authorized 2026-08-25, §9 `DEM-PRODUCER-PLAN`), every plugin record whose realizing code changes in the slot moves one minor: `afi-analysis-technical` `2.0.0 → 2.1.0` (the technical lane now verifies the submitted `afi.trade-plan.v1` against its fetched candles and emits `technical.plan` — the producer contract and its declared absences are recorded in the manifest `description`); `afi-merge-enriched-view` `1.1.0 → 1.2.0` (`viewTechnical` projects the plan facts — `laneView.ts` is the merge node's sole realizing helper); `afi-scorer-froggy-trend-pullback` `1.3.0 → 1.4.0` (the `rrMultiplePlanned` synthesis is deleted from the scorer-realizing adapter; the composer is generalized). `pluginVersion` is unchanged on all three (contract surface untouched); `pluginSetHash` rotates (`220c004e… → 36f911f4…`). Adapter identity `afi-adapter-technical-local@1.0.0` is held (DEM-GOV §9 determination D-2).
