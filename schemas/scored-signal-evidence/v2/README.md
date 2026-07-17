# Canonical Scored-Signal Evidence Contract (v2)

**Family:** `afi.scored-signal-evidence.v2` — the canonical scored-signal evidence record, **with composition provenance**.
**Status:** `governed-contract` — the **active write contract** of the one canonical scored-signal evidence store.
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1`, exercising v1's own change-control rule ("any shape change requires a new governance decision and a new schema version — never a silent mutation").

## Supersession (v2 vs v1)

- **v2 supersedes v1 as the active write contract**: every newly written canonical evidence record conforms to v2.
- **v1 remains the frozen prior version**: existing v1 records stand as history under [`../v1/`](../v1/) exactly as written. There is **no dual-write** and **no v1 back-write**; the v1 directory is untouched and frozen.
- v2 is v1 **copied exactly** — the same reused `afi.scored-signal.v1` / `afi.provenance-record.v1` / `CanonicalHash` `$ref`s, the same thirteen v1 properties, the same lifecycle/finality `if/then` binder, the same store-layer and continuity constraints — **plus exactly one addition**:

| Delta | Value |
|---|---|
| `schema` const | `afi.scored-signal-evidence.v2` |
| **new REQUIRED** `composition` | `$ref` [`afi.composition-ref.v1`](../../composition-ref/v1/composition-ref.schema.json) |

## What `composition` adds

The complete, hash-pinned identity of **what composed the score** (reconciliation report §9 N1, realized as a dedicated object rather than overloading `strategyVersion` — N5 avoided): pipeline identity + canonical `manifestHash`, `analystConfigHash`, scorer plugin identity, `pluginSetHash`, `executionSummaryHash` (timestamp-free), `enrichmentHash`. The composition ref is **all-or-nothing** (every field required): a submitter that cannot produce every pin **refuses to submit** — there is no degraded stamp and no partially-pinned record.

Cross-object agreements recorded in `x-afiConstraints.compositionBinding` (tooling/submitter-enforced): `composition.analystConfigHash` equals the registration's pin; `composition.enrichmentHash` equals `provenanceRecord.enrichmentHash` when present; the composition's scorer is the scorer that actually produced `scoredSignal`.

Everything else — boundary (schema/contract only), store-layer constraints, identifier continuity, the analyst-neutral UWR profile stamp (PR-UWR-STAMP shape, RC-6 `source` discriminator) — is **unchanged from v1**; see the [v1 README](../v1/README.md) for the full doctrine walk-through, which this version consumes and does not re-decide.

## Validation

```
npm run test:run   # includes tests/composition-evidence-v2-schema-validation.test.ts
```

Valid and invalid governed vectors live in [`../../../examples/scored-signal-evidence/v2/`](../../../examples/scored-signal-evidence/v2/) (admissible = schema-valid AND identifier-continuity-clean, the same two-layer rule as v1; invalid vectors include: missing `composition`, v1 schema const carrying a `composition`, malformed hashes, forbidden extra properties).

## Change control

- `afi.scored-signal-evidence.v2` is a versioned contract. Any shape change requires a new governance decision and a new schema version (`.v3`) — never a silent mutation.
- The v1 directory is **frozen**: no edits, no deletions, no back-ports.
