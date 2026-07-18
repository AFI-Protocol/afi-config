# `afi.enrichment.*.v1` — canonical category-result contracts (PBF-GOV D-PBF-2/D-PBF-8)

The per-category output contract for an open analysis lane: the **one** resolved result a
provider/plugin contributes to the scorer-facing join. A provider-produced result MUST pass
this validation at the provider-adapter edge **before** it reaches scoring (D-PBF-8); a
malformed result never reaches the scorer. The `category` marker is the discriminator the
deterministic one-per-category join uses (D-PBF-2).

These are **runtime category-result payloads**, not stored artifacts, so they carry no
`schema` const field. Referenced by `afi.analysis-plugin.v1`'s `outputSchemaRef`.

v0.1 ships the two lanes the mission proves; the remaining lanes are added when their
reference adapters land:

| Schema id | Lane | File |
|---|---|---|
| `afi.enrichment.technical.v1` | `technical` (keyless proof) | `technical/v1/enrichment-technical.schema.json` |
| `afi.enrichment.news.v1` | `news` (BYOK proof) | `news/v1/enrichment-news.schema.json` |
