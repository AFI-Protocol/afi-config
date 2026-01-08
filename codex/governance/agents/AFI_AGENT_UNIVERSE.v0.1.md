# AFI Agent Universe v0.1

**Status**: v0.1 — Initial design map (subject to future revision)  
**Location**: `afi-config/codex/governance/agents/AFI_AGENT_UNIVERSE.v0.1.md`  
**Last Updated**: 2025-11-28

This document maps the conceptual universe of AFI Protocol runtime agents—the intelligent actors that process signals, interact with humans, validate data, and govern the protocol. It serves as an orientation guide and design reference, not an executable specification.

**Companion documents**:
- **AFI_DROID_INDEX.v0.1.md** — Catalog of house droids (repo maintenance workers)
- **AFI_DROID_CHARTER.v0.1.md** — Global rules for droids
- **AFI_DROID_GLOSSARY.md** — Terminology (droids vs agents vs gateways)
- **afi-gateway/docs/AFI_AGENT_PLAYBOOK.v0.1.md** — Runtime behavior for ElizaOS agents

---

## 1. Purpose and Scope

### What This Document Is

This document exists to:

- Provide a **conceptual map** of AFI Protocol's runtime agent ecosystem
- Clarify **how agents differ from droids** (agents operate on live data; droids maintain repos)
- Describe **agent dimensions** (interface, role, home, lifecycle stage)
- Outline **agent classes by domain** (frontline, pipeline, governance, validator, ops)
- Establish a **shared vocabulary** for discussing agent architecture and design

This is a **design-level orientation document**, not a binding specification. It describes aspirational agent classes and roles that may or may not be implemented. Actual agent implementations must respect repo-level AGENTS.md files, governance constraints, and security boundaries.

### What "Agents" Mean in AFI

In AFI Protocol, **agents** are runtime actors that:

- Operate on **live data** (signals, proposals, logs, user queries)
- Execute **skills** from the canonical skill library (afi-skills)
- Consume **schemas and types** defined in afi-core and afi-config
- Interact with **humans** (via chat, voice, UI) or **systems** (via APIs, DAG nodes, batch jobs)
- Produce **outputs** (summaries, scores, alerts, recommendations, governance votes)

Agents are **not** repo maintenance workers. They do not edit code, schemas, or configs. That is the role of droids.

### How Agents Differ from Droids

**Droids** (Factory.ai coding workers):
- Operate on **Git repositories** (code, configs, tests, docs)
- Maintain **schemas, DAGs, skills, contracts, and CI/CD**
- Follow **AFI Droid Charter v0.1** and repo-specific AGENTS.md files
- Produce **commits and pull requests** for human review
- Examples: dag-builder-droid, schema-validator-droid, skillsmith-droid, ci-guardian-droid, contract-test-droid, config-keeper-droid

**Agents** (runtime actors):
- Operate on **live data** (signals, proposals, logs, user queries)
- Execute **skills** and call **AFI services** (afi-reactor, afi-core)
- Follow **AFI Agent Playbook v0.1** (for ElizaOS agents) and domain-specific guidelines
- Produce **runtime outputs** (summaries, scores, alerts, recommendations)
- Examples: Phoenix (AFI Ambassador), Market Scout agents, Governance Risk Sentinel, CI Explainer Agent

**Key distinction**: Droids create safe playgrounds (guardrails); agents play inside that sandbox.

### Scope of This Document

This document covers:

- Conceptual agent classes and roles across AFI Protocol
- Agent dimensions (interface, role, home, lifecycle stage)
- Relationship between droids and agents
- Prioritized agent roster (first waves)
- Safety and non-binding nature of this design map

This document does NOT cover:

- Executable agent specifications (those live in character configs, plugin code, and skill definitions)
- Droid behavior (see AFI_DROID_INDEX.v0.1.md and AFI_DROID_CHARTER.v0.1.md)
- Smart contract behavior or on-chain logic (see afi-token documentation)
- Infrastructure deployment (see afi-ops documentation)

---

## 2. Agent Dimensions

AFI agents can be categorized along four primary dimensions:

### Interface

**Human-facing**:
- Agents that interact directly with humans via chat, voice, or UI
- Examples: Phoenix (Discord/Telegram/web chat), Mentor agents (conversational advisors), Governance Explainer (proposal summaries for voters)
- Characteristics: Natural language I/O, conversational context, user-specific state

