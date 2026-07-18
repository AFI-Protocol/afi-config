# `afi.enrichment.*.v1` — canonical category-result contracts (PBF-GOV D-PBF-2/D-PBF-8)

The per-category output contract for an open analysis lane: the **one** resolved result a
provider/plugin contributes to the scorer-facing join. A provider-produced result MUST pass
this validation at the provider-adapter edge **before** it reaches scoring (D-PBF-8); a
malformed result never reaches the scorer. The `category` marker is the discriminator the
deterministic one-per-category join uses (D-PBF-2).

These are **runtime category-result payloads**, not stored artifacts, so they carry no
`schema` const field. Referenced by `afi.analysis-plugin.v1`'s `outputSchemaRef`.

All five open analysis lanes carry a governed category-result contract:

| Schema id | Lane | File |
|---|---|---|
| `afi.enrichment.technical.v1` | `technical` | `technical/v1/enrichment-technical.schema.json` |
| `afi.enrichment.pattern.v1` | `pattern` (incl. the optional FLPR-GOV `candlestick` block) | `pattern/v1/enrichment-pattern.schema.json` |
| `afi.enrichment.sentiment.v1` | `sentiment` | `sentiment/v1/enrichment-sentiment.schema.json` |
| `afi.enrichment.news.v1` | `news` | `news/v1/enrichment-news.schema.json` |
| `afi.enrichment.aiml.v1` | `aiMl` | `aiml/v1/enrichment-aiml.schema.json` |
