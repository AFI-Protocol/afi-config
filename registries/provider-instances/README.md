# Provider-instances registry (`afi.provider-instance.v1`)

Non-secret **provider instance** records (PBF-GOV D-PBF-4/D-PBF-7; FLPR-GOV D-FLPR-7).
Each file is one `afi.provider-instance.v1` record: `<providerInstanceId>--<recordVersion>.json`.

A **ProviderInstance** is the non-secret configuration a pipeline node references (by
`providerInstanceRef` = id + record version) to select a configured provider for its
category: exactly one category, one provider, one trusted registered adapter (id +
pinned version), optional bounded invocation tuning, and — only when the bound provider
requires a credential — one opaque `credentialRef` pointer. It carries **no secret
value, no arbitrary endpoint, no code** (`additionalProperties:false`; anti-SSRF).

This registry holds the **committed reference records** of the five-lane provider
runtime: the `reference` tenant's all-five keyless/self-hosted profile (the canonical
smoke surface) plus the header-BYOK proof instances. Deployment- or tenant-specific
instances remain tenant configuration, not registry records.

## Seeded records

| Instance | Category | Provider | Credential |
|---|---|---|---|
| `afi-instance-reference-technical-local` | `technical` | `afi-provider-technical-local` | keyless |
| `afi-instance-reference-pattern-candlestick` | `pattern` | `afi-provider-pattern-candlestick` | keyless |
| `afi-instance-reference-pattern-tiny-brains` | `pattern` | `afi-provider-pattern-tiny-brains` | keyless |
| `afi-instance-reference-sentiment-cftc-cot` | `sentiment` | `afi-provider-sentiment-cftc-cot` | keyless |
| `afi-instance-byok-sentiment-coinalyze` | `sentiment` | `afi-provider-sentiment-coinalyze` | `credential-coinalyze-reference` |
| `afi-instance-reference-news-sec-edgar` | `news` | `afi-provider-news-sec-edgar` | keyless |
| `afi-instance-byok-news-newsdata` | `news` | `afi-provider-news-http` | `credential-newsdata-reference` |
| `afi-instance-reference-aiml-tiny-brains` | `aiMl` | `afi-provider-aiml-tiny-brains` | keyless (`model: froggy-reference-v1` selects the Tiny Brains orchestration profile) |

The five `afi-instance-reference-*` records for technical, pattern (candlestick),
sentiment (CFTC COT), news (SEC EDGAR), and aiMl (Tiny Brains) form the committed
all-five reference profile selected by the registered pipeline manifest. Selecting a
different supported instance is a registry/record change — never a category-node code
change (FLPR-GOV D-FLPR-4).

Adding a conforming instance is an **administrative registry update** under FCP-GOV
D-FCP-5 / PBF-GOV D-PBF-6 — not per-participant governance.
