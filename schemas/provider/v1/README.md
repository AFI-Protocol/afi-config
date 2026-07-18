# `afi.provider.v1` — compute/data provider identity (PBF-GOV D-PBF-4)

Non-secret identity of a provider that supplies an analytical capability for one or more
of the five open lanes (`technical | pattern | sentiment | news | aiMl`). Distinct from
the ingress `afi.provider-strategy-binding.v1` (which routes inbound *signals*).

Carries **only** non-secret metadata: `providerId`, `recordVersion`, `displayName`,
`supportedCategories`, `executionClass` (`local|remote`), `deterministic`, `adapterId`
(the trusted runtime-registered adapter that implements it), `requiresCredential`, an
optional `credentialKind` (present **iff** `requiresCredential`; names the *kind*, never a
value), an optional closed `supportedModels` set, and `status`. `additionalProperties:false`
leaves a secret value nowhere to live.

Registry presence = **available**, not endorsement (D-PBF-6). Reference records live in
`registries/providers/`. Provider instances and credential references are deployment-local
(not a public registry, D-PBF-7).
