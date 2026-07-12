# UWR Profile KAT Vectors (v0)

**Status:** `draft-non-implementation` — pure data only.
**Authorization:** `afi-governance/decisions/uwr-profile-pin-v0.1.md` **UP-12** (PR-UWR-CONFIG).

Known-answer-test (KAT) vectors for the version-pinned UWR profile **`uwr-weighted-lifts-v0.1`**, per the UP-11 gate: the profile may not back any reward-qualified or mint-eligible flow until these vectors exist and the D2 M2 goldens remain byte-stable.

| File | Target | Schema |
|---|---|---|
| `compute-uwr-score.kat.json` | `computeUwrScore` (afi-core `UniversalWeightingRule.ts` @ `390b440`) — includes the D2 M2 golden anchor `uwrScore 0.1875` | `schemas/uwr-profile/v0/uwr-score-kat.schema.json` |
| `apply-time-decay.kat.json` | `applyTimeDecay` (afi-core `GreeksDecayTemplate.ts` @ `390b440`) — all four pinned templates (8/60/720/5040 minutes) | `schemas/uwr-profile/v0/uwr-decay-kat.schema.json` |

**These files are data, not tests.** Nothing in afi-config executes the engine or decay formulas; the vitest suite only validates the files against their schemas and asserts the decision-anchored literals. KAT **execution** against afi-core code is the separately-authorized **PR-UWR-KAT-EXEC**, which consumes these files via the vendored-golden-with-source-pin pattern and owns the floating-point comparison policy (no tolerance is defined here; the decay vectors are constructed bit-exact — `expected = baseScore × 2⁻ᵏ`).

**Change control:** values are testnet-provisional, not production scoring law. They change only via a new governance decision and a new profile version (a new id) — never by editing the vectors of `uwr-weighted-lifts-v0.1`.
