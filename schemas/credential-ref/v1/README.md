# `afi.credential-ref.v1` — opaque, non-secret BYOK pointer (PBF-GOV D-PBF-4/D-PBF-7)

A non-secret, opaque, scoped **pointer** to credentials — **never** a value. Carries only:
`credentialRef` (an opaque deployment-local id, never a backend path/URL), `recordVersion`,
`tenant` (owning scope), `providerId` (the credentialed provider it is compatible with),
`credentialKind`, and `status` (`active|disabled`). The actual secret lives in a deployment
secret backend keyed by `(tenant, credentialRef)`; rotation/revocation happen **behind** the
reference.

Two defenses forbid secret material: (1) **primary** — `additionalProperties:false` plus the
explicit allowed-field set (an inline `apiKey`/`token`/`secret`/`password`/`authorization`
field is rejected as an unknown property); (2) **secondary** — the BYOK denylist validator
(`tests/provider-byok-cross-reference-validation.test.ts`) walks all keys against a
secret-name denylist. Credential-reference records are deployment-local operator
configuration, not a public registry (D-PBF-7); the fixtures here are reference shapes only.
