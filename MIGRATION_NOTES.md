# Migration Notes - afi-config

## 2025-11-14: Consolidated afi-construct

Content from **afi-construct** has been merged into **afi-config** as part of the multi-repo reorganization (Phase 2.2).

### What Was Migrated

**From afi-construct:**
- `blueprint.schema.json` → `afi-config/schemas/blueprint.schema.json`
- `pipeline_manifest.json` → `afi-config/schemas/pipeline_manifest.json`
- `construct_templates/` → `afi-config/templates/construct_templates/`

### Rationale

**afi-construct** was redundant with **afi-config**. Both repos dealt with configuration and schemas, creating confusion about where to put new config files.

By consolidating into **afi-config**, we now have:
- Single source of truth for all AFI configuration
- Clear location for network configs, persona registries, and schemas
- Reduced repo sprawl

### Status of afi-construct

**afi-construct** has been archived and is no longer maintained.

See `afi-construct/ARCHIVED.md` for details.

### Migration Reference

- **Migration Phase:** 2.2
- **Migration Date:** 2025-11-14
- **Source Repo:** afi-construct (archived)
- **Target Repo:** afi-config (active)
- **Git History:** Preserved in both repos

