"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, Layers, Users, Zap, AlertCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopStrip } from "@/components/TopStrip";
import { MarketDrawer } from "@/components/MarketDrawer";
import {
  BrandHeroTile,
  MarketTile,
  StatTile,
  LiveActivityTile,
  LeaderboardTile,
  CategoryFilterBar,
} from "@/components/BentoTiles";
import { useMarkets, useMarketById } from "@/hooks/useMarkets";
import { useActivity } from "@/hooks/useActivity";
import { useProtocolStats } from "@/hooks/useProtocolStats";
import { useTopTraders } from "@/hooks/useTopTraders";
import { fmtUSD } from "@/lib/format";
import type { Market } from "@/lib/types";

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [openMarketId, setOpenMarketId] = useState<string | null>(null);

  const { markets, isLoading, error, refetch } = useMarkets();
  // We need openMarketId to be lookup-able across ALL markets (including resolved)
  // so we can still open the drawer for a resolved market via search/activity
  const openMarket = useMarketById(openMarketId, markets);

  // Activity feed
  const { trades, isLoading: activityLoading, refetch: refetchActivity } = useActivity(markets, {
    limit: 12,
  });

  // Real protocol-wide stats (indexer) — falls back gracefully if not available
  const { stats: protocolStats } = useProtocolStats();

  // Top 3 traders for the leaderboard tile
  const { traders: topTraders, isLoading: tradersLoading, isAvailable: tradersAvailable } =
    useTopTraders(3);

  // ─── Live markets = anything NOT fully resolved ────────────────────
  // Per your spec: hide fully resolved markets (status RESOLVED_YES/NO/INVALID)
  // Keep ended-awaiting-resolution visible (they're still "live" until admin resolves)
  const liveMarkets = useMemo(
    () => markets.filter((m) => !m.resolution),
    [markets]
  );

  // Live count for stats — only count live markets, not resolved ones
  const liveCount = liveMarkets.length;

  // Apply category + search filters to the LIVE markets only
  const filtered = useMemo(() => {
    let m: Market[] = liveMarkets;
    if (category === "trending") m = m.filter((x) => x.trending);
    else if (category !== "all") m = m.filter((x) => x.category === category);
    if (search) {
      const q = search.toLowerCase();
      m = m.filter((x) => x.question.toLowerCase().includes(q));
    }
    return m;
  }, [liveMarkets, category, search]);

  // Featured tile: pick from LIVE markets only
  const featured = liveMarkets.find((m) => m.featured) || liveMarkets[0];
  const others = featured ? filtered.filter((m) => m.id !== featured.id) : filtered;

  // ─── Stats computations ────────────────────────────────────────────
  const totalLiquidity = liveMarkets.reduce((sum, m) => sum + m.liquidity, 0);

  // Total volume: prefer indexer-backed all-time volume, fallback to summing market.volume
  const totalVolume = protocolStats.isAvailable
    ? protocolStats.totalVolume
    : markets.reduce((sum, m) => sum + m.volume, 0);

  // Refresh both markets and activity after a trade lands
  const handleTradeSuccess = () => {
    refetch();
    refetchActivity();
  };

  return (
    <AppShell>
      <TopStrip onSearch={setSearch} searchValue={search} />

      <main className="px-6 py-6 max-w-[1600px] mx-auto">
        {isLoading && markets.length === 0 && <LoadingState />}

        {error && !isLoading && (
          <ErrorState message={String(error.message || error)} onRetry={refetch} />
        )}

        {!isLoading && !error && markets.length === 0 && <EmptyState />}

        {markets.length > 0 && !featured && (
          // All markets are resolved — show a different empty state
          <AllResolvedState resolvedCount={markets.length} />
        )}

        {liveMarkets.length > 0 && featured && (
          <>
            <section className="bento mb-3">
              <div className="col-span-4 lg:col-span-4 sm:col-span-2">
                <BrandHeroTile />
              </div>

              <div className="col-span-5 lg:col-span-6 sm:col-span-2">
                <MarketTile market={featured} size="xl" onOpen={setOpenMarketId} />
              </div>

              <div className="col-span-3 lg:col-span-2 sm:col-span-2">
                <LiveActivityTile
                  trades={trades}
                  isLoading={activityLoading}
                  onTradeClick={setOpenMarketId}
                />
              </div>
            </section>

            <section className="bento mb-3">
              <div className="col-span-2 lg:col-span-2 sm:col-span-1">
                <StatTile
                  label="Total Liquidity"
                  value={fmtUSD(totalLiquidity)}
                  sub="Across live markets"
                  icon={<DollarSign size={11} className="ink-3" />}
                  accent="#22D3EE"
                />
              </div>
              <div className="col-span-2 lg:col-span-2 sm:col-span-1">
                <StatTile
                  label="Live Markets"
                  value={String(liveCount)}
                  sub={`${liveMarkets.filter((m) => m.trending).length} trending`}
                  icon={<Layers size={11} className="ink-3" />}
                />
              </div>
              <div className="col-span-2 lg:col-span-2 sm:col-span-1">
                <StatTile
                  label="Total Volume"
                  value={fmtUSD(totalVolume)}
                  sub={protocolStats.isAvailable ? "All-time traded" : "Approx (indexer needed)"}
                  icon={<Users size={11} className="ink-3" />}
                />
              </div>
              <div className="col-span-2 lg:col-span-2 sm:col-span-1">
                <StatTile
                  label="Settlement"
                  value="<500ms"
                  sub="Arc native finality"
                  icon={<Zap size={11} className="ink-3" />}
                  accent="#A855F7"
                />
              </div>
              <div className="col-span-4 lg:col-span-4 sm:col-span-2">
                <LeaderboardTile
                  traders={topTraders}
                  isLoading={tradersLoading}
                  isAvailable={tradersAvailable}
                />
              </div>
            </section>

            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 flex items-center justify-between gap-4"
            >
              <CategoryFilterBar selected={category} onSelect={setCategory} />
              <span className="text-[11px] font-mono ink-3 whitespace-nowrap flex-shrink-0">
                {filtered.length} {filtered.length === 1 ? "market" : "markets"}
              </span>
            </motion.section>

            <section className="bento">
              {others.length === 0 ? (
                <div className="col-span-12 py-16 text-center ink-3">
                  <div className="font-display text-2xl mb-1">No markets match</div>
                  <div className="text-sm">Try a different search or category.</div>
                </div>
              ) : (
                others.map((m, i) => {
                  const isLg = m.featured || i % 5 === 2;
                  const size = isLg ? "lg" : "md";
                  return (
                    <div
                      key={m.id}
                      className={
                        isLg
                          ? "col-span-4 lg:col-span-4 sm:col-span-2"
                          : "col-span-3 lg:col-span-3 sm:col-span-2"
                      }
                    >
                      <MarketTile
                        market={m}
                        size={size as any}
                        onOpen={setOpenMarketId}
                        index={i}
                      />
                    </div>
                  );
                })
              )}
            </section>

            <div className="mt-12 mb-4 text-center text-[11px] font-mono ink-3">
              Powered by Arc · Settles in &lt;500ms · USDC-native
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

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="ink-3 animate-spin mb-4" />
      <div className="font-display text-xl mb-1">Loading markets from Arc</div>
      <div className="text-[13px] ink-3 font-mono">Reading on-chain data via RPC...</div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg mx-auto">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ background: "rgba(239, 68, 68, 0.12)", color: "#EF4444" }}
      >
        <AlertCircle size={20} />
      </div>
      <div className="font-display text-xl mb-2">Couldn't load markets</div>
      <div className="text-[13px] ink-2 mb-2 max-w-md">{message}</div>
      <div className="text-[11px] ink-3 mb-5 font-mono">
        Make sure your wallet is on Arc Testnet (Chain ID 5042002), and the factory contract is
        deployed.
      </div>
      <button onClick={() => onRetry()} className="btn">
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg mx-auto">
      <div className="font-display text-2xl mb-2">No markets yet</div>
      <div className="text-[13px] ink-2 mb-4 max-w-md">
        Your factory is deployed but hasn't created any markets. Run the SeedMarkets script or use
        the admin panel to create your first market.
      </div>
      <code
        className="text-[12px] font-mono p-3 rounded-lg block mb-2"
        style={{ background: "rgb(var(--surface-2))", border: "1px solid rgb(var(--line))" }}
      >
        forge script script/SeedMarkets.s.sol --broadcast
      </code>
    </div>
  );
}

function AllResolvedState({ resolvedCount }: { resolvedCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg mx-auto">
      <div className="font-display text-2xl mb-2">No live markets right now</div>
      <div className="text-[13px] ink-2 mb-4 max-w-md">
        All {resolvedCount} markets have resolved. New markets coming soon — or create one via the
        admin panel.
      </div>
    </div>
  );
}
