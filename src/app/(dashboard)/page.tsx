import { createClient } from "@/lib/supabase/server";
import { Roadmap, DailyRecord } from "@/types/database";
import { RoadmapCard } from "@/components/roadmap/RoadmapCard";
import { formatCurrency } from "@/lib/utils";
import { Target, TrendingUp, Trophy, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function OverviewDashboard() {
  const supabase = createClient();

  const { data: roadmapsData } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const roadmaps: Roadmap[] = roadmapsData || [];

  const roadmapIds = roadmaps.map((r) => r.id);
  let dailyRecords: DailyRecord[] = [];
  if (roadmapIds.length > 0) {
    const { data: drData } = await supabase
      .from("daily_records")
      .select("*")
      .in("roadmap_id", roadmapIds);
    dailyRecords = drData || [];
  }

  const totalPnl = roadmaps.reduce((acc, r) => {
    const recs = dailyRecords.filter((d) => d.roadmap_id === r.id);
    return acc + recs.reduce((sum, d) => sum + Number(d.net_pl), 0);
  }, 0);

  const totalTarget = roadmaps.reduce((acc, r) => acc + Number(r.profit_target), 0);
  const activeRoadmapsCount = roadmaps.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Trading Command Center</h1>
          <p className="text-xs text-gray-400 mt-1">Monitor active profit roadmaps and daily trading performance.</p>
        </div>
        <Link
          href="/roadmaps"
          className="bg-profit hover:bg-profit/90 text-black font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition-all shadow-lg shadow-profit/10"
        >
          <Target className="w-4 h-4" /> Manage Roadmaps <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl">
          <span className="text-xs text-gray-400 uppercase font-mono">Active Roadmaps</span>
          <p className="text-2xl font-bold font-mono text-white mt-2">{activeRoadmapsCount}</p>
        </div>
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl">
          <span className="text-xs text-gray-400 uppercase font-mono">Total Net P/L</span>
          <p className={`text-2xl font-bold font-mono mt-2 ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {formatCurrency(totalPnl, "USD", true)}
          </p>
        </div>
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl">
          <span className="text-xs text-gray-400 uppercase font-mono">Total Targets</span>
          <p className="text-2xl font-bold font-mono text-white mt-2">{formatCurrency(totalTarget)}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-4">Active Roadmaps</h2>
        {roadmaps.length === 0 ? (
          <div className="bg-terminal-surface border border-terminal-border rounded-xl p-12 text-center">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-1">No Active Roadmaps</h3>
            <p className="text-xs text-gray-400 mb-6">Create your first trading profit roadmap to begin tracking.</p>
            <Link
              href="/roadmaps"
              className="inline-flex items-center gap-2 bg-profit text-black px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Create Roadmap
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((r) => (
              <RoadmapCard key={r.id} roadmap={r} dailyRecords={dailyRecords} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
