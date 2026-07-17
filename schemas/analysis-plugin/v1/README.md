# AFI Analysis Plugin Manifest Contract (v1)

**Family:** `afi.analysis-plugin.v1` — the declarative contract of one analysis plugin.
**Status:** `governed-contract` (FACTORY-CONTRACT slot of the AFI Factory analyst-configurable pipelines V1 program).
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1`.

A pipeline node binds a plugin **by `pluginId` + `pluginVersion` only**. This manifest is what that binding means: the plugin's category, I/O schema identifiers, determinism, capability requirements, execution defaults, permitted failure policies, its inline `paramsSchema`, multi-instance admissibility, ordering hints, and scorer-feed admissibility.

## Shape

| Field | Req | Notes |
|---|---|---|
| `schema` | ✅ | const `afi.analysis-plugin.v1` |
| `pluginId` / `pluginVersion` | ✅ | registry key; `pluginVersion` = contract-surface semver (no `v`) |
| `implementationVersion` | ✅ | code/build identity — a **distinct axis** from `pluginVersion` |
| `category` | ✅ | `technical\|pattern\|sentiment\|news\|aiMl\|merge\|scorer` |
| `inputSchemaRef` / `outputSchemaRef` | ✅ | **schema identifiers** (`afi.*` id or `https://afi-protocol.org/schemas/...`) — filesystem paths structurally rejected |
| `deterministic` | ✅ | pure function of validated input + config; provider-backed plugins declare `false` |
| `paramsSchema` | ✅ | inline JSON Schema (draft-07) validating a binding node's `config` |
| `mayFeedScorer` | ✅ | whether output is admissible scorer input (scorer plugins: `false`) |
| `capabilities` | — | requirement classes, e.g. `provider:coinalyze`, `secret:COINALYZE_API_KEY` — never secret values |
| `defaultTimeoutMs`, `defaultRetryPolicy` | — | node-level values override |
| `permittedFailurePolicies` | — | subset of `abort|degrade`; absent ⇒ only `abort` |
| `multiInstance` | — | default `false` |
| `orderingConstraints` | — | `mustRunBefore`/`mustRunAfter` **categories** (factory-enforced hints) |
| `description`, `metadata` | — | annotational; excluded from canonical hash material |

## No filesystem paths — build-time binding

This contract carries **no** entrypoint, module specifier, or path. The consuming runtime maintains a **build-time registry** `pluginId+pluginVersion -> code`; a manifest with no registry entry is unbindable and the composition fails closed. This is the same statically-imported-registry discipline the live Reactor already uses.

## Validation

```
npm run test:run   # includes tests/analysis-plugin-schema-validation.test.ts
```

Canonical example + governed vectors: [`../../../examples/analysis-plugin/v1/`](../../../examples/analysis-plugin/v1/).

## Change control

Versioned contract — shape changes require a new decision + `.v2`. Individual plugins version through `pluginVersion` (contract) and `implementationVersion` (code); both are immutable per published manifest.
