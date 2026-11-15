import { differenceInCalendarDays, eachDayOfInterval, isWeekend, parseISO } from "date-fns";
import type { DailyRecord, Roadmap } from "@/types/database";

export interface RoadmapMetrics {
  profitRequired: number;
  remainingProfit: number;
  completionPercentage: number;
  rawPercentage: number;
  currentBalance: number;
  profitPerWinningTrade: number;
  breakEvenWinRate: number;
  expectedProfitPerTrade: number | null;
  requiredWinsZeroLosses: number;
  remainingCalendarDays: number;
  remainingTradingDays: number;
  dailyAverageProfitNeeded: number;
  winRate: number;
  maxDrawdownHit: number;
  isDrawdownBreached: boolean;
  currentNetPnl: number;
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  totalBreakEvens: number;
}

export function calculateRoadmapMetrics(
  roadmap: Roadmap,
  dailyRecords: DailyRecord[] = []
): RoadmapMetrics {
  const target = Number(roadmap.profit_target);
  const startBal = Number(roadmap.starting_balance);
  const risk = Number(roadmap.risk_per_trade);
  const rr = Number(roadmap.rr_ratio);
  const winRateAssumption = roadmap.win_rate_assumption ? Number(roadmap.win_rate_assumption) : undefined;

  let currentNetPnl = 0;
  let totalTrades = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalBreakEvens = 0;

  for (const rec of dailyRecords) {
    if (rec.roadmap_id === roadmap.id) {
      currentNetPnl += Number(rec.net_pl);
      totalTrades += Number(rec.total_trades);
      totalWins += Number(rec.wins);
      totalLosses += Number(rec.losses);
      totalBreakEvens += Number(rec.break_evens);
    }
  }

  const profitRequired = Math.max(0, target - currentNetPnl);
  const rawPercentage = target > 0 ? (currentNetPnl / target) * 100 : 0;
  const completionPercentage = Math.min(100, Math.max(0, rawPercentage));
  const currentBalance = startBal + currentNetPnl;

  const profitPerWinningTrade = risk * rr;
  const breakEvenWinRate = rr > 0 ? (1 / (1 + rr)) * 100 : 100;

  let expectedProfitPerTrade: number | null = null;
  if (winRateAssumption !== undefined && !Number.isNaN(winRateAssumption)) {
    const pWin = Math.min(1, Math.max(0, winRateAssumption / 100));
    const pLoss = 1 - pWin;
    expectedProfitPerTrade = pWin * profitPerWinningTrade - pLoss * risk;
  }

  const requiredWinsZeroLosses =
    profitPerWinningTrade > 0 ? Math.ceil(profitRequired / profitPerWinningTrade) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = parseISO(roadmap.target_date);

  let remainingCalendarDays = 0;
  let remainingTradingDays = 0;

  if (targetDate >= today) {
    remainingCalendarDays = differenceInCalendarDays(targetDate, today) + 1;
    const intervalDays = eachDayOfInterval({ start: today, end: targetDate });
    remainingTradingDays = intervalDays.filter((d) => !isWeekend(d)).length;
  }

  const dailyAverageProfitNeeded =
    remainingTradingDays > 0 ? profitRequired / remainingTradingDays : profitRequired;

  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

  let peak = 0;
  let running = 0;
  let maxDrawdownHit = 0;
  const sorted = [...dailyRecords]
    .filter((r) => r.roadmap_id === roadmap.id)
    .sort((a, b) => a.trade_date.localeCompare(b.trade_date));

  for (const rec of sorted) {
    running += Number(rec.net_pl);
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDrawdownHit) maxDrawdownHit = dd;
  }

  const isDrawdownBreached =
    roadmap.max_drawdown !== null &&
    maxDrawdownHit >= Number(roadmap.max_drawdown);

  return {
    profitRequired,
    remainingProfit: profitRequired,
    completionPercentage,
    rawPercentage,
    currentBalance,
    profitPerWinningTrade,
    breakEvenWinRate,
    expectedProfitPerTrade,
    requiredWinsZeroLosses,
    remainingCalendarDays,
    remainingTradingDays,
    dailyAverageProfitNeeded,
    winRate,
    maxDrawdownHit,
    isDrawdownBreached,
    currentNetPnl,
    totalTrades,
    totalWins,
    totalLosses,
    totalBreakEvens,
  };
}
