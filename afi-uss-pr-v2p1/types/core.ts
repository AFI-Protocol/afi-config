import { z } from "zod";

export const zCore = z.object({
  cashProxy: z.enum(["delta_fcf","pnl","risk_reduction","capital_efficiency"]).optional(),
  measurement: z.object({
    window: z.string().optional(),
    lag: z.string().optional(),
    benchmark: z.string().optional()
  }).partial().optional(),
  frictions: z.object({
    fees: z.union([z.number(), z.string()]).optional(),
    slippage: z.union([z.number(), z.string()]).optional(),
    taxes: z.union([z.number(), z.string()]).optional(),
    latencyMs: z.number().optional()
  }).partial().optional(),
  capacityConstraints: z.array(z.string()).max(8).optional(),
  reinvestmentIntensity: z.object({
    roiicIntangible: z.number().optional(),
    salesToCapital: z.number().optional()
  }).partial().optional(),
  rights: z.object({
    mode: z.enum(["owned","licensed","public","restricted"]).optional(),
    exclusive: z.boolean().optional()
  }).partial().optional(),
  telemetry: z.object({
    decay: z.object({
      halfLifeDays: z.number().optional(),
      function: z.enum(["exp","power","custom"]).optional(),
      params: z.record(z.any()).optional()
    }).partial().optional(),
    greeks: z.object({
      thetaPerDay: z.number().optional(),
      deltaPer1pctPrice: z.number().optional(),
      vegaPer1vol: z.number().optional(),
      rhoPer1pctRate: z.number().optional(),
      gammaNote: z.string().optional(),
      asOf: z.string().optional(),
      method: z.enum(["bsm","surface_fit","finite_diff","path_sim","other"]).optional(),
      surfaceId: z.string().optional(),
      source: z.enum(["self","network"]).optional(),
      hedgePolicy: z.object({
        deltaBand: z.number().optional(),
        rollCadenceDays: z.number().optional(),
        notes: z.string().optional()
      }).partial().optional()
    }).partial().optional()
  }).partial().optional(),
  terminalDiscipline: z.object({
    method: z.enum(["gordon","exit_multiple"]).optional(),
    gStable: z.number().optional(),
    wacc: z.number().optional()
  }).partial().optional()
}).partial();

export type Core = z.infer<typeof zCore>;
