import { z } from "zod";
export const zOnchainLens = z.object({
  onchain: z.object({
    mevCost: z.number().optional(),
    gasCost: z.number().optional(),
    poolDepthAt1pct: z.number().optional(),
    oracleLatencyMs: z.number().optional(),
    privateOrderflowAccess: z.boolean().optional()
  }).strict()
});
export type OnchainLens = z.infer<typeof zOnchainLens>;
