# AFI Droid Index v0.1

**Status**: v0.1 — Initial index (subject to future revision)  
**Location**: `afi-config/codex/governance/droids/AFI_DROID_INDEX.v0.1.md`  
**Last Updated**: 2025-11-28

This index catalogs all house droids defined for AFI Protocol repositories. Each droid is a specialized coding worker that operates within strict boundaries defined by the AFI Droid Charter v0.1 and repo-specific AGENTS.md files.

**Companion documents**:
- **AFI_DROID_CHARTER.v0.1.md** — Global rules and constraints for all droids
- **AFI_DROID_PLAYBOOK.v0.1.md** — Behavioral guidelines and workflows
- **AFI_DROID_GLOSSARY.md** — Terminology (droids vs agents vs gateways)

---

## 1. Purpose and Scope

This index exists to:

- Provide a **single source of truth** for all AFI Protocol house droids
- Help humans **quickly find the right droid** for a specific task
- Document **risk levels and boundaries** for each droid
- Maintain **consistency** across droid definitions and governance

This index covers:

- All house droids defined in `.factory/droids/` across AFI repos
- Their primary skills defined in `.factory/skills/`
- Risk levels, allowed actions, and hard boundaries
- When to use each droid and when to escalate to humans

This index does NOT cover:

- Runtime ElizaOS agents (see AFI_DROID_GLOSSARY.md for distinction)
- Eliza gateway configurations or agent personas
- On-chain behavior or tokenomics (see afi-token documentation)

---

## 2. How to Read This Index

Each droid entry includes:

- **Name**: The droid's canonical identifier
- **Home repo**: The single repository this droid operates in
- **Primary skill(s)**: The main workflows this droid executes
- **Risk level**: LOW, MEDIUM, or HIGH (see Section 4 for definitions)
- **What it does**: 2-4 bullets summarizing allowed responsibilities
- **Hard boundaries**: 3-6 bullets summarizing key "MUST NOT" constraints
- **When to use it**: 2-4 bullets describing typical use cases
- **Key file paths**: Locations of droid definition and skill files

All information is derived directly from the droid and skill definitions in each repo's `.factory/` directory.

---

## 3. Droids by Repo

### 3.1 afi-reactor: dag-builder-droid

**Name**: dag-builder-droid  
**Home repo**: afi-reactor  
**Primary skill(s)**:
- add-dag-node

**Risk level**: LOW

**What it does**:
- Scaffolds new DAG nodes with typed interfaces and minimal logic
- Wires nodes into the DAG graph by updating configs and registries
- Imports canonical types and validators from afi-core (read-only)
- Adds minimal tests and runners for DAG nodes
- Respects the 15-node pipeline architecture defined in AFI_REACTOR_DAG_SPEC.md

**Hard boundaries**:
- MUST NOT create or modify validators/schemas in afi-reactor (import from afi-core instead)
- MUST NOT duplicate or move canonical logic out of afi-core
- MUST NOT add orchestration logic to other repos (afi-core, afi-token, etc.)
- MUST NOT make agents into orchestrators (agents are nodes, not gods)
- MUST NOT violate the AFI Orchestrator Doctrine (10 Commandments)
- MUST NOT modify token/economics logic or smart contracts

**When to use it**:
- Adding a new DAG node to the afi-reactor pipeline
- Wiring a new stage into the signal processing flow
- Updating DAG configuration to connect upstream/downstream nodes
- Adding tests for DAG node behavior

**Key file paths**:
- Droid: `afi-reactor/.factory/droids/dag-builder-droid.md`
- Skill: `afi-reactor/.factory/skills/add-dag-node/SKILL.md`

---

### 3.2 afi-core: schema-validator-droid

**Name**: schema-validator-droid  
**Home repo**: afi-core  
**Primary skill(s)**:
- extend-signal-schema

**Risk level**: LOW

**What it does**:
- Extends signal schemas (Raw, Enriched, Analyzed, Scored) with new fields and types
- Creates and refines validators that enforce signal integrity and business rules
- Updates type exports and registries to keep schemas and validators in sync
- Adds minimal tests for schema validation and validator behavior
- Preserves determinism and backwards compatibility where possible

**Hard boundaries**:
- MUST NOT modify orchestration logic or DAG wiring in afi-reactor
- MUST NOT touch token/economics or smart contracts in afi-token
- MUST NOT add PoI/PoInsight fields to signal schemas (they are validator-level traits, not signal fields)
- MUST NOT modify Eliza agents or gateway configs
- MUST NOT break signal schema compatibility with afi-reactor
- MUST NOT add orchestration logic to afi-core

