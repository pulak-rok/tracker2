"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trade, Roadmap, TradeOutcome, TradingSession } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Search, Plus, Image as ImageIcon, X } from "lucide-react";

export default function TradeHistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [sessionFilter, setSessionFilter] = useState("ALL");

  // Single trade quick-add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split("T")[0]);
  const [symbol, setSymbol] = useState("XAUUSD");
  const [session, setSession] = useState<TradingSession>("New York");
  const [outcome, setOutcome] = useState<TradeOutcome>("WIN");
  const [riskAmount, setRiskAmount] = useState("100");
  const [rrAchieved, setRrAchieved] = useState("2");
  const [pnl, setPnl] = useState("200");
  const [reason, setReason] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    const { data: tData } = await supabase
      .from("trades")
      .select("*, roadmaps(name)")
      .order("created_at", { ascending: false });

    const { data: rData } = await supabase
      .from("roadmaps")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    setTrades(tData || []);
    setRoadmaps(rData || []);
    if (rData && rData.length > 0 && !selectedRoadmapId) {
      setSelectedRoadmapId(rData[0].id);
      setRiskAmount(String(Number(rData[0].risk_per_trade) || 100));
      setRrAchieved(String(Number(rData[0].rr_ratio) || 2));
      setPnl(String(((Number(rData[0].risk_per_trade) || 100) * (Number(rData[0].rr_ratio) || 2)).toFixed(2)));
    }
    setLoading(false);
  }, [supabase, selectedRoadmapId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const handleOutcomeChange = (nextOutcome: TradeOutcome) => {
    setOutcome(nextOutcome);
    const r = parseFloat(riskAmount) || 0;
    const rr = parseFloat(rrAchieved) || 2;
    if (nextOutcome === "WIN") setPnl(String((r * rr).toFixed(2)));
    else if (nextOutcome === "LOSS") setPnl(String((-Math.abs(r)).toFixed(2)));
    else setPnl("0");
  };

  const handleAddSingleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoadmapId) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    let photoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop() || "png";
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("trade-photos")
        .upload(filePath, photoFile);
      if (uploadError) {
        alert(`Photo upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }
      const { data: pubUrl } = supabase.storage.from("trade-photos").getPublicUrl(filePath);
      photoUrl = pubUrl.publicUrl;
    }

    let { data: dayRec } = await supabase
      .from("daily_records")
      .select("id, entry_mode")
      .eq("roadmap_id", selectedRoadmapId)
      .eq("trade_date", tradeDate)
      .single();

    if (!dayRec) {
      const { data: createdDay, error: dayErr } = await supabase
        .from("daily_records")
        .insert({
          user_id: user.id,
          roadmap_id: selectedRoadmapId,
          trade_date: tradeDate,
          entry_mode: "detailed",
          session,
          total_trades: 0,
          wins: 0,
          losses: 0,
          break_evens: 0,
          gross_profit: 0,
          gross_loss: 0,
        })
        .select("id, entry_mode")
        .single();

      if (dayErr || !createdDay) {
        alert(dayErr?.message || "Could not create day record");
        setSaving(false);
        return;
      }
      dayRec = createdDay;
    }

    if (dayRec.entry_mode === "summary") {
      alert("This date is in Quick Summary mode. Choose another date or switch to Detailed mode.");
      setSaving(false);
      return;
    }

    let finalPnl = parseFloat(pnl) || 0;
    if (outcome === "WIN" && finalPnl <= 0) finalPnl = Math.abs(parseFloat(riskAmount) || 100);
    if (outcome === "LOSS" && finalPnl >= 0) finalPnl = -(Math.abs(parseFloat(riskAmount) || 100));
    if (outcome === "BE") finalPnl = 0;

    const { error: tradeErr } = await supabase.from("trades").insert({
      user_id: user.id,
      roadmap_id: selectedRoadmapId,
      daily_record_id: dayRec.id,
      symbol: symbol.toUpperCase() || "XAUUSD",
      session,
      outcome,
      risk_amount: parseFloat(riskAmount) || 0,
      rr_achieved: rrAchieved ? parseFloat(rrAchieved) : null,
      pnl: finalPnl,
      notes: reason || null,
      photo_url: photoUrl,
    });

    setSaving(false);
    if (tradeErr) {
      alert(tradeErr.message);
    } else {
      setShowAddModal(false);
      setReason("");
      setPhotoFile(null);
      fetchTrades();
    }
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Trade History Ledger</h1>
          <p className="text-xs text-gray-400 mt-1">Log individual trades anytime with reason & chart photo, or view entries from Telegram.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-profit hover:bg-profit/90 text-black font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Single Trade
        </button>
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
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Photo</th>
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
                  <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{t.notes || "—"}</td>
                  <td className="py-3 px-4">
                    {t.photo_url ? (
                      <a
                        href={t.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-profit hover:underline"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> View
                      </a>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 max-w-md w-full space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-white">Add Single Trade</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSingleTrade} className="space-y-3">
              <div>
                <label className="block text-gray-400 mb-1">Roadmap</label>
                <select
                  value={selectedRoadmapId}
                  onChange={(e) => setSelectedRoadmapId(e.target.value)}
                  className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2 text-white"
                >
                  {roadmaps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Symbol</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Outcome</label>
                  <select
                    value={outcome}
                    onChange={(e) => handleOutcomeChange(e.target.value as TradeOutcome)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2 text-white"
                  >
                    <option value="WIN">WIN</option>
                    <option value="LOSS">LOSS</option>
                    <option value="BE">BE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Session</label>
                  <select
                    value={session}
                    onChange={(e) => setSession(e.target.value as TradingSession)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2 text-white"
                  >
                    <option value="London">London</option>
                    <option value="New York">New York</option>
                    <option value="Asian">Asian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Risk ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={riskAmount}
                    onChange={(e) => setRiskAmount(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Net P/L ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value)}
                    className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Trade Reason / Setup Notes</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why did you take this trade?"
                  className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Chart Photo (Supabase Storage)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-gray-300 text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg bg-terminal-elevated text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-profit text-black font-semibold flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
