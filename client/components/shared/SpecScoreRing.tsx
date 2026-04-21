"use client";

import { useEffect, useState } from "react";

interface SpecScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
  showLabel?: boolean;
  fontSize?: number;
}

export function SpecScoreRing({
  score,
  size = 160,
  strokeWidth = 10,
  animate = true,
  showLabel = true,
  fontSize = 48,
}: SpecScoreRingProps) {
  const [displayed, setDisplayed] = useState(animate ? 0 : score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayed / 100) * circumference;

  const color =
    score >= 80 ? "#00E396" : score >= 60 ? "#FFB547" : "#FF4560";
  const label =
    score >= 80 ? "GOOD" : score >= 60 ? "NEEDS WORK" : "CRITICAL";
  const labelColor =
    score >= 80 ? "#00E396" : score >= 60 ? "#FFB547" : "#FF4560";

  useEffect(() => {
    if (!animate) return;
    const timeout = setTimeout(() => {
      setDisplayed(score);
    }, 200);
    return () => clearTimeout(timeout);
  }, [score, animate]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1E2D4A"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: animate
                ? "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)"
                : "none",
              filter: `drop-shadow(0 0 8px ${color}66)`,
            }}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{
              fontSize,
              color: "#E8EEFF",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {displayed}
          </span>
          {showLabel && (
            <span
              className="text-xs font-medium mt-1 tracking-widest uppercase"
              style={{ color: labelColor }}
            >
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MiniSpecScoreRing({ score }: { score: number }) {
  const size = 40;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#00E396" : score >= 60 ? "#FFB547" : "#FF4560";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E2D4A" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#00E396" : score >= 60 ? "#FFB547" : "#FF4560";
  const bg =
    score >= 80
      ? "rgba(0,227,150,0.12)"
      : score >= 60
      ? "rgba(255,181,71,0.12)"
      : "rgba(255,69,96,0.12)";

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold tabular-nums"
      style={{ color, background: bg, border: `1px solid ${color}33` }}
    >
      {score}
    </span>
  );
}
