# AFI Config Overview

## What is afi-config?

**afi-config** is the canonical configuration and JSON Schema library for AFI Protocol. It serves as the single source of truth for all configuration schemas, templates, and validation utilities used across the AFI ecosystem.

This repository provides:
- **JSON Schemas** for validating configuration files
- **Configuration templates** for common use cases
- **Validation utilities** for ensuring config correctness
- **Documentation** for config authoring and best practices

## How Other Repos Use afi-config

AFI Protocol is organized as a modular multi-repo architecture. Each module consumes schemas from afi-config:

### afi-core (ElizaOS Runtime)
- **Character/Agent Config**: Defines agent personas, abilities, and behaviors
- **Schema**: `character.schema.json`
- **Use Case**: Configure AI agents with specific traits, knowledge domains, and interaction patterns

### afi-reactor (DAG Orchestrator)
- **Pipeline Config**: Defines signal processing pipelines and DAG workflows
- **Schema**: `pipeline.schema.json`, `blueprint.schema.json`
- **Use Case**: Orchestrate multi-stage signal analysis flows (RAW → ENRICHED → ANALYZED → SCORED)

### afi-infra (Infrastructure Layer)
- **T.S.S.D. Vault Config**: Configures Time-Series Signal Data storage
- **Schema**: `vault.schema.json`
- **Use Case**: Define database connections, collection names, retention policies

### afi-plugins (Plugin Registry)
- **Plugin Manifest**: Declares plugin metadata, inputs, outputs, and entrypoints
- **Schema**: `plugin-manifest.schema.json`
- **Use Case**: Register signal generators, analyzers, validators, executors, and observers

### afi-ops (Operations Toolkit)
- **Deployment Config**: Defines service orchestration and health check parameters
- **Schema**: `ops-config.schema.json` (future)
- **Use Case**: Configure local/production deployments, SLOs, and monitoring

### afi-token (Smart Contracts)
- **Token Config**: Defines contract deployment parameters and governance settings
- **Schema**: `token-config.schema.json` (future)
- **Use Case**: Configure AFI token emissions, roles, and supply caps

## Universal Signal Schema (USS) & Lenses

**AFI Universal Signal Schema (USS)** is the canonical ingestion and envelope schema for all signals in the AFI Protocol ecosystem. It provides a standardized structure for signal data with optional lens-based extensions.

### What is USS?

USS defines:
- **Core envelope**: Cross-cutting fields for cash proxy, measurement windows, frictions, capacity constraints, telemetry, and decay models
- **Lens system**: Optional structured extensions for domain-specific data (equity, strategy, macro, on-chain)
- **Provenance tracking**: Required metadata for signal lineage and reproducibility

### Location

- **Root schema**: `schemas/usignal/v1/index.schema.json`
- **Core schema**: `schemas/usignal/v1/core.schema.json`
- **Lens schemas**: `schemas/usignal/v1/lenses/*.lens.schema.json`

### Available Lenses

1. **Equity Lens** (`equity.lens.schema.json`)
   - Purpose: Traditional equity and credit instruments
   - Fields: Entity identification, delta FCF analysis, scenario modeling, terminal value
   - Use Case: Fundamental equity analysis signals

2. **Strategy Lens** (`strategy.lens.schema.json`)
   - Purpose: After-friction P&L and trading strategies
   - Fields: Asset, P&L, friction breakdown, capacity constraints
   - Use Case: Quantitative trading strategy signals

3. **Macro Lens** (`macro.lens.schema.json`)
   - Purpose: Macroeconomic regime and factor attribution
   - Fields: Regime tags, factor attribution, financing rates
   - Use Case: Macro regime signals and factor models

4. **On-chain Lens** (`onchain.lens.schema.json`)
   - Purpose: Blockchain microstructure and execution
   - Fields: MEV costs, gas costs, pool depth, oracle latency, private orderflow
   - Use Case: DeFi and on-chain execution signals

### How USS Integrates with Other Schemas

- **Pipeline Schema** (`pipeline.schema.json`): Pipeline nodes declare `signalSchema: "afi.usignal.v1"` to indicate they process USS-compliant signals
- **Vault Schema** (`vault.schema.json`): Vaults store USS-compliant signals with `signalSchema` field
- **Plugin Manifest** (`plugin-manifest.schema.json`): Plugins declare supported lenses via `supportedLenses` array

### Provider Flow

**Preferred approach:**
1. Set the `lens` field to indicate signal type (`equity`, `strategy`, `macro`, `onchain`)
2. Include the matching lens object with domain-specific data
3. Include `core` telemetry fields (especially `decay` for signal half-life)
4. Include optional `greeks` if applicable (cross-cutting sensitivities)

**Fallback approach:**
- Omit `lens` field; intake will auto-detect based on present fields
- Ambiguous signals default to `generic` with core-only validation

### Important Notes

