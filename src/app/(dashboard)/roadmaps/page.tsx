'client';
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Roadmap, DailyRecord } from "@/types/database";
import { RoadmapCard } from "@/components/roadmap/RoadmapCard";
import { Target, Plus, Loader2 } from "lucide-react";

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [profitTarget, setProfitTarget] = useState("");
  const [startingBalance, setStartingBalance] = useState("0");
  const [riskPerTrade, setRiskPerTrade] = useState("");
  const [rrRatio, setRrRatio] = useState("2.0");
  const [winRateAssumption, setWinRateAssumption] = useState("50");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetDate, setTargetDate] = useState("");
  const [maxDrawdown, setMaxDrawdown] = useState("");
  const [dailyTradeLimit, setDailyTradeLimit] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rData } = await supabase
      .from("roadmaps")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: dData } = await supabase
      .from("daily_records")
      .select("*");

    setRoadmaps(rData || []);
    setDailyRecords(dData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("roadmaps").insert({
      user_id: user.id,
      name,
      profit_target: parseFloat(profitTarget),
      starting_balance: parseFloat(startingBalance) || 0,
      risk_per_trade: parseFloat(riskPerTrade),
      rr_ratio: parseFloat(rrRatio),
      win_rate_assumption: winRateAssumption ? parseFloat(winRateAssumption) : null,
      start_date: startDate,
      target_date: targetDate,
      max_drawdown: maxDrawdown ? parseFloat(maxDrawdown) : null,
      daily_trade_limit: dailyTradeLimit ? parseInt(dailyTradeLimit) : null,
      notes: notes || null,
      status: "active",
    });

    setSubmitting(false);
    if (!error) {
      setShowModal(false);
      setName("");
      setProfitTarget("");
      setRiskPerTrade("");
      setTargetDate("");
      fetchData();
    } else {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-profit" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Trading Roadmaps</h1>
          <p className="text-xs text-gray-400 mt-1">Create and manage independent profit target roadmaps.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-profit hover:bg-profit/90 text-black font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition-all shadow-lg shadow-profit/10"
        >
          <Plus className="w-4 h-4" /> New Roadmap
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roadmaps.map((r) => (
          <RoadmapCard key={r.id} roadmap={r} dailyRecords={dailyRecords} />
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Create New Roadmap</h2>
            <form onSubmit={handleCreateRoadmap} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Roadmap Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. $10k Q1 Challenge"
                  className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1">Profit Target (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={profitTarget}
                    onChange={(e) => setProfitTarget(e.target.value)}
                    placeholder="10000"
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Starting Balance (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1">Risk per Trade ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(e.target.value)}
                    placeholder="100"
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Risk:Reward (e.g. 2)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={rrRatio}
                    onChange={(e) => setRrRatio(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Win Rate % (Opt)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={winRateAssumption}
                    onChange={(e) => setWinRateAssumption(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-terminal-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-terminal-elevated text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-profit text-black font-semibold flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create Roadmap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
