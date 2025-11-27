# AFI Droid Playbook v0.1

This Playbook defines how **AFI droids** are expected to behave when operating on AFI-Protocol repositories via Factory.ai.

It governs:
- How droids read and obey the Droid Charter and AGENTS.md.
- How they plan and execute repo changes.
- How they stay within architectural and safety boundaries.

It does **not** govern runtime Eliza agents or any on-chain behavior.

## 0. Relationship to Other Docs

- **AFI_DROID_CHARTER.v0.1.md** — global rules and constraints.
- **AFI_DROID_GLOSSARY.md** — terminology (droids vs agents vs gateways).
- Repo-local **AGENTS.md** — repo-specific roles, commands, and boundaries.

If there is ever a conflict:

1. Charter (global)
2. Playbook (this document)
3. Repo-local AGENTS.md

## 1. Ground Rules for Droids

1. **Charter first, repo second**

   - Always read the Droid Charter and the target repo's AGENTS.md before making changes.
   - Treat these as non-negotiable constraints.

2. **Stay inside the fence**

   - Operate only on:
     - The assigned repo, and
     - Any explicitly allowed sibling modules noted in AGENTS.md.
   - Do not wander into unrelated repos.

3. **No surprise architecture**

   - Refine and extend existing patterns.
   - Do not invent new core patterns (DAG engines, tokenomics, governance primitives) without an explicit spec and permission in AGENTS.md.

4. **No live secrets or live trading**

   - Never add real API keys, private keys, or secret material.
   - Do not introduce code that calls live trading endpoints by default.
   - Use environment variables and configuration stubs only.

5. **Eliza is external**

   - Treat Eliza as a client of AFI services.
   - Do not import Eliza core libraries into AFI core repos.
   - Eliza-related work is confined to gateway/plugin repos (e.g., `afi-eliza-gateway`).

## 2. Standard Droid Workflow (Single-Repo Missions)

When assigned to a repo (e.g., `afi-reactor`), a droid should follow this sequence:

1. **Read instructions**

   - Load the Droid Charter and the repo's AGENTS.md.
   - Extract:
     - Repo role and responsibilities.
     - Allowed vs forbidden edits.
     - Required commands (build, test, lint).

2. **Restate the mission**

   - Summarize the requested change in its own words, including:
     - Target repo and branch.
     - Intended outcome (e.g., "add unit tests for VaultedSignal replay").
     - Expected artifacts (files, configs, docs).

3. **Scan before editing**

   - Identify:
     - Relevant directories (e.g., `src/`, `tests/`, `codex/`, `config/`).
     - Existing patterns and utilities to reuse.
     - TODOs or comments that influence the change.

4. **Plan a minimal diff**

   - Prefer:
     - Small, focused changes.
     - Reuse of existing helpers and schemas.
   - Only introduce new abstractions when clearly justified and consistent with repo style.

5. **Edit with guardrails**

   - Follow repo conventions for:
     - File layout, naming, imports.
     - Error handling and logging.
     - Documentation and comments.
   - Never:
     - Change public API shapes without updating specs/schemas.
     - Remove safety checks or risk controls without explicit instruction.

6. **Run local checks**

   - Use the commands defined in AGENTS.md:
     - `npm test`, `npm run build`, `npm run typecheck`, `forge test`, etc.
   - If tests are known to be slow or flaky, note this in the summary instead of silently skipping.

7. **Summarize changes**

   - Explain:
     - What was changed and why.
     - Which commands were run and their results.
     - Any follow-up tasks or open questions.

8. **Prepare commits/PRs (when allowed)**

   - Follow the repo's commit style guidelines (e.g., conventional commits).
   - Group related changes into coherent commits.

## 3. Multi-Repo Missions

Some missions legitimately span more than one repo (for example, updating a schema in `afi-config` and its consumer in `afi-reactor`).

In these cases:

1. **Declare all repos up front**

   - Explicitly list the repos involved and their roles.
   - Example: "This mission touches `afi-config` (schemas) and `afi-reactor` (DAG nodes)."

2. **Read AGENTS.md for each repo**

   - Confirm that each repo allows multi-repo changes.
   - If any repo forbids this, split the mission or escalate.

3. **Respect dependency direction**

   - Never invert established relationships, such as:
     - `afi-reactor` orchestrates DAGs and exposes APIs; it does not depend on Eliza.
     - `afi-core` provides shared types and validators; it is not a client of Eliza.
     - `afi-eliza-gateway` is a client of AFI; AFI core repositories never depend on it.

4. **Keep diffs localized**

   - Each repo's changes should make sense in isolation.
   - Cross-repo dependency changes must be documented in both commit and PR descriptions.

## 4. Repo Archetypes (Droid View)

This section gives high-level guidance for common AFI repos, from a droid's point of view.

### afi-config

- Home of schemas, governance config, and Codex metadata.
- Changes here can cascade across the system.
- Always:
  - Update validation/tests where applicable.
  - Clearly document breaking changes.

### afi-reactor

- DAG orchestration and signal pipelines.
- Exposes HTTP/WS APIs for gateways and external clients.
- Focus on:
  - Deterministic DAG behavior.
  - Clear boundaries between stages.
  - Stable APIs for gateways.

### afi-core

- Shared types, validators, and helpers for AFI services.
- May host AFI client libraries for gateways and external tools.
- Do not:
  - Hide business-critical rules in generic helpers.
  - Import Eliza core libraries.

### afi-eliza-gateway

- Integration shell for Eliza-based agents.
- Hosts AFI-specific plugins and client code.
- Must:
  - Call AFI services via HTTP/WS APIs.
  - Import shared types/clients from `afi-core`.
- Must not:
  - Re-implement AFI scoring or tokenomics here.

### afi-token / governance-sensitive repos

- HIGH RISK zones.
- Default stance:
  - Documentation, comments, and tests only.
- Any change to contract behavior, emissions, or governance mechanics requires:
  - An explicit spec.
  - Dedicated tests.
  - Clear signposting in commit messages.

## 5. Eliza Boundary (from the Droid Perspective)

To keep boundaries simple:

- In AFI core repos (`afi-config`, `afi-reactor`, `afi-core`, `afi-token`, etc.):
  - Treat Eliza as an external client that calls your APIs.
  - Do not import Eliza core SDKs or character definitions.

- In `afi-eliza-gateway`:
  - You may:
    - Use Eliza SDKs and plugin interfaces.
    - Use AFI client libraries from `afi-core`.
  - You must:
    - Call AFI APIs for business logic.
    - Avoid duplicating AFI logic in plugins or character configs.

## 6. Safety & Escalation

Droids should **stop and escalate** (via comments/notes) when:

- A change would:
  - Alter tokenomics, emissions, or governance rules.
  - Change how AFI interacts with external wallets or exchanges.
  - Remove or weaken existing safety checks, limits, or risk controls.

- Repo instructions are:
  - Ambiguous or contradictory.
  - In conflict with the Droid Charter.

- The mission conflicts with:
  - The Eliza Gateway Boundary.
  - On-chain risk guidelines.

Escalation note format:

- What was requested.
- Which rule/section blocked it (Charter/Playbook/AGENTS.md).
- Recommended next step or alternative.

## 7. Future Extensions

This v0.1 Playbook leaves room for future refinement, including:

- Droid "classes" (Validator Droid, Gateway Droid, Tokenomics Droid, Docs Droid).
- Skill packs anchored in `afi-skills`.
- Evaluation tracks that droids must satisfy for certain repos.

Until then, droids should follow:
- The Charter,
- This Playbook,
- And repo-local AGENTS.md files.

