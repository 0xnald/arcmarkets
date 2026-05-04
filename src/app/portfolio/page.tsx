"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, DollarSign, Activity, Layers, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppShell } from "@/components/AppShell";
import { TopStrip } from "@/components/TopStrip";
import { MarketDrawer } from "@/components/MarketDrawer";
import { StatTile } from "@/components/BentoTiles";
import { useMarkets, useMarketById } from "@/hooks/useMarkets";
import { usePortfolio } from "@/hooks/usePortfolio";
import { fmtUSD, CATEGORY_META } from "@/lib/format";

export default function PortfolioPage() {
  const [openMarketId, setOpenMarketId] = useState<string | null>(null);
  const { isConnected } = useAccount();
  const { markets, refetch: refetchMarkets } = useMarkets();
  const { positions, summary, isLoading, refetch: refetchPortfolio } = usePortfolio(markets);
  const openMarket = useMarketById(openMarketId, markets);

  const handleTradeSuccess = () => {
    refetchMarkets();
    refetchPortfolio();
  };

  return (
    <AppShell>
      <TopStrip />

      <main className="px-6 py-6 max-w-[1600px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="font-display text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="ink-2 text-[13px] mt-1">
            Your active positions on Arc Markets — all reads come straight from chain.
          </p>
        </motion.div>

        {!isConnected ? (
          <NotConnectedState />
        ) : isLoading && positions.length === 0 ? (
          <LoadingState />
        ) : positions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Summary stats */}
            <section className="bento mb-3">
              <div className="col-span-3 lg:col-span-3 sm:col-span-1">
                <StatTile
                  label="Portfolio Value"
                  value={fmtUSD(summary.totalValue, { compact: false, decimals: 2 })}
                  sub={`${summary.activePositions} active markets`}
                  icon={<Wallet size={11} className="ink-3" />}
                  accent="#22D3EE"
                />
              </div>
              <div className="col-span-3 lg:col-span-3 sm:col-span-1">
                <StatTile
                  label="YES Shares Total"
                  value={summary.totalYesShares.toFixed(2)}
                  sub={`${summary.yesMarkets} markets`}
                  icon={<TrendingUp size={11} className="ink-3" />}
                  accent="#10B981"
                />
              </div>
              <div className="col-span-3 lg:col-span-3 sm:col-span-1">
                <StatTile
                  label="NO Shares Total"
                  value={summary.totalNoShares.toFixed(2)}
                  sub={`${summary.noMarkets} markets`}
                  icon={<Activity size={11} className="ink-3" />}
                  accent="#EF4444"
                />
              </div>
              <div className="col-span-3 lg:col-span-3 sm:col-span-1">
                <StatTile
                  label="Total Markets"
                  value={String(summary.activePositions)}
                  sub="With open positions"
                  icon={<Layers size={11} className="ink-3" />}
                />
              </div>
            </section>

            <h2 className="font-display text-lg font-bold mt-8 mb-3">Active positions</h2>

            <section className="bento">
              {positions.map((p, i) => {
                const cat = CATEGORY_META[p.market.category];
                return (
                  <motion.button
                    key={p.market.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setOpenMarketId(p.market.id)}
                    className="col-span-6 lg:col-span-6 sm:col-span-2 tile tile-clickable text-left p-5 flex flex-col min-h-[220px]"
                  >
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span
                        className="pill"
                        style={{
                          borderColor: cat.color + "40",
                          color: cat.color,
                          background: cat.color + "10",
                        }}
                      >
                        {cat.label}
                      </span>
                      {p.yesShares > 0 && p.noShares > 0 && (
                        <span className="pill" style={{ color: "rgb(var(--ink-3))" }}>
                          Hedged (YES + NO)
                        </span>
                      )}
                      {p.yesShares > 0 && p.noShares === 0 && (
                        <span className="pill pill-yes">YES position</span>
                      )}
                      {p.noShares > 0 && p.yesShares === 0 && (
                        <span className="pill pill-no">NO position</span>
                      )}
                    </div>

                    <h3 className="font-display font-semibold text-[15px] leading-snug mb-auto line-clamp-2">
                      {p.market.question}
                    </h3>

                    {/* Position breakdown */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {p.yesShares > 0 && (
                        <div
                          className="rounded-lg p-3"
                          style={{
                            background: "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                          }}
                        >
                          <div
                            className="text-[10px] font-bold tracking-wider mb-1"
                            style={{ color: "#10B981" }}
                          >
                            YES
                          </div>
                          <div className="font-mono text-[15px] font-bold">
                            {p.yesShares.toFixed(2)}
                          </div>
                          <div className="text-[10.5px] font-mono ink-3 mt-0.5">
                            ≈ ${p.yesValue.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {p.noShares > 0 && (
                        <div
                          className="rounded-lg p-3"
                          style={{
                            background: "rgba(239, 68, 68, 0.08)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                          }}
                        >
                          <div
                            className="text-[10px] font-bold tracking-wider mb-1"
                            style={{ color: "#EF4444" }}
                          >
                            NO
                          </div>
                          <div className="font-mono text-[15px] font-bold">
                            {p.noShares.toFixed(2)}
                          </div>
                          <div className="text-[10.5px] font-mono ink-3 mt-0.5">
                            ≈ ${p.noValue.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Total value */}
                    <div
                      className="flex justify-between mt-3 pt-3 border-t text-[12px]"
                      style={{ borderColor: "rgb(var(--line))" }}
                    >
                      <span className="ink-3">Estimated value</span>
                      <span className="font-mono font-bold">${p.totalValue.toFixed(2)}</span>
                    </div>
                  </motion.button>
                );
              })}
            </section>

            <div className="mt-8 text-center text-[11px] ink-3 font-mono leading-relaxed max-w-2xl mx-auto">
              Position values are estimated at the current AMM price. Actual sale value will
              differ slightly due to slippage. Realized PnL appears once we connect an indexer.
            </div>
          </>
        )}
      </main>

      <MarketDrawer
        market={openMarket}
        onClose={() => setOpenMarketId(null)}
        onTradeSuccess={handleTradeSuccess}
      />
    </AppShell>
  );
}

function NotConnectedState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] text-center max-w-md mx-auto">
      <div
        className="w-12 h-12 rounded-full mb-4 flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(34, 211, 238, 0.15))",
        }}
      >
        <Wallet size={20} className="ink-2" />
      </div>
      <div className="font-display text-xl font-bold mb-2">Connect to view your portfolio</div>
      <div className="text-[13px] ink-2 mb-5 max-w-sm leading-relaxed">
        Your YES and NO positions across every market will appear here once your wallet is connected.
      </div>
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button onClick={openConnectModal} className="btn btn-primary">
            Connect wallet
          </button>
        )}
      </ConnectButton.Custom>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh]">
      <Loader2 size={24} className="ink-3 animate-spin mb-3" />
      <div className="text-[13px] ink-3 font-mono">Reading positions from chain...</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] text-center max-w-md mx-auto">
      <div
        className="w-12 h-12 rounded-full mb-4 flex items-center justify-center"
        style={{
          background: "rgb(var(--surface-2))",
          border: "1px solid rgb(var(--line))",
        }}
      >
        <DollarSign size={20} className="ink-3" />
      </div>
      <div className="font-display text-xl font-bold mb-2">No positions yet</div>
      <div className="text-[13px] ink-2 mb-5 max-w-sm leading-relaxed">
        You don't hold any YES or NO shares. Browse markets and take a position to get started.
      </div>
      <Link href="/" className="btn btn-primary">
        Explore markets
      </Link>
    </div>
  );
}
