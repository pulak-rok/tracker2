"use client";

import React from "react";
import { CheckCircle2, Circle, Trophy } from "lucide-react";

interface AnimatedRoadmapTrackProps {
  percentage: number;
}

const milestones = [0, 10, 25, 50, 75, 100];

export function AnimatedRoadmapTrack({ percentage }: AnimatedRoadmapTrackProps) {
  return (
    <div className="w-full py-4">
      <div className="flex justify-between text-xs text-gray-400 mb-2 font-mono">
        <span>START</span>
        <span>10%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span className="flex items-center gap-1 text-profit font-bold">
          <Trophy className="w-3.5 h-3.5" /> TARGET
        </span>
      </div>
      <div className="relative flex items-center">
        <div className="absolute left-0 right-0 h-1.5 bg-terminal-border rounded-full" />
        <div
          className="absolute left-0 h-1.5 bg-profit rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
        <div className="relative w-full flex justify-between z-10">
          {milestones.map((m) => {
            const achieved = percentage >= m;
            return (
              <div key={m} className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                    achieved
                      ? "bg-profit text-black border-profit shadow-lg shadow-profit/20"
                      : "bg-terminal-surface text-gray-500 border-terminal-border"
                  }`}
                >
                  {achieved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
