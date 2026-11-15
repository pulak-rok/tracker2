'client';
import React from "react";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 10,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-terminal-border"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-profit transition-all duration-1000 ease-out"
          fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold font-mono text-white">
          {percentage.toFixed(1)}%
        </span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Complete</span>
      </div>
    </div>
  );
}
