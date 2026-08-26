# AFI Analyst Strategy Registry

**Entry contract:** [`afi.analyst-strategy-registration.v1`](../../schemas/analyst-strategy-registration/v1/analyst-strategy-registration.schema.json)
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1` (FACTORY-CONTRACT).

This directory holds the **canonical registry of registered analyst strategies** — the entries the resolution seam consults to map an inbound signal's strategy triple to a pinned, hash-verified `afi.analyst-strategy-config.v1`.

> **Registration here is FACTORY admission only.** It does NOT wire runtime consumption, confer UP-10 scorer-identity recognition, qualification (UP-9), reward eligibility, or production scoring law. An analyst config naming an identity the runtime does not recognize under UP-10 fail-closes at the UWR stamp exactly as today.

## Layout

- **One JSON file per registered identity**, named by the triple:
  `<analystId>--<strategyId>--<strategyVersion>.json`
  (e.g. `kestrel--mean_reversion_v2--2.1.0.json`).
- Every file MUST validate against the registration schema **and** the suite's semantic layer (embedded-major agreement, `explicit` ⇒ `allowedBindings`, hash shape).
- `configRef` MUST resolve to an immutable `afi.analyst-strategy-config.v1` artifact whose canonical hash (metadata excluded, per [`canonical-json-hashing.v1.md`](../../schemas/hashing/canonical-json-hashing.v1.md)) equals `analystConfigHash`.

## Change control (the generic administrative rule)

- **Adding** an entry and **flipping `status`** (`active` ⇔ `inactive`) are administrative registry acts: an owner-merged PR referencing the registering act in `registrationRef`.
- An entry's **triple never mutates**, and its **`analystConfigHash` never mutates outside an owner-authorized pin re-record** (next bullet). Corrections register a **new `strategyVersion`** (a new file); retirement flips `status`.
- Re-recording an entry's **composition pin** (its config's `pipelineRef` and the
  recomputed `analystConfigHash`) under the SAME strategy triple is an
  owner-authorized governance act, never a routine edit (FLPR-GOV D-FLPR-6 re-recorded
  the froggy 1.0.0 registration onto the v1.1.0 five-lane pipeline, the Mission D
  owner authorization re-recorded it onto v1.2.0, and EV3-GOV D-EV3-5(1) re-recorded
  it onto the fail-fast v1.3.0 successor; the analyst's
  scorer identity — and therefore the triple — is unchanged; git history is the archive).
- The test suite pins this directory's contents to the authorized set (drift guard): adding an entry requires updating the pinned list in the same PR.

## Current contents

The production **froggy** registration (five-lane provider runtime, FLPR-GOV):

- [`froggy--trend_pullback_v1--1.0.0.json`](./froggy--trend_pullback_v1--1.0.0.json) — the registration entry (`status: active`, `providerBindingPolicy: explicit` over the seeded [`provider-bindings`](../provider-bindings/)).
- [`froggy--trend_pullback_v1--1.0.0.config.json`](./froggy--trend_pullback_v1--1.0.0.config.json) — the co-located registered `afi.analyst-strategy-config.v1` artifact the entry's `configRef` resolves to, pinning the [`froggy-trend-pullback--v1.3.0`](../pipelines/froggy-trend-pullback--v1.3.0.json) fail-fast manifest by canonical hash (EV3-GOV D-EV3-5(1)) and declaring the per-signal ratio decay law `barsPerHalfLife: 12` with assumed timeframe 5m for unparseable timeframes (TDR-GOV D-TDR-4; supersedes the DH-GOV D-DH-1 `decay-intraday-v1` ref — live 5m stamps stay at halfLifeMinutes 60 by construction). Its canonical hash (domain tag `afi.d2.analyst-config`) is
  `300783e4f93ae07b2d758a3780b03cfbf6e4742bb4e0e5c9e06fb54c1df1ff99`, recomputed and asserted by the test suite (DEM-PRODUCER-CANDLE era; the config's hash-excluded `metadata.supersedes` records the prior versions).

Co-located config artifacts are named `<analystId>--<strategyId>--<strategyVersion>.config.json` beside their registration entry.

Complete worked examples (schema-valid, semantically clean, with real canonical hashes) live under
[`examples/analyst-strategy-registration/v1/`](../../examples/analyst-strategy-registration/v1/) with governed valid/invalid vectors.

## Change control — analystConfigHash rotation (DEM-BIND step (d))

`froggy--trend_pullback_v1--1.0.0.config.json` gains `mappingRef: {froggy-trend-pullback, 1.0.0}` (DEM-GOV D-DEM-2(3)); `analystConfigHash` rotates `1172e5da… → aa8cf5cf…` (D-DEM-6(2): mapping identity rides the config hash — no new record member). Prior rotations: TDR-GOV D-TDR-4 (`8ab16706 → 1172e5da`), DH-GOV D-DH-1 (`e34471de → 8ab16706`).


## Change control — analystConfigHash re-record (DEM-PRODUCER-PLAN)

`froggy--trend_pullback_v1--1.0.0.config.json` moves `mappingRef` `1.0.0 → 1.1.0` (DEM-GOV §9 `DEM-PRODUCER-PLAN`, owner-authorized 2026-08-25, determination D-5): `rrMultiplePlanned` is bound to the technical lane's verified trade-plan fact. `analystConfigHash` re-records `aa8cf5cf… → 5cb9b7a4…` under the frozen triple (SV-GOV D-SV-1; D-CFG-5(4): the version identity IS the hash — the superseded version survives on every record sealed under it and in git history, and is listed in the config's hash-excluded `metadata.supersedes`). Prior rotations: DEM-BIND step (d) (`1172e5da → aa8cf5cf`), TDR-GOV D-TDR-4 (`8ab16706 → 1172e5da`), DH-GOV D-DH-1 (`e34471de → 8ab16706`).

## Change control — analystConfigHash re-record (DEM-PRODUCER-CANDLE)

`froggy--trend_pullback_v1--1.0.0.config.json` moves `mappingRef` `1.1.0 → 1.2.0` (DEM-GOV §9 `DEM-PRODUCER-CANDLE`, owner-authorized 2026-08-25): `brokeEmaWithBody` and `haFlatBackConfirmed` are bound (required) to the technical lane's computed candle-structure facts. `analystConfigHash` re-records `5cb9b7a4… → 300783e4…` under the frozen triple (SV-GOV D-SV-1; D-CFG-5(4)); the superseded version is listed in the config's hash-excluded `metadata.supersedes`.
