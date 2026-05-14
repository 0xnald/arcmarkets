"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Loader2,
  RefreshCcw,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopStrip } from "@/components/TopStrip";
import { MarketDrawer } from "@/components/MarketDrawer";
import { StatTile } from "@/components/BentoTiles";
import { useMarkets, useMarketById } from "@/hooks/useMarkets";
import { useActivity } from "@/hooks/useActivity";
import { fmtUSD, timeSince } from "@/lib/format";

const ARC_EXPLORER = "https://testnet.arcscan.app";

export default function ActivityPage() {
  const [openMarketId, setOpenMarketId] = useState<string | null>(null);
  const { markets, refetch: refetchMarkets } = useMarkets();

  // Pull last 100 trades so we can show recent activity AND have enough
  // history to compute 24h volume accurately.
  const {
    trades,
    volume24h,
    tradesCount24h,
    isLoading,
    error,
    refetch,
  } = useActivity(markets, { limit: 100 });

  const openMarket = useMarketById(openMarketId, markets);

  // YES/NO split, 24h window
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentTrades = trades.filter((t) => t.timestamp >= cutoff);
  const yesCount = recentTrades.filter((t) => t.side === "yes").length;
  const noCount = recentTrades.length - yesCount;
  const yesPct = recentTrades.length > 0 ? Math.round((yesCount / recentTrades.length) * 100) : 0;
  const noPct = recentTrades.length > 0 ? Math.round((noCount / recentTrades.length) * 100) : 0;

  const handleTradeSuccess = () => {
    refetchMarkets();
    refetch();
  };

  return (
    <AppShell>
      <TopStrip />

      <main className="px-6 py-6 max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Activity</h1>
            <p className="ink-2 text-[13px] mt-1">
              Recent trades across every Arc Markets contract. Last 100 shown.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn btn-sm"
            title="Refresh"
          >
            {isLoading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <RefreshCcw size={11} />
            )}
            Refresh
          </button>
        </motion.div>

        {/* Stats — now showing 24h metrics */}
        <section className="bento mb-3">
          <div className="col-span-3 lg:col-span-3 sm:col-span-1">
            <StatTile
              label="24h Trades"
              value={String(tradesCount24h)}
              sub="In the last day"
              icon={<ActivityIcon size={11} className="ink-3" />}
            />
          </div>
          <div className="col-span-3 lg:col-span-3 sm:col-span-1">
            <StatTile
              label="24h Volume"
              value={fmtUSD(volume24h, { compact: false, decimals: 0 })}
              sub="USDC traded in 24h"
              icon={<ArrowUpRight size={11} className="ink-3" />}
              accent="#22D3EE"
            />
          </div>
          <div className="col-span-3 lg:col-span-3 sm:col-span-1">
            <StatTile
              label="YES vs NO (24h)"
              value={recentTrades.length > 0 ? `${yesPct}% / ${noPct}%` : "—"}
              sub={`${yesCount} yes · ${noCount} no`}
              icon={<ArrowDownRight size={11} className="ink-3" />}
            />
          </div>
          <div className="col-span-3 lg:col-span-3 sm:col-span-1">
            <StatTile
              label="Settlement"
              value="<500ms"
              sub="Arc native finality"
              icon={<Zap size={11} className="ink-3" />}
              accent="#A855F7"
            />
          </div>
        </section>

        {/* Activity feed */}
        <section className="bento">
          <div className="col-span-12 lg:col-span-6 sm:col-span-2">
            <div className="tile overflow-hidden">
              <div
                className="flex items-center gap-2 px-5 py-3 border-b"
                style={{ borderColor: "rgb(var(--line))" }}
              >
                <span className="pulse-dot" />
                <span className="label-overline">Recent trades</span>
                <span className="ml-auto text-[11px] font-mono ink-3">
                  {isLoading ? "Loading..." : `${trades.length} found`}
                </span>
              </div>

              {error ? (
                <div className="p-12 text-center text-[13px] ink-3">
                  <div className="mb-1">Couldn't fetch activity</div>
                  <div className="text-[11px] font-mono">{error}</div>
                </div>
              ) : isLoading && trades.length === 0 ? (
                <div className="p-16 text-center">
                  <Loader2 size={20} className="ink-3 animate-spin mx-auto mb-3" />
                  <div className="text-[12px] ink-3 font-mono">Loading trades...</div>
                </div>
              ) : trades.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-[13px] ink-2 mb-1">No trades yet</div>
                  <div className="text-[11.5px] ink-3 max-w-sm mx-auto leading-relaxed">
                    Once people start trading, all activity will stream in here.
                  </div>
                </div>
              ) : (
                trades.map((t, i) => {
                  const isYes = t.side === "yes";
                  const txHash = t.id.split("-")[0];
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="px-5 py-3.5 flex items-center gap-4 hover:bg-bg-2 transition-colors border-b"
                      style={{ borderColor: "rgb(var(--line))" }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isYes
                            ? "rgba(16, 185, 129, 0.12)"
                            : "rgba(239, 68, 68, 0.12)",
                          color: isYes ? "#10B981" : "#EF4444",
                        }}
                      >
                        {isYes ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>

                      <button
                        onClick={() => setOpenMarketId(t.marketId)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-[13.5px] mb-0.5 flex items-center gap-1.5">
                          <span className="font-mono text-[11.5px] ink-2">{t.user}</span>
                          <span className="ink-3">bought</span>
                          <span className={isYes ? "pill pill-yes" : "pill pill-no"}>
                            {t.side.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[12.5px] font-medium line-clamp-1 hover:underline">
                          {t.marketQuestion}
                        </div>
                      </button>

                      <div className="text-right hidden sm:block">
                        <div className="font-mono text-[12.5px] font-semibold">
                          {t.shares.toFixed(2)}{" "}
                          <span className="ink-3 font-normal text-[10.5px]">shares</span>
                        </div>
                        <div className="font-mono text-[10.5px] ink-3">
                          @ {Math.round(t.price * 100)}¢
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-[13px] font-semibold">
                          ${t.total.toFixed(2)}
                        </div>
                        <div className="font-mono text-[10.5px] ink-3">
                          {timeSince(t.timestamp)}
                        </div>
                      </div>

                      <a
                        href={`${ARC_EXPLORER}/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ink-3 hover:text-ink transition-colors"
                        title="View transaction"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={12} />
                      </a>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <div className="text-center mt-6 mb-4 text-[11px] font-mono ink-3 leading-relaxed">
          Volume stats reflect the last 24 hours. Showing the most recent 100 trades overall.
        </div>
      </main>

      <MarketDrawer
        market={openMarket}
        onClose={() => setOpenMarketId(null)}
        onTradeSuccess={handleTradeSuccess}
      />
    </AppShell>
  );
}
