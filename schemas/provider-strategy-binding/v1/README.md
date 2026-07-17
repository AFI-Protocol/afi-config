# AFI Provider Strategy Binding Contract (v1)

**Family:** `afi.provider-strategy-binding.v1` — provider-to-strategy routing.
**Status:** `governed-contract` (FACTORY-CONTRACT slot of the AFI Factory analyst-configurable pipelines V1 program).
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1`.

A binding declares which strategies an **authenticated** signal provider may route into, and which one is the default. It makes today's implicit routing (every provider → the one hardcoded strategy) declarative and auditable.

## Shape

| Field | Req | Notes |
|---|---|---|
| `schema` | ✅ | const `afi.provider-strategy-binding.v1` |
| `bindingId` | ✅ | `^[a-z0-9-]+$` — referenced by registration `allowedBindings` |
| `providerId` | ✅ | same id space as USS `provenance.providerId` |
| `providerType` | ✅ | `webhook \| cpj \| gateway` |
| `authenticatedBy` | ✅ | `route-secret \| gateway-tenant \| integration-key` — the mechanism **class**, never the secret value |
| `allowedStrategies` | ✅ | min 1; canonical D-OBJ-3 triples `{analystId, strategyId, strategyVersion}` |
| `defaultStrategy` | — | same triple shape; **must be a member of `allowedStrategies`** |
| `status` | ✅ | `active \| inactive` |

## Constraints JSON Schema cannot enforce

Recorded in `x-afiConstraints`, enforced by tooling + `tests/analyst-strategy-schema-validation.test.ts`:

- **default membership**: `defaultStrategy` (when present) is deep-equal to an `allowedStrategies` entry;
- **no secret material**: only the authentication class is representable (`additionalProperties:false`);
- each triple should resolve to an **active** registration whose `providerBindingPolicy` admits this binding;
- per-triple `strategyId` embedded major == `strategyVersion` major.

## Validation

```
npm run test:run   # includes tests/analyst-strategy-schema-validation.test.ts
```

Canonical example + governed vectors: [`../../../examples/provider-strategy-binding/v1/`](../../../examples/provider-strategy-binding/v1/).

## Change control

Versioned contract — shape changes require a new decision + `.v2`. Binding updates are administrative registry acts; retirement flips `status`, never deletes.
