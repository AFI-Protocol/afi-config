import { z } from "zod";
export const zEquityLens = z.object({
  equity: z.object({
    entity: z.object({ ticker: z.string().optional(), asOf: z.string().optional() }).partial().optional(),
    deltaFCF: z.object({
      drivers: z.array(z.object({ name: z.string(), delta: z.number() })).optional(),
      reinvestment: z.object({ roiicIntangible: z.number().optional(), salesToCapital: z.number().optional() }).partial().optional(),
      frictions: z.object({ taxRate: z.number().optional() }).partial().optional(),
      capacityConstraints: z.array(z.string()).optional()
    }).partial().optional(),
    scenarios: z.object({ bear: z.record(z.any()).optional(), base: z.record(z.any()).optional(), bull: z.record(z.any()).optional() }).partial().optional(),
    terminal: z.object({ method: z.enum(["gordon","exit_multiple"]).optional(), g_stable: z.number().optional(), wacc: z.number().optional() }).partial().optional(),
    statementsReconciled: z.boolean().optional()
  }).strict()
});
export type EquityLens = z.infer<typeof zEquityLens>;
