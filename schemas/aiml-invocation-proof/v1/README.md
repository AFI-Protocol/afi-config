# AiMl Invocation Proof (v1)

**Family:** `afi.aiml-invocation-proof.v1` — the deterministic, non-secret projection of one **successful** `tiny-brains.aiml-invocation.v1` record.
**Status:** `governed-contract`.
**Authorization:** `afi-governance/decisions/evidence-v3-provider-provenance-v0.1` (EV3-GOV) **D-EV3-3**, under the FCP-GOV D-FCP-3 contract-family delegation.

Carried inside the `aiMl` member of [`afi.provider-invocation-proof.v1`](../../provider-invocation-proof/v1/provider-invocation-proof.schema.json) on every [`afi.scored-signal-evidence.v3`](../../scored-signal-evidence/v3/scored-signal-evidence.schema.json) record. It binds the orchestration identity chain of the invocation that occurred:

- `profileId` + `profileVersion` (the reactor client validates the service's profile echo — both fields — fail-closed),
- `resolverId` + `resolverVersion`,
- the service `codeConfigFingerprint`,
- the normalized Tiny Brains `inputHash` and final `outputHash`,
- `status: "succeeded"`, and
- per required expert: `expertId`, `expertVersion`, `posture` (`deterministic` | `probabilistic`), `status: "succeeded"`, the expert `outputHash`, and the optional model `artifactFingerprints` set.

**Key laws:**

- The `experts` array is sorted ascending by case-sensitive lexicographic `expertId` (tooling-enforced; the Evidence V3 builder fails closed on a mis-ordered list).
- **Volatile timing facts are structurally excluded** (`additionalProperties:false` — no startedAt/endedAt/durations anywhere).
- All hex digests are **OPAQUE commitments under the service law `tiny-brains.hash.v1`** (pinned by the required `hashLaw` const) — they are **NOT** `afi.hash.v1` CanonicalHash objects and are never recomputed under either AFI canonicalization law; the reactor client verifies the service's final `outputHash` by KAT-proven recomputation, fail-closed (D-EV3-4(5)).
- **No raw candles, prompts, filesystem paths, weights, or expert payloads** — hashes and identifiers only (D-EV3-6).

Governed vectors are exercised through the v3 evidence record suite (`tests/scored-signal-evidence-schema-validation.test.ts`) over [`examples/scored-signal-evidence/v3/`](../../../examples/scored-signal-evidence/v3/).

## Change control

Any shape change requires a new governance decision and a new schema version (`.v2`) — never a silent mutation (FCP-GOV D-FCP-3).
