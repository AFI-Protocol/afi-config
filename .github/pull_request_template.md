<!--
Thanks for contributing to afi-config. Fill in every section so reviewers (and
autonomous agents) have the context they need. Delete guidance comments before
submitting.
-->

## Summary

<!-- What does this PR change and why? 1-3 sentences focused on intent. -->

## Type of change

<!-- Mark all that apply with an [x]. -->

- [ ] `feat` — new schema / capability
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `refactor` — no behavior change
- [ ] `chore` / `ci` — tooling, deps, or workflows

## Related issues

<!-- e.g. "Closes #123". Write "None" if not applicable. -->

## Changes

<!-- Bullet the concrete changes made in this PR. -->

-

## Governance & contract impact

<!--
Schema changes cascade to downstream AFI repos. Answer honestly:
- Does this add/modify/remove any JSON schema, registry, template, or codex artifact?
- Is it backward compatible? (Removing/renaming fields breaks contracts.)
- Does it touch codex/governance/ (requires explicit human approval)?
-->

- Affects `schemas/` / `registries/` / `templates/` / `codex/`: <!-- yes/no + details -->
- Backward compatible: <!-- yes/no + rationale -->

## Testing done

<!-- List the commands you ran and their outcome. -->

- [ ] `npm test` (schema validation suites)
- [ ] `npm run validate`
- [ ] `npm run lint` / `npm run format:check`
- [ ] `npm run typecheck`

## Checklist

- [ ] Changes are scoped and focused on a single concern.
- [ ] Hash-governed canonical artifacts were not altered without approval.
- [ ] Docs (README / AGENTS.md) updated if commands or conventions changed.
- [ ] CI is green (lint, format, dead-code, duplicates, tech-debt, tests, build).
