# afi-config

**Canonical configuration and JSON Schema library for AFI Protocol**

This repository is the **single source of truth** for all AFI Protocol configuration schemas, templates, and validation utilities. It provides JSON Schema definitions that are consumed by all other AFI modules.

## Quick Links

📖 **[AFI Config Overview](./docs/AFI_CONFIG_OVERVIEW.md)** - Comprehensive guide to schemas and usage
📋 **[Migration Notes](./MIGRATION_NOTES.md)** - Consolidation from afi-construct

## Contents

- **schemas/** - JSON Schema definitions for all AFI configurations
- **templates/** - Configuration templates and starter files
- **cli_utils/** - CLI utilities for config validation
- **docs/** - Documentation and authoring guidelines
- **tests/** - Schema validation tests
- **codex/** - Codex governance artifacts and policies
  - **governance/droids/** - Droid operation policies (AFI Droid Charter)

## Core Schemas

- `character.schema.json` - Agent/character configs (afi-core)
- `pipeline.schema.json` - Pipeline configs (afi-reactor)
- `blueprint.schema.json` - DAG/construct blueprints (afi-reactor)
- `plugin-manifest.schema.json` - Plugin manifests (afi-plugins)
- `vault.schema.json` - T.S.S.D. Vault configs (afi-infra)
- `.afi-codex.schema.json` - Codex metadata schema (all repos)

## Usage

Other AFI repos consume these schemas for configuration validation:

- **afi-core**: Character and agent configurations
- **afi-reactor**: Pipeline and DAG orchestration
- **afi-infra**: T.S.S.D. Vault and infrastructure
- **afi-plugins**: Plugin registry and manifests
- **afi-ops**: Deployment and operations
- **afi-token**: Smart contract configurations

## Governance

AFI Protocol uses **Codex** as the canonical registry for schemas, policies, and provenance.

This repository now includes a Codex governance namespace:

- **AFI Droid Charter v0.1** – defines how Factory droids and automated agents are expected to operate across AFI repos
  Path: [`codex/governance/droids/AFI_DROID_CHARTER.v0.1.md`](./codex/governance/droids/AFI_DROID_CHARTER.v0.1.md)

Schema and Codex changes in this repo should respect the Charter and are subject to human review.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Validate schemas
npm run validate

# Build TypeScript utilities
npm run build
```

## Migration Note

**2025-11-14:** Consolidated content from **afi-construct** into this repo.
See [MIGRATION_NOTES.md](./MIGRATION_NOTES.md) for details.
