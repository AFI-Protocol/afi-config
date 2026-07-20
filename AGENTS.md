# afi-config — Agent Instructions

**afi-config** is the configuration and governance home for AFI Protocol. It provides JSON schemas, `.afi-codex.json` metadata contracts, validation utilities, and **canonical governance artifacts** including the AFI Droid Charter v0.1.

**Global Authority**: All agents operating in AFI Protocol repos must follow `codex/governance/droids/AFI_DROID_CHARTER.v0.1.md`. If this AGENTS.md conflicts with the Charter, **the Charter wins**.

---

## Build & Test

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run schema validation tests (vitest 4.0.14)
npm test

# Validate all configs and schemas
npm run validate

# Type check
npm run typecheck
```

**Expected outcomes**: All 20 schema validation tests pass, no TypeScript errors.

---

## Run Locally / Dev Workflow

This repo has no dev server. Typical workflow:

1. Edit schemas in `schemas/`
2. Update types in `src/types/` if needed
3. Run `npm run validate` to check schema validity
4. Run `npm test` to ensure tests pass
5. Update templates in `templates/` if schema changed

---

## Architecture Overview

**Purpose**: Define configuration contracts consumed by all AFI repos.

**Key directories**:

- `schemas/` — JSON schemas for signals, configs, Codex metadata
- `src/types/` — TypeScript type definitions
- `templates/` — Config file templates
- `codex/governance/droids/` — **Canonical droid governance** (AFI Droid Charter v0.1)
- `.afi-codex.json` — This repo's Codex metadata

**Consumed by**: afi-core, afi-reactor, afi-factory, and all other AFI repos.

---

## Security

- **Schema changes cascade system-wide**: Changing a schema can break multiple repos. Always validate downstream impact.
- **No secrets in code**: Use environment variables for sensitive data.
- **Governance artifacts are binding**: Do not modify `codex/governance/` without explicit human approval.
- **Backward compatibility**: Removing or renaming schema fields breaks contracts. Add new fields instead.
- **Minimum dependency release age**: Dependency version bumps must target a release that is at least **7 days** old. CI (`npm run check:dep-release-age`, `AFI_MIN_RELEASE_AGE_DAYS`) diffs `package-lock.json` against `origin/main`, queries the npm registry for each bumped version's publish date, and fails the PR if any target is younger than the threshold. This mitigates supply-chain risk from freshly published packages.

---

## Git Workflows

- **Base branch**: `main`
- **Branch naming**: `feat/`, `fix/`, `docs/`, `refactor/`
- **Commit messages**: Conventional commits (e.g., `feat(schemas): add signal v2 schema`)
- **Before committing**: Run `npm test && npm run validate`

---

## Conventions & Patterns

- **Language**: TypeScript (ESM), JSON Schema (Draft 2020-12)
- **Style**: Prettier + ESLint (if configured)
- **Schema naming**: kebab-case (e.g., `signal-schema.json`)
- **Type naming**: PascalCase (e.g., `SignalConfig`)
- **Tests**: Vitest, located in `tests/` or co-located with source
- **Technical debt**: Every `TODO`/`FIXME`/`HACK`/`XXX` comment must link to a tracking issue, e.g. `// TODO(#123): ...` or `// FIXME(AFI-42): ...`. CI (`npm run check:tech-debt`) fails on unlinked markers and prints an inventory of tracked debt.

## Issue & PR Labels

The canonical label taxonomy is defined in `.github/labels.yml` and synced to the repo by the **Sync Labels** workflow (`sync-labels.yml`). Three categories:

- **Priority**: `P0` (critical), `P1` (high), `P2` (medium), `P3` (low).
- **Type**: `bug`, `enhancement`, `documentation`, `chore`, `refactor`, `test`, `dependencies`.
- **Area**: `area:schemas`, `area:registries`, `area:templates`, `area:codex`, `area:cli-utils`, `area:ci`, `area:docs`, `area:security`.

Agents should apply one priority, one type, and one area label to every issue they create. To change the taxonomy, edit `.github/labels.yml` and merge to `main`; the workflow keeps the repo's labels in sync.

---

## Scope & Boundaries for Agents

**Allowed**:

- Propose new schemas and non-breaking extensions
- Add examples, tests, and documentation
- Update `.afi-codex.json` metadata when capabilities change
- Maintain `codex/governance/` directory (governance artifacts)

**Forbidden**:

- Remove schema fields or change types (breaks backward compatibility)
- Change schema semantics without coordination across repos
- Modify AFI Droid Charter without explicit human approval
- Add dependencies that introduce security risks
- Change validation logic without understanding downstream impact

**When unsure**: Open a PR with clear explanation and wait for human review. Prefer no-op over risky action.

---

**Last Updated**: 2025-11-26
**Maintainers**: AFI Core Team
**Charter**: `codex/governance/droids/AFI_DROID_CHARTER.v0.1.md`
