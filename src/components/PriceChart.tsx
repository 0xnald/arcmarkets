"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PricePoint } from "@/lib/types";

interface Props {
  data: PricePoint[];
}

const RANGES = [
  { key: "1d", label: "1D", points: 8 },
  { key: "1w", label: "1W", points: 56 },
  { key: "1m", label: "1M", points: 240 },
  { key: "all", label: "All", points: Infinity },
] as const;

export function PriceChart({ data }: Props) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("1m");
  const cfg = RANGES.find((r) => r.key === range)!;
  const sliced =
    cfg.points === Infinity ? data : data.slice(-cfg.points);

  const formatted = sliced.map((p) => ({
    time: new Date(p.t).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    yes: Math.round(p.yes * 100),
    raw: p.t,
  }));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="label-overline mb-1">Price History</div>
          <div className="font-display text-2xl font-bold">
            {formatted.length > 0 ? formatted[formatted.length - 1].yes : 0}
            <span className="text-base ink-3 font-medium">¢ YES</span>
          </div>
        </div>
        <div
          className="flex p-1 rounded-lg"
          style={{ background: "rgb(var(--surface-2))" }}
        >
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all"
                style={{
                  background: active ? "rgb(var(--surface))" : "transparent",
                  color: active ? "rgb(var(--ink))" : "rgb(var(--ink-3))",
                  boxShadow: active ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <AreaChart data={formatted} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgb(var(--ink-3))", fontSize: 10, fontFamily: "JetBrains Mono" }}
              minTickGap={50}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgb(var(--ink-3))", fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickFormatter={(v) => `${v}¢`}
              width={32}
            />
            <Tooltip
              cursor={{ stroke: "rgb(var(--line-2))", strokeWidth: 1 }}
              contentStyle={{
                background: "rgb(var(--surface))",
                border: "1px solid rgb(var(--line-2))",
                borderRadius: 8,
                fontFamily: "JetBrains Mono",
                fontSize: 11,
              }}
              labelStyle={{ color: "rgb(var(--ink-3))" }}
              formatter={(v: number) => [`${v}¢`, "YES"]}
            />
            <Area
              type="monotone"
              dataKey="yes"
              stroke="#22D3EE"
              strokeWidth={2}
              fill="url(#yesGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