**System-facing**:
- Agents that operate as DAG nodes, batch jobs, or background services
- Examples: Market Scout agents (data ingest), Pattern Analyst (signal enrichment), SignalScorer (scoring stage)
- Characteristics: Structured I/O (JSON, typed signals), stateless or batch-oriented, API-driven

**Hybrid**:
- Agents that serve both humans and systems
- Examples: CI Explainer Agent (wraps CI outputs for maintainers, also callable via API), Validator Registry Curator (maintains registries, answers queries about validators)
- Characteristics: Dual interfaces (conversational + API), context-aware routing

### Role

AFI agents typically fulfill one or more of these roles:

- **Scout**: Discovers and ingests raw data (market data, on-chain events, news, social signals)
- **Analyst**: Enriches or analyzes signals (adds context, detects patterns, computes derived metrics)
- **Validator**: Validates signal integrity, data quality, or governance proposals
- **Mentor**: Guides humans through AFI concepts, strategies, or governance decisions
- **Governor**: Participates in or facilitates governance (proposal summarization, impact simulation, voting)
- **Operator**: Manages operational concerns (CI/CD, health checks, incident triage, deployment)
- **Execution Advisor**: Provides trade execution guidance or strategy recommendations (future, high-risk)

### Home / Anchor

Each agent class typically has a primary "home" repo or system:

- **afi-reactor**: Pipeline agents (DAG nodes for signal processing)
- **afi-core**: Validator agents, scoring agents, registry curators
- **afi-gateway**: Frontline persona agents (Phoenix, Mentor agents)
- **afi-ops**: Ops agents (CI Explainer, Incident Triage, Deployment Dry-Run Advisor)
- **afi-governance**: Governance agents (Proposal Summarizer, Parameter Impact Simulator, Governance Risk Sentinel)
- **afi-skills**: Skill-focused agents (skill discovery, skill recommendation, skill eval runners)

### Signal Lifecycle Stage

Agents often align with specific stages of the AFI signal lifecycle:

- **Raw**: Scout agents that ingest unprocessed data
- **Enriched**: Analyst agents that add context (funding rates, volatility, news sentiment, liquidity)
- **Analyzed**: Pattern recognition agents, regime detection, cross-asset analysis
- **Scored**: Scoring agents that produce final risk tiers, strategy fit scores, or PoI/PoInsight ratings

Some agents (e.g., Phoenix, Governance agents) operate across all stages or outside the signal pipeline entirely.

---

## 3. Agent Classes by Domain

This section describes conceptual agent classes grouped by domain. These are design-level descriptions, not guarantees of implementation.

### 3.1 Frontline & Persona Agents (Eliza / Gateway)

**What they do**:

Frontline agents are human-facing personas that serve as the public face of AFI Protocol. They interact with users via chat, voice, or web interfaces, routing queries to AFI backend services and presenting results in natural language.

**Canonical example: Phoenix (AFI Ambassador)**:

- **Interface**: Human-facing (Discord, Telegram, web chat, voice)
- **Role**: Mentor + Router into AFI backend
- **Home**: afi-gateway
- **Stage focus**: Analyzed/Scored signals (presents final intelligence to users)
- **What it does**: Answers questions about AFI, explains signals and scores, guides users through governance, routes complex queries to specialized mentor agents
- **Inputs**: User queries (natural language), AFI API responses (signals, scores, proposals)
- **Outputs**: Natural language responses, signal summaries, governance explanations, strategy recommendations

**Mentor agent family** (aspirational):

- **Macro Mentor**: Specializes in macroeconomic regime analysis, central bank policy, global liquidity
- **Derivatives Mentor**: Specializes in options, futures, funding rates, volatility surfaces
- **Risk Mentor**: Specializes in portfolio risk, drawdown analysis, correlation breakdowns
- **Interface**: Human-facing (conversational)
- **Role**: Mentor (domain-specific expertise)
- **Home**: afi-gateway
- **Stage focus**: Analyzed/Scored signals (interprets complex signals for users)
- **What they do**: Provide deep, domain-specific explanations of signals, patterns, and strategies
- **Inputs**: User queries, domain-specific signals (macro regime, derivatives data, risk metrics)
- **Outputs**: Natural language explanations, educational content, strategy guidance

