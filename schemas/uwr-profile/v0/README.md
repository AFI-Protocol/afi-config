# Version-Pinned UWR Profile Registry Schemas (v0)

**Status:** `draft-non-implementation` — schema/spec + registration surface only.
**Authorization:** `afi-governance/decisions/uwr-profile-pin-v0.1.md` **UP-12**, which authorizes **PR-UWR-CONFIG only**: profile schema + registry instance + examples + positive/negative tests + KAT vector files + docs section.
**Part of:** AFI version-pinned UWR profile registry.

The canonical artifact term is "**version-pinned UWR profile**" (UP-1); UWR expands as **Universal Weighting Rule**. "Testnet Scoring Profile v0" is an optional, human-facing alias ONLY — it must never appear as a repo identifier, schema `$id`, field name, or profile id.

These schemas register the first version-pinned UWR profile, **`uwr-weighted-lifts-v0.1`** (UP-2), so testnet signal scoring runs against a named, pinned, KAT-gated profile instead of the anonymous `uwr-default-stub` placeholder — **without changing a single scored value**. The registration is value-identical to afi-core's `defaultUwrConfig` by construction (UP-5), and the v0 profile schema is deliberately **const-pinned**: any document other than the registered profile fails validation. Every value is **testnet-provisional, not production scoring law**.

## Files

| Artifact | File | Purpose |
|---|---|---|
| Profile schema | `uwr-profile.schema.json` | Const-pinned document format for the registered profile (UP-1..UP-10 encoded as `const`/pinned values) |
| Score-KAT schema | `uwr-score-kat.schema.json` | Format of the `computeUwrScore` KAT vector file (UP-11) |
| Decay-KAT schema | `uwr-decay-kat.schema.json` | Format of the `applyTimeDecay` KAT vector file (UP-7, UP-11); enum-pins each vector's `elapsedMinutes` to integer half-life multiples |
| Registry instance | [`../../../registries/uwr-profiles/uwr-weighted-lifts-v0.1.json`](../../../registries/uwr-profiles/uwr-weighted-lifts-v0.1.json) | The registration itself (UP-2) |
| Example | [`../../../examples/uwr-profile/v0/uwr-weighted-lifts-v0.1.example.json`](../../../examples/uwr-profile/v0/uwr-weighted-lifts-v0.1.example.json) | Byte-identical to the registry instance (drift-guarded by test) |
| KAT vectors | [`../../../kats/uwr-profile/v0/`](../../../kats/uwr-profile/v0/) | Pure-data known-answer-test vectors, including the D2 M2 golden anchor `uwrScore 0.1875` |

Positive and negative validation tests live in `tests/uwr-profile-schema-validation.test.ts` (AJV strict, same conventions as the existing harness).

## KAT/golden gate (UP-11)

Profile `uwr-weighted-lifts-v0.1` may not back any **reward-qualified or mint-eligible flow** until KAT vectors exist for `computeUwrScore` (including the `0.1875` anchor) and `applyTimeDecay` over the pinned template set, and the D2 M2 goldens (`afi-reactor/test/evidence/provenance/fixtures/golden.json`) remain byte-stable. KAT **vectors** (pure data) live here; KAT **execution** against afi-core code is the separately-authorized **PR-UWR-KAT-EXEC**, following the vendored-golden-with-source-pin pattern.

## Boundaries (what these drafts deliberately do NOT do)

- **No runtime consumption** — nothing here is read by any running system; consuming the registry at runtime requires its own scoped authorization.
- **No scoring code** — KAT expected values are decision-anchored literals; **nothing in afi-config evaluates the engine or decay formulas**. `afi-core/validators/UniversalWeightingRule.ts` and `defaultUwrConfig` are untouched.
- **SS-O1/O2/O3 close for this profile only** — the org-wide open items in `schemas/provenance/v1/scored-signal.schema.json` remain OPEN under District 2 authority; that schema is untouched.
- **Decay canonicality stays OPEN** — deferred to the existing PR-7 slot (`math-authority-v0.1.md` §8); these artifacts pin the GreeksDecayTemplate **surface** only (UP-8).
- **thetaBias is declared-but-not-consumed**; `linear`/`cliff` decay models are documented only, NOT pinned (UP-7).
- **Qualification is recorded, not wired** — `minDecayScoreThreshold 0.5` and `challengeWindowDurationHours 24` are testnet-provisional values (UP-9); no `IValidatorScorer` or `ValidatorDaemon` composition exists or is authorized here. The canonical term is "challenge window".
- **Not production scoring law** — production values require their own decision informed by testnet data. Any value change is a **new profile version (new id) + new governance decision**, never a mutation of `uwr-weighted-lifts-v0.1`.
