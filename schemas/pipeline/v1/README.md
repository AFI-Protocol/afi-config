# AFI Pipeline Manifest Contract (v1)

**Family:** `afi.pipeline.v1` — canonical analyst-configurable pipeline topology.
**Status:** `governed-contract` (FACTORY-CONTRACT slot of the AFI Factory analyst-configurable pipelines V1 program).
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1`; design boundary per `reports/afi-configurable-dag-live-runtime-reconciliation.md` §5/§9 N7 (minted **fresh** as `afi.pipeline.v1` — never a mutation of the retired ungoverned draft `schemas/pipeline.schema.json`).

A pipeline manifest is a **declarative, deterministic** description of a directed acyclic analysis graph. It is data the Factory authors and the Reactor executes — it contains no code, no filesystem paths, and no runtime wiring.

## Shape

| Field | Req | Notes |
|---|---|---|
| `schema` | ✅ | const `afi.pipeline.v1` |
| `pipelineId` | ✅ | `^[a-z0-9-]+$` — registry key |
| `pipelineVersion` | ✅ | `^v\d+\.\d+\.\d+$` (WITH `v` prefix) — new version per change, never mutation |
| `entry` | ✅ | node id of the single entry node |
| `nodes` | ✅ | min 1; structurally requires ≥ 1 `scorer` (`contains`) |
| `edges` | ✅ | directed dataflow edges |
| `description`, `metadata` | — | annotational, **non-authoritative**, excluded from canonical hash material |

**Node** (`additionalProperties:false`): required `id` (unique), `category` (exactly `technical|pattern|sentiment|news|aiMl|merge|scorer`), `pluginId`, `pluginVersion` (semver, no `v`); optional `config` (open object, validated **downstream** against the plugin's `paramsSchema`), `timeoutMs` (int ≥ 1), `maxRetries` (int ≥ 0), `retryDelayMs`, `backoff` (`none|fixed|exponential`), `critical` (default **true**), `failurePolicy` (`abort|degrade` — `degrade` is structurally allowed only when `critical` is explicitly `false`), `resourceLimits`, `join`.

**Edge** (`additionalProperties:false`): required `from`, `to`; optional `fromPort`/`toPort`, `condition` (predicate tree), `optional` (optional parent for a join).

**Conditions** are schema-validated predicate trees — `all`/`any`/`not`/`exists`/`eq`/`ne`/`gt`/`gte`/`lt`/`lte`/`in` over JSON-pointer-style paths (`/nodes/<nodeId>/output/...`, `/context/...`). Deterministic pure data; **no code strings**, no expression language, unknown operators are structurally rejected.

**Joins:** any node with **more than one** incoming edge MUST declare
`join: { policy: "all", merge: { strategy: "namespace-by-node" | "declared-fields", conflictRule: "error" | "prefer:<nodeId>" } }`
— deterministic by construction (both `strategy` and `conflictRule` mandatory). Nodes with 0 or 1 incoming edge MUST NOT declare `join`. A `prefer:<nodeId>` rule must name a parent of the joining node.

## Graph constraints JSON Schema cannot enforce

Recorded in the schema's `x-afiConstraints`, enforced by `tests/pipeline-schema-validation.test.ts` (the same two-layer admission pattern as the scored-signal-evidence contract: **admissible = schema-valid AND graph-clean**):

- unique node ids; `entry`/`from`/`to` name declared nodes; no self-edges;
- acyclicity (Kahn);
- **exactly one** `scorer` node (schema enforces ≥ 1 via `contains`; tooling caps at 1);
- **scorer terminality / non-bypassability**: the scorer is a sink, every node is reachable from `entry`, and the scorer is the **only** sink — so every path from `entry` that reaches any sink reaches the scorer;
- join declaration ⇔ in-degree > 1; `prefer:` targets are parents.

## One representation

`nodes`/`edges` is the **one** topology representation. The retired drafts' parallel mechanisms (`enrichmentNodes` map, `requiredNodes` list) are structurally rejected (`additionalProperties:false`) and must not be reintroduced.

## Hashing

`manifestHash` (referenced by `afi.analyst-strategy-config.v1` and `afi.composition-ref.v1`) is computed per [`../../hashing/canonical-json-hashing.v1.md`](../../hashing/canonical-json-hashing.v1.md), domain tag `afi.factory.pipeline-manifest`, **excluding** `description` and `metadata`.

## Validation

```
npm run test:run   # includes tests/pipeline-schema-validation.test.ts
```

Canonical example + governed vectors: [`../../../examples/pipeline/v1/`](../../../examples/pipeline/v1/). Registry layout: [`../../../registries/pipelines/README.md`](../../../registries/pipelines/README.md).

## Change control

`afi.pipeline.v1` is a versioned contract: any shape change requires a new governance decision and a new schema version (`.v2`) — never a silent mutation. Individual pipeline topologies version through `pipelineVersion` (immutable per version; corrections supersede).
