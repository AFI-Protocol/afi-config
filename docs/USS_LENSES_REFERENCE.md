# AFI Universal Signal Schema (USS) - Lenses Reference

This document provides detailed reference information for all USS lens schemas.

## Overview

USS lenses are **optional, structured extensions** to the core universal signal envelope. They provide domain-specific fields for different signal types while maintaining a common core structure.

A signal may include:
- **Zero lenses**: Core-only signal (generic)
- **One lens**: Domain-specific signal (equity, strategy, macro, or onchain)
- **Multiple lenses**: Hybrid signal combining multiple domains (e.g., macro + onchain)

## Core Schema

**File**: `schemas/usignal/v1/core.schema.json`

The core schema provides cross-cutting fields applicable to all signal types:

### Cash Proxy
- `cashProxy`: Primary cash flow proxy method
  - `delta_fcf`: Delta free cash flow
  - `pnl`: Profit and loss
  - `risk_reduction`: Risk reduction value
  - `capital_efficiency`: Capital efficiency metric

### Measurement
- `measurement.window`: Time window (ISO 8601 duration, e.g., `P365D` for 365 days)
- `measurement.lag`: Data lag/lookback period
- `measurement.benchmark`: Comparison benchmark (e.g., `S&P500`, `BTC`)

### Frictions
- `frictions.fees`: Fee amount or description
- `frictions.slippage`: Slippage amount or model
- `frictions.taxes`: Tax amount or model
- `frictions.latencyMs`: Execution latency in milliseconds

### Capacity & Reinvestment
- `capacityConstraints`: Array of human-readable capacity constraint strings
- `reinvestmentIntensity.roiicIntangible`: Return on invested intangible capital
- `reinvestmentIntensity.salesToCapital`: Sales to capital ratio

### Rights
- `rights.mode`: Data rights mode (`owned`, `licensed`, `public`, `restricted`)
- `rights.exclusive`: Whether rights are exclusive

### Telemetry
- `telemetry.decay.halfLifeDays`: Signal half-life in days
- `telemetry.decay.function`: Decay function (`exp`, `power`, `custom`)
- `telemetry.decay.params`: Additional decay parameters

### Greeks (Optional, Cross-Cutting)
- `telemetry.greeks.thetaPerDay`: Time decay per day
- `telemetry.greeks.deltaPer1pctPrice`: Delta per 1% price change
- `telemetry.greeks.vegaPer1vol`: Vega per 1 vol point
- `telemetry.greeks.rhoPer1pctRate`: Rho per 1% rate change
- `telemetry.greeks.asOf`: Timestamp when greeks were calculated
- `telemetry.greeks.method`: Calculation method (`bsm`, `surface_fit`, `finite_diff`, `path_sim`, `other`)
- `telemetry.greeks.surfaceId`: Volatility surface identifier
- `telemetry.greeks.source`: Source of calculation (`self`, `network`)
- `telemetry.greeks.hedgePolicy`: Hedging policy configuration

### Terminal Discipline
- `terminalDiscipline.method`: Terminal value method (`gordon`, `exit_multiple`)
- `terminalDiscipline.gStable`: Stable growth rate (Gordon model)
- `terminalDiscipline.wacc`: Weighted average cost of capital

## Equity Lens

**File**: `schemas/usignal/v1/lenses/equity.lens.schema.json`

**Purpose**: Traditional equity and credit instruments with fundamental analysis

### Field Categories

#### Entity Identification
- `equity.entity.ticker`: Stock ticker symbol
- `equity.entity.asOf`: As-of date for entity data

#### Delta FCF Analysis
- `equity.deltaFCF.drivers[]`: Array of FCF drivers
  - `name`: Driver name (e.g., `price`, `volume`, `unit_cost`)
  - `delta`: Delta value for this driver
- `equity.deltaFCF.reinvestment`: Reinvestment metrics
- `equity.deltaFCF.frictions.taxRate`: Effective tax rate
- `equity.deltaFCF.capacityConstraints[]`: Capacity constraint descriptions

#### Scenario Analysis
- `equity.scenarios`: Scenario modeling (bear/base/bull or custom)

#### Terminal Value
- `equity.terminal.method`: Terminal value method
- `equity.terminal.g_stable`: Stable growth rate
- `equity.terminal.wacc`: Weighted average cost of capital

#### Reconciliation
- `equity.statementsReconciled`: Whether financial statements are reconciled

### Use Cases
- Fundamental equity analysis
- DCF valuation models
- Credit analysis
- Issuer-style valuations

## Strategy Lens

**File**: `schemas/usignal/v1/lenses/strategy.lens.schema.json`

**Purpose**: After-friction P&L and trading strategy signals

### Field Categories

#### Asset & P&L
- `strategy.asset`: Asset or instrument identifier
- `strategy.pnlAfterFrictions`: P&L after all frictions

#### Friction Breakdown
- `strategy.frictions.hedgingCosts`: Hedging costs
- `strategy.frictions.fundingCosts`: Funding costs

#### Capacity
- `strategy.capacity.maxNotional`: Maximum notional size
- `strategy.capacity.slippageAtSizeBps`: Slippage at max size in basis points

#### Notes
- `strategy.notes`: Additional strategy notes

### Use Cases
- Quantitative trading strategies
- Options strategies
- Arbitrage signals
- Market-making strategies

## Macro Lens

**File**: `schemas/usignal/v1/lenses/macro.lens.schema.json`

**Purpose**: Macroeconomic regime and factor attribution signals

### Field Categories

#### Regime
- `macro.regimeTag`: Macroeconomic regime identifier (e.g., `expansion`, `contraction`, `stagflation`)

#### Factor Attribution
- `macro.factorAttribution[]`: Array of factor contributions
  - Each item describes a factor and its contribution

#### Financing
- `macro.financingRate`: Relevant financing rate

### Use Cases
- Macro regime signals
- Factor models
- Economic cycle analysis
- Cross-asset allocation

## On-chain Lens

**File**: `schemas/usignal/v1/lenses/onchain.lens.schema.json`

**Purpose**: Blockchain microstructure and execution signals

### Field Categories

#### Costs
- `onchain.mevCost`: MEV (Maximal Extractable Value) cost
- `onchain.gasCost`: Gas cost for execution

#### Liquidity
- `onchain.poolDepthAt1pct`: Pool depth at 1% price impact

#### Latency & Access
- `onchain.oracleLatencyMs`: Oracle latency in milliseconds
- `onchain.privateOrderflowAccess`: Whether private orderflow access is available

### Use Cases
- DeFi execution signals
- MEV analysis
- On-chain liquidity analysis
- Oracle-based strategies

## Combining Lenses

Signals can include multiple lenses simultaneously. For example, a macro + onchain signal might analyze:
- Macro regime impact on DeFi yields
- Cross-chain arbitrage opportunities during regime shifts
- On-chain execution costs in different macro environments

When combining lenses:
1. Set `lens` field to the primary lens type
2. Include all relevant lens objects
3. Ensure core fields are coherent across lenses
4. Document the multi-lens rationale in provenance or metadata

## Validation

All lens schemas are validated using AJV (Another JSON Schema Validator) with JSON Schema Draft 07.

To validate a signal:
```bash
npm run validate
```

See `tests/schema-validation.test.ts` for validation test examples.

