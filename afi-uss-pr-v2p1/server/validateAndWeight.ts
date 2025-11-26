// server/validateAndWeight.ts (v2p1)
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { detectLens, Lens } from "./lensDetector";
import fs from "node:fs";
import path from "node:path";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const base = path.join(__dirname, "..", "schema", "usignal", "v1");
const indexSchema = JSON.parse(fs.readFileSync(path.join(base, "index.schema.json"), "utf8"));
const coreSchema = JSON.parse(fs.readFileSync(path.join(base, "core.schema.json"), "utf8"));
const eqSchema = JSON.parse(fs.readFileSync(path.join(base, "lenses", "equity.schema.json"), "utf8"));
const stSchema = JSON.parse(fs.readFileSync(path.join(base, "lenses", "strategy.schema.json"), "utf8"));
const maSchema = JSON.parse(fs.readFileSync(path.join(base, "lenses", "macro.schema.json"), "utf8"));
const ocSchema = JSON.parse(fs.readFileSync(path.join(base, "lenses", "onchain.schema.json"), "utf8"));

ajv.addSchema(coreSchema, "core.schema.json");
ajv.addSchema(eqSchema, "lenses/equity.schema.json");
ajv.addSchema(stSchema, "lenses/strategy.schema.json");
ajv.addSchema(maSchema, "lenses/macro.schema.json");
ajv.addSchema(ocSchema, "lenses/onchain.schema.json");

const validateRoot = ajv.compile(indexSchema);

export function validateUSS(payload: any) {
  const ok = validateRoot(payload);
  return { ok, errors: validateRoot.errors ?? [] };
}

export function weightQuality(payload: any) {
  const lens = (payload.lens as Lens) ?? detectLens(payload);
  let score = 0;
  const reasons: string[] = [];

  // Universal Core checks
  if (payload.core?.cashProxy) score += 1; else reasons.push("missing core.cashProxy");
  if (payload.core?.measurement?.window) score += 0.5; else reasons.push("missing measurement.window");
  if (payload.core?.frictions) score += 0.5;
  if (Array.isArray(payload.core?.capacityConstraints)) score += 0.5;
  if (payload.provenance?.timestamp) score += 0.5;
  if (payload.core?.telemetry?.decay?.halfLifeDays) score += 0.5;

  // Bonus for well-specified, verifiable greeks (optional)
  const g = payload.core?.telemetry?.greeks;
  if (g && g.asOf && g.method) score += 0.5;

  // Lens-specific
  if (lens === "equity") {
    if (payload.equity?.deltaFCF) score += 1;
    const tv = payload.equity?.terminal || payload.core?.terminalDiscipline;
    if (tv?.method && typeof tv?.g_stable === "number" && typeof tv?.wacc === "number") {
      if (tv.g_stable <= 0.05) score += 0.5; else reasons.push("terminal g_stable > nominal GDP guardrail (5% default)");
    }
  }
  if (lens === "strategy") {
    if (typeof payload.strategy?.pnlAfterFrictions === "number") score += 1;
    if (payload.strategy?.frictions) score += 0.5;
    if (payload.strategy?.capacity) score += 0.5;
  }
  if (lens === "onchain") {
    if (typeof payload.onchain?.mevCost === "number" && typeof payload.onchain?.gasCost === "number") score += 1;
  }
  if (lens === "macro") {
    if (Array.isArray(payload.macro?.factorAttribution)) score += 1;
  }

  return { lens, score, reasons };
}
