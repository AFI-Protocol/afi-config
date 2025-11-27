# AFI Droid vs Agent Glossary

This glossary clarifies how **AFI droids** (Factory.ai coding workers) differ from **ElizaOS agents** (runtime personas), and how the Eliza gateway fits into the picture.

It exists to keep roles clean:

- Droids: operate over Git repositories and AGENTS.md rules.
- Agents: operate at runtime, talking to humans and calling AFI APIs.
- Gateways: connect agents to AFI as external clients.

Nothing in this document defines on-chain behavior or tokenomics. It is strictly about development-time automation and runtime personas.

## Droid (Factory Droid)

**What it is**

A droid is a **coding worker** controlled by Factory.ai that operates on AFI Git repositories.

**Where it lives**

- Inside AFI's development workflow.
- Runs over cloned repos, not in production runtimes.

**What it reads**

- `AFI_DROID_CHARTER.v0.1.md` (global rules)
- Repo-local `AGENTS.md` (local rules and boundaries)

**What it does**

- Edits code, config, and docs inside a single repo (or a small, explicit set of repos).
- Runs tests/lints/builds as instructed in AGENTS.md.
- Prepares changes suitable for human review (commits/PRs).

**What it does NOT do**

- Act as a user-facing bot or trading assistant.
- Hold live keys or call live trading/exchange APIs.
- Clone or vendor upstream ElizaOS into AFI core repos.
- Invent new AFI "grand architecture" without an explicit spec.

**Mental model:** droids swing hammers in Git; they never talk directly to AFI users.

## Agent (ElizaOS Agent)

**What it is**

An agent is a **runtime persona** inside ElizaOS (e.g., Spartan, Phoenix) that interacts with humans and tools.

**Where it lives**

- In Eliza runtimes (Discord, Telegram, web, etc.).
- In gateway environments that connect Eliza to AFI (e.g., `afi-eliza-gateway`).

**What it reads**

- Character configs and prompts.
- Plugins and runtime skills.
- AFI APIs and client libraries, treated as external services.

**What it does**

- Answers user questions and routes tasks.
- Calls AFI services via HTTP/WS APIs.
- Orchestrates tools and data sources at runtime.

**What it does NOT do**

- Edit AFI source code directly.
- Bypass AFI governance, Charter, or droid rules.
- Re-implement core AFI business logic inside plugins.

**Mental model:** agents are faces and voices; they ask AFI for help, they don't refactor AFI.

## Gateway (afi-eliza-gateway)

**What it is**

`afi-eliza-gateway` is an **integration shell**: a client-facing bridge between Eliza agents and AFI backends.

**Role**

- Hosts AFI-specific Eliza plugins and character wiring.
- Uses AFI client libraries and HTTP/WS APIs.
- Never becomes a source of truth for AFI business logic.

**Dependency direction**

- Eliza agents → `afi-eliza-gateway` → AFI APIs (e.g. `afi-reactor`, `afi-core`).
- AFI core repos never depend on Eliza internals.

## Skills

### AFI Skills (repo land)

- Canonical, testable capabilities encoded as:
  - Config, templates, or code modules
  - Stored in AFI repos (e.g., `afi-skills`).
- Governed by the Droid Charter + AGENTS.md.
- Extended through repo changes and PRs.

### Agent Skills (runtime land)

- Behaviors exposed via Eliza plugins and actions.
- Used by runtime agents to:
  - Call AFI APIs
  - Fetch data, submit events, or trigger workflows.
- Must call AFI services instead of duplicating AFI logic.

## One-sentence Contrast

- **Droids**: "Given these repos and rules, safely change the code."
- **Agents**: "Given this user, these tools, and these APIs, decide what to do."

## Scope of this Glossary

- Applies only to AFI development and runtime integration patterns.
- Does not change any smart contracts, tokenomics, or governance modules.
- Complements:
  - `AFI_DROID_CHARTER.v0.1.md`
  - `AFI_DROID_PLAYBOOK.v0.1.md`