**When to use it**:
- Adding new fields to signal schemas (Raw, Enriched, Analyzed, Scored)
- Creating new validators for signal integrity or scoring logic
- Refining existing validators to improve accuracy or performance
- Adding tests for schema validation or validator behavior

**Key file paths**:
- Droid: `afi-core/.factory/droids/schema-validator-droid.md`
- Skill: `afi-core/.factory/skills/extend-signal-schema/SKILL.md`

---

### 3.3 afi-skills: skillsmith-droid

**Name**: skillsmith-droid  
**Home repo**: afi-skills  
**Primary skill(s)**:
- add-skill-from-template

**Risk level**: LOW

**What it does**:
- Creates new skills from canonical templates with proper front-matter and structure
- Maintains skill quality by ensuring compliance with Skill Contract v1
- Manages evals by creating and maintaining golden test cases for deterministic skills
- Validates consistency across skill metadata, domain placement, and risk levels
- Keeps the skill library clean by fixing minor drift and documentation issues

**Hard boundaries**:
- MUST NOT modify skill IDs (breaks versioning)
- MUST NOT remove required front-matter fields (breaks contract)
- MUST NOT skip eval golden cases for deterministic skills
- MUST NOT add skills without security review (risk patterns)
- MUST NOT modify afi-core schemas, afi-reactor DAGs, or afi-token contracts
- MUST NOT change skill domain after publication

**When to use it**:
- Adding a new skill to the AFI skills library
- Creating golden test cases for deterministic skills
- Validating skill front-matter and metadata compliance
- Fixing documentation drift or minor skill issues

**Key file paths**:
- Droid: `afi-skills/.factory/droids/skillsmith-droid.md`
- Skill: `afi-skills/.factory/skills/add-skill-from-template/SKILL.md`

---

### 3.4 afi-ops: ci-guardian-droid

**Name**: ci-guardian-droid
**Home repo**: afi-ops
**Primary skill(s)**:
- run-ci-smoke-suite

**Risk level**: LOW

**What it does**:
- Runs smoke checks across key AFI repos (afi-core, afi-reactor, afi-skills, afi-token)
- Validates builds by running `npm run build` or `forge build` in each repo
- Runs tests by executing `npm test` or `forge test` in each repo
- Checks linters by running `npm run lint` or equivalent validation commands
- Summarizes results in a clear, human-readable format with pass/fail status
- Acts as safety officer that can be called after other droids make changes

**Hard boundaries**:
- MUST NOT edit application code, configs, or scripts in any repo
- MUST NOT commit, push, or deploy anything
- MUST NOT modify schemas, DAGs, skills, or contracts
- MUST NOT run destructive operations (DB wipes, migrations, data loss)
- MUST NOT handle secrets or production environments
- MUST NOT change CI/CD pipeline configurations

**When to use it**:
- Running a quick cross-repo health check after making changes
- Validating that builds and tests pass before opening a PR
- Getting a fast sanity check on the current state of AFI repos
- Confirming that recent changes didn't break builds or tests

**Key file paths**:
- Droid: `afi-ops/.factory/droids/ci-guardian-droid.md`
- Skill: `afi-ops/.factory/skills/run-ci-smoke-suite/SKILL.md`

---

### 3.5 afi-token: contract-test-droid

**Name**: contract-test-droid
**Home repo**: afi-token
**Primary skill(s)**:
- add-contract-test-scenario

**Risk level**: ⚠️ **HIGH**

**What it does**:
- Adds test coverage for AFI token contracts (AFIToken, AFIMintCoordinator, AFISignalReceipt)
- Creates test scenarios for happy-path, edge-case, failure, invariant, and regression testing
- Extends test fixtures and helpers to support comprehensive testing
- Documents test intent via clear comments and test names
- Runs Foundry tests to validate changes (`forge build`, `forge test`)
- Improves test documentation to clarify contract behavior and assumptions

**Hard boundaries**:
- MUST NEVER modify contracts in `src/` (AFIToken.sol, AFIMintCoordinator.sol, AFISignalReceipt.sol)
- MUST NEVER modify deployment scripts in `script/`
- MUST NEVER change chain IDs, RPC URLs, or network configurations
- MUST NEVER alter tokenomics, emissions logic, or supply caps
- MUST NEVER modify role management or access control logic
- MUST NEVER deploy or broadcast transactions to any network
- MUST NEVER modify other repos (afi-core, afi-reactor, afi-skills, afi-ops, etc.)

