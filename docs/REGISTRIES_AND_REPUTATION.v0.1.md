# AFI Registries & Reputation Invariants (v0.1)

**Purpose**: This document defines the canonical behavior of Agent Registries and Reputation systems in AFI Protocol, aligned with the AFI white paper (arXiv version).

**Audience**: Protocol contributors, governance participants, and agent developers.

---

## Overview

AFI Protocol maintains **Agent Registries** as the canonical source of truth for agent identity, roles, capabilities, and permissions. Alongside these registries, AFI implements a **Reputation system** (PoI, PoInsight, Repₜ) that influences agent selection, eligibility, and allocation—without ever directly modifying signal scores or overriding protocol finality.

This document establishes the invariants that govern how registries and reputation interact with the rest of the protocol.

---

## Agent Registries

### Purpose

Agent Registries serve as the **canonical source** for:

**Agent Identity**:
- Unique agent IDs (e.g., `scout:tv-webhook-btc-perps:v1`)
- Display names and metadata
- Version tracking and lifecycle management

**Roles & Lifecycle Stages**:
- Which lifecycle stage each agent operates in (scout, enrich, analyze, validate, audit, mentor)
- What embodiment kind each agent has (droid, service, companion, contract)
- Clear separation of concerns between stages

**Capabilities & Permissions**:
- What inputs each agent consumes
- What outputs each agent produces
- What tools and scopes each agent has access to
- What constraints each agent must respect

### Configuration vs. Protocol Behavior

**Configuration View**:
- Files like `agents.registry.v0.1.json` in this repo represent the **configuration view** of agent registries.
- These files are used for development, testing, and documentation purposes.
- They provide a human-readable and machine-parseable representation of agent definitions.

**Protocol Behavior**:
- The **runtime protocol** must ultimately respect governance flows (UPS/APS) for registry updates.
- Changes to agent roles, permissions, or capabilities that affect protocol behavior must flow through governance rails, not arbitrary config file edits.
- On-chain or service-level registries are the authoritative source for production behavior.

**Invariant**: Configuration files document intended behavior; governance and on-chain registries enforce it.

---

## Reputation System

### Components

AFI's reputation system consists of:

**PoI (Proof of Intelligence)**:
- Measures the capability and competence of an agent or validator under pinned, deterministic test suites
- Evaluates coverage, determinism, latency, and stability
- Focuses on technical performance and reliability

**PoInsight (Proof of Insight)**:
- Measures the quality and usefulness of insights an agent produces over time
- Evaluates novelty, usefulness, durability, and timeliness of contributions that made it into finalized receipts
- Tracks the value of agent contributions to the protocol

**Reputation Score (Repₜ)**:
- Agent-level reputation measure derived from PoI (Proof of Intelligence), PoInsight (Proof of Insight), and time-based decay/shrinkage
- Time-indexed (subscript t indicates reputation at time t)
- Influences agent selection, eligibility, and allocation weights
- Attached to agents/validators, NOT to individual signals

### What Reputation Influences

Reputation **DOES** influence:

**Eligibility**:
- Which agents are eligible to serve as validators or governance participants
- Which agents can participate in specific workflows or DAG nodes
- Minimum reputation thresholds for certain roles

**Selection & Allocation**:
- When multiple agents can perform the same role, reputation helps determine which is chosen
- How rewards, fees, or protocol incentives are weighted across agents
- Priority ordering when resources are scarce

**Governance Participation**:
- Voting weight or influence in protocol governance (via UPS/APS)
- Ability to propose changes or challenge decisions
- Stake requirements or bonding curves

---

## Reputation Invariants (No-Drift Contract)

### What Reputation MUST NOT Do

To preserve protocol integrity and determinism, reputation **MUST NOT**:

**Modify Signal Scoring (UWR)**:
- Reputation cannot alter the Unified Weighting Rule (UWR) or scoring logic for individual signals
- Signal scores are computed by analyst agents using fixed, governance-approved algorithms
- Reputation does not act as a "bonus term" or multiplier inside signal scoring functions

