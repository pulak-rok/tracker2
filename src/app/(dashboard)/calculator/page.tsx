"use client";

import { useState } from "react";
import { simulateTradingEdge, RiskSimulationInput } from "@/lib/math/probability";
import { formatCurrency } from "@/lib/utils";
import { Calculator, AlertCircle } from "lucide-react";

export default function CalculatorPage() {
  const [riskPerTrade, setRiskPerTrade] = useState("100");
  const [rr, setRr] = useState("2.0");
  const [winRate, setWinRate] = useState("55");
  const [numTrades, setNumTrades] = useState("50");
  const [targetProfit, setTargetProfit] = useState("5000");

  const input: RiskSimulationInput = {
    riskPerTrade: parseFloat(riskPerTrade) || 0,
    rr: parseFloat(rr) || 0,
    winRatePercent: parseFloat(winRate) || 0,
    numTrades: parseInt(numTrades) || 0,
    targetProfit: parseFloat(targetProfit) || 0,
  };

  const result = simulateTradingEdge(input);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Risk & Probability Calculator</h1>
        <p className="text-xs text-gray-400 mt-1">Simulate binomial probability and expected value for your trading edge.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 space-y-4 shadow-xl text-xs">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-profit" /> Parameters
          </h2>

          <div>
            <label className="block text-gray-400 mb-1">Risk per Trade ($)</label>
            <input
              type="number"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(e.target.value)}
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Risk-to-Reward Ratio (1:RR)</label>
            <input
              type="number"
              step="0.1"
              value={rr}
              onChange={(e) => setRr(e.target.value)}
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Win Rate Assumption (%)</label>
            <input
              type="number"
              step="0.1"
              value={winRate}
              onChange={(e) => setWinRate(e.target.value)}
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Number of Trades</label>
            <input
              type="number"
              value={numTrades}
              onChange={(e) => setNumTrades(e.target.value)}
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Target Profit ($)</label>
            <input
              type="number"
              value={targetProfit}
              onChange={(e) => setTargetProfit(e.target.value)}
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white font-mono"
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-1">Simulation Results (Statistical Estimate)</h2>
            <p className="text-[11px] text-gray-400 mb-4">
              Computed via an exact binomial model assuming independent trades and fixed R-multiples. Not a guarantee of future returns.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-terminal-elevated/50 p-4 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Probability of Target</span>
                <p className="text-2xl font-bold font-mono text-profit mt-1">
                  {result.probabilityOfReachingTarget.toFixed(1)}%
                </p>
              </div>

              <div className="bg-terminal-elevated/50 p-4 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Expected Value / Trade</span>
                <p className={`text-2xl font-bold font-mono mt-1 ${result.expectedValuePerTrade >= 0 ? "text-profit" : "text-loss"}`}>
                  {formatCurrency(result.expectedValuePerTrade, "USD", true)}
                </p>
              </div>

              <div className="bg-terminal-elevated/50 p-4 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Break-Even Win Rate</span>
                <p className="text-2xl font-bold font-mono text-white mt-1">
                  {result.breakEvenWinRate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-terminal-elevated/50 p-4 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Expected Total Profit</span>
                <p className={`text-xl font-bold font-mono mt-1 ${result.expectedTotalProfit >= 0 ? "text-profit" : "text-loss"}`}>
                  {formatCurrency(result.expectedTotalProfit, "USD", true)}
                </p>
              </div>

              <div className="bg-terminal-elevated/50 p-4 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Min Wins Required</span>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  {result.minWinsRequiredForTarget} / {numTrades}
                </p>
              </div>

              <div className="bg-terminal-elevated/50 p-4 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Total Risk Exposure</span>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  {formatCurrency(result.totalRiskExposure)}
                </p>
              </div>
            </div>

            {!result.isMathematicallyPossible && (
              <div className="mt-6 p-4 bg-loss-muted border border-loss-border rounded-lg flex items-center gap-3 text-loss text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Target is mathematically impossible to reach in {numTrades} trades with current parameters. Increase trades or RR.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