**Governance Explainer** (aspirational):

- **Interface**: Human-facing (conversational) + System-facing (API for governance UI)
- **Role**: Mentor + Governor
- **Home**: afi-gateway or afi-governance
- **What it does**: Summarizes governance proposals, explains parameter changes, simulates impact of governance decisions
- **Inputs**: Governance proposals, parameter change specs, historical governance data
- **Outputs**: Plain-language summaries, impact assessments, voting guidance

---

### 3.2 Market Pipeline Agents (Reactor DAG)

**What they do**:

Pipeline agents are system-facing actors that operate as nodes in the afi-reactor DAG. They process signals through the four lifecycle stages (Raw → Enriched → Analyzed → Scored), transforming raw market data into actionable intelligence.

**Raw-stage "Scout" agents**:

- **On-chain Flow Scout**: Monitors on-chain flows (whale movements, exchange inflows/outflows, stablecoin minting)
- **News Sentiment Scout**: Ingests news feeds and social media, extracts sentiment signals
- **Anomaly Scout**: Detects statistical anomalies in price, volume, or volatility
- **Interface**: System-facing (batch jobs, streaming data ingest)
- **Role**: Scout (data discovery and ingestion)
- **Home**: afi-reactor (DAG nodes)
- **Stage focus**: Raw (unprocessed data)
- **Inputs**: External APIs (on-chain data, news feeds, market data)
- **Outputs**: Raw signals (unvalidated, unscored)

**Enrichment-stage agents**:

- **Funding Rate Enricher**: Adds perpetual funding rate context to signals
- **Volatility Enricher**: Adds realized/implied volatility metrics
- **Liquidity Enricher**: Adds order book depth, bid-ask spreads, slippage estimates
- **Cross-Asset Context Builder**: Adds correlations, regime indicators, macro context
- **Interface**: System-facing (DAG nodes)
- **Role**: Analyst (context addition)
- **Home**: afi-reactor (DAG nodes)
- **Stage focus**: Enriched (contextualized data)
- **Inputs**: Raw signals
- **Outputs**: Enriched signals (with added context fields)

**Analyzed-stage agents**:

- **Pattern Recognition Agent**: Detects technical patterns (breakouts, reversals, divergences)
- **Regime Detection Agent**: Classifies market regime (risk-on, risk-off, transition, crisis)
- **Cross-Asset Analyst**: Analyzes correlations, factor exposures, contagion risks
- **Macro Regime Analyst**: Analyzes central bank policy, liquidity cycles, inflation/deflation signals
- **Interface**: System-facing (DAG nodes)
- **Role**: Analyst (pattern detection, regime classification)
- **Home**: afi-reactor (DAG nodes)
- **Stage focus**: Analyzed (interpreted data)
- **Inputs**: Enriched signals
- **Outputs**: Analyzed signals (with pattern labels, regime classifications, risk flags)

**Scored-stage agents**:

- **SignalScorer**: Produces final signal scores (0-100 scale, risk tiers)
- **Risk Tier Labeler**: Assigns risk tiers (low, medium, high, extreme)
- **Strategy Fit Scorer**: Scores signals for fit with specific strategies (momentum, mean-reversion, carry, etc.)
- **PoI/PoInsight Scorer**: Computes Proof of Intelligence and Proof of Insight scores for validators (validator-level traits, NOT signal fields)
- **Interface**: System-facing (DAG nodes)
- **Role**: Validator + Analyst (final scoring and validation)
- **Home**: afi-reactor (DAG nodes) or afi-core (validator logic)
- **Stage focus**: Scored (final intelligence output)
- **Inputs**: Analyzed signals
- **Outputs**: Scored signals (with final scores, risk tiers, strategy fit ratings)

---

### 3.3 Governance & Oversight Agents

**What they do**:

Governance agents facilitate protocol governance by summarizing proposals, simulating parameter changes, and monitoring governance risks. They serve both human governors (token holders, council members) and automated governance processes.

**Proposal Summarizer Agent** (aspirational):

- **Interface**: Human-facing (governance UI, Discord) + System-facing (API)
- **Role**: Governor (proposal analysis and summarization)
- **Home**: afi-governance
- **What it does**: Reads governance proposals, extracts key changes, summarizes impact in plain language
- **Inputs**: Governance proposals (markdown, JSON), historical governance data
- **Outputs**: Plain-language summaries, key change highlights, voting recommendations

