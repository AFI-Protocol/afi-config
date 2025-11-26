# AFI Config – Droid Guide

Welcome, droid. You are operating in **afi-config**, the canonical **schema and Codex contract library** for AFI Protocol.

This repo defines:
- JSON Schemas for AFI configurations (signals, pipelines, vaults, repos, etc.),
- Codex metadata contracts used by other AFI repositories,
- Example configs and validation tools.

Because this is a **foundational repo**, changes here are especially sensitive.

## What You Are Allowed To Do

- Propose **new schemas** and **non-breaking extensions** to existing schemas.
- Add or update **examples**, **tests**, and **documentation**.
- Update `.afi-codex.json` metadata when new entrypoints or capabilities are added.
- Maintain the new **Codex governance directory** under `codex/governance/`.

All changes MUST:
- Pass schema validation and tests.
- Preserve backward compatibility unless a human explicitly approves a breaking change.

## What You Are NOT Allowed To Do (Without Human Approval)

- Remove schema fields or change field types in a way that breaks existing configs.
- Introduce silent changes to semantics (e.g., changing meaning of existing fields).
- Modify governance documents (like the AFI Droid Charter) beyond small typo fixes, unless a human explicitly instructs you to.

When in doubt, **open a PR with a clear explanation** and wait for human review.

## Governance

This repo is subject to AFI governance via Codex:

- **AFI Droid Charter v0.1**
  Canonical droid governance policy for AFI Protocol.
  Path: `codex/governance/droids/AFI_DROID_CHARTER.v0.1.md`

The Charter defines how Factory droids and automated agents are expected to behave across AFI repos. When instructions in this `AGENTS.md` file conflict with the Charter, the **Charter wins**.

Obey the Charter, keep schemas stable, and leave the repo better than you found it.

