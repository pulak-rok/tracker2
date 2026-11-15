export interface RiskSimulationInput {
  riskPerTrade: number;
  rr: number;
  winRatePercent: number;
  numTrades: number;
  targetProfit: number;
}

export interface RiskSimulationResult {
  expectedValuePerTrade: number;
  breakEvenWinRate: number;
  expectedTotalProfit: number;
  estimatedWins: number;
  estimatedLosses: number;
  minWinsRequiredForTarget: number;
  totalRiskExposure: number;
  probabilityOfReachingTarget: number;
  isMathematicallyPossible: boolean;
}

function logFactorial(n: number): number {
  let sum = 0;
  for (let i = 2; i <= n; i++) {
    sum += Math.log(i);
  }
  return sum;
}

function binomialProbabilityAtLeastK(n: number, k: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  const logFactN = logFactorial(n);
  const logP = Math.log(p);
  const logOneMinusP = Math.log(1 - p);

  let totalProb = 0;
  for (let i = k; i <= n; i++) {
    const logComb = logFactN - logFactorial(i) - logFactorial(n - i);
    const logTerm = logComb + i * logP + (n - i) * logOneMinusP;
    totalProb += Math.exp(logTerm);
  }

  return Math.min(1, Math.max(0, totalProb));
}

export function simulateTradingEdge(input: RiskSimulationInput): RiskSimulationResult {
  const { riskPerTrade, rr, winRatePercent, numTrades, targetProfit } = input;
  const p = Math.min(1, Math.max(0, winRatePercent / 100));
  const q = 1 - p;

  const winAmount = riskPerTrade * rr;
  const expectedValuePerTrade = p * winAmount - q * riskPerTrade;
  const breakEvenWinRate = rr > 0 ? (1 / (1 + rr)) * 100 : 100;
  const expectedTotalProfit = expectedValuePerTrade * numTrades;

  const estimatedWins = Math.round(numTrades * p);
  const estimatedLosses = numTrades - estimatedWins;
  const totalRiskExposure = riskPerTrade * numTrades;

  const denominator = riskPerTrade * (rr + 1);
  const minWinsRequiredForTarget =
    denominator > 0
      ? Math.max(0, Math.ceil((targetProfit + numTrades * riskPerTrade) / denominator))
      : numTrades + 1;

  const isMathematicallyPossible = minWinsRequiredForTarget <= numTrades;
  const prob = isMathematicallyPossible
    ? binomialProbabilityAtLeastK(numTrades, minWinsRequiredForTarget, p) * 100
    : 0;

  return {
    expectedValuePerTrade,
    breakEvenWinRate,
    expectedTotalProfit,
    estimatedWins,
    estimatedLosses,
    minWinsRequiredForTarget,
    totalRiskExposure,
    probabilityOfReachingTarget: prob,
    isMathematicallyPossible,
  };
}
