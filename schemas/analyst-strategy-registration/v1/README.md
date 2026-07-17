# AFI Analyst Strategy Registration Contract (v1)

**Family:** `afi.analyst-strategy-registration.v1` — the registry **entry** for one registered analyst strategy.
**Status:** `governed-contract` (FACTORY-CONTRACT slot of the AFI Factory analyst-configurable pipelines V1 program).
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1`.

One JSON file per identity under [`registries/analyst-strategies/`](../../../registries/analyst-strategies/) (see that directory's README for layout and change control). Registration is **factory admission** only — it does not confer UP-10 scorer-identity recognition, qualification, rewards, or runtime consumption.

## Shape

| Field | Req | Notes |
|---|---|---|
| `schema` | ✅ | const `afi.analyst-strategy-registration.v1` |
| `analystId` / `strategyId` / `strategyVersion` | ✅ | the D-OBJ-3 triple, same patterns as the config contract (embedded-major agreement tooling-enforced) |
| `analystConfigHash` | ✅ | CanonicalHash v1 of the exact registered config (domain tag `afi.factory.analyst-config`; config `metadata` excluded) |
| `configRef` | ✅ | immutable path/ref to the config artifact — must resolve **and** hash-match |
| `providerBindingPolicy` | ✅ | `{mode: "explicit" \| "any-authenticated", allowedBindings?}`; `explicit` structurally requires `allowedBindings` (`if/then`) |
| `status` | ✅ | `active \| inactive` — retirement flips status, never deletes |
| `registeredAt` | ✅ | administrative date; **excluded from canonical hash material** |
| `registrationRef` | ✅ | PR/decision pointer for the registering act |

## Constraints JSON Schema cannot enforce

Recorded in `x-afiConstraints`, enforced by registry tooling + `tests/analyst-strategy-schema-validation.test.ts`:

- `configRef` resolves to an `afi.analyst-strategy-config.v1` whose triple equals this entry's and whose canonical hash equals `analystConfigHash` (fail closed);
- under `mode: "explicit"`, every `allowedBindings` id names an existing **active** `afi.provider-strategy-binding.v1` whose `allowedStrategies` contains this triple;
- identity + hash are immutable per entry; corrections register a new `strategyVersion`;
- `strategyId` embedded major == `strategyVersion` major.

## Validation

```
npm run test:run   # includes tests/analyst-strategy-schema-validation.test.ts
```

Canonical example + governed vectors: [`../../../examples/analyst-strategy-registration/v1/`](../../../examples/analyst-strategy-registration/v1/).

## Change control

Versioned contract — shape changes require a new decision + `.v2`. Entries follow the registry's administrative-update rule: status flips and additive registrations are administrative; identity/hash mutation is forbidden.
