# `afi.provider-instance.v1` — tenant-scoped, non-secret provider configuration (PBF-GOV D-PBF-4/D-PBF-7)

A tenant/operator-scoped, non-secret configuration binding **one** provider to **one**
trusted registered adapter for **exactly one** category. This is what a pipeline node
references (by `providerInstanceId` + `recordVersion`).

Fields: `providerInstanceId`, `recordVersion` (version-pinned for deterministic composition),
`tenant`, `category` (one of the five open lanes), `providerId`, `adapterId` + `adapterVersion`,
optional `model` (∈ provider `supportedModels`), optional `credentialRef` (opaque id — present
**iff** the provider `requiresCredential`), optional non-secret `invocation` settings (a
**closed** object; `endpointProfile` is a named allow-listed profile, never a raw URL —
anti-SSRF), and `status`.

Cross-field coherence (provider exists; category ∈ provider `supportedCategories`; `adapterId`
= provider `adapterId`; credential coherence + tenant scope) is enforced by the runtime adapter
registry (afi-reactor) and `tests/provider-byok-cross-reference-validation.test.ts`. Contains
no credential value, no arbitrary code, and no analyst-supplied endpoint. Instance records are
deployment-local tenant configuration, not a public registry (D-PBF-7).
