# AFI Agent Taxonomy v0.1

**Purpose**: This document defines how AFI Protocol categorizes agents, their lifecycle roles, and their embodiments.

**Audience**: Technical contributors, agent developers, and protocol integrators.

---

## Overview

AFI Protocol uses **agents** as the primary abstraction for all intelligent actors in the system—whether they're development-time workers, runtime services, human-facing companions, or on-chain contracts.

Every agent has:
- **A lifecycle stage** (what phase of signal processing it participates in)
- **An embodiment kind** (how it runs and where it lives)
- **A clear purpose** (what it does and what it doesn't do)

This taxonomy ensures clean separation of concerns and prevents role confusion.

---

## Agent Embodiments (Kind)

Agents come in four primary embodiments:

**Important Note on Droid Classification**: When an agent has `kind = "droid"` in this taxonomy, this field describes only the **metadata and classification** of that actor within the AFI ecosystem (its lifecycle stage, inputs/outputs, runtime environment, etc.). The **normative behavior** of droids—what they are allowed to do, how they operate in repositories and CI, safety constraints, and operational rules—is governed exclusively by:

- `afi-config/codex/governance/droids/AFI_DROID_CHARTER.v0.1.md`
- `afi-config/codex/governance/droids/AFI_DROID_PLAYBOOK.v0.1.md`

This taxonomy does not override, redefine, or replace any droid behavioral rules. It simply provides a consistent way to describe what droids are and where they fit in the AFI agent ecosystem.

### Droid

**What it is**: A Factory-style, repo-bound worker with a charter and safety rails.

**Where it lives**: Development environment, operating on Git repositories.

**Examples**:
- `droid:schema-sync:v1` — Syncs JSON schemas across repos
- `droid:dag-builder:v1` — Scaffolds DAG nodes in afi-reactor

**Key traits**:
- Reads AFI Droid Charter and repo-level AGENTS.md
- Edits code, config, and docs within a defined repo scope
- Prepares changes for human review (commits/PRs)
- Does NOT interact with users or hold live credentials

### Service

**What it is**: A long-running backend daemon or API service.

**Where it lives**: Production infrastructure, cloud environments, or local servers.

**Examples**:
- `service:vault-indexer:v1` — Indexes T.S.S.D. Vault signals
- `service:regime-detector:v1` — Detects market regime shifts

**Key traits**:
- Runs continuously in the background
- Exposes APIs or message queues
- May hold credentials for external services (with proper security)
- Does NOT directly interact with end users

### Companion

**What it is**: A human-facing persona (chat, voice, or UI-based).

**Where it lives**: ElizaOS runtimes (Discord, Telegram, web, etc.) or afi-eliza-gateway.

**Examples**:
- `companion:phoenix:v1` — AFI's primary user-facing agent
- `companion:spartan:v1` — Trading-focused companion

**Key traits**:
- Interacts with humans via natural language
- Calls AFI services as an external client
- Follows AFI Agent Playbook for runtime behavior
- Does NOT modify AFI core code or governance

### Contract

**What it is**: On-chain logic that enforces protocol rules.

**Where it lives**: Blockchain (Solana, Ethereum, etc.).

**Examples**:
- `contract:afi-token:v1` — AFI token minting and emissions
- `contract:mint-gate:v1` — On-chain validation and minting logic

**Key traits**:
- Immutable after deployment (or governed by DAO)
- Enforces economic and governance rules
- Interacts with other contracts and off-chain oracles
- Does NOT have AI/ML capabilities (deterministic only)

---

## Lifecycle Stages (Pipeline)

AFI's signal processing pipeline has six distinct stages. Each agent operates in exactly one stage.

### Scout

**Role**: Originate signals from external sources or AFI-native models.

**What it does**:
- Brings original signals into AFI from outside (e.g., TradingView webhooks, partner research)
- OR generates new signals using AFI-trained models based on vault/regime data
- Outputs `afi_original_signal` (or clearly equivalent format)

**What it does NOT do**:
- Enrich signals with features or context
- Score or analyze signals
- Validate or mint signals

**Origin kinds**:
- `external` — Signals from external sources (webhooks, APIs, human traders)
- `afi_native_model` — Signals from AFI-trained models
- `human_discretionary` — Signals from human contributors

**Example agents**:
- `scout:tv-webhook-btc-perps:v1` — TradingView webhook listener for BTC perpetuals
- `scout:afi-regime-signal-gen:v1` — AFI-native model that generates signals based on regime shifts
- `scout:partner-research-feed:v1` — Ingests research signals from partner firms

### Enrich

**Role**: Add features, context, and metadata to signals WITHOUT scoring or interpreting them.

**What it does**:
- Adds technical indicators (RSI, MACD, Bollinger Bands)
- Adds market context (volume regime, liquidity depth)
- Adds metadata (timestamps, source attribution, data quality flags)

**What it does NOT do**:
- Compute scores or confidence levels
- Make trading recommendations
- Validate or mint signals

**Example agents**:
- `enricher:vol-regime:v1` — Adds volatility regime classification
- `enricher:liquidity-depth:v1` — Adds order book depth metrics
- `enricher:multi-timeframe:v1` — Adds multi-timeframe technical indicators

### Analyze

**Role**: Compute scores, narratives, and proposed actions using AI/ML models.

**What it does**:
- Scores signals for quality, confidence, and risk
- Generates narratives and interpretations
- Proposes trading actions or portfolio adjustments
- Runs ensemble models and probabilistic forecasts

**What it does NOT do**:
- Validate or mint signals (that's the validator's job)
- Execute trades (that's downstream of validation)

**Example agents**:
- `analyst:signal-scorer:v1` — Scores signals using ensemble ML models
- `analyst:narrative-gen:v1` — Generates human-readable narratives for signals
- `analyst:risk-assessor:v1` — Computes risk metrics and position sizing

### Validate

**Role**: Dumb mint gate using replay + challenge windows (post-hoc yes/no only).

**What it does**:
- Consumes already-scored signals from analysts
- Uses replay outputs and challenge windows to decide `mint` vs `no_mint`
- Enforces deterministic, rule-based validation (no AI/ML)
- Emits mint events or rejection events

**What it does NOT do**:
- Invent or adjust scores (scores come from analysts)
- Do any "smart" market analysis
- Execute trades or interact with exchanges

**Key principle**: Validators are intentionally dumb and post-hoc. They enforce rules, not intelligence.

**Example agents**:
- `validator:mint-gate:v1` — Deterministic mint gate using replay + challenge windows
- `validator:replay-checker:v1` — Verifies signal replay consistency before minting

### Audit

**Role**: Check determinism, drift, and replay consistency across the pipeline.

**What it does**:
- Verifies that signals can be replayed deterministically
- Detects drift in model outputs or data sources
- Monitors pipeline health and data quality
- Flags anomalies for human review

**What it does NOT do**:
- Mint or validate signals
- Score or analyze signals
- Execute trades

**Example agents**:
- `auditor:codex-replay:v1` — Replays signals through Codex and checks for drift
- `auditor:drift-detector:v1` — Detects model drift and data quality issues
- `auditor:pipeline-health:v1` — Monitors pipeline health and latency

### Mentor

**Role**: Evaluate agents (not signals) and train/improve them using Proof-of-Insight principles.

**What it does**:
- Evaluates agent performance and quality
- Trains and improves agents using feedback loops
- Implements Proof-of-Insight (PoI) evaluation for agents
- Provides coaching and recommendations for agent improvements

**What it does NOT do**:
- Mint signals or tokens
- Validate signals (that's the validator's job)
- Execute trades

**Key principle**: Mentors evaluate agents, not signals. They improve the intelligence of the system, not the outputs.

**Example agents**:
- `mentor:analyst-coach:v1` — Evaluates and improves analyst agents
- `mentor:poi-evaluator:v1` — Implements Proof-of-Insight evaluation for agents
- `mentor:model-trainer:v1` — Trains and fine-tunes ML models used by analysts

---

## Swarms (Overlay Concept)

**What it is**: A swarm is NOT a lifecycle stage. It's an optional overlay/ensemble label that groups multiple agents working together.

**Where it's used**: Primarily in the **enrich** and **analyze** stages, where multiple agents collaborate to produce richer outputs.

**How it works**: Agents can declare membership in a swarm using an optional `swarm` field in their definition.

**Examples**:
- `core_enrichment_swarm_v1` — A swarm of enrichers that add technical indicators, volume regimes, and liquidity depth
- `ensemble_analyst_swarm_v1` — A swarm of analysts that score signals using different ML models and aggregate results
- `audit_swarm_v1` — A swarm of auditors that check different aspects of pipeline health

**Key principle**: Swarms are a coordination mechanism, not a new type of agent or lifecycle stage.

---

## Agent Naming Convention

AFI uses a consistent naming convention for all agents:

**Format**: `{lifecycle_stage}:{name}:{version}`

**Examples**:
- `scout:tv-webhook-btc-perps:v1`
- `enricher:vol-regime:v1`
- `analyst:signal-scorer:v1`
- `validator:mint-gate:v1`
- `auditor:codex-replay:v1`
- `mentor:analyst-coach:v1`

**For droids**: `droid:{name}:{version}`
- `droid:schema-sync:v1`
- `droid:dag-builder:v1`

**For services**: `service:{name}:{version}`
- `service:vault-indexer:v1`
- `service:regime-detector:v1`

**For companions**: `companion:{name}:{version}`
- `companion:phoenix:v1`
- `companion:spartan:v1`

**For contracts**: `contract:{name}:{version}`
- `contract:afi-token:v1`
- `contract:mint-gate:v1`

---

## Key Principles

### Separation of Concerns

Each agent has exactly one lifecycle stage and one embodiment kind. This prevents role confusion and ensures clean boundaries.

### Scouts Originate, Enrichers Add Context, Analysts Score

- **Scouts** bring signals into AFI (external or AFI-native)
- **Enrichers** add features and context WITHOUT scoring
- **Analysts** compute scores and interpretations

This separation ensures that scoring is always explicit and traceable.

### Validators Are Dumb and Post-Hoc

Validators consume already-scored signals and apply deterministic rules. They do NOT invent scores or do "smart" analysis.

This ensures that minting is transparent, auditable, and replay-consistent.

### Mentors Evaluate Agents, Not Signals

Mentors improve the intelligence of the system by evaluating and training agents. They do NOT mint signals or tokens.

This separates agent improvement from signal validation.

### Swarms Are Overlays, Not Stages

Swarms group agents for coordination and ensemble behavior. They do NOT replace lifecycle stages.

---

## Cross-References

- **AFI Droid Charter**: `afi-config/codex/governance/droids/AFI_DROID_CHARTER.v0.1.md`
- **AFI Droid Glossary**: `afi-config/codex/governance/droids/AFI_DROID_GLOSSARY.md`
- **AFI Agent Playbook**: `afi-eliza-gateway/docs/AFI_AGENT_PLAYBOOK.v0.1.md`
- **Agent Definition Schema**: `afi-config/docs/agent_definition.schema.v0.1.json`
- **Agent Registry**: `afi-config/docs/agents.registry.v0.1.json`

---

**Version**: 0.1
**Last Updated**: 2025-11-26
**Maintainer**: AFI Core Team
**Status**: Canonical taxonomy for AFI Protocol agents

