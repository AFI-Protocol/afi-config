// server/lensDetector.ts (v2p1)
export type Lens = "equity" | "strategy" | "macro" | "onchain" | "generic";

export function detectLens(payload: any): Lens {
  if (payload?.equity || payload?.lens === "equity") return "equity";
  if (payload?.strategy || payload?.lens === "strategy") return "strategy";
  if (payload?.macro || payload?.lens === "macro") return "macro";
  if (payload?.onchain || payload?.lens === "onchain") return "onchain";

  const hasTerminal = !!payload?.equity?.terminal || !!payload?.core?.terminalDiscipline;
  const hasPnL = typeof payload?.strategy?.pnlAfterFrictions === "number" || typeof payload?.pnlAfterFrictions === "number";
  const hasOnchainish = typeof payload?.onchain?.mevCost === "number" || typeof payload?.onchain?.gasCost === "number";
  const hasMacroish = Array.isArray(payload?.macro?.factorAttribution);

  if (hasTerminal) return "equity";
  if (hasPnL) return "strategy";
  if (hasOnchainish) return "onchain";
  if (hasMacroish) return "macro";
  return "generic";
}
