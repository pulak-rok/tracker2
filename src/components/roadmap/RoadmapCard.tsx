import Link from "next/link";
import { Roadmap, DailyRecord } from "@/types/database";
import { calculateRoadmapMetrics } from "@/lib/math/roadmap-calculations";
import { formatCurrency } from "@/lib/utils";
import { CircularProgress } from "./CircularProgress";
import { AnimatedRoadmapTrack } from "./AnimatedRoadmapTrack";
import { ArrowUpRight, Calendar, ShieldAlert } from "lucide-react";

interface RoadmapCardProps {
  roadmap: Roadmap;
  dailyRecords: DailyRecord[];
}

export function RoadmapCard({ roadmap, dailyRecords }: RoadmapCardProps) {
  const metrics = calculateRoadmapMetrics(roadmap, dailyRecords);
  const isProfitable = metrics.currentNetPnl >= 0;

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 hover:border-terminal-hover transition-all flex flex-col justify-between shadow-xl">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-terminal-elevated text-gray-400 border border-terminal-border">
              {roadmap.status}
            </span>
            <h3 className="text-lg font-bold text-white mt-1.5 tracking-tight">{roadmap.name}</h3>
          </div>
          <Link
            href={`/roadmaps/${roadmap.id}`}
            className="p-2 rounded-lg bg-terminal-elevated border border-terminal-border hover:border-profit text-gray-300 hover:text-profit transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-terminal-elevated/50 p-3 rounded-lg border border-terminal-border">
            <span className="text-[10px] text-gray-400 uppercase">Target Amount</span>
            <p className="text-base font-bold font-mono text-white mt-0.5">
              {formatCurrency(roadmap.profit_target)}
            </p>
          </div>
          <div className="bg-terminal-elevated/50 p-3 rounded-lg border border-terminal-border">
            <span className="text-[10px] text-gray-400 uppercase">Net P/L</span>
            <p className={`text-base font-bold font-mono mt-0.5 ${isProfitable ? "text-profit" : "text-loss"}`}>
              {formatCurrency(metrics.currentNetPnl, "USD", true)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center my-4">
          <CircularProgress percentage={metrics.completionPercentage} />
        </div>

        <AnimatedRoadmapTrack percentage={metrics.completionPercentage} />
      </div>

      <div className="mt-6 pt-4 border-t border-terminal-border grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <span className="text-[10px] text-gray-400 block">Win Rate</span>
          <span className="font-mono font-semibold text-white">{metrics.winRate.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 block">Trades</span>
          <span className="font-mono font-semibold text-white">{metrics.totalTrades}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 block">Days Left</span>
          <span className="font-mono font-semibold text-white">{metrics.remainingCalendarDays}</span>
        </div>
      </div>
    </div>
  );
}
