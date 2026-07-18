# Credential-refs registry (`afi.credential-ref.v1`)

Non-secret **credential reference** records (PBF-GOV D-PBF-7; FLPR-GOV D-FLPR-7).
Each file is one `afi.credential-ref.v1` record: `<credentialRef>--<recordVersion>.json`.

A **CredentialRef** is an opaque, non-secret pointer naming *that* a credential exists
for one tenant and one provider (kind `apiKeyHeader` — the only kind in v0.1). It never
contains a secret value and never names a backend path or env var. The runtime resolves
the actual secret only at invocation, only for the active instance's exact
credentialRef, through the injected least-privilege `SecretResolver` (whose backend
mapping is deployment configuration, not registry data).

## Seeded records

| CredentialRef | Tenant | Provider |
|---|---|---|
| `credential-newsdata-reference` | `reference` | `afi-provider-news-http` |
| `credential-coinalyze-reference` | `reference` | `afi-provider-sentiment-coinalyze` |

These are the header-BYOK proof pointers for the two credentialed providers. Absent an
operator-provisioned secret, the credentialed instances fail closed (no fabricated
enrichment, no fallback provider).