- **Behavioral logic lives elsewhere**: USS is a schema library only. Signal processing, validation, and scoring logic lives in `afi-infra`, `afi-reactor`, and `afi-engine`.
- **Lenses are optional**: A signal may include zero, one, or multiple lenses simultaneously
- **Quality weighting**: Network rewards economically coherent, well-specified signals. Nothing is network-enforced at the schema level.
- **Provenance is required**: All signals must include `provenance.timestamp` for lineage tracking

### Examples

See `examples/usignal/` for complete examples:
- `basic-core-only.example.json` - Minimal signal with core fields only
- `equity-lens.example.json` - Equity signal with fundamental analysis
- `strategy-lens.example.json` - Strategy signal with greeks and hedging policy
- `multi-lens.example.json` - Signal with multiple lenses (macro + onchain)

For detailed lens field documentation, see [USS_LENSES_REFERENCE.md](./USS_LENSES_REFERENCE.md).

## Schema Strategy

### JSON Schema as Canonical Format

afi-config uses **JSON Schema (Draft 7+)** as the standard for all configuration validation. This provides:
- **Type safety**: Catch config errors before runtime
- **Documentation**: Schemas serve as living documentation
- **Tooling support**: IDE autocomplete, validation, and linting
- **Versioning**: Track schema evolution over time

### Schema Organization

All schemas live in the `schemas/` directory:

```
schemas/
├── blueprint.schema.json          # DAG/construct blueprints
├── character.schema.json          # Agent/character configs
├── pipeline.schema.json           # Pipeline configs
├── plugin-manifest.schema.json    # Plugin manifests
├── vault.schema.json              # T.S.S.D. Vault configs
└── .afi-codex.schema.json         # Codex metadata schema
```

### Example Configs

Example configuration files live in the `examples/` directory (when created):

```
examples/
├── character.example.json
├── pipeline.example.json
└── plugin-manifest.example.json
```

## Authoring Guidelines

### Adding a New Schema

1. **Create the schema file** in `schemas/` with naming convention: `<name>.schema.json`

2. **Use JSON Schema Draft 7+** structure:
   ```json
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "$id": "https://afi-protocol.org/schemas/<name>.schema.json",
     "title": "Descriptive Title",
     "type": "object",
     "required": ["field1", "field2"],
     "properties": {
       "field1": { "type": "string", "description": "..." },
       "field2": { "type": "number", "description": "..." }
     }
   }
   ```

3. **Add validation tests** in `tests/schema-validation.test.ts`

4. **Create example configs** in `examples/<name>.example.json`

5. **Update documentation**:
   - Add schema to this overview
   - Update `README.md` if needed
   - Document in consuming repo's docs

### Naming Conventions

- **Schemas**: `*.schema.json` (e.g., `character.schema.json`)
- **Examples**: `*.example.json` (e.g., `character.example.json`)
- **Templates**: `*.template.json` (e.g., `character.template.json`)

### Schema Design Principles

- **Keep schemas simple**: Start minimal, add complexity only when needed
- **Use clear descriptions**: Every field should have a `description`
- **Define required fields**: Be explicit about what's mandatory vs. optional
- **Use enums for fixed values**: Constrain values when there's a known set
- **Version schemas**: Include version info in `$id` or top-level `version` field

## Validation Story

### Automated Validation

The `tests/` directory contains automated schema validation using **AJV (Another JSON Schema Validator)**:

- **Schema compilation tests**: Ensure all schemas are valid JSON Schema
- **Metadata validation**: Validate `.afi-codex.json` against `.afi-codex.schema.json`
- **Example validation**: Validate example configs against their schemas

Run validation with:
```bash
npm test                    # Run all tests
npm run validate            # Run schema validation only
```

### CLI Utilities

The `cli_utils/` directory provides command-line tools for config validation:

- `codex_validator.ts`: Validate .afi-codex files against the schema
- Future: Config linters, formatters, and migration tools

## Schema Versioning

Schemas follow semantic versioning principles:

- **Major version**: Breaking changes (remove fields, change types)
- **Minor version**: Additive changes (new optional fields)
- **Patch version**: Documentation/description updates

Schema versions are tracked in:
- The `$id` field (e.g., `v1/character.schema.json`)
- The top-level `version` field in the schema
- Git tags in this repository

## Cross-Repo Dependencies

afi-config is a **foundational repository** with no dependencies on other AFI repos. All other repos depend on afi-config:

```
afi-config (foundational)
    ↓
    ├── afi-core (consumes character.schema.json)
    ├── afi-reactor (consumes pipeline.schema.json, blueprint.schema.json)
    ├── afi-infra (consumes vault.schema.json)
    ├── afi-plugins (consumes plugin-manifest.schema.json)
    ├── afi-ops (consumes ops-config.schema.json)
    └── afi-token (consumes token-config.schema.json)
```

## Future Enhancements

- **Schema registry**: Centralized schema discovery and versioning
- **Config migration tools**: Automated config upgrades between schema versions
- **Visual schema editor**: GUI for creating and editing schemas
- **Config linting**: Style and best practice enforcement
- **Template generator**: CLI tool to scaffold new configs from templates