**Parameter Impact Simulator** (aspirational):

- **Interface**: System-facing (API) + Human-facing (governance UI)
- **Role**: Governor (impact analysis)
- **Home**: afi-governance
- **What it does**: Simulates impact of parameter changes (emissions rates, supply caps, validator thresholds) on protocol behavior
- **Inputs**: Proposed parameter changes, historical protocol data
- **Outputs**: Impact assessments (projected emissions, validator incentives, token supply curves)

**Governance Risk Sentinel** (aspirational):

- **Interface**: System-facing (monitoring service) + Human-facing (alerts)
- **Role**: Governor + Validator (risk monitoring)
- **Home**: afi-governance
- **What it does**: Monitors governance proposals for risks (centralization, attack vectors, unintended consequences)
- **Inputs**: Governance proposals, on-chain governance state, historical attack patterns
- **Outputs**: Risk alerts, red flags, escalation to governance council

---

### 3.4 Validator & Reputation Agents

**What they do**:

Validator agents maintain the integrity of AFI's signal validation and reputation systems. They compute PoI/PoInsight scores, manage validator registries, and audit signal provenance via Codex replay.

**PoI/PoInsight Scoring Agents**:

- **Interface**: System-facing (DAG nodes, batch jobs)
- **Role**: Validator (reputation scoring)
- **Home**: afi-core (validator logic)
- **What they do**: Compute Proof of Intelligence (PoI) and Proof of Insight (PoInsight) scores for validators based on signal accuracy, timeliness, and uniqueness
- **Critical note**: PoI and PoInsight are **validator-level traits**, NOT signal-level fields. These agents score validators, not signals.
- **Inputs**: Historical signals, validator submissions, ground truth data (realized outcomes)
- **Outputs**: PoI/PoInsight scores for validators, reputation rankings

**Challenge & Replay Agent** (aspirational):

- **Interface**: System-facing (Codex replay service)
- **Role**: Validator (audit and replay)
- **Home**: afi-reactor (Codex replay logic)
- **What it does**: Replays historical signals from Codex vault, validates determinism, detects discrepancies
- **Inputs**: Codex vault entries, DAG configs, historical signal data
- **Outputs**: Replay reports, determinism validation, discrepancy alerts

**Registry Curator Agent** (aspirational):

- **Interface**: System-facing (registry maintenance) + Human-facing (registry queries)
- **Role**: Validator (registry management)
- **Home**: afi-core (validator/mentor registry)
- **What it does**: Maintains registries of validators, mentors, and agents; answers queries about registry state
- **Inputs**: Validator registrations, mentor profiles, agent metadata
- **Outputs**: Updated registries, registry query responses, curator reports

---

### 3.5 Ops & Infra Agents

**What they do**:

Ops agents support operational concerns like CI/CD, health monitoring, incident triage, and deployment dry-runs. They serve maintainers and operators, not end users.

**CI Explainer Agent** (aspirational):

- **Interface**: Human-facing (GitHub comments, Slack) + System-facing (CI/CD API)
- **Role**: Operator (CI/CD interpretation)
- **Home**: afi-ops
- **What it does**: Wraps CI outputs (test failures, lint errors, build logs) in plain-language explanations for maintainers
- **Inputs**: CI/CD logs, test results, build outputs
- **Outputs**: Plain-language summaries, root cause analysis, fix suggestions

**Incident Triage Agent** (aspirational):

- **Interface**: System-facing (monitoring alerts) + Human-facing (incident reports)
- **Role**: Operator (incident response)
- **Home**: afi-ops
- **What it does**: Triages production incidents, correlates alerts, suggests runbooks
- **Inputs**: Monitoring alerts, logs, metrics, historical incident data
- **Outputs**: Incident severity ratings, runbook recommendations, escalation decisions

**Deployment Dry-Run Advisor** (aspirational):

- **Interface**: System-facing (deployment pipeline) + Human-facing (deployment reports)
- **Role**: Operator (deployment safety)
- **Home**: afi-ops
- **What it does**: Simulates deployments, checks for breaking changes, validates rollback procedures
- **Inputs**: Deployment manifests, infrastructure state, historical deployment data
- **Outputs**: Dry-run reports, risk assessments, rollback validation

