# Canonical Scored-Signal Evidence Contract (v1)

**Slot:** `MONGO-CONTRACT` — Slot 1 of `AFI-GOV-PERSISTENCE-IMPL-v0.1` (MONGO-IMPL).
**Status:** `governed-contract` — the authorized canonical **schema/contract** for the one canonical scored-signal evidence store.
**Authorization:** `afi-governance/decisions/persistence-impl-v0.1.md` (MONGO-IMPL) Slot 1, on owner merge of MONGO-IMPL (afi-governance `main` `2166823`). It realizes MONGO-GOV `D-MONGO-1`/`D-MONGO-2` and consumes OBJ-GOV, LIFE-GOV, and MONGO-GOV **exactly**.

This directory defines **`afi.scored-signal-evidence.v1`** — the canonical persisted **shape** of the single canonical scored-signal evidence store designated by MONGO-GOV `D-MONGO-1`. It is the object the LIFE-GOV `D-LIFE-6` pre-persistence handoff hands into.

## Boundary (what this slot does NOT do)

Per MONGO-IMPL Slot 1, this is **schema/contract only**:

- **No storage engine** — no MongoDB, no collection names, no indexes, no deployment topology, no storage-engine behavior. (That is `MONGO-STORE` / afi-infra, Slot 2.)
- **No migration mechanics** — none of the legacy-store reconciliation (`MONGO-MIGRATION`, Slot 5, separately gated).
- **No API / endpoint** — no read/replay/verify surface (ATLAS-GOV).
- **No Reactor / Gateway / afi-infra changes** — those are Slots 2–4.
- **No Atlas, chain, mint, reward, settlement, or production-scoring work.**
- It does **not** import or canonize the heavy `ReactorScoredSignalDocument` or the full `VaultedSignalRecord` — those are demoted tier-4 carriers (MONGO-GOV `D-MONGO-7`) and are structurally rejected here.

## Composition — carried by reuse, not redefinition

`afi.scored-signal-evidence.v1` is a **thin, self-identifying** evidence record keyed by the governed `signalId`. It **reuses** the governed District-2 shapes via `$ref` rather than redefining them, so it "builds on" the `schemas/provenance/v1/` family (MONGO-GOV `D-MONGO-2`) without re-deciding it:

| Field | Source clause | Notes |
|---|---|---|
| `schema` (const `afi.scored-signal-evidence.v1`) | OBJ-GOV `D-OBJ-6` axis (a) | per-object schema-id const; versions the record shape |
| `signalId` | OBJ-GOV `D-OBJ-1`, MONGO-GOV `D-MONGO-6` | canonical join key + store idempotency key |
| `analystId` / `strategyId` / `strategyVersion` | OBJ-GOV `D-OBJ-3` | **complete** canonical strategy identity triple — all three **required-present** on the evidence record (top-level, denormalized for keying). D-OBJ-3 leaves `strategyVersion` optional at the general object level and the reused projection keeps it optional; the canonical evidence record requires the full triple. Format unchanged (non-binding). |
| `canonicalizationVersion` (`^afi\.hash\.v[0-9]+$`) | OBJ-GOV `D-OBJ-6` axis (b) | held distinct from the schema-id |
| `lifecycleState` | LIFE-GOV `D-LIFE-1` / `D-LIFE-6` | restricted to the **persistable** canonical states (post-scoring) |
| `finalized` | MONGO-GOV `D-MONGO-5`, LIFE-GOV `D-LIFE-4` | immutable-after-`FINALIZED` marker; bound to `lifecycleState` by `if/then/else` |
| `scoredSignal` (`$ref afi.scored-signal.v1`) | OBJ-GOV `D-OBJ-5` | the thin canonical projection, by reuse |
| `provenanceRecord` (`$ref afi.provenance-record.v1`) | LIFE-GOV `D-LIFE-6`, MONGO-GOV `D-MONGO-9` | present + replay/verify-sufficient; full canonical shape deferred |
| `uwrProfile` | PR-UWR-STAMP `UP-2`/`UP-5`/`UP-10`, PR-UWR-STAMP-SEMANTICS `RC-6` | **required** governed UWR profile stamp, reused **verbatim** (`profileId` + `status` + `decisionRef` + `source`). Traceability metadata only — no qualification gate (`UP-9`), no reward/mint wiring (§6). See below. |
| `recordVersion?` / `supersedesRecordHash?` | MONGO-GOV `D-MONGO-5` | versioning-by-supersession (contract-level, not storage) |

