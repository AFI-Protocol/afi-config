# Enrichment Mapping Registry

**Family:** `afi.enrichment-mapping.v1` (schema: [`schemas/enrichment-mapping/v1/`](../../schemas/enrichment-mapping/v1/README.md)).
**Authorization:** `afi-governance/decisions/declarative-enrichment-mapping-v0.1.md` (D-DEM-2(2)); family added to the FCP-GOV D-FCP-3 delegation per its own change-control sentence.

One file per registered mapping identity: `<mappingId>--<version>.json`. A version any signal has been scored under is **immutable** — changes register a new version, never edit an existing file (D-DEM-2(2), D-DEM-6(1)). The registry entry pins each document's canonical-json hash at registration.

Every entry is AJV-validated against the family schema and drift-guarded by `tests/registries-seeding-validation.test.ts` (the directory's exact contents are pinned; an unregistered file is a red test).

## Current contents

| File | canonical-json sha256 (full document, no exclusions — D-DEM-6(1)) | Registered under |
|---|---|---|
| `froggy-trend-pullback--1.0.0.json` | `fb68ef40681126554daf43f6b7828bf822f383be8ee03ffa358fe3f58957d488` | DEM-GOV DEM-BIND step (d) (D-DEM-2(5)(d)), 2026-08-23; byte-copy of the canonical example at registration time |

The suite-side pin lives in `tests/registries-seeding-validation.test.ts` (`PINNED_MAPPING_HASHES`) — a registered version is immutable; any byte change is a red test. The runtime resolves this registry lazily per `mappingRef` from DEM-BIND step (c) onward.
