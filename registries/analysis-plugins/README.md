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
- Files are never edited in place and never deleted; supersession is by new version.
- The test suite pins this directory's contents to the authorized set (drift guard): adding a manifest requires updating the pinned list in the same PR.

## Current contents

The **seven official froggy-trend-pullback plugin manifests** (W3a administrative seeding; byte-identical copies of the accepted `afi-factory` main `templates/official/froggy-trend-pullback/plugins/` artifacts):

| pluginId | pluginVersion | category |
|---|---|---|
| `afi-analysis-technical` | 1.0.0 | technical |
| `afi-analysis-pattern` | 1.0.0 | pattern |
| `afi-analysis-sentiment` | 1.0.0 | sentiment |
| `afi-analysis-news` | 1.0.0 | news |
| `afi-analysis-aiml` | 1.0.0 | aiMl |
| `afi-merge-enriched-view` | 1.0.0 | merge |
| `afi-scorer-froggy-trend-pullback` | 1.0.0 | scorer |

Their canonical plugin-set hash (`afi.d2.plugin-set`) is
`6d54c8b720d6d709962bc2b8c792b4e8b1657308fac46fbec33a8f24232e0bb7`, recomputed
and asserted by the test suite.

Worked examples (schema-valid vectors, including negatives) live under
[`examples/analysis-plugin/v1/`](../../examples/analysis-plugin/v1/).
