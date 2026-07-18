# Providers registry (`afi.provider.v1`)

Non-secret compute/data **provider identities** (PBF-GOV D-PBF-4). Each file is one
`afi.provider.v1` record: `<providerId>--<recordVersion>.json`.

A **Provider** names *who or what* supplies an analytical capability for one or more
of the five open analysis lanes (`technical | pattern | sentiment | news | aiMl`). It is
distinct from the ingress `afi.provider-strategy-binding.v1` (which routes inbound
*signals*). Registry presence means **available to the relevant AFI deployment or
configuration** — **not** universally approved by AFI Protocol, and **not** an
endorsement (D-PBF-6).

A Provider record carries **only non-secret identity metadata**: id, record version,
display name, supported categories, execution class, deterministic posture, the
identity of the trusted runtime-registered adapter that implements it (`adapterId`),
whether it requires a credential (and, if so, the **kind** — never a value), an optional
closed set of supported models, and an active/inactive status. It never contains a
credential value (`additionalProperties:false`).

## Seeded reference records (the two v0.1 proofs)

| Provider | Category | Credential | Adapter |
|---|---|---|---|
| `afi-provider-technical-local` | `technical` | keyless | `afi-adapter-technical-local` (local, deterministic) |
| `afi-provider-news-http` | `news` | BYOK `apiKeyHeader` | `afi-adapter-news-http` (remote, header-authenticated) |

Adding a conforming provider is an **administrative registry update** under FCP-GOV
D-FCP-5 — not per-participant governance.

**Provider instances and credential references are deployment-local tenant/operator
configuration, not a public registry** (D-PBF-7); their reference shapes live under
`schemas/provider-instance/` and `schemas/credential-ref/`, with fixtures under
`examples/provider-instance/` and `examples/credential-ref/`.
