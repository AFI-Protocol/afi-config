# afi.signal-reassessment.v1 — the sealed half-life checkpoint artifact

**Authority:** DLC-GOV (`afi-governance/decisions/decay-lifecycle-v0.1.md`) **D-DLC-4**, slot `DLC-CHECKPOINT` (authorized at acceptance, recorded in the Status flip). This is the artifact a validator — human or automated, same contract — emits at/post a scored signal's stamped half-life: the comparison of the sealed assertion against the captured realization for that one signal.

## Shape (exhaustive per D-DLC-4(3) — nothing more without a further filing)

| Member | Required | Meaning |
|---|---|---|
| `schema` | yes | `afi.signal-reassessment.v1` (const) |
| `signalId` | yes | the linkage to the scored signal — the record itself is never copied, never touched |
| `checkpointTime` | yes | `{ scoredAt, checkpointAt, elapsedMinutes, halfLifeMinutes }` — self-proving eligibility: `elapsedMinutes >= halfLifeMinutes` (semantic layer) |
| `horizonsRead` | yes | the DH-GOV outcome rows read, label-for-label (`{ horizon, horizonBasis, fractionOfHalfLife? }`) |
| `realizedFigures` | yes | the realization, copied **verbatim** from `signal_outcomes` — never recomputed |
| `reassessmentReading` | yes | the **deterministic** classification (`rule: signedReturnPct-sign-v1`): per-horizon `favorable/adverse/flat/indeterminate` from the sign of `signedReturnPct`; `overall` = `confirmed/contradicted/mixed/indeterminate` over the non-indeterminate horizons. Not a score. |
| `seal` | yes | CanonicalHash v1 — **the D-DLC-4(3) sealing answer**: sha256 under canonical-json-hashing.v1 (`afi.hash.v1`) of this document with the top-level `seal` member excluded; domain tag `afi.checkpoint.signal-reassessment` carried, never hashed |

## What instances are — and are not

Instances are **runtime artifacts**, written by the checkpoint reader to the analytics-plane store (`signal_reassessments`, beside — never inside — the canonical evidence plane, MONGO-GOV D-MONGO-3 honored). They are **not** config-registry records: no `registries/` family exists for them and none may be created without its own filing. A reassessment never mutates the scored record (immutability attaches at `SCORED`); it is append-only, one per `signalId`.

## Change control

The member set is exhaustive by decision text (D-DLC-4(3)). Any new member, any second reading rule, and any reputation/aggregation consequence requires its own filing (`DLC-REPUTATION` is reserved by name). The sealing vectors live in `examples/signal-reassessment/v1/vectors/valid/` — every valid vector's `seal.value` reproduces under the canonical reference implementation, enforced by `tests/signal-reassessment-schema-validation.test.ts`.
