import { z } from "zod";
import { zCore } from "./core";
import { zEquityLens } from "./lenses/equity";
import { zStrategyLens } from "./lenses/strategy";
import { zMacroLens } from "./lenses/macro";
import { zOnchainLens } from "./lenses/onchain";

export const zUSS = z.object({
  schema: z.literal("afi.usignal.v1"),
  lens: z.enum(["equity","strategy","macro","onchain"]).optional(),
  core: zCore.optional(),
  lens_data: z.union([zEquityLens, zStrategyLens, zMacroLens, zOnchainLens]).optional(),
  provenance: z.object({
    datasetId: z.string().optional(),
    codeCommit: z.string().optional(),
    seed: z.union([z.string(), z.number()]).optional(),
    timestamp: z.string()
  })
});
export type USS = z.infer<typeof zUSS>;
