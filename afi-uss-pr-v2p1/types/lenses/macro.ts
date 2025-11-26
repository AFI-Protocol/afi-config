import { z } from "zod";
export const zMacroLens = z.object({
  macro: z.object({
    regimeTag: z.string().optional(),
    factorAttribution: z.array(z.record(z.any())).optional(),
    financingRate: z.number().optional()
  }).strict()
});
export type MacroLens = z.infer<typeof zMacroLens>;