---

## 4. Relationship Between Droids and Agents

Droids and agents are complementary but distinct:

**Droids = Repo-level housekeepers**:

- Operate on **Git repositories** (code, configs, tests, docs)
- Maintain **DAGs, schemas, skills, configs, tests, CI/CD, contracts**
- Follow **AFI Droid Charter v0.1** and repo-specific AGENTS.md files
- Produce **commits and pull requests** for human review
- Examples: dag-builder-droid (afi-reactor), schema-validator-droid (afi-core), skillsmith-droid (afi-skills), ci-guardian-droid (afi-ops), contract-test-droid (afi-token), config-keeper-droid (afi-config)

**Agents = Runtime actors using those structures**:

- Operate on **live data** (signals, proposals, logs, user queries)
- Execute **skills** from afi-skills, consume **schemas** from afi-core/afi-config, use **Codex** for replay
- Follow **AFI Agent Playbook v0.1** (for ElizaOS agents) and domain-specific guidelines
- Produce **runtime outputs** (summaries, scores, alerts, recommendations)
- Examples: Phoenix (afi-gateway), Market Scout agents (afi-reactor DAG), Governance Risk Sentinel (afi-governance)

**Key relationships**:

- **Agents invoke skills, but do not edit them**: Skills are maintained by skillsmith-droid in afi-skills. Agents execute skills at runtime.
- **Agents consume schemas and Codex; droids maintain them**: Schemas are maintained by schema-validator-droid (afi-core) and config-keeper-droid (afi-config). Agents use schemas to validate signals and parse data.
- **Droids create safe playgrounds (guardrails); agents play inside that sandbox**: Droids enforce boundaries via AGENTS.md, Charter, and Playbook. Agents operate within those boundaries.

**Droid roster** (for reference, see AFI_DROID_INDEX.v0.1.md):

- **dag-builder-droid** (afi-reactor): Scaffolds DAG nodes, wires nodes into pipeline
- **schema-validator-droid** (afi-core): Extends signal schemas, creates validators
- **skillsmith-droid** (afi-skills): Adds skills, maintains skill quality, manages evals
- **ci-guardian-droid** (afi-ops): Runs smoke checks, validates builds and tests (read-only)
- **contract-test-droid** (afi-token): Adds test coverage for smart contracts (test-only, HIGH RISK)
- **config-keeper-droid** (afi-config): Validates codex structure, governance artifacts, schemas (MEDIUM RISK)

**This document does not override the Droid Charter or Droid Index**. Droids and agents have separate governance documents and operate in separate domains (Git repos vs runtime data).

---

## 5. v0.1 Agent Roster (First Waves)

This section provides a prioritized conceptual roster of agents likely to appear in the first waves of AFI Protocol deployment. These are **aspirational** and **non-binding**—actual implementation depends on protocol priorities, resources, and governance decisions.

### Wave 1 – Surface AFI's Brain

**Goal**: Make AFI's intelligence visible and accessible to users and maintainers.

**Phoenix (AFI Ambassador)**:

- **Role**: Front-door agent, mentor, router into AFI backend
- **Home**: afi-gateway
- **Primary inputs**: User queries (natural language), AFI API responses (signals, scores, proposals)
- **Primary outputs**: Natural language responses, signal summaries, governance explanations
- **Status**: Aspirational (character config and plugins in development)
- **Why Wave 1**: Phoenix is the public face of AFI. Without Phoenix, users cannot easily access AFI intelligence.

**Core Signal Explainer** (embedded in Phoenix or standalone):

- **Role**: Mentor (signal interpretation)
- **Home**: afi-gateway
- **Primary inputs**: Scored signals, signal metadata, user queries
- **Primary outputs**: Plain-language signal explanations, risk context, strategy fit guidance
- **Status**: Aspirational (may be integrated into Phoenix persona)
- **Why Wave 1**: Users need to understand what signals mean and how to use them.

**CI Explainer Agent**:

- **Role**: Operator (CI/CD interpretation for maintainers)
- **Home**: afi-ops
- **Primary inputs**: CI/CD logs, test results, build outputs
- **Primary outputs**: Plain-language summaries, root cause analysis, fix suggestions
- **Status**: Aspirational (wraps ci-guardian-droid outputs)
- **Why Wave 1**: Maintainers need fast feedback on CI failures without reading raw logs.

