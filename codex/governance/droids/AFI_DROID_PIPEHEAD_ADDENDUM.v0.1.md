# AFI_DROID_PIPEHEAD_ADDENDUM.v0.1.md

**Status:** Proposed  
**Canonical Location:** `afi-config/codex/governance/droids/AFI_DROID_PIPEHEAD_ADDENDUM.v0.1.md`  
**Authority:** Subordinate to `AFI_DROID_CHARTER.v0.1.md`  
**Scope:** Non-production Droid-operated AFI pipeline proof-of-concept  
**Last Updated:** 2026-06-29

---

## 1. Purpose

This addendum extends the AFI Droid Charter to explicitly authorize a new Droid role:

**Droids as operators of AFI pipeline lanes / provider surfaces.**

A Droid-operated pipehead is a Droid-managed operational layer assigned to an AFI pipeline node. The Droid may build, maintain, operate, test, monitor, repair, and report on that node’s execution surface, while the trust-critical AFI logic invoked by that node remains deterministic, auditable, and governed by explicit protocol rules.

This addendum exists because the existing Droid Charter primarily governs dev-time Droid behavior. The pipehead architecture introduces a bounded runtime / harness-operation role that should be explicitly authorized rather than inferred.

---

## 2. Core Principle

Droids may operate AFI pipeline nodes.

Droids may invoke deterministic AFI modules.

Droids may maintain the machinery around those modules.

Droids may not replace deterministic AFI logic with LLM judgment.

In short:

> A Droid may operate the pipehead, but AFI’s deterministic kernel remains the source of truth.

---

## 3. Definitions

### Pipehead

A pipehead is an AFI pipeline lane / node interface responsible for moving state through a defined stage of the AFI pipeline.

### Droid-Operated Pipehead

A Droid-operated pipehead is a pipehead whose operational layer is managed by a Droid. This may include API handling, adapter maintenance, schema validation, routing, retries, monitoring, tests, reporting, and repair workflows.

### Analysis Lane

An analysis lane is a first-class AFI evaluation category that processes a submitted signal before final scoring. AFI’s initial analysis lanes are:

1. Technical Indicators
2. Pattern Recognition
3. News
4. Social
5. AI / ML

An analysis lane may be operated by a Droid pipehead, but its outputs must be structured, inspectable, and suitable for deterministic scoring or explicitly labeled as provisional / non-canonical.

### Analysis Bundle

An analysis bundle is the normalized output package produced by AFI’s analysis lanes and consumed by the scoring pipehead. It may include technical indicators, pattern results, news evidence, social evidence, AI / ML outputs, metadata, provenance references, timestamps, confidence values, and validation status.

### Deterministic Kernel

The deterministic kernel is any AFI logic that produces trust-critical protocol outputs, including but not limited to:

- signal scoring
- validation decisions
- reputation updates
- reward math
- epoch aggregation
- settlement logic
- receipt / audit truth

A Droid may invoke deterministic kernel logic, but may not silently alter, replace, or reinterpret it.

---

## 4. Allowed Droid Pipehead Actions

A Droid-operated pipehead may:

- operate a pipeline lane / provider surface (declared in the governed registries) in an authorized non-production harness
- manage APIs and adapters
- validate schemas
- normalize and route inputs
- fetch or attach approved data fixtures
- manage retries and failure handling
- run deterministic scoring or reputation modules
- execute tests and replay checks
- generate fixtures
- generate audit records and reports
- monitor pipeline health
- detect anomalies
- explain failures
- propose patches
- update docs related to the pipehead
- repair non-trust-critical orchestration bugs through PR-gated changes

A Droid may operate a scoring pipehead, reputation pipehead, or receipt pipehead **only when the node invokes explicit deterministic AFI logic**.

---

## 5. Forbidden Droid Pipehead Actions

A Droid-operated pipehead may not:

- substitute LLM judgment for deterministic scoring
- decide whether a financial signal is “good” based on subjective reasoning
- fabricate market data
- fabricate provenance
- silently change UWR weights
- silently change reputation math
- silently change reward or emissions math
- alter settlement logic
- move funds
- touch production private keys
- deploy to production without explicit authorization
- introduce live external dependencies without approval
- rename or redefine core AFI concepts without approval
- choose canonical scoring, pipeline, or settlement paths without human instruction
- claim production-truth results from placeholder, mock, or unapproved configurations
- hide missing analysis lanes behind vague AI-generated explanations

---

## 6. AFI Analysis Pipeline Requirement

The initial Droid pipehead architecture must preserve AFI’s original multi-category analysis design.

Before final scoring, AFI may evaluate a submitted signal across five first-class analysis categories:

1. Technical Indicators
2. Pattern Recognition
3. News
4. Social
5. AI / ML

These analysis categories may run in parallel, sequentially, conditionally, or in any strategy-defined combination.

The Droid pipehead architecture must not collapse AFI’s analysis process into a single linear scoring step unless explicitly scoped as a temporary demo simplification.

Each analysis category may be represented as its own Droid-operated pipehead lane.

