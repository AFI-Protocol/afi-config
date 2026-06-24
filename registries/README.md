# AFI Registries

This directory holds **canonical, machine-readable registries** for AFI Protocol. The first registry is the **vault / Safe / address registry**.

- **Schema:** [`../schemas/afiVaultAddressRegistry.schema.json`](../schemas/afiVaultAddressRegistry.schema.json)
- **Registry (draft v1):** [`./afi-vault-address-registry.v1.json`](./afi-vault-address-registry.v1.json)

> **This registry is descriptive source-of-truth metadata. It is NOT an instruction to move funds, update ENS records, create Safe transactions, grant roles, deploy contracts, or change runtime configuration.** It exists so that later runtime corrections, contract specs, Safe hardening, and deployment planning can be done against an authoritative, reviewed mapping. Status is **draft — pending owner confirmation**.

---

## Purpose

AFI's ENS namespace (`afidao.eth` + the `treasury` / `reserve` / `grants` / `ops` / `liq` subnames) exists, but recon found it is **placeholder scaffolding**, not a funded, segregated vault system: the subnames collapse to two unfunded 1-of-1 Safes on Ethereum mainnet, and the real Base Treasury Safe has **no ENS name**. The registry encodes this reality precisely so that:

1. Nobody mistakes an ENS alias for a funded vault.
2. The real Base Treasury Safe is represented **separately** from the placeholder `treasury.afidao.eth`.
3. Every known mismatch (treasury mispoint, reserve/root collision, lane collapse, legacy-ENS-alias staleness, 1-of-1 risk) is captured as structured data.
4. Future runtime/config/contract work can resolve roles to **concrete addresses**, not ENS names.

This registry implements [`AFI_ENS_SAFE_ADDRESS_REGISTRY_DOCTRINE.md`](../../afi-docs/specs/AFI_ENS_SAFE_ADDRESS_REGISTRY_DOCTRINE.md) and [`ADR-005`](../../afi-docs/adrs/ADR-005-ens-aliases-addresses-source-of-truth.md), and derives its facts from the recon reports under `reports/`.

---

## ENS aliases vs. concrete addresses (the core rule)

> **Concrete addresses + `chainId` + Safe `threshold` + signer policy are AUTHORITATIVE. ENS names are human-readable aliases ONLY.**

- An **ENS alias** (e.g. `treasury.afidao.eth`) is a convenience label for humans. It is **mutable** (a parent owner can re-point a subname at any time) and may resolve to a placeholder, the wrong chain, or nothing.
- The **concrete address** (e.g. `0x1Dd6705…` on `chainId 8453/84532`) plus its **Safe threshold/owners** is the thing that actually holds authority or funds. That is what configs, contracts, and governance must key on.

In this registry, every entry carries both: the `ens` field (alias, may be `null`) **and** the authoritative `resolvedAddress` + `chainId` + `safe` block.

---

## Why contracts must NOT resolve ENS dynamically for access control

- **Mutability / takeover risk:** ENS resolution depends on registry/resolver state that can be changed by the name's owner (or, for subnames, the parent). A contract that gates `onlyRole`/treasury access on a live ENS lookup would transfer control to whoever can edit the ENS record. AFI's afidao subnames are **not emancipated**, so the parent can rewrite them.
- **Cross-chain incoherence:** ENS lives on Ethereum L1; AFI executes on Base. There is no trustworthy, atomic, in-contract way to resolve an L1 name from a Base contract for authorization.
- **Cost / failure modes:** on-chain resolution adds gas, external calls, and new revert/oracle surfaces to a security-critical path.

**Rule:** contracts MUST embed concrete addresses (or read them from an owner-controlled, immutable-per-epoch config), never an ENS name. ENS is for humans and off-chain tooling only.

---

## How future runtime configs should consume this registry

- Treat this JSON as the **single lookup** for "which concrete address plays role X on chain Y." Resolve by `recommendedRole` + `chainId`, then use `resolvedAddress`.
- **Never** copy an ENS string into a runtime authorization path; copy the `resolvedAddress` (and assert `chainId`).
- Respect the flags: do not fund or authorize an entry with `isPlaceholder: true`, `isFundedVault: false`, or `productionStatus: not-production` without owner approval.
- Honor `forbiddenActions` and `knownMismatches` — they are machine-readable guardrails.
- The runtime `snapshotSpaceId` default has been corrected to `afidao.eth` (it previously held a non-canonical ENS alias); see `deprecatedAliases`, `openQuestions.OQ-7`, and `reports/afi-legacy-ens-alias-removal.md`. The registry records `afidao.eth` as the canonical source-of-truth value.

---

## Status vocabulary

The registry uses two independent status axes.

### `currentStatus` (operational state of the account)
| Value | Meaning |
|-------|---------|
| `active-identity` | A live, in-use account (e.g. the ENS root identity / Snapshot admin). Active ≠ a funded token vault. |
| `placeholder` | A reserved alias/Safe with no funds, history, or segregated purpose yet. |
| `runtime-authority` | Currently holds on-chain authority (admin/emissions roles) or controls Safes. |
| `testnet-authority` | Holds authority on a **testnet** only (e.g. Base Sepolia v0). |
| `deprecated` | Stale/wrong; must not be used (see `deprecatedAliases`). |
| `unknown` | State could not be determined. |

*(The mission also refers to an "active" and an "open" status. "active" maps to `active-identity`; "open" items are tracked in the registry's `openQuestions` array rather than as an account status.)*

### `productionStatus` (production-readiness)
| Value | Meaning |
|-------|---------|
| `not-production` | Not suitable for mainnet production custody/authority (e.g. 1-of-1 Safe, placeholder). |
| `testnet-only` | Exists/operates on testnet only. |
| `production-candidate` | Proposed for production, **pending** owner approval + hardening. |
| `production-approved` | Owner-approved for production. **No entry may carry this without supporting docs + explicit owner approval.** |
| `unknown` | Readiness could not be determined. |

---

## Unknowns

Per design rule 10, unknown values are encoded as `null` or `"unknown"` — **never guessed**. Multi-chain accounts (e.g. the operator signer) use `chainId: null` + `network: "multi-chain"` and enumerate per-chain status in `chainDeployments` where relevant.

---

## Validation

```
jq . afi-config/registries/afi-vault-address-registry.v1.json        # JSON syntax
# schema conformance (draft-07) via ajv:
npx ajv-cli validate -s afi-config/schemas/afiVaultAddressRegistry.schema.json \
  -d afi-config/registries/afi-vault-address-registry.v1.json
```

The draft v1 registry has been validated against the schema (AJV, draft-07) — see [`reports/afi-config-vault-address-registry-implementation.md`](../../reports/afi-config-vault-address-registry-implementation.md).

---

## Change control

- This is a **draft**. Changing an entry's `productionStatus` to `production-approved`, re-pointing an ENS alias, or marking a placeholder as a funded vault requires **owner confirmation** (and, for legal/clawback items, legal/compliance) — see the registry's `openQuestions`.
- Address/Safe facts carry a `lastVerified` date; re-verify on-chain before relying on them for any transaction.
