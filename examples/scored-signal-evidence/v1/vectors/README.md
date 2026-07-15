# `afi.scored-signal-evidence.v1` governed test vectors

Positive and negative vectors for the canonical scored-signal evidence contract
(`schemas/scored-signal-evidence/v1/scored-signal-evidence.schema.json`), exercised by
`tests/scored-signal-evidence-schema-validation.test.ts`.

A record is **admissible** only when it is BOTH schema-valid AND passes the governed
identifier-continuity contract constraint (which JSON Schema draft-07 cannot express).

Every record also carries the **required** governed UWR profile stamp (`uwrProfile` —
PR-UWR-STAMP; RC-6 `source` discriminator). The vector suite exercises **both** governed
sources; the continuity-only negatives below carry a valid stamp so they stay schema-valid
and are caught purely by the continuity layer.

## Valid vectors (`valid/`)

| File | Demonstrates | Stamp `source` |
|---|---|---|
| `minimal-scored.json` | Minimal required record: `SCORED`, `finalized:false`, the complete strategy triple (incl. required `strategyVersion`), thin `scoredSignal` (ref-linked provenance) + minimal `provenanceRecord`. | `builtin-value-identity` |
| `qualified-mid-lifecycle.json` | Mid-lifecycle `QUALIFIED` record with optional `strategyVersion`/`recordVersion`, hash-linked provenance, full scored-signal surface. | `registry-consumed` |
| `epoch-eligible-superseded.json` | Post-finalization `EPOCH_ELIGIBLE`, `finalized:true`, `recordVersion:2` + `supersedesRecordHash` (versioning-by-supersession, MONGO-GOV D-MONGO-5). | `registry-consumed` |

## Invalid vectors (`invalid/`)

| File | Governed violation | Caught by |
|---|---|---|
| `signalid-discontinuity.json` | top-level `signalId` != `scoredSignal.signalId` (OBJ-GOV D-OBJ-1 / LIFE-GOV D-LIFE-5) | continuity constraint (schema-valid in isolation) |
| `provenance-signalid-discontinuity.json` | top-level `signalId` != `provenanceRecord.signalId`, with `scoredSignal.signalId` matching (isolates the provenance-record continuity leg, OBJ-GOV D-OBJ-1 / LIFE-GOV D-LIFE-5) | continuity constraint (schema-valid in isolation) |
| `strategy-triple-mismatch.json` | top-level `strategyId` != `scoredSignal.strategyId` (OBJ-GOV D-OBJ-3 triple agreement). The divergent value is the non-canonical analyst-prefixed `froggy_trend_pullback_v1`, illustrating the kind of drift the triple-agreement constraint rejects — note it is the *mismatch* that is caught, not a `strategyId` pattern (D-OBJ-3 made the value format non-binding). | continuity constraint |
| `canonicalization-version-mismatch.json` | top-level `canonicalizationVersion` != `provenanceRecord.canonicalizationVersion` (OBJ-GOV D-OBJ-6) | continuity constraint |
| `missing-strategy-version.json` | required `strategyVersion` absent — incomplete strategy triple (OBJ-GOV D-OBJ-3) | JSON Schema (`required`) |
| `missing-provenance-record.json` | required `provenanceRecord` absent (LIFE-GOV D-LIFE-6) | JSON Schema (`required`) |
| `pre-scoring-lifecycle-state.json` | `lifecycleState: "INGESTED"` — a pre-scoring state, not persistable (LIFE-GOV D-LIFE-6) | JSON Schema (`enum`) |
| `legacy-vocabulary-state.json` | `lifecycleState: "minted"` — a demoted tier-4 vocabulary value, not the canonical machine (LIFE-GOV D-LIFE-1) | JSON Schema (`enum`) |
| `finality-marker-mismatch.json` | `FINALIZED` with `finalized:false` (MONGO-GOV D-MONGO-5) | JSON Schema (`if/then`) |
| `heavy-carrier-substitution.json` | heavy `ReactorScoredSignalDocument` fields (`rawUss`/`lenses`/`_priceFeedMetadata`/`rawPayload`) substituted into `scoredSignal` | JSON Schema (reused thin projection `additionalProperties:false`) |
| `vaulted-lifecycle-brain.json` | full `VaultedSignalRecord` brain fields (`validator`/`minted`/`replayed`/`training`/`proprietary`) at top level | JSON Schema (`additionalProperties:false`) |
| `volatile-timestamp.json` | volatile storage timestamp (`storedAt`) at top level (District-2 hash doctrine / MONGO-GOV D-MONGO-1) | JSON Schema (`additionalProperties:false`) |
| `missing-uwr-profile.json` | required governed UWR profile stamp absent (PR-UWR-STAMP). The canonical store is fresh (MONGO-GOV D-MONGO-1, Option A) and has no compatibility obligation to accept a newly written **unstamped** record. | JSON Schema (`required`) |
| `uwr-stamp-missing-source.json` | stamp present but the RC-6 `source` discriminator is absent. RC-6 reserves an **absent** source to identify the pre-program era; this fresh store holds no pre-program records, so an unsourced stamp written now would masquerade as one. | JSON Schema (`required`) |
| `uwr-stamp-invalid-source.json` | stamp carries an ungoverned source (`"registry"` — the runtime *resolved-source* name, not the persisted RC-6 discriminator). Only `builtin-value-identity` / `registry-consumed` are governed. | JSON Schema (`enum`) |
