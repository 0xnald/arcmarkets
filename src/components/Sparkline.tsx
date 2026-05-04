"use client";

import { useId } from "react";

interface Props {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
  filled?: boolean;
  strokeWidth?: number;
}

export function Sparkline({
  data,
  positive = true,
  width = 80,
  height = 28,
  filled = true,
  strokeWidth = 1.5,
}: Props) {
  const gradId = useId();
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color = positive ? "#10B981" : "#EF4444";

  return (
    <svg width={width} height={height} className="overflow-visible">
      {filled && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {filled && (
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#${gradId})`}
        />
      )}
      <polyline points={points} stroke={color} strokeWidth={strokeWidth} fill="none" />
    </svg>
  );
}
