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
  const { trades, isLoading, error, refetch } = useActivity(markets, { limit: 100 });
  const openMarket = useMarketById(openMarketId, markets);

  // Stats from the trade feed
  const totalVolume = trades.reduce((sum, t) => sum + t.total, 0);
  const yesCount = trades.filter((t) => t.side === "yes").length;
  const noCount = trades.length - yesCount;
  const yesPct = trades.length > 0 ? Math.round((yesCount / trades.length) * 100) : 0;
  const noPct = trades.length > 0 ? Math.round((noCount / trades.length) * 100) : 0;

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
              Recent Trade events scanned directly from Arc Testnet contracts.
            </p>
          </div>
          <button
            onClick={refetch}
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

        {/* Stats */}
        <section className="bento mb-3">
          <div className="col-span-3 lg:col-span-3 sm:col-span-1">
            <StatTile
              label="Recent Trades"
              value={String(trades.length)}
              sub="Last ~5000 blocks"
              icon={<ActivityIcon size={11} className="ink-3" />}
            />
          </div>
          <div className="col-span-3 lg:col-span-3 sm:col-span-1">
            <StatTile
              label="Volume"
              value={fmtUSD(totalVolume, { compact: false, decimals: 0 })}
              sub="Across all trades"
              icon={<ArrowUpRight size={11} className="ink-3" />}
              accent="#22D3EE"
            />
          </div>
          <div className="col-span-3 lg:col-span-3 sm:col-span-1">
            <StatTile
              label="YES vs NO"
              value={trades.length > 0 ? `${yesPct}% / ${noPct}%` : "—"}
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
                <span className="label-overline">Live trades</span>
                <span className="ml-auto text-[11px] font-mono ink-3">
                  {isLoading ? "Scanning..." : `${trades.length} found`}
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
                  <div className="text-[12px] ink-3 font-mono">Scanning chain for trades...</div>
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
                  const txHash = t.id.split("-")[0]; // tx hash from id format
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
          Activity scans the last ~5000 blocks of Trade events. For deeper history, an indexer is needed.
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
