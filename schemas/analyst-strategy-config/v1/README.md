# AFI Analyst Strategy Config Contract (v1)

**Family:** `afi.analyst-strategy-config.v1` — the analyst's strategy **selection** object.
**Status:** `governed-contract` (FACTORY-CONTRACT slot of the AFI Factory analyst-configurable pipelines V1 program).
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1`.

The config carries the **choices**; the pipeline manifest carries the **graph**. The resolution seam maps an inbound signal to this object, and this object pins everything the run composes.

## Shape

| Field | Req | Notes |
|---|---|---|
| `schema` | ✅ | const `afi.analyst-strategy-config.v1` |
| `analystId` | ✅ | `^[a-z0-9-]+$` (D-OBJ-3) |
| `strategyId` | ✅ | bare snake_case slug **with embedded major token** `..._v<major>` (e.g. `trend_pullback_v1`); never embeds the analyst name |
| `strategyVersion` | ✅ | semver **without** `v` prefix (e.g. `1.0.0`) |
| `pipelineRef` | ✅ | `{pipelineId, pipelineVersion, manifestHash}` — `manifestHash` is a CanonicalHash v1 pin of the exact manifest |
| `scorerRef` | ✅ | `{pluginId, pluginVersion}` — must agree with the pipeline's single scorer node |
| `uwrProfileRef` | ✅ | `{profileId}` — selection only; UP-10 recognition / UP-9 qualification / rewards remain separately governed |
| `decayConfig` | ✅ | `oneOf` `{ref:{templateId}}` **or** `{inline:{halfLifeMinutes>0, greeksTemplateId}}` |
| `nodeOverrides` | — | map `nodeId -> {enabled?, config?}` — bounded (values only, never topology) |
| `metadata` | — | annotational; excluded from `analystConfigHash` material |

## D-OBJ-3 triple formats (all three, structurally enforced where expressible)

- `analystId`: `^[a-z0-9-]+$`
- `strategyId`: `^[a-z][a-z0-9]*(_[a-z0-9]+)*_v(0|[1-9]\d*)$`
- `strategyVersion`: `^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$` (**no** `v` prefix)
- **Embedded-major agreement** (`trend_pullback_v1` ⇔ `1.x.y`) is cross-field — a governed constraint (`x-afiConstraints.strategyIdMajorAgreement`) enforced by the test suite's semantic layer.

## Constraints JSON Schema cannot enforce

Recorded in `x-afiConstraints`, enforced by `tests/analyst-strategy-schema-validation.test.ts` and factory validation: embedded-major agreement; override boundedness (only node ids of the referenced pipeline; only `enabled`/`config`); manifest-hash pin (fail closed on mismatch); scorer agreement with the pipeline's scorer node.

## Hashing

`analystConfigHash` (registration + `afi.composition-ref.v1`) is computed per [`../../hashing/canonical-json-hashing.v1.md`](../../hashing/canonical-json-hashing.v1.md), domain tag `afi.factory.analyst-config`, **excluding** `metadata`.

## Validation

```
npm run test:run   # includes tests/analyst-strategy-schema-validation.test.ts
```

Canonical example + governed vectors: [`../../../examples/analyst-strategy-config/v1/`](../../../examples/analyst-strategy-config/v1/).

## Change control

Versioned contract — shape changes require a new decision + `.v2`. A config instance is immutable once registered (its hash is pinned); changes register a new `strategyVersion`.
