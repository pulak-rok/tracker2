"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Roadmap, DailyRecord, TradingSession, TradeOutcome } from "@/types/database";
import { calculateRoadmapMetrics } from "@/lib/math/roadmap-calculations";
import { formatCurrency } from "@/lib/utils";
import { CircularProgress } from "@/components/roadmap/CircularProgress";
import { AnimatedRoadmapTrack } from "@/components/roadmap/AnimatedRoadmapTrack";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
  Archive,
  Copy,
} from "lucide-react";
import Link from "next/link";

interface TradeDraft {
  symbol: string;
  session: TradingSession;
  outcome: TradeOutcome;
  risk_amount: string;
  rr_achieved: string;
  pnl: string;
  notes: string;
}

export default function RoadmapDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roadmapId = params.id as string;
  const supabase = createClient();

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Daily record modal state
  const [entryMode, setEntryMode] = useState<"detailed" | "summary">("detailed");
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split("T")[0]);
  const [session, setSession] = useState<TradingSession>("New York");
  const [dayNotes, setDayNotes] = useState("");

  // Quick summary fields
  const [sumTrades, setSumTrades] = useState("1");
  const [sumWins, setSumWins] = useState("1");
  const [sumLosses, setSumLosses] = useState("0");
  const [sumBE, setSumBE] = useState("0");
  const [sumProfit, setSumProfit] = useState("0");
  const [sumLoss, setSumLoss] = useState("0");

  // Detailed trades draft
  const [tradeDrafts, setTradeDrafts] = useState<TradeDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    const { data: rData } = await supabase
      .from("roadmaps")
      .select("*")
      .eq("id", roadmapId)
      .single();

    const { data: dData } = await supabase
      .from("daily_records")
      .select("*, trades(*)")
      .eq("roadmap_id", roadmapId)
      .order("trade_date", { ascending: true });

    setRoadmap(rData);
    setDailyRecords(dData || []);
    setLoading(false);
  }, [roadmapId, supabase]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const openModalWithDefaultTrade = () => {
    if (!roadmap) return;
    const defaultRisk = Number(roadmap.risk_per_trade);
    const defaultRR = Number(roadmap.rr_ratio);
    setTradeDrafts([
      {
        symbol: "XAUUSD",
        session: "New York",
        outcome: "WIN",
        risk_amount: String(defaultRisk),
        rr_achieved: String(defaultRR),
        pnl: String((defaultRisk * defaultRR).toFixed(2)),
        notes: "",
      },
    ]);
    setShowRecordModal(true);
  };

  const addTradeRow = () => {
    if (!roadmap) return;
    const defaultRisk = Number(roadmap.risk_per_trade);
    const defaultRR = Number(roadmap.rr_ratio);
    setTradeDrafts((prev) => [
      ...prev,
      {
        symbol: "XAUUSD",
        session: session,
        outcome: "WIN",
        risk_amount: String(defaultRisk),
        rr_achieved: String(defaultRR),
        pnl: String((defaultRisk * defaultRR).toFixed(2)),
        notes: "",
      },
    ]);
  };

  const updateTradeDraft = (idx: number, field: keyof TradeDraft, value: string) => {
    setTradeDrafts((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        const updated = { ...t, [field]: value };
        const r = parseFloat(updated.risk_amount) || 0;
        const rr = parseFloat(updated.rr_achieved) || (roadmap ? Number(roadmap.rr_ratio) : 2);
        if (field === "outcome") {
          if (value === "WIN") updated.pnl = String((r * rr).toFixed(2));
          else if (value === "LOSS") updated.pnl = String((-r).toFixed(2));
          else updated.pnl = "0";
        }
        return updated;
      })
    );
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmap) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (entryMode === "summary") {
      const w = parseInt(sumWins) || 0;
      const l = parseInt(sumLosses) || 0;
      const b = parseInt(sumBE) || 0;
      const tot = parseInt(sumTrades) || w + l + b;

      const { error } = await supabase.from("daily_records").insert({
        user_id: user.id,
        roadmap_id: roadmap.id,
        trade_date: tradeDate,
        entry_mode: "summary",
        session,
        total_trades: tot,
        wins: w,
        losses: l,
        break_evens: b,
        gross_profit: parseFloat(sumProfit) || 0,
        gross_loss: parseFloat(sumLoss) || 0,
        notes: dayNotes || null,
      });

      setSubmitting(false);
      if (error) {
        alert(error.message);
      } else {
        setShowRecordModal(false);
        fetchDetails();
      }
    } else {
      const payload = tradeDrafts.map((t) => ({
        symbol: t.symbol.toUpperCase() || "XAUUSD",
        session: t.session,
        outcome: t.outcome,
        risk_amount: parseFloat(t.risk_amount) || 0,
        rr_achieved: t.rr_achieved ? parseFloat(t.rr_achieved) : null,
        pnl: parseFloat(t.pnl) || 0,
        notes: t.notes,
      }));

      const { error } = await supabase.rpc("create_detailed_day", {
        p_roadmap_id: roadmap.id,
        p_trade_date: tradeDate,
        p_session: session,
        p_notes: dayNotes,
        p_trades: payload,
      });

      setSubmitting(false);
      if (error) {
        alert(error.message);
      } else {
        setShowRecordModal(false);
        fetchDetails();
      }
    }
  };

  const handleDeleteDay = async (id: string) => {
    if (!confirm("Delete this trading day and all its trades?")) return;
    await supabase.from("daily_records").delete().eq("id", id);
    fetchDetails();
  };

  const handleDuplicateRoadmap = async () => {
    if (!roadmap) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("roadmaps").insert({
      user_id: user.id,
      name: `${roadmap.name} (Copy)`,
      profit_target: roadmap.profit_target,
      starting_balance: roadmap.starting_balance,
      risk_per_trade: roadmap.risk_per_trade,
      rr_ratio: roadmap.rr_ratio,
      win_rate_assumption: roadmap.win_rate_assumption,
      start_date: roadmap.start_date,
      target_date: roadmap.target_date,
      max_drawdown: roadmap.max_drawdown,
      daily_trade_limit: roadmap.daily_trade_limit,
      notes: roadmap.notes,
      status: "active",
    });
    if (!error) router.push("/roadmaps");
  };

  const handleArchiveToggle = async () => {
    if (!roadmap) return;
    const nextStatus = roadmap.status === "archived" ? "active" : "archived";
    await supabase.from("roadmaps").update({ status: nextStatus }).eq("id", roadmap.id);
    fetchDetails();
  };

  const handleDeleteRoadmap = async () => {
    if (!roadmap || !confirm("Permanently delete this roadmap and all records?")) return;
    await supabase.from("roadmaps").delete().eq("id", roadmap.id);
    router.push("/roadmaps");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-profit" />
      </div>
    );
  }

  if (!roadmap) {
    return <div className="text-gray-400">Roadmap not found.</div>;
  }

  const metrics = calculateRoadmapMetrics(roadmap, dailyRecords);

  // Build cumulative chart series
  let cumulative = 0;
  const chartData = [
    { date: roadmap.start_date, dailyPnl: 0, cumulative: 0 },
    ...dailyRecords.map((rec) => {
      cumulative += Number(rec.net_pl);
      return {
        date: rec.trade_date,
        dailyPnl: Number(rec.net_pl),
        cumulative: Number(cumulative.toFixed(2)),
      };
    }),
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/roadmaps"
            className="p-2 rounded-lg bg-terminal-surface border border-terminal-border hover:border-profit text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">{roadmap.name}</h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-terminal-elevated text-gray-400 border border-terminal-border">
                {roadmap.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Target: {formatCurrency(roadmap.profit_target)} | Risk: {formatCurrency(roadmap.risk_per_trade)} (1:{roadmap.rr_ratio} RR)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openModalWithDefaultTrade}
            className="bg-profit hover:bg-profit/90 text-black font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-profit/10"
          >
            <Plus className="w-4 h-4" /> Add Daily Record
          </button>
          <button
            onClick={handleDuplicateRoadmap}
            title="Duplicate Roadmap"
            className="p-2 rounded-lg bg-terminal-surface border border-terminal-border hover:border-terminal-hover text-gray-300"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleArchiveToggle}
            title="Archive / Unarchive"
            className="p-2 rounded-lg bg-terminal-surface border border-terminal-border hover:border-terminal-hover text-gray-300"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteRoadmap}
            title="Delete Roadmap"
            className="p-2 rounded-lg bg-terminal-surface border border-terminal-border hover:border-loss text-loss"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {metrics.isDrawdownBreached && (
        <div className="p-4 bg-loss-muted border border-loss-border rounded-xl flex items-center gap-3 text-loss text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>
            Maximum allowed drawdown ({formatCurrency(Number(roadmap.max_drawdown))}) has been reached or exceeded (Current Max DD: {formatCurrency(metrics.maxDrawdownHit)}).
          </span>
        </div>
      )}

      {/* Progress & Visual Track */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
          <div className="flex justify-center">
            <CircularProgress percentage={metrics.completionPercentage} size={140} />
          </div>
          <div className="lg:col-span-3 space-y-4">
            <AnimatedRoadmapTrack percentage={metrics.completionPercentage} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-terminal-elevated/50 p-3 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Current Net P/L</span>
                <p className={`text-base font-bold font-mono mt-0.5 ${metrics.currentNetPnl >= 0 ? "text-profit" : "text-loss"}`}>
                  {formatCurrency(metrics.currentNetPnl, "USD", true)}
                </p>
              </div>
              <div className="bg-terminal-elevated/50 p-3 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Remaining Target</span>
                <p className="text-base font-bold font-mono text-white mt-0.5">
                  {formatCurrency(metrics.remainingProfit)}
                </p>
              </div>
              <div className="bg-terminal-elevated/50 p-3 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Current Balance</span>
                <p className="text-base font-bold font-mono text-white mt-0.5">
                  {formatCurrency(metrics.currentBalance)}
                </p>
              </div>
              <div className="bg-terminal-elevated/50 p-3 rounded-lg border border-terminal-border">
                <span className="text-[10px] text-gray-400 uppercase">Daily Avg Needed</span>
                <p className="text-base font-bold font-mono text-white mt-0.5">
                  {formatCurrency(metrics.dailyAverageProfitNeeded)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cumulative Profit Graph */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-white">Cumulative Equity & Daily Performance</h2>
          <span className="text-xs font-mono text-gray-400">
            Break-Even WR: {metrics.breakEvenWinRate.toFixed(1)}% | Wins Needed (0 Loss): {metrics.requiredWinsZeroLosses}
          </span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222634" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#11131A",
                  borderColor: "#222634",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <ReferenceLine
                y={Number(roadmap.profit_target)}
                stroke="#10B981"
                strokeDasharray="4 4"
                label={{ value: "Target", fill: "#10B981", fontSize: 11 }}
              />
              <Bar dataKey="dailyPnl" name="Daily Net P/L ($)" fill="#374151" radius={[3, 3, 0, 0]} />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Cumulative P/L ($)"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#10B981" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Records Log */}
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-white mb-4">Daily Trading Journal</h2>
        {dailyRecords.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">
            No trading records yet. Click &ldquo;Add Daily Record&rdquo; to log your first session.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-terminal-border text-gray-400 font-mono uppercase text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4">Entries</th>
                  <th className="py-3 px-4">W / L / BE</th>
                  <th className="py-3 px-4">Net P/L</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border">
                {[...dailyRecords].reverse().map((rec) => (
                  <tr key={rec.id} className="hover:bg-terminal-elevated/40">
                    <td className="py-3 px-4 font-mono text-white">{rec.trade_date}</td>
                    <td className="py-3 px-4 text-gray-300">{rec.session || "—"}</td>
                    <td className="py-3 px-4 font-mono">{rec.total_trades}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-profit">{rec.wins}W</span> /{" "}
                      <span className="text-loss">{rec.losses}L</span> /{" "}
                      <span className="text-breakeven">{rec.break_evens}BE</span>
                    </td>
                    <td
                      className={`py-3 px-4 font-mono font-bold ${
                        Number(rec.net_pl) >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatCurrency(Number(rec.net_pl), "USD", true)}
                    </td>
                    <td className="py-3 px-4 text-gray-400 max-w-xs truncate">{rec.notes || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteDay(rec.id)}
                        className="text-gray-500 hover:text-loss p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Daily Record Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-xs">
            <h2 className="text-lg font-bold text-white mb-4">Record Trading Day</h2>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setEntryMode("detailed")}
                className={`px-3 py-1.5 rounded-lg font-medium border ${
                  entryMode === "detailed"
                    ? "bg-profit-muted text-profit border-profit-border"
                    : "bg-terminal-elevated text-gray-400 border-terminal-border"
                }`}
              >
                Detailed Individual Trades
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("summary")}
                className={`px-3 py-1.5 rounded-lg font-medium border ${
                  entryMode === "summary"
                    ? "bg-profit-muted text-profit border-profit-border"
                    : "bg-terminal-elevated text-gray-400 border-terminal-border"
                }`}
              >
                Quick Daily Summary
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1">Trading Date</label>
                  <input
                    type="date"
                    required
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Primary Session</label>
                  <select
                    value={session}
                    onChange={(e) => setSession(e.target.value as TradingSession)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                  >
                    <option value="London">London</option>
                    <option value="New York">New York</option>
                    <option value="Asian">Asian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {entryMode === "summary" ? (
                <div className="space-y-4 bg-terminal-elevated/40 p-4 rounded-lg border border-terminal-border">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1">Total Trades</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={sumTrades}
                        onChange={(e) => setSumTrades(e.target.value)}
                        className="w-full bg-terminal-elevated border border-terminal-border rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Wins</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={sumWins}
                        onChange={(e) => setSumWins(e.target.value)}
                        className="w-full bg-terminal-elevated border border-terminal-border rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Losses</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={sumLosses}
                        onChange={(e) => setSumLosses(e.target.value)}
                        className="w-full bg-terminal-elevated border border-terminal-border rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Break-Evens</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={sumBE}
                        onChange={(e) => setSumBE(e.target.value)}
                        className="w-full bg-terminal-elevated border border-terminal-border rounded p-2 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-1">Gross Profit ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        required
                        value={sumProfit}
                        onChange={(e) => setSumProfit(e.target.value)}
                        className="w-full bg-terminal-elevated border border-terminal-border rounded p-2 text-profit font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Gross Loss ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        required
                        value={sumLoss}
                        onChange={(e) => setSumLoss(e.target.value)}
                        className="w-full bg-terminal-elevated border border-terminal-border rounded p-2 text-loss font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-300">Individual Trades</span>
                    <button
                      type="button"
                      onClick={addTradeRow}
                      className="text-profit hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Trade
                    </button>
                  </div>
                  {tradeDrafts.map((td, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-terminal-elevated/40 p-3 rounded-lg border border-terminal-border"
                    >
                      <input
                        type="text"
                        placeholder="Symbol"
                        value={td.symbol}
                        onChange={(e) => updateTradeDraft(idx, "symbol", e.target.value)}
                        className="bg-terminal-elevated border border-terminal-border rounded p-2 text-white font-mono"
                      />
                      <select
                        value={td.outcome}
                        onChange={(e) => updateTradeDraft(idx, "outcome", e.target.value)}
                        className="bg-terminal-elevated border border-terminal-border rounded p-2 text-white"
                      >
                        <option value="WIN">WIN</option>
                        <option value="LOSS">LOSS</option>
                        <option value="BE">BREAK-EVEN</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Risk $"
                        value={td.risk_amount}
                        onChange={(e) => updateTradeDraft(idx, "risk_amount", e.target.value)}
                        className="bg-terminal-elevated border border-terminal-border rounded p-2 text-white font-mono"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Net P/L $"
                        value={td.pnl}
                        onChange={(e) => updateTradeDraft(idx, "pnl", e.target.value)}
                        className="bg-terminal-elevated border border-terminal-border rounded p-2 text-white font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Trade note"
                        value={td.notes}
                        onChange={(e) => updateTradeDraft(idx, "notes", e.target.value)}
                        className="bg-terminal-elevated border border-terminal-border rounded p-2 text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-gray-400 mb-1">Session Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-terminal-border">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 rounded-lg bg-terminal-elevated text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-profit text-black font-semibold flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save Day
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