**When to use it**:
- Adding test coverage for AFI token contracts
- Creating test scenarios for edge cases or failure modes
- Adding regression tests for known bugs or issues
- Improving test documentation for contract behavior

**Critical safety note**:
- This droid is **test-only** and **NEVER modifies contract code**
- If tests reveal a contract bug, the droid STOPS and escalates to @afi-security-team
- Contract changes require security audit and human approval
- Smart contracts are IMMUTABLE after deployment — bugs can cause PERMANENT LOSS OF FUNDS

**Key file paths**:
- Droid: `afi-token/.factory/droids/contract-test-droid.md`
- Skill: `afi-token/.factory/skills/add-contract-test-scenario/SKILL.md`

---

### 3.6 afi-config: config-keeper-droid

**Name**: config-keeper-droid
**Home repo**: afi-config
**Primary skill(s)**:
- validate-codex-config

**Risk level**: ⚠️ **MEDIUM**

**What it does**:
- Validates codex structure in `codex/` directory (JSON/YAML syntax, required fields, file references)
- Checks governance artifacts in `codex/governance/droids/` for consistency and broken references
- Validates schema files in `schemas/` for JSON Schema compliance and structural integrity
- Ensures `.afi-codex.json` metadata is accurate and up-to-date with repo capabilities
- Detects broken file paths in codex entries, governance docs, and schema references
- Runs validation commands defined in `package.json` (`npm run validate`, `npm test`)
- Maintains internal consistency across schemas, templates, and governance artifacts

**Hard boundaries**:
- MUST NOT modify code in other repos (afi-core, afi-reactor, afi-skills, afi-ops, afi-token, etc.)
- MUST NOT change AFI token parameters, emissions, or economics
- MUST NOT change DAG structure or orchestration logic (afi-reactor)
- MUST NOT change signal schemas or validators in afi-core (beyond schema definition)
- MUST NOT change skills in afi-skills
- MUST NOT modify Eliza configs or agent behavior
- MUST NOT change protocol governance rules without explicit human approval
- MUST NOT remove or rename schema fields (breaks backward compatibility)

**When to use it**:
- Validating codex structure and governance artifacts for consistency
- Checking for broken file references in governance docs or codex entries
- Ensuring schemas are valid JSON Schema Draft 2020-12
- Auditing configuration drift or inconsistencies
- Validating that `.afi-codex.json` metadata is accurate

**Critical safety note**:
- afi-config is the **governance and configuration home** for AFI Protocol
- Schema changes cascade to ALL AFI repos (system-wide impact)
- Governance artifacts (AFI Droid Charter, Playbook) define rules for all droids
- This droid maintains consistency but NEVER makes breaking changes or modifies governance semantics without human approval

**Key file paths**:
- Droid: `afi-config/.factory/droids/config-keeper-droid.md`
- Skill: `afi-config/.factory/skills/validate-codex-config/SKILL.md`

---

## 4. Risk Levels and Safety Notes

AFI droids are assigned risk levels based on the potential impact of their actions:

### LOW Risk

**Definition**: Droids that operate on documentation, tests, or isolated code with minimal cross-repo impact.

**Examples**:
- dag-builder-droid (afi-reactor): Adds DAG nodes following strict doctrine
- schema-validator-droid (afi-core): Extends schemas with backward compatibility
- skillsmith-droid (afi-skills): Adds skills with security review
- ci-guardian-droid (afi-ops): Read-only validation, no modifications

**Safety characteristics**:
- Changes are reversible via Git
- No direct protocol or financial risk
- Failures are caught by tests and code review
- Limited to single repo with clear boundaries

### MEDIUM Risk

**Definition**: Droids that operate on configuration or schemas consumed by multiple repos, with system-wide impact.

**Examples**:
- config-keeper-droid (afi-config): Validates schemas and governance artifacts consumed by all AFI repos

**Safety characteristics**:
- Schema changes cascade to all consuming repos
- Breaking changes can cause runtime errors across the protocol
- Governance artifacts define rules for all droids
- Requires careful coordination and backward compatibility checks
- Changes are reversible but may require cross-repo updates

### HIGH Risk

**Definition**: Droids that operate on smart contracts or other immutable, financially-critical code.

**Examples**:
- contract-test-droid (afi-token): Adds tests for AFI token contracts (test-only, NEVER modifies contracts)

**Safety characteristics**:
- Smart contracts are IMMUTABLE after deployment
- Bugs can cause PERMANENT LOSS OF FUNDS
- Math errors in emissions logic can break tokenomics
- Role management errors can lock funds or enable attacks
- Contract changes require security audit and human approval
- This droid is **test-only** and escalates contract bugs to @afi-security-team

