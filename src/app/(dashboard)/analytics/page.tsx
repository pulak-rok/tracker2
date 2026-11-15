"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DailyRecord, Trade } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";

export default function AnalyticsPage() {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const { data: dData } = await supabase
      .from("daily_records")
      .select("*")
      .order("trade_date", { ascending: true });
    const { data: tData } = await supabase.from("trades").select("*");

    setRecords(dData || []);
    setTrades(tData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-profit" />
      </div>
    );
  }

  const totalPnl = records.reduce((s, r) => s + Number(r.net_pl), 0);
  const totalWins = records.reduce((s, r) => s + Number(r.wins), 0);
  const totalLosses = records.reduce((s, r) => s + Number(r.losses), 0);
  const totalBE = records.reduce((s, r) => s + Number(r.break_evens), 0);
  const totalCount = totalWins + totalLosses + totalBE;
  const winRate = totalCount > 0 ? (totalWins / totalCount) * 100 : 0;

  const grossProfit = records.reduce((s, r) => s + Number(r.gross_profit), 0);
  const grossLoss = records.reduce((s, r) => s + Number(r.gross_loss), 0);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  const winningTrades = trades.filter((t) => t.outcome === "WIN");
  const losingTrades = trades.filter((t) => t.outcome === "LOSS");
  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((s, t) => s + Number(t.pnl), 0) / winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((s, t) => s + Number(t.pnl), 0)) / losingTrades.length
      : 0;

  const bestDay = records.length > 0 ? Math.max(...records.map((r) => Number(r.net_pl))) : 0;
  const worstDay = records.length > 0 ? Math.min(...records.map((r) => Number(r.net_pl))) : 0;

  // Session breakdown
  const sessions = ["London", "New York", "Asian", "Other"];
  const sessionData = sessions.map((sess) => {
    const sessRecs = records.filter((r) => r.session === sess);
    const net = sessRecs.reduce((s, r) => s + Number(r.net_pl), 0);
    return { session: sess, netPnl: Number(net.toFixed(2)) };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Performance Analytics</h1>
        <p className="text-xs text-gray-400 mt-1">Deep statistical breakdown across all roadmaps and sessions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Total Net P/L</span>
          <p className={`text-xl font-bold font-mono mt-1 ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {formatCurrency(totalPnl, "USD", true)}
          </p>
        </div>
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Win Rate</span>
          <p className="text-xl font-bold font-mono text-white mt-1">{winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Profit Factor</span>
          <p className="text-xl font-bold font-mono text-profit mt-1">{profitFactor.toFixed(2)}</p>
        </div>
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Record (W/L/BE)</span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {totalWins} / {totalLosses} / {totalBE}
          </p>
        </div>
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Avg Win</span>
          <p className="text-lg font-bold font-mono text-profit mt-1">{formatCurrency(avgWin)}</p>
        </div>
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Avg Loss</span>
          <p className="text-lg font-bold font-mono text-loss mt-1">{formatCurrency(avgLoss)}</p>
        </div>
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Best Day</span>
          <p className="text-lg font-bold font-mono text-profit mt-1">{formatCurrency(bestDay, "USD", true)}</p>
        </div>
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Worst Day</span>
          <p className="text-lg font-bold font-mono text-loss mt-1">{formatCurrency(worstDay, "USD", true)}</p>
        </div>
      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-white mb-4">Performance by Trading Session</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222634" />
              <XAxis dataKey="session" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#11131A",
                  borderColor: "#222634",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="netPnl" name="Net P/L ($)" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
