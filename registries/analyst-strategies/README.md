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
- An entry's **triple and `analystConfigHash` never mutate**. Corrections register a **new `strategyVersion`** (a new file); retirement flips `status` — files are never deleted.
- The test suite pins this directory's contents to the authorized set (drift guard): adding an entry requires updating the pinned list in the same PR.

## Current contents

The production **froggy** registration (W3a administrative seeding, reactor wave):

- [`froggy--trend_pullback_v1--1.0.0.json`](./froggy--trend_pullback_v1--1.0.0.json) — the registration entry (`status: active`, `providerBindingPolicy: explicit` over the seeded [`provider-bindings`](../provider-bindings/)).
- [`froggy--trend_pullback_v1--1.0.0.config.json`](./froggy--trend_pullback_v1--1.0.0.config.json) — the co-located registered `afi.analyst-strategy-config.v1` artifact the entry's `configRef` resolves to (a **byte-identical copy** of the accepted `afi-factory` main `templates/official/froggy-trend-pullback/analyst-config.json`). Its canonical hash (domain tag `afi.d2.analyst-config`) is
  `269ae355a0d8bfaf53d849c38fba16e167f0571b6319ddc8d94841ff7c275261`, recomputed and asserted by the test suite.

Co-located config artifacts are named `<analystId>--<strategyId>--<strategyVersion>.config.json` beside their registration entry.

Complete worked examples (schema-valid, semantically clean, with real canonical hashes) live under
[`examples/analyst-strategy-registration/v1/`](../../examples/analyst-strategy-registration/v1/) with governed valid/invalid vectors.