**Critical rule for HIGH risk droids**:
- If a HIGH risk droid detects a contract bug or security issue, it MUST STOP immediately and escalate to @afi-security-team
- HIGH risk droids NEVER modify production contract code
- All contract changes require explicit human approval and security audit

---

## 5. When to Use Which Droid

This section provides a quick reference for choosing the right droid for your task:

**If you need to add or wire DAG nodes**:
- Use **dag-builder-droid** in afi-reactor
- Skill: add-dag-node
- Respects AFI Orchestrator Doctrine (10 Commandments)

**If you need to extend signal schemas or validators**:
- Use **schema-validator-droid** in afi-core
- Skill: extend-signal-schema
- Preserves backward compatibility and determinism

**If you're adding or refining skills**:
- Use **skillsmith-droid** in afi-skills
- Skill: add-skill-from-template
- Ensures compliance with Skill Contract v1 and security review

**If you want a quick cross-repo health check**:
- Use **ci-guardian-droid** in afi-ops
- Skill: run-ci-smoke-suite
- Read-only validation across afi-core, afi-reactor, afi-skills, afi-token

**If you're adding contract test scenarios** (HIGH RISK, tests only):
- Use **contract-test-droid** in afi-token
- Skill: add-contract-test-scenario
- NEVER modifies contracts, only adds tests
- Escalates contract bugs to @afi-security-team

**If you're validating or auditing codex/schemas/governance**:
- Use **config-keeper-droid** in afi-config
- Skill: validate-codex-config
- Maintains consistency without breaking changes
- Escalates governance changes to @afi-governance-team

---

## 6. Future Extensions (Non-binding)

The following future droids and skills have been mentioned in existing droid definitions as potential future work. **These are NOT yet implemented** and this section is informational only.

### Potential Future Skills (from existing droid definitions)

**afi-reactor (dag-builder-droid)**:
- inspect-dag-graph — Visualize current DAG structure and dependencies
- validate-dag-determinism — Check if DAG changes maintain Codex replay determinism
- wire-node-to-dag — Update DAG config to connect a node
- test-dag-path — Generate integration test for a specific signal path

**afi-core (schema-validator-droid)**:
- add-validator — Scaffold a new validator with tests and registry integration
- migrate-schema — Safe migration workflow for breaking schema changes
- test-schema-compatibility — Validate schema changes against afi-reactor usage

**afi-skills (skillsmith-droid)**:
- validate-skill-evals — Run golden cases and validate deterministic skills
- refactor-skill-domain — Move a skill to a different domain (with migration)
- deprecate-skill — Mark a skill as deprecated and provide migration path
- bump-skill-version — Update skill version following semver rules
- audit-skill-security — Deep security review for high-risk skills

**afi-ops (ci-guardian-droid)**:
- run-full-ci — Run comprehensive CI suite with coverage, gas reports, security scans
- generate-ci-report — Generate detailed CI report with metrics and trends
- run-cross-repo-integration-tests — Run integration tests across multiple repos
- validate-deployment-readiness — Check if repos are ready for deployment
- run-security-audit — Run automated security scans (Slither, MythX, etc.)

**afi-token (contract-test-droid)**:
- add-invariant-test-suite — Add comprehensive invariant tests for critical properties
- add-regression-test — Add regression tests for known bugs or issues
- generate-gas-report-tests — Add tests focused on gas optimization validation
- add-fuzz-test-suite — Add comprehensive fuzz tests for contract functions
- add-integration-test — Add end-to-end integration tests across multiple contracts

**afi-config (config-keeper-droid)**:
- sync-governance-index — Sync governance artifact index with actual files
- audit-config-drift — Detect drift between schemas and consumer usage
- validate-schema-compatibility — Check schema changes for backward compatibility
- generate-schema-docs — Generate documentation from JSON Schema definitions
- check-downstream-impact — Analyze which repos consume each schema

**Note**: These future skills are mentioned for planning purposes only. They are NOT yet implemented and should NOT be assumed to exist. If you need one of these capabilities, consult with AFI Protocol maintainers first.

---

**End of AFI Droid Index v0.1**

For questions or updates to this index, contact AFI Protocol maintainers or open an issue in the afi-config repository.

**Governance**: This index is governed by the AFI Droid Charter v0.1 and AFI Droid Playbook v0.1.
**Maintainers**: AFI Protocol Team
**Repository**: https://github.com/AFI-Protocol/afi-config
