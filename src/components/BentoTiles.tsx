"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Sparkles,
} from "lucide-react";
import type { Market, Trade } from "@/lib/types";
import { fmtUSD, fmtCents, fmtPct, timeUntil, timeSince, CATEGORY_META } from "@/lib/format";
import { Sparkline } from "./Sparkline";

// ===== Market tile (variants by size) =====

interface MarketTileProps {
  market: Market;
  onOpen: (id: string) => void;
  size?: "sm" | "md" | "lg" | "xl";
  index?: number;
}

export function MarketTile({ market, onOpen, size = "md", index = 0 }: MarketTileProps) {
  const positive = market.change24h >= 0;
  const cat = CATEGORY_META[market.category];
  const isXL = size === "xl";
  const isLg = size === "lg";
  const isSm = size === "sm";

  const sparkData = market.history.slice(isXL ? -64 : isLg ? -48 : -32).map((p) => p.yes);

  return (
    <motion.button
      onClick={() => onOpen(market.id)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.025, 0.25) }}
      className={`tile tile-clickable text-left p-5 flex flex-col w-full ${
        market.featured ? "tile-featured" : ""
      }`}
      style={{ minHeight: isXL ? 300 : isLg ? 220 : 180 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="pill"
          style={{
            borderColor: cat.color + "40",
            color: cat.color,
            background: cat.color + "10",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
          {cat.label}
        </span>
        <span className="flex items-center gap-1 text-[10.5px] ink-3 font-mono">
          <Clock size={9} />
          {timeUntil(market.endsAt)}
        </span>
      </div>

      <h3
        className={`font-display font-semibold leading-snug mb-auto ${
          isXL ? "text-2xl" : isLg ? "text-base" : "text-[14px]"
        }`}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: isXL ? 3 : 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {market.question}
      </h3>

      <div className="mt-4">
        <div className="flex items-end justify-between mb-2.5">
          <div>
            <div className={`font-display font-bold leading-none ${isXL ? "text-5xl" : "text-3xl"}`}>
              {Math.round(market.yesPrice * 100)}
              <span className="text-base ink-3 font-medium ml-0.5">%</span>
            </div>
            <div
              className="flex items-center gap-1 mt-1.5 text-[11px] font-mono font-semibold"
              style={{ color: positive ? "#10B981" : "#EF4444" }}
            >
              {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {fmtPct(market.change24h, 1)} · 24h
            </div>
          </div>
          <Sparkline
            data={sparkData}
            positive={positive}
            width={isXL ? 160 : isLg ? 100 : 70}
            height={isXL ? 50 : 32}
          />
        </div>

        <div
          className="relative h-1 rounded-full overflow-hidden mb-3"
          style={{ background: "rgb(var(--surface-2))" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${market.yesPrice * 100}%`,
              background: "linear-gradient(90deg, #10B981 0%, #22D3EE 100%)",
            }}
          />
        </div>

        {!isSm && (
          <div className="grid grid-cols-2 gap-2">
            <div
              className="px-3 py-1.5 rounded-md text-center text-[11.5px] font-bold"
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                color: "#10B981",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              YES {fmtCents(market.yesPrice)}
            </div>
            <div
              className="px-3 py-1.5 rounded-md text-center text-[11.5px] font-bold"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#EF4444",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              NO {fmtCents(1 - market.yesPrice)}
            </div>
          </div>
        )}

        {!isSm && (
          <div className="flex justify-between mt-3 text-[10.5px] ink-3 font-mono">
            <span>Vol {fmtUSD(market.volume)}</span>
            <span>Liq {fmtUSD(market.liquidity)}</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ===== Stat tile =====

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}

export function StatTile({ label, value, sub, accent, icon }: StatTileProps) {
  return (
    <div className="tile p-4 flex flex-col justify-between min-h-[120px]">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="label-overline">{label}</span>
      </div>
      <div>
        <div
          className="font-display text-2xl font-bold leading-none"
          style={{ color: accent }}
        >
          {value}
        </div>
        {sub && <div className="text-[10.5px] font-mono ink-3 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ===== Live activity tile =====

interface LiveActivityTileProps {
  trades: Trade[];
  isLoading?: boolean;
  onTradeClick?: (marketId: string) => void;
}

export function LiveActivityTile({ trades, isLoading, onTradeClick }: LiveActivityTileProps) {
  return (
    <div className="tile flex flex-col min-h-[300px]">
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "rgb(var(--line))" }}
      >
        <span className="pulse-dot" />
        <span className="label-overline">Live trades</span>
        <span className="ml-auto text-[10px] font-mono ink-3">
          {isLoading ? "Loading..." : "On-chain"}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        {trades.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-[12.5px] ink-2 font-medium mb-1">No recent trades</div>
            <div className="text-[11px] ink-3 leading-relaxed max-w-[200px]">
              Trades from the last few hours will stream in here.
            </div>
          </div>
        ) : trades.length === 0 && isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-[11.5px] ink-3 font-mono">Scanning chain...</div>
          </div>
        ) : (
          trades.slice(0, 6).map((t, i) => {
            const isYes = t.side === "yes";
            return (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onTradeClick?.(t.marketId)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 border-b text-[12px] text-left hover:bg-bg-2 transition-colors"
                style={{ borderColor: "rgb(var(--line))" }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isYes
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(239, 68, 68, 0.12)",
                    color: isYes ? "#10B981" : "#EF4444",
                  }}
                >
                  {isYes ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium truncate"
                    style={{ color: "rgb(var(--ink-2))" }}
                  >
                    {t.marketQuestion}
                  </div>
                  <div className="font-mono text-[10.5px] ink-3 mt-0.5">
                    {t.user} · ${t.total.toFixed(0)} @ {Math.round(t.price * 100)}¢
                  </div>
                </div>
                <div className="font-mono text-[10px] ink-3 flex-shrink-0">
                  {timeSince(t.timestamp)}
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ===== Leaderboard tile (coming soon) =====

export function LeaderboardTile() {
  return (
    <div className="tile flex flex-col min-h-[300px] relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #A855F7 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "rgb(var(--line))" }}
      >
        <Trophy size={13} className="ink-2" />
        <span className="label-overline">Top traders</span>
        <span
          className="ml-auto text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(168, 85, 247, 0.12)",
            color: "#A855F7",
            border: "1px solid rgba(168, 85, 247, 0.3)",
          }}
        >
          Soon
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 relative">
        <div
          className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(34, 211, 238, 0.15))",
          }}
        >
          <Sparkles size={18} className="ink-2" />
        </div>
        <div className="font-display text-base font-semibold mb-1">
          Leaderboard <span className="text-gradient">coming soon</span>
        </div>
        <div className="text-[11.5px] ink-3 leading-relaxed max-w-[240px]">
          Once enough trades flow through, top traders will be ranked here by realized PnL.
        </div>
      </div>
    </div>
  );
}

// ===== Brand hero tile =====

export function BrandHeroTile() {
  return (
    <div className="tile relative overflow-hidden flex flex-col justify-between p-6 min-h-[300px] tile-featured">
      <div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(34, 211, 238, 0.2) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <span className="pulse-dot" style={{ width: 6, height: 6 }} />
          <span className="label-overline" style={{ color: "#22D3EE" }}>
            Live · Arc Testnet
          </span>
        </div>
        <h1 className="font-display text-3xl xl:text-4xl font-bold leading-[1.05] tracking-tight">
          Trade the <span className="text-gradient">future</span>.<br />
          Win in seconds.
        </h1>
      </div>

      <div className="relative">
        <p className="text-[13px] ink-2 leading-relaxed mb-4 max-w-md">
          On-chain prediction markets denominated in USDC, settled with sub-second finality on Arc.
        </p>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary">Explore markets</button>
          <button className="btn">How it works</button>
        </div>
      </div>
    </div>
  );
}

// ===== Category filter tile =====

interface CategoryTileProps {
  selected: string;
  onSelect: (cat: string) => void;
}

const CATS = [
  { key: "all", label: "All" },
  { key: "trending", label: "Trending" },
  { key: "crypto", label: "Crypto" },
  { key: "arc", label: "Arc" },
  { key: "macro", label: "Macro" },
  { key: "tech", label: "Tech" },
  { key: "politics", label: "Politics" },
  { key: "sports", label: "Sports" },
  { key: "culture", label: "Culture" },
  { key: "science", label: "Science" },
];

export function CategoryFilterBar({ selected, onSelect }: CategoryTileProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
      {CATS.map((c) => {
        const active = selected === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
            className="px-3 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: active ? "rgb(var(--ink))" : "rgb(var(--surface))",
              color: active ? "rgb(var(--bg))" : "rgb(var(--ink-2))",
              border: `1px solid ${active ? "rgb(var(--ink))" : "rgb(var(--line))"}`,
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