### The governed UWR profile stamp (`uwrProfile`)

Added under **MONGO-CONTRACT** authority (this slot owns the canonical record contract, MONGO-GOV `D-MONGO-2`) consuming the **already-accepted** `PR-UWR-STAMP` / `PR-UWR-STAMP-SEMANTICS` decisions **exactly**. This contract **reuses** the governed stamp shape and discriminator values; it does **not** redesign UWR, change any profile value, alter scoring, reopen `UP-8`/`UP-9`, or add stamp semantics.

| Stamp field | Governed meaning |
|---|---|
| `profileId` | the pinned governed profile the scoring configuration corresponds to (`UP-2`), e.g. `uwr-weighted-lifts-v0.1` |
| `status` (const `testnet-provisional`) | the pinned profile's governance status, mirroring the governed stamp literal; promoting it is a separate governed change |
| `decisionRef` | the decision that pinned the profile |
| `source` (`builtin-value-identity` \| `registry-consumed`) | **required** `RC-6` discriminator: whether scoring ran afi-core's builtin `defaultUwrConfig` (value-identical by construction, registry **not** read) or the profile actually **read** from the registry and validated under the `RC-5` identity predicate |

**Why `source` is required here** (while the governed stamp type leaves it optional): `RC-6` reserves an **absent** `source` to identify the **pre-program era**. This canonical store is **fresh** (MONGO-GOV `D-MONGO-1`, Option A) and contains no pre-program records, so it has **no compatibility obligation** to accept a newly written unstamped/unsourced record — one written now would masquerade as pre-program. The pre-program allowance stays governed for **reading** historical records in the demoted legacy stores; it is not relevant to what this store admits.

**Consequence of requiring the stamp** (`UP-10`): the profile is recognized only for the registry `scorerIdentity`, so only records from that identity are stampable — and therefore admissible. A record from an unrecognized scorer identity is not admissible to this store until its profile recognition is separately governed.

**Runtime obligations** (not JSON-Schema-enforceable; see `x-afiConstraints.uwrProfileStamp`): the submitter must build the stamp from the source the composition path **actually scored with** (propagated explicitly, never re-derived at the stamp site or read from the environment), and `RC-4` fail-closed resolution means a failed/invalid registry read refuses to score — so **no record and no stamp exist** for a failed resolution.

## Constraints that JSON Schema cannot enforce

Recorded as governed contract constraints in the schema's `x-afiConstraints` and verified by `tests/scored-signal-evidence-schema-validation.test.ts`:

- **`signalId` uniqueness / idempotency** — a store-layer unique constraint (MONGO-GOV `D-MONGO-6`); the store MUST support it (i.e. **not** time-series). Fixed here as the idempotency key only; the index/DDL is Slot 2.
- **Append-once / immutable-after-`FINALIZED`** — one current record per `signalId`; corrections **supersede** (MONGO-GOV `D-MONGO-5`).
- **Single-writer boundary** — only the afi-infra interface writes; Reactor/Gateway submit, never write (MONGO-GOV `D-MONGO-3`).
- **Identifier continuity** — top-level `signalId` == `scoredSignal.signalId` == `provenanceRecord.signalId`; strategy triple agrees; `canonicalizationVersion` agrees with the provenance record (OBJ-GOV `D-OBJ-1`, LIFE-GOV `D-LIFE-5`). Not expressible in JSON Schema draft-07; enforced by the drift-guard tests.
- **UWR profile stamp honesty** — the stamp must reflect the source actually scored with (propagated, never re-derived); only the `UP-10`-recognized scorer identity is stampable; `RC-4` fail-closed resolution means a failed registry read produces no record at all (PR-UWR-STAMP / `RC-6`). Enforced by the afi-reactor runtime guardrails, not by this schema.

## Validation

```
npm run test:run   # includes tests/scored-signal-evidence-schema-validation.test.ts
```

Valid and invalid governed vectors live in [`../../../examples/scored-signal-evidence/v1/`](../../../examples/scored-signal-evidence/v1/); see that directory's `vectors/README.md`.

## Change control

- `afi.scored-signal-evidence.v1` is a **versioned contract**. Any shape change requires a new governance decision and a new schema version (`.v2`) — never a silent mutation.
- Merging the `MONGO-CONTRACT` PR opens the gate for **Slot 2 (`MONGO-STORE`, afi-infra)**. No storage work is authorized by this schema's merge alone.
