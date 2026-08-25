# afi.analyst-calibration.v1 — the sealed per-analyst calibration record

**Authority:** CAL-GOV (`afi-governance/decisions/analyst-calibration-record-v0.1.md`) **D-CAL-1 … D-CAL-5**, slot `CAL-SCHEMA`. This is the artifact the calibration builder (afi-reactor `scripts/calibration-build.mjs`, slot `CAL-BUILDER`) emits per **grouping key** — the per-analyst aggregation of that analyst's sealed `afi.signal-reassessment.v1` artifacts, joined by `signalId` to the **sealed** scored-signal evidence record and verified on read. It is the off-chain evidentiary input from which the reserved on-chain per-analyst reputation primitives (PoI / PoInsight — CONST-GOV D-CONST-5, untouched) can later be derived; it computes, names, and forecloses none of them (D-CAL-5).

## Shape (exhaustive per D-CAL-1(3) — nothing more without a further filing)

| Member | Meaning |
|---|---|
| `schema` · `rule` · `readingRule` | consts: `afi.analyst-calibration.v1` · `analyst-calibration-v1` · `signedReturnPct-sign-v1` (the consumed reading rule, never re-classified) |
| `groupKey` | `analystId × strategyId@strategyVersion × scoringIdentity × halfLifeMinutes` (D-CAL-2). `scoringIdentity` = the composition members that pin the instrument + the record's `uwrProfile` stamp identity — not `analystConfigHash` alone. `halfLifeMinutes` is the sealed reassessment member; timeframe is `signalId`-derived provenance, not a key element |
| `n` · `attribution` | rows aggregated; `corpus` when fewer than two symbols **and** under 28 days, else `analyst` (D-CAL-3(3)) |
| `provenance` | consumed `signalIds` each with the joined `recordHash`/`recordVersion` (accumulation order: ascending `scoredAt`, then `signalId`); scoredAt/checkpointAt windows; sorted sets `symbols`, `timeframes`, `providers`, `analystConfigHashes`; direction counts; the four exclusion counters `unverifiableInput`, `supersededSinceCheckpoint`, `supersededSinceCalibration`, `magnitudeConventionViolation` |
| `readings` | overall confirmed/contradicted/mixed/indeterminate and per-`f` favorable/adverse/flat/indeterminate counts, copied from the governed reading |
| `realized` | per `f ∈ {0.25, 0.5, 1}`: `win` (count + rate), `meanSignedReturnPct`, `medianSignedReturnPct` (point only), `meanMfePct`, `meanMaePct` — each under a `status` |
| `reliability` | per `f`, twenty bins `[k·0.05, (k+1)·0.05)`, `k = floor(round(uwrScore × 1000) / 50)`, each with `n`, `favorable`, `status`; a rate only at `n ≥ 20`; never a comparison between bins |
| `rank` | per `f`, Spearman ρ (Pearson on mid-ranks; influence-function CR1 sandwich; Fisher-z interval) with `status` and, when the point is present, `claim` (`sealed` only at `n ≥ 200`) |
| `strata` | the `readings`/`realized` blocks by `riskBucket` and by direction, each block on its own `n` |
| `dependence` | per group: overlap clusters `G` (connected components at `|Δt| < H`), `withNeighbour` / `pairedOpposite` (`|Δt| ≤ H`) and `pairingFraction`, greedy non-overlap count; per `f`: design effect of the win rate and lag-1 autocorrelation of `signedReturnPct` |
| `supersedes` | `seal.value` of the previous record for the same key, or `null` (D-CAL-4) |
| `seal` | CanonicalHash v1 — **the D-CAL-1(5) sealing answer**: sha256 under canonical-json-hashing.v1 (`afi.hash.v1`) of this document with the top-level `seal` excluded; domain tag `afi.calibration.analyst` carried, never hashed |

**One status vocabulary** for every rate / mean / median / ρ block: `sealed` (estimate + interval; block `n ≥` its minimum and `G ≥ 3`), `withheld` (estimate, no interval; `G < 3`), `insufficient` (counts only; `n <` minimum — 100 for group/strata/rank blocks, 20 for bins). Every interval is cluster-robust (CR1, `G/(G−1)`) on the full sample, deterministic, no seed. **No member is a scalar summary of an analyst.**

## Rounding and serialization law (D-CAL-1(5))
Every derived non-integer member is rounded to **six decimal places, round-half-even on the exact binary value** (never via a half-up formatter such as `toFixed`); counts are integers; set-valued provenance members are serialized sorted ascending by UTF-16 code units. Two conforming builders therefore seal identically, and anyone can recompute the seal from the sealed inputs.

## What instances are — and are not
Instances are **runtime artifacts**, written by the calibration builder to the analytics-plane store (`analyst_calibrations`, beside — never inside — the canonical evidence plane; MONGO-GOV D-MONGO-3 honored; non-canonical under CFG-GOV D-CFG-2(4): integrity-checkable, not evidentiary). They are **not** config-registry records and no `registries/` family exists for them. A record never mutates a reassessment or a scored record; it is append-only, one chain per `groupKey` linked by `supersedes`.

## Vectors
`examples/analyst-calibration/v1/vectors/valid/` holds the two records built from the 2026-08-24 corpus (froggy, `BTC/USDT`, H = 60 with n = 141 and H = 180 with n = 45) and a second-run record exercising `supersedes`; every valid vector's `seal.value` reproduces under the canonical reference implementation — enforced by `tests/analyst-calibration-schema-validation.test.ts`, which also carries the semantic layer (rounding, sorted sets, status presence rules, the claim rule, bin completeness, the no-PoI/PoInsight/no-scalar rule, `n` consistency). `vectors/invalid/` holds the named negatives the CAL-SCHEMA gate requires.

## Change control
The member set is exhaustive by decision text (D-CAL-1(3)). Any new member, any second calibration rule, any display or ranking surface, and any PoI / PoInsight / economic consequence requires its own filing; the PoI / PoInsight primitives themselves are reserved to CHAIN-GOV and are never described here as retired, narrowed, or replaced.
