# AFI Universal Signal Schema (USS) — PR Skeleton (v2p1)

**Update:** `core.telemetry.greeks` now includes verifiable fields:
- `asOf`, `method` (`bsm|surface_fit|finite_diff|path_sim|other`), `surfaceId`, `source` (`self|network`)
- `hedgePolicy` with `deltaBand`, `rollCadenceDays`, `notes`

Greeks remain **optional** and **cross-cutting** (not a lens). Scoring agents recompute canonically and compare.

## Provider flow
- **Preferred:** set `lens` and include the matching object (`equity`, `strategy`, `macro`, `onchain`).
- **Fallback:** omit `lens`; intake will auto-detect. Ambiguous → `generic`, core-only checks.
- **Telemetry:** include `core.telemetry.decay` (recommended) and `core.telemetry.greeks` (optional, if you have them).

Nothing is network-enforced; quality weighting rewards economically coherent, well-specified claims.

© AFI — pre-beta, R&D.