---

### Wave 2 – Market Brain Boosters

**Goal**: Enhance signal quality and coverage by deploying specialized pipeline agents.

**On-chain Flow Scout**:

- **Role**: Scout (on-chain data ingestion)
- **Home**: afi-reactor (DAG node, Raw stage)
- **Primary inputs**: On-chain APIs (whale movements, exchange flows, stablecoin minting)
- **Primary outputs**: Raw signals (on-chain flow events)
- **Status**: Aspirational (requires on-chain data provider integration)
- **Why Wave 2**: On-chain flows are high-signal, low-noise indicators of market intent.

**News Sentiment Scout**:

- **Role**: Scout (news and social media ingestion)
- **Home**: afi-reactor (DAG node, Raw stage)
- **Primary inputs**: News feeds, social media APIs, sentiment analysis tools
- **Primary outputs**: Raw signals (news sentiment events)
- **Status**: Aspirational (requires news API integration and sentiment model)
- **Why Wave 2**: News sentiment drives short-term volatility and can front-run price moves.

**Pattern Analyst**:

- **Role**: Analyst (technical pattern detection)
- **Home**: afi-reactor (DAG node, Analyzed stage)
- **Primary inputs**: Enriched signals (price, volume, volatility)
- **Primary outputs**: Analyzed signals (pattern labels: breakout, reversal, divergence)
- **Status**: Aspirational (requires pattern recognition models)
- **Why Wave 2**: Technical patterns are widely used by traders and can improve signal actionability.

**Regime Detection Agent**:

- **Role**: Analyst (market regime classification)
- **Home**: afi-reactor (DAG node, Analyzed stage)
- **Primary inputs**: Enriched signals (macro indicators, volatility, correlations)
- **Primary outputs**: Analyzed signals (regime labels: risk-on, risk-off, transition, crisis)
- **Status**: Aspirational (requires regime classification model)
- **Why Wave 2**: Regime awareness is critical for strategy selection and risk management.

---

### Wave 3 – Governance & Safety

**Goal**: Enable decentralized governance and protocol safety monitoring.

**Proposal Summarizer Agent**:

- **Role**: Governor (proposal analysis and summarization)
- **Home**: afi-governance
- **Primary inputs**: Governance proposals (markdown, JSON), historical governance data
- **Primary outputs**: Plain-language summaries, key change highlights, voting recommendations
- **Status**: Aspirational (requires governance proposal schema and summarization logic)
- **Why Wave 3**: Governance participation requires understanding complex proposals. Summaries lower the barrier to informed voting.

**Governance Risk Sentinel**:

- **Role**: Governor + Validator (governance risk monitoring)
- **Home**: afi-governance
- **Primary inputs**: Governance proposals, on-chain governance state, historical attack patterns
- **Primary outputs**: Risk alerts, red flags, escalation to governance council
- **Status**: Aspirational (requires governance risk model and alerting infrastructure)
- **Why Wave 3**: Governance attacks (e.g., parameter manipulation, centralization) can break the protocol. Early detection is critical.

**Parameter Impact Simulator**:

- **Role**: Governor (impact analysis)
- **Home**: afi-governance
- **Primary inputs**: Proposed parameter changes, historical protocol data
- **Primary outputs**: Impact assessments (projected emissions, validator incentives, token supply curves)
- **Status**: Aspirational (requires protocol simulation model)
- **Why Wave 3**: Parameter changes have system-wide effects. Simulations help governors understand consequences before voting.

---

## 6. Safety, Scope, and Non-Binding Nature

### This Document Is Non-Binding

This document is a **design map and orientation guide**, not a binding specification. It describes aspirational agent classes and roles that may or may not be implemented.

**What this means**:

- **No guarantees**: The agents described here are conceptual. Actual implementation depends on protocol priorities, resources, and governance decisions.
- **No enforcement**: This document does not create obligations for droids, contracts, or runtime systems.
- **Subject to change**: Future versions of this document may add, remove, or revise agent classes based on protocol evolution.

### Actual Agent Implementations Must Respect Governance

When agents are implemented, they must:

