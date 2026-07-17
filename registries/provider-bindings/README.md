# AFI Provider Strategy Binding Registry

**Entry contract:** [`afi.provider-strategy-binding.v1`](../../schemas/provider-strategy-binding/v1/provider-strategy-binding.schema.json)
**Authorization:** `afi-governance/decisions/factory-configurable-pipelines-v1` (D-FCP-5 generic registration rule).

This directory holds the **canonical registry of provider-to-strategy bindings** — which strategies an authenticated signal provider may route into, and which one is the default when the inbound signal does not select one. A binding names the provider, its ingress class (`providerType`), the authentication CLASS (`authenticatedBy` — never secret material), the whitelist of canonical strategy triples (`allowedStrategies`), an optional `defaultStrategy` (which MUST be a member of `allowedStrategies`), and an `active`/`inactive` status.

> **No secret material lives here.** `authenticatedBy` names the mechanism class only (`route-secret` | `gateway-tenant` | `integration-key`); the secret/tenant/key VALUES are operator configuration.

## Layout

- **One JSON file per binding**, named `<bindingId>.json`
  (e.g. `tradingview-default-webhook.json`).
- Every file MUST validate against the binding schema **and** the suite's
  semantic layer (D-OBJ-3 embedded-major agreement, defaultStrategy
  membership, active-binding cross-resolution against
  `registries/analyst-strategies/`) — enforced by
  `tests/registries-seeding-validation.test.ts`.
- `providerType` is the **ingress class** (`webhook` | `cpj` | `gateway`), not
  the upstream message source: CPJ payloads carry their own source-level
  `provenance.providerType` (e.g. `telegram`, `discord`), while the binding for
  that provider is keyed by the CPJ `provenance.providerId` with binding
  `providerType: "cpj"`.

## Change control (the generic administrative rule)

- **Adding** a binding and **flipping `status`** (`active` ⇔ `inactive`) are administrative registry acts (owner-merged PR, schema-validated).
- Files are never deleted; retirement flips `status` to `inactive`.
- The test suite pins this directory's contents to the authorized set (drift guard): adding a binding requires updating the pinned list in the same PR.

## Current contents

W3a administrative seeding — all bindings route (only) the registered froggy triple `froggy`/`trend_pullback_v1`/`1.0.0`:

| bindingId | providerType | providerId | status |
|---|---|---|---|
| `tradingview-default-webhook` | webhook | `tradingview-default` | active |
| `cpj-oracle-telegram-channel-1` | cpj | `oracle-telegram-channel-1` | active |
| `cpj-oracle-telegram-channel-2` | cpj | `oracle-telegram-channel-2` | active |
| `cpj-oracle-discord-guild-3` | cpj | `oracle-discord-guild-3` | active |
| `example-inactive-webhook` | webhook | `example-retired-provider` | **inactive** (negative-testing example: an inactive binding never routes) |

The three CPJ bindings cover exactly the provider pairs used by the afi-reactor oracle CPJ fixtures (`test/oracle/fixtures/cpj/`): telegram `oracle-telegram-channel-1` / `oracle-telegram-channel-2` and discord `oracle-discord-guild-3`.

Worked examples (schema-valid vectors, including negatives) live under
[`examples/provider-strategy-binding/v1/`](../../examples/provider-strategy-binding/v1/).
