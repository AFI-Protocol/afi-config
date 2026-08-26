# Enrichment Mapping Registry

**Family:** `afi.enrichment-mapping.v1` (schema: [`schemas/enrichment-mapping/v1/`](../../schemas/enrichment-mapping/v1/README.md)).
**Authorization:** `afi-governance/decisions/declarative-enrichment-mapping-v0.1.md` (D-DEM-2(2)); family added to the FCP-GOV D-FCP-3 delegation per its own change-control sentence.

One file per registered mapping identity: `<mappingId>--<version>.json`. A version any signal has been scored under is **immutable** — changes register a new version, never edit an existing file (D-DEM-2(2), D-DEM-6(1)). The registry entry pins each document's canonical-json hash at registration.

Every entry is AJV-validated against the family schema and drift-guarded by `tests/registries-seeding-validation.test.ts` (the directory's exact contents are pinned; an unregistered file is a red test).

## Current contents

| File | canonical-json sha256 (full document, no exclusions — D-DEM-6(1)) | Registered under |
|---|---|---|
| `froggy-trend-pullback--1.0.0.json` | `fb68ef40681126554daf43f6b7828bf822f383be8ee03ffa358fe3f58957d488` | DEM-GOV DEM-BIND step (d) (D-DEM-2(5)(d)), 2026-08-23; byte-copy of the canonical example at registration time |
| `froggy-trend-pullback--1.1.0.json` | `4642fe926b663faded2a674efd5c44e9ecefb4b4205e2ce9ee348cf974a117c3` | DEM-GOV DEM-PRODUCER-PLAN (owner-authorized 2026-08-25; §9 D-5), 2026-08-25: 1.0.0 + `rrMultiplePlanned` bound to `technical.plan.rrToFirstTarget` (producer-declared optional, floor default 1). 1.0.0 stays byte-identical (D-DEM-6(1)); the canonical example remains the 1.0.0 document |
| `froggy-trend-pullback--1.2.0.json` | `6ecfa9dc1041f17722759baedcd19d8208015c46ee5dcbb930c9e60115d4a9c6` | DEM-GOV DEM-PRODUCER-CANDLE (owner-authorized 2026-08-25), 2026-08-25: 1.1.0 + `brokeEmaWithBody` and `haFlatBackConfirmed` bound (required) to the technical lane's computed candle-structure facts. 1.0.0 and 1.1.0 stay byte-identical |

The suite-side pin lives in `tests/registries-seeding-validation.test.ts` (`PINNED_MAPPING_HASHES`) — a registered version is immutable; any byte change is a red test. The runtime resolves this registry lazily per `mappingRef` from DEM-BIND step (c) onward.