A Droid-operated analysis pipehead may manage data collection, adapters, schema validation, normalization, retries, monitoring, test generation, report generation, and evidence packaging for its assigned analysis category.

The outputs of these lanes should be normalized into an analysis bundle consumed by the scoring pipehead.

---

## 7. Analysis Fan-Out / Fan-In Model

The intended evaluation pipeline may follow this general shape:

```text
Signal ingestion
→ schema validation
→ analysis fan-out across:
   - Technical Indicators
   - Pattern Recognition
   - News
   - Social
   - AI / ML
→ analysis result normalization
→ deterministic scoring invocation
→ reputation update or receipt-like output
→ audit / report emission
```

Droids may operate pipeheads at each stage of this pipeline.

This includes:

- ingestion pipehead
- schema validation pipehead
- technical indicators pipehead
- pattern recognition pipehead
- news pipehead
- social pipehead
- AI / ML pipehead
- scoring pipehead
- reputation pipehead
- audit / receipt pipehead

The scoring pipehead may invoke deterministic AFI scoring logic over the analysis bundle, but the Droid must not replace that deterministic scoring logic with subjective LLM judgment.

---

## 8. Trust Boundary

The pipehead architecture separates **operation** from **authority**.

Droids may operate the pipeline machinery.

AFI’s deterministic modules produce protocol truth.

Humans and governance processes decide high-risk protocol changes.

Any ambiguity defaults to **not authorized**.

---

## 9. Initial Authorized POC Scope

This addendum authorizes the first non-production Factory/Droid mission:

**AFI Signal Evaluation Pipehead System**

The initial mission may build a Droid-operated AFI evaluation pipeline slice:

1. Signal input
2. Schema validation
3. Analysis fan-out across the five AFI analysis categories
4. Provenance / market-data fixture attachment
5. Analysis result normalization into an analysis bundle
6. Deterministic scoring invocation
7. Reputation or receipt-like output
8. Content-hashed audit record
9. Replay test proving deterministic output

The first Factory Mission does not need to fully implement all five analysis lanes in production-ready form.

However, the mission should preserve the five-lane architecture at the interface level.

Acceptable first-mission scope:

- define pipehead interfaces for all five analysis categories
- fully wire one or two analysis lanes if needed for the demo
- use deterministic fixtures or approved mock inputs for incomplete lanes
- normalize all lane outputs into a shared analysis bundle
- run deterministic scoring over that bundle
- emit a replayable audit record

Unacceptable first-mission scope:

- build a one-off linear pipeline that cannot expand into the five-category AFI analysis pipeline
- treat scoring as the only meaningful analysis stage
- let a Droid subjectively decide the final score
- hide missing analysis lanes behind vague AI-generated explanations
- claim production readiness for a temporary demo path

The initial POC excludes:

- production deployment
- live trading
- minting
- token settlement
- treasury operations
- reward distribution
- changes to core scoring math
- changes to core reputation math
- changes to emissions math

---

## 10. Human-Pinned Mission Inputs

Before a Droid or Factory Mission begins implementation, a human maintainer must explicitly pin:

- the pipeline path used for the POC
- the analyst or scorer path used for the POC
- the UWR config or scoring config used for the POC
- whether the POC is a truth-scoring demo or only a determinism / plumbing demo
- which repos and paths are in scope
- which repos and paths are out of scope
- which analysis lanes must be fully wired in the first mission
- which analysis lanes may use deterministic fixtures or approved mock inputs
- which outputs are canonical, provisional, or demo-only

Droids may apply these choices.

Droids may not make these choices silently.

---

## 11. Review Requirements

All Droid pipehead implementation work must be:

- PR-gated
- test-covered
- reviewable by a human maintainer
- replayable where deterministic behavior is claimed
- clearly separated from production runtime authority
- clearly documented

Any change touching scoring, reputation, rewards, settlement, contracts, treasury, governance, or production infrastructure requires explicit human approval and any applicable AFI governance process.

---

## 12. Factory Mission Framing

The first Factory Mission should be framed as:

> Build the first Droid-operated AFI pipehead factory district: a non-production Signal Evaluation Pipehead System where Droids operate the pipeline lanes / provider surfaces (declared in the governed registries) around AFI’s five analysis lanes, deterministic scoring, validation, and audit logic.

The mission proves that AFI can become Droid-operable without making Droids the source of financial truth.

---

## 13. Version Expansion

This v0.1 addendum authorizes only the first non-production Signal Evaluation Pipehead POC.

Future Droid factory districts — including provenance, reputation, contracts, settlement-readiness, monitoring, docs, and external agent interfaces — require either:

- a new version of this addendum, or
- a separate mission-specific authorization.

---

## 14. Summary Statement

Droids may operate AFI’s evaluation pipeline as pipeheads.

Droids may operate the five analysis lanes.

Droids may operate the scoring pipehead.

Droids may invoke deterministic AFI logic.

Droids may maintain, test, monitor, and report on the pipeline.

Droids may not become the source of financial truth.

AFI’s trust-critical outputs must remain deterministic, auditable, replayable, and governed by explicit protocol rules.