**Override Vault or Codex Finality**:
- Once a signal is validated and recorded in the Codex, reputation cannot retroactively change its status
- Vault finality (T.S.S.D. Vault immutability) is absolute; reputation cannot rewrite history
- Challenge windows and replay mechanisms are the only ways to contest finality, and these are governed by deterministic rules, not reputation

**Change Validator Behavior Post-Hoc**:
- Validators (Deterministic Market Validators, DMVs) remain dumb, deterministic, and rule-bound
- If validator behavior needs to change, it must be via pinned rule updates and governance approval
- Reputation cannot make a validator "smarter" or override its deterministic logic

**Act as a Hidden Influence**:
- All reputation-based decisions must be transparent and auditable
- Reputation scores and their influence on selection/allocation must be queryable
- No "black box" reputation adjustments that bypass governance

### How Reputation Changes Behavior (Correctly)

Reputation **MAY** influence behavior through:

**Explicit Governance Proposals**:
- If reputation data suggests a validator is unreliable, governance can propose removing or replacing it
- If an agent consistently underperforms, governance can adjust its eligibility or allocation
- All such changes flow through UPS/APS, not ad-hoc reputation overrides

**Transparent Selection Algorithms**:
- When choosing between multiple eligible agents, a transparent algorithm (e.g., weighted random selection based on Repₜ) can be used
- The algorithm itself is governance-approved and deterministic
- Reputation is an input to the algorithm, not a way to bypass it

**Incentive Alignment**:
- Reputation can influence reward distribution (e.g., higher-reputation agents receive larger shares of protocol fees)
- This creates incentives for good behavior without altering core protocol logic
- Incentive structures are defined in governance and applied uniformly

---

## Validators (DMVs) and Reputation

### Validators Remain Dumb

Validators in AFI Protocol are **Deterministic Market Validators (DMVs)**—intentionally dumb, deterministic mint gates. They:

- Consume already-scored signals from analyst agents
- Use replay outputs, challenge windows, and fixed rules to decide `mint` vs `no_mint`
- Produce validation/attestation records that can be replayed for audit

Validators **DO NOT**:
- Invent or adjust signal scores
- Perform "clever" market analysis or predictive modeling
- Use reputation to override deterministic validation logic

### Reputation's Role with Validators

Reputation **MAY** influence:

**Which validators are selected**:
- If multiple validators are available, reputation can help choose the most reliable one
- Selection is transparent and governance-approved

**Validator rotation or replacement**:
- If a validator's reputation degrades (e.g., due to downtime, incorrect attestations, or governance violations), it may be rotated out
- Rotation decisions flow through governance, not automatic reputation-based overrides

**Validator incentives**:
- Higher-reputation validators may receive larger shares of validation fees
- This incentivizes reliability and adherence to protocol rules

Reputation **MUST NOT**:
- Change the validation logic itself
- Allow a low-reputation validator to bypass rules
- Override a validator's deterministic output based on reputation alone

---

## Summary of Invariants

**Agent Registries**:
- Canonical source for agent identity, roles, capabilities, and permissions
- Configuration files document intended behavior; governance enforces it
- Updates to production registries must flow through governance rails (UPS/APS)

**Reputation (PoI, PoInsight, Repₜ)**:
- Agent-level reputation derived from PoI (Proof of Intelligence), PoInsight (Proof of Insight), and time-based decay
- Influences eligibility, selection, allocation, and governance participation
- Does NOT modify signal scoring (UWR), override vault/Codex finality, or change validator logic post-hoc
- All reputation-based decisions must be transparent, auditable, and governance-approved

**Validators (Deterministic Market Validators, DMVs)**:
- Remain dumb, deterministic, and rule-bound
- Reputation may influence validator selection, rotation, and incentives
- Reputation MUST NOT override validator logic or deterministic outputs

---

**Version**: 0.1  
**Last Updated**: 2025-11-27  
**Source**: Derived from AFI Protocol white paper (arXiv version)  
**Maintainer**: AFI Core Team