- **Respect repo-level AGENTS.md files**: Each repo defines allowed actions, forbidden actions, and security constraints.
- **Respect risk levels and boundaries**: Agents that call high-risk APIs (e.g., token contracts, governance voting) must follow strict safety protocols.
- **Follow AFI Agent Playbook v0.1**: ElizaOS agents must follow runtime behavior guidelines in `afi-gateway/docs/AFI_AGENT_PLAYBOOK.v0.1.md`.
- **Undergo security review**: Agents that execute skills, call external APIs, or handle user data must pass security review.

### Risk Levels for Agent Classes

Agent classes can be informally categorized by risk level (similar to droids):

**LOW Risk**:
- Read-only agents (CI Explainer, Signal Explainer, Proposal Summarizer)
- Agents that do not modify state or call external APIs
- Agents that operate on public data only

**MEDIUM Risk**:
- Agents that call AFI APIs (Phoenix, Market Scout agents, Pattern Analyst)
- Agents that execute skills from afi-skills
- Agents that interact with users but do not handle funds or governance votes

**HIGH Risk**:
- Agents that participate in governance (Governance Risk Sentinel, Parameter Impact Simulator)
- Agents that provide trade execution advice (Execution Advisor, future)
- Agents that handle user funds or private keys (future, requires strict security audit)

**Critical rule**: HIGH risk agents must undergo security audit and human approval before deployment.

### Future Concrete Specs Will Take Precedence

This document is a high-level design map. Future concrete specifications (e.g., Phoenix persona sheet, validator agent specs, governance agent contracts) will take precedence for implementation details.

**Examples of future concrete specs**:

- **Phoenix Character Config v1.0**: Detailed persona, prompts, tools, and safety constraints for Phoenix
- **Market Scout Agent Spec v1.0**: Detailed I/O schemas, data sources, and error handling for on-chain flow scout
- **Governance Agent Safety Protocol v1.0**: Security requirements for agents that participate in governance

When these concrete specs exist, they supersede the aspirational descriptions in this document.

---

## 7. Future Work: Toward an Agent Index

### From Universe to Index

This document (AFI_AGENT_UNIVERSE.v0.1.md) is an **orientation map**—a conceptual guide to the agent ecosystem. It describes aspirational agent classes and roles, not actual implemented agents.

Once AFI Protocol has a stable set of **actual implemented agents**, a sibling document to AFI_DROID_INDEX.v0.1.md may be introduced:

**AFI_AGENT_INDEX.v1.0** (future):

- Lists **real, implemented agents** with names, homes, risk profiles, tool access, and usage guidance
- Provides **when to use which agent** guidance (similar to AFI_DROID_INDEX.v0.1.md Section 5)
- Documents **agent boundaries** (what each agent can and cannot do)
- Includes **escalation paths** (when to escalate to humans or specialized agents)

**Structure of future Agent Index** (aspirational):

1. Purpose and Scope
2. How to Read This Index
3. Agents by Domain
   - Frontline & Persona Agents
   - Market Pipeline Agents
   - Governance & Oversight Agents
   - Validator & Reputation Agents
   - Ops & Infra Agents
4. Risk Levels and Safety Notes
5. When to Use Which Agent
6. Escalation Paths and Human Handoff

### Transition from Universe to Index

The transition from AFI_AGENT_UNIVERSE (design map) to AFI_AGENT_INDEX (live registry) will happen when:

- **Phoenix is deployed**: The first frontline agent is live and serving users
- **Pipeline agents are operational**: At least 3-5 DAG node agents are processing signals in production
- **Governance agents are tested**: At least one governance agent (e.g., Proposal Summarizer) is operational
- **Agent boundaries are stable**: Each agent has clear AGENTS.md-style constraints and escalation paths

Until then, AFI_AGENT_UNIVERSE.v0.1.md serves as the primary design reference for the agent ecosystem.

---

**End of AFI Agent Universe v0.1**

For questions or updates to this document, contact AFI Protocol maintainers or open an issue in the afi-config repository.

**Governance**: This document is governed by the AFI Droid Charter v0.1 (for droid behavior) and AFI Agent Playbook v0.1 (for ElizaOS agent behavior).
**Maintainers**: AFI Protocol Team
**Repository**: https://github.com/AFI-Protocol/afi-config
