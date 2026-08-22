# Enrichment Mapping Registry

**Family:** `afi.enrichment-mapping.v1` (schema: [`schemas/enrichment-mapping/v1/`](../../schemas/enrichment-mapping/v1/README.md)).
**Authorization:** `afi-governance/decisions/declarative-enrichment-mapping-v0.1.md` (D-DEM-2(2)); family added to the FCP-GOV D-FCP-3 delegation per its own change-control sentence.

One file per registered mapping identity: `<mappingId>--<version>.json`. A version any signal has been scored under is **immutable** — changes register a new version, never edit an existing file (D-DEM-2(2), D-DEM-6(1)). The registry entry pins each document's canonical-json hash at registration.

Every entry is AJV-validated against the family schema and drift-guarded by `tests/registries-seeding-validation.test.ts` (the directory's exact contents are pinned; an unregistered file is a red test).

## Current contents

Empty — the first registration (`froggy-trend-pullback` `1.0.0`, whose content the canonical example at `examples/enrichment-mapping/v1/enrichment-mapping.example.json` already carries) lands under the DEM-BIND slot, merge-order step (d) of D-DEM-2(5), and **no runtime resolves this registry yet** (DEM-CONTRACT slot text). Registration is an owner-gated act; the drift guard's pinned list updates in the same PR.
