# Provider Invocation Proof (v1)

**Family:** `afi.provider-invocation-proof.v1` — one closed, credential-safe record of one **successful** provider invocation for one governed category lane.
**Status:** `governed-contract`.
**Authorization:** `afi-governance/decisions/evidence-v3-provider-provenance-v0.1` (EV3-GOV) **D-EV3-2**, under the FCP-GOV D-FCP-3 contract-family delegation.

Every [`afi.scored-signal-evidence.v3`](../../scored-signal-evidence/v3/scored-signal-evidence.schema.json) record carries **exactly five** of these proofs — one per governed category (`technical`, `pattern`, `sentiment`, `news`, `aiMl`), unique by category, deterministically ordered ascending by case-sensitive lexicographic category name (`aiMl`, `news`, `pattern`, `sentiment`, `technical`) — bound **positionally** by the v3 record schema.

Each proof binds, with **non-secret facts only**:

1. **Category-result identity** — `category`, the governed `resultSchema` id (bound per-category by `if/then` binders), the `categoryResultHash` of the exact result that entered the join, and `status: "succeeded"`.
2. **Provider identity** — `providerId`, `recordVersion`, `recordFingerprint` (`afi.d2.provider-record`), `executionClass`, `deterministic`.
3. **ProviderInstance identity** — `providerInstanceId`, `recordVersion`, `recordFingerprint` (`afi.d2.provider-instance-record`), and the governed `model` where the instance declares one.
4. **Adapter identity** — `adapterId`, exact `adapterVersion`, `transportKind` (`in-process` | `http`).
5. **Credential binding** — exactly one of explicit keyless posture (`mode: "keyless"`) or an opaque CredentialRef binding (`mode: "credentialRef"` + kind, opaque ref id, recordVersion, governed status) — **never a secret** (D-EV3-6).
6. **Invocation input and output** — `invocationInputHash` (`afi.d2.provider-invocation-input`) and `providerResultHash` (`afi.d2.provider-result`); the technical lane's `priceSource` is the **only** per-lane source-reference field admitted in this version (structurally forbidden elsewhere).
7. **aiMl nested proof** — [`afi.aiml-invocation-proof.v1`](../../aiml-invocation-proof/v1/aiml-invocation-proof.schema.json), required exactly when `category` is `aiMl`, structurally forbidden otherwise (D-EV3-3).

Every hash is computed under the **composition canonicalization law** ([`canonical-json-hashing.v1`](../../hashing/canonical-json-hashing.v1.md)) and carried as a `CanonicalHash v1` object with the domain tag **carried, never hashed** (D-EV3-4). Proof facts are **carried, never consumed**: no lane, join, analyst, scorer, UWR, or decay path may read them.

Governed vectors are exercised through the v3 evidence record suite (`tests/scored-signal-evidence-schema-validation.test.ts`) over [`examples/scored-signal-evidence/v3/`](../../../examples/scored-signal-evidence/v3/).

## Change control

Any shape change requires a new governance decision and a new schema version (`.v2`) — never a silent mutation (FCP-GOV D-FCP-3).
