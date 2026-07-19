# AFI Composition Ref Contract (v1)

**Family:** `afi.composition-ref.v1` — canonical composition/graph provenance stamp.
**Status:** `governed-contract` (FACTORY-CONTRACT slot of the AFI Factory analyst-configurable pipelines V1 program).
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1` (realizes reconciliation report §9 N1 as a dedicated object, avoiding N5's `strategyVersion` overloading).

The composition ref is the **complete, hash-pinned identity of what composed a score**. It is carried by `afi.scored-signal-evidence.v3` as the required `composition` property.

## Shape — ALL fields required, `additionalProperties:false`

| Field | Type | Domain tag (tooling-verified) |
|---|---|---|
| `schema` | const `afi.composition-ref.v1` | — |
| `pipelineId` / `pipelineVersion` | pipeline identity | — |
| `manifestHash` | CanonicalHash v1 | `afi.factory.pipeline-manifest` |
| `analystConfigHash` | CanonicalHash v1 | `afi.factory.analyst-config` |
| `scorerPluginId` / `scorerPluginVersion` | scorer plugin identity | — |
| `pluginSetHash` | CanonicalHash v1 | `afi.factory.plugin-set` |
| `executionSummaryHash` | CanonicalHash v1 | `afi.reactor.execution-summary` |
| `enrichmentHash` | CanonicalHash v1 | `afi.d2.enrichment-bundle` |

All hashes `$ref` the governed [`canonical-hash.schema.json`](../../provenance/v1/canonical-hash.schema.json) and are computed per [`../../hashing/canonical-json-hashing.v1.md`](../../hashing/canonical-json-hashing.v1.md).

## Governed constraints (`x-afiConstraints`)

- **All-or-nothing**: partial composition provenance is inadmissible; a submitter that cannot produce every pin refuses to submit (fail closed).
- **Agreement**: pipeline + scorer identities/hashes must equal the resolved analyst-strategy-config's `pipelineRef`/`scorerRef`; `analystConfigHash` must equal the registration's pin.
- **Timestamp-free summary**: the hashed execution summary is deterministic and carries no wall-clock material (District 2 hash doctrine).

## Validation

```
npm run test:run   # includes tests/composition-evidence-v3-schema-validation.test.ts
```

Canonical example + governed vectors: [`../../../examples/composition-ref/v1/`](../../../examples/composition-ref/v1/).

## Change control

Versioned contract — any shape change requires a new decision + `.v2` (and a corresponding evidence-contract revision).
