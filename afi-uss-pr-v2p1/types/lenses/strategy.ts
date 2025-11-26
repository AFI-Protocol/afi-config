import { z } from "zod";
export const zStrategyLens = z.object({
  strategy: z.object({
    asset: z.string().optional(),
    pnlAfterFrictions: z.number().optional(),
    frictions: z.object({ hedgingCosts: z.number().optional(), fundingCosts: z.number().optional() }).partial().optional(),
    capacity: z.object({ maxNotional: z.number().optional(), slippageAtSizeBps: z.number().optional() }).partial().optional(),
    notes: z.string().optional()
  }).strict()
});
export type StrategyLens = z.infer<typeof zStrategyLens>;
