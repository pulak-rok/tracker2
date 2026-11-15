"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trade } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";

export default function TradeHistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [sessionFilter, setSessionFilter] = useState("ALL");
  const supabase = createClient();

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trades")
      .select("*, roadmaps(name)")
      .order("created_at", { ascending: false });
    setTrades(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const filtered = trades.filter((t) => {
    if (symbolFilter && !t.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) return false;
    if (outcomeFilter !== "ALL" && t.outcome !== outcomeFilter) return false;
    if (sessionFilter !== "ALL" && t.session !== sessionFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-profit" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Trade History Ledger</h1>
        <p className="text-xs text-gray-400 mt-1">Search and filter every executed trade across all roadmaps.</p>
      </div>

      <div className="flex flex-wrap gap-3 bg-terminal-surface border border-terminal-border p-4 rounded-xl text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter by symbol (e.g. XAUUSD)..."
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="w-full bg-terminal-elevated border border-terminal-border rounded-lg pl-9 pr-3 py-2 text-white"
          />
        </div>
        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="bg-terminal-elevated border border-terminal-border rounded-lg px-3 py-2 text-white"
        >
          <option value="ALL">All Outcomes</option>
          <option value="WIN">WIN</option>
          <option value="LOSS">LOSS</option>
          <option value="BE">BREAK-EVEN</option>
        </select>
        <select
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          className="bg-terminal-elevated border border-terminal-border rounded-lg px-3 py-2 text-white"
        >
          <option value="ALL">All Sessions</option>
          <option value="London">London</option>
          <option value="New York">New York</option>
          <option value="Asian">Asian</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">No matching trades found.</p>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-terminal-border text-gray-400 font-mono uppercase text-[10px]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Roadmap</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4">Net P/L</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-terminal-elevated/40">
                  <td className="py-3 px-4 font-mono text-gray-400">{t.trade_no}</td>
                  <td className="py-3 px-4 text-gray-300">{t.roadmaps?.name || "—"}</td>
                  <td className="py-3 px-4 font-mono font-bold text-white">{t.symbol}</td>
                  <td className="py-3 px-4 text-gray-300">{t.session || "—"}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        t.outcome === "WIN"
                          ? "bg-profit-muted text-profit"
                          : t.outcome === "LOSS"
                          ? "bg-loss-muted text-loss"
                          : "bg-breakeven-muted text-breakeven"
                      }`}
                    >
                      {t.outcome}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-300">{formatCurrency(Number(t.risk_amount))}</td>
                  <td
                    className={`py-3 px-4 font-mono font-bold ${
                      Number(t.pnl) > 0 ? "text-profit" : Number(t.pnl) < 0 ? "text-loss" : "text-breakeven"
                    }`}
                  >
                    {formatCurrency(Number(t.pnl), "USD", true)}
                  </td>
                  <td className="py-3 px-4 text-gray-400 max-w-xs truncate">{t.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
