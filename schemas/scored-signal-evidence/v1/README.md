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
| `uwrProfile` | PR-UWR-STAMP `UP-2`/`UP-5`, PR-UWR-STAMP-SEMANTICS `RC-6` | **required** scoring-profile stamp identifying the profile that actually produced the score, reused **verbatim** (`profileId` + `status` + `decisionRef` + `source`). **Analyst-/strategy-/profile-neutral.** Traceability metadata only — no qualification gate (`UP-9`), no reward/mint wiring (§6). See below. |
| `recordVersion?` / `supersedesRecordHash?` | MONGO-GOV `D-MONGO-5` | versioning-by-supersession (contract-level, not storage) |

### The scoring-profile stamp (`uwrProfile`)

Added under **MONGO-CONTRACT** authority (this slot owns the canonical record contract, MONGO-GOV `D-MONGO-2`), reusing the **already-accepted** `PR-UWR-STAMP` stamp shape and the `PR-UWR-STAMP-SEMANTICS` `RC-6` source values **exactly**. It does **not** redesign UWR, change any profile value, alter scoring, reopen `UP-8`/`UP-9`, or add stamp semantics.

**Rule:** every newly created canonical evidence record must carry the UWR/scoring profile that **actually produced the score**, identifying the profile and its exact source/provenance.

| Stamp field | Meaning | Fixed vocabulary? |
|---|---|---|
| `profileId` | identifies the profile that produced the score (e.g. `uwr-weighted-lifts-v0.1` — *illustrative*) | **No** — any conforming profile id |
| `status` | the profile's declared governance/lifecycle status (e.g. `testnet-provisional` — *illustrative*) | **No** — non-empty string |
| `decisionRef` | the reference that defines/pins that profile | **No** — non-empty string |
| `source` (`builtin-value-identity` \| `registry-consumed`) | the **`RC-6`** discriminator: whether scoring ran the builtin config (value-identical by construction, registry **not** read) or the profile actually **read** and validated at runtime | **Yes** — the governed values, reused exactly |

#### Analyst-, strategy-, and profile-neutral

This contract fixes **no** analyst, strategy, or profile value — `analystId`, `strategyId`, `strategyVersion`, `profileId`, `status`, and `decisionRef` carry **no** `const`/`enum`/`pattern`. `source` is the **only** fixed vocabulary. Concretely:

- Today's Reactor emits a single supported profile — that is an **implementation limitation, not a protocol-schema restriction**.
- Future analysts may emit other AFI-conforming profiles once their pipeline/runtime supports and validates them (see the `alternate-analyst-profile` valid vector, and the neutrality drift guard in the test suite).
- **No bespoke governance decision is required** merely for an analyst to configure and run a conforming strategy. Governance remains required for protocol-wide canonical defaults, registry admission rules, reward eligibility, production scoring law, and economic effects — **none** of which this stamp confers.
- `UP-10` profile *recognition* scopes what a given implementation may stamp; it is **not** an admission rule of this contract.

#### Why `source` is required here (the governed stamp type leaves it optional)

`RC-6` reserves an **absent** `source` to identify the **pre-program era**. This canonical store is **fresh** (MONGO-GOV `D-MONGO-1`, Option A) and contains no pre-program records, so it has **no compatibility obligation** to accept a newly written unsourced record — one written now would masquerade as pre-program. The pre-program allowance stays governed for **reading** historical records in the demoted legacy stores; it is not relevant to what this store admits.

#### Runtime obligations (not JSON-Schema-enforceable; see `x-afiConstraints.uwrProfileStamp`)

The submitter must stamp the profile it **actually ran**, build `source` from the provenance it **actually resolved** (propagated explicitly — never re-derived at the stamp site or read from the environment), and **fail closed**: if the configured profile cannot be resolved/validated it must refuse to score, so **no record and no stamp exist** for a failed resolution (`RC-4` realizes this for the registry-backed profile).

## Constraints that JSON Schema cannot enforce

Recorded as governed contract constraints in the schema's `x-afiConstraints` and verified by `tests/scored-signal-evidence-schema-validation.test.ts`:

- **`signalId` uniqueness / idempotency** — a store-layer unique constraint (MONGO-GOV `D-MONGO-6`); the store MUST support it (i.e. **not** time-series). Fixed here as the idempotency key only; the index/DDL is Slot 2.
- **Append-once / immutable-after-`FINALIZED`** — one current record per `signalId`; corrections **supersede** (MONGO-GOV `D-MONGO-5`).
- **Single-writer boundary** — only the afi-infra interface writes; Reactor/Gateway submit, never write (MONGO-GOV `D-MONGO-3`).
- **Identifier continuity** — top-level `signalId` == `scoredSignal.signalId` == `provenanceRecord.signalId`; strategy triple agrees; `canonicalizationVersion` agrees with the provenance record (OBJ-GOV `D-OBJ-1`, LIFE-GOV `D-LIFE-5`). Not expressible in JSON Schema draft-07; enforced by the drift-guard tests.
- **Scoring-profile stamp honesty** — the stamp must name the profile actually run and the source actually resolved (propagated, never re-derived); a profile that cannot be resolved/validated must fail closed, producing no record at all (PR-UWR-STAMP / `RC-6`; `RC-4` for the registry-backed profile). Which profiles/identities an implementation may stamp is its own runtime property, **not** an admission rule here. Enforced by the submitter's runtime guardrails, not by this schema.

## Validation

```
npm run test:run   # includes tests/scored-signal-evidence-schema-validation.test.ts
```

Valid and invalid governed vectors live in [`../../../examples/scored-signal-evidence/v1/`](../../../examples/scored-signal-evidence/v1/); see that directory's `vectors/README.md`.

## Change control

- `afi.scored-signal-evidence.v1` is a **versioned contract**. Any shape change requires a new governance decision and a new schema version (`.v2`) — never a silent mutation.
- Merging the `MONGO-CONTRACT` PR opens the gate for **Slot 2 (`MONGO-STORE`, afi-infra)**. No storage work is authorized by this schema's merge alone.
