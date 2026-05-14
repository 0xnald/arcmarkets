"use client";

import { motion } from "framer-motion";
import { Trophy, Sparkles, BarChart3, Database, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopStrip } from "@/components/TopStrip";
import { useLeaderboard, type LeaderboardEntry } from "@/hooks/useLeaderboard";
import { fmtUSD, fmtPct } from "@/lib/format";

const ARC_EXPLORER = "https://testnet.arcscan.app";

// Inline shortAddr helper — doesn't depend on what format.ts exports
function shortAddr(a: string): string {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function LeaderboardPage() {
  const { entries, isLoading, isAvailable } = useLeaderboard(50);

  return (
    <AppShell>
      <TopStrip />

      <main className="px-6 py-6 max-w-[1600px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="font-display text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="ink-2 text-[13px] mt-1">
            Top traders ranked by realized profit. Updates every 30 seconds.
          </p>
        </motion.div>

        {!isAvailable ? (
          <ComingSoonState />
        ) : isLoading && entries.length === 0 ? (
          <LoadingState />
        ) : entries.length === 0 ? (
          <NoTradersYetState />
        ) : (
          <LeaderboardTable entries={entries} />
        )}
      </main>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Real leaderboard table
// ─────────────────────────────────────────────────────────────────────

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const rankColors = ["#FBBF24", "#9CA3AF", "#CD7F32"];

  return (
    <>
      {/* Top 3 podium */}
      {top3.length > 0 && (
        <section className="bento mb-3">
          {top3.map((entry, i) => (
            <motion.div
              key={entry.address}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="col-span-4 lg:col-span-2 sm:col-span-2 tile p-5 relative overflow-hidden"
            >
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${rankColors[i]} 0%, transparent 70%)`,
                  filter: "blur(20px)",
                }}
              />

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold"
                  style={{
                    background: rankColors[i] + "18",
                    color: rankColors[i],
                    border: `1px solid ${rankColors[i]}40`,
                  }}
                >
                  {i === 0 ? <Trophy size={16} /> : `#${entry.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={`${ARC_EXPLORER}/address/${entry.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-display font-bold text-[15px] truncate hover:underline block"
                  >
                    {shortAddr(entry.address)}
                  </a>
                </div>
              </div>

              <div
                className="font-display text-3xl font-bold mb-1"
                style={{ color: entry.realizedPnL >= 0 ? "#10B981" : "#EF4444" }}
              >
                {entry.realizedPnL >= 0 ? "+" : ""}
                {fmtUSD(entry.realizedPnL)}
              </div>
              <div className="text-[11px] font-mono ink-3 mb-3">realized profit</div>

              <div
                className="grid grid-cols-3 gap-2 pt-3 border-t text-[11px]"
                style={{ borderColor: "rgb(var(--line))" }}
              >
                <div>
                  <div className="label-overline mb-0.5">Volume</div>
                  <div className="font-mono font-semibold">{fmtUSD(entry.totalVolume)}</div>
                </div>
                <div>
                  <div className="label-overline mb-0.5">Win</div>
                  <div className="font-mono font-semibold">
                    {entry.marketsWon + entry.marketsLost > 0
                      ? fmtPct(entry.winRate, 0)
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="label-overline mb-0.5">Trades</div>
                  <div className="font-mono font-semibold">{entry.tradeCount}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </section>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <section className="bento">
          <div className="col-span-12 lg:col-span-6 sm:col-span-2">
            <div className="tile overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: "rgb(var(--line))" }}
              >
                <span className="label-overline">Rankings 4–{entries.length}</span>
                <span className="text-[11px] font-mono ink-3">All time</span>
              </div>

              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-2 label-overline border-b w-12" style={{ borderColor: "rgb(var(--line))" }}>#</th>
                    <th className="text-left px-5 py-2 label-overline border-b" style={{ borderColor: "rgb(var(--line))" }}>Trader</th>
                    <th className="text-right px-5 py-2 label-overline border-b" style={{ borderColor: "rgb(var(--line))" }}>PnL</th>
                    <th className="text-right px-5 py-2 label-overline border-b hidden md:table-cell" style={{ borderColor: "rgb(var(--line))" }}>Volume</th>
                    <th className="text-right px-5 py-2 label-overline border-b hidden md:table-cell" style={{ borderColor: "rgb(var(--line))" }}>Win</th>
                    <th className="text-right px-5 py-2 label-overline border-b" style={{ borderColor: "rgb(var(--line))" }}>Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((e, i) => (
                    <motion.tr
                      key={e.address}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-bg-2 transition-colors"
                    >
                      <td className="px-5 py-3 border-b font-mono text-[12.5px] ink-3" style={{ borderColor: "rgb(var(--line))" }}>
                        #{e.rank}
                      </td>
                      <td className="px-5 py-3 border-b" style={{ borderColor: "rgb(var(--line))" }}>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: `hsl(${i * 47}, 65%, 50%)` }}
                          >
                            {e.address.slice(2, 4).toUpperCase()}
                          </div>
                          <a
                            href={`${ARC_EXPLORER}/address/${e.address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[12.5px] hover:underline"
                          >
                            {shortAddr(e.address)}
                          </a>
                        </div>
                      </td>
                      <td
                        className="px-5 py-3 border-b text-right font-mono text-[12.5px] font-semibold"
                        style={{
                          borderColor: "rgb(var(--line))",
                          color: e.realizedPnL >= 0 ? "#10B981" : "#EF4444",
                        }}
                      >
                        {e.realizedPnL >= 0 ? "+" : ""}{fmtUSD(e.realizedPnL)}
                      </td>
                      <td className="px-5 py-3 border-b text-right font-mono text-[12.5px] hidden md:table-cell" style={{ borderColor: "rgb(var(--line))" }}>
                        {fmtUSD(e.totalVolume)}
                      </td>
                      <td className="px-5 py-3 border-b text-right font-mono text-[12.5px] hidden md:table-cell" style={{ borderColor: "rgb(var(--line))" }}>
                        {e.marketsWon + e.marketsLost > 0 ? fmtPct(e.winRate, 0) : "—"}
                      </td>
                      <td className="px-5 py-3 border-b text-right font-mono text-[12.5px] ink-2" style={{ borderColor: "rgb(var(--line))" }}>
                        {e.tradeCount}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
//  Empty / Loading / Coming-soon states
// ─────────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh]">
      <Loader2 size={24} className="ink-3 animate-spin mb-3" />
      <div className="text-[13px] ink-3 font-mono">Reading leaderboard from indexer...</div>
    </div>
  );
}

function NoTradersYetState() {
  return (
    <div className="tile p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
      <div
        className="w-12 h-12 rounded-full mb-4 flex items-center justify-center"
        style={{ background: "rgb(var(--surface-2))", border: "1px solid rgb(var(--line))" }}
      >
        <Trophy size={18} className="ink-3" />
      </div>
      <div className="font-display text-xl font-bold mb-2">No traders yet</div>
      <div className="text-[13px] ink-2 max-w-md leading-relaxed">
        Once people start trading, the leaderboard fills up — ranked by realized profit across all markets.
      </div>
    </div>
  );
}

function ComingSoonState() {
  return (
    <section className="bento">
      <div className="col-span-12 lg:col-span-6 sm:col-span-2">
        <div className="tile p-12 relative overflow-hidden min-h-[420px] flex flex-col items-center justify-center text-center">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-25 pointer-events-none" style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-25 pointer-events-none" style={{ background: "radial-gradient(circle, #22D3EE 0%, transparent 70%)", filter: "blur(40px)" }} />

          <div className="relative max-w-md">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(34, 211, 238, 0.2))",
                border: "1px solid rgba(139, 92, 246, 0.3)",
              }}
            >
              <Trophy size={28} style={{ color: "#A855F7" }} />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Sparkles size={11} className="ink-3" />
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] font-semibold" style={{ color: "#A855F7" }}>
                Indexer required
              </span>
            </div>

            <h2 className="font-display text-3xl font-bold mb-3">
              The <span className="text-gradient">leaderboard</span> is on its way.
            </h2>
            <p className="text-[13.5px] ink-2 leading-relaxed mb-6">
              Set the NEXT_PUBLIC_SUBGRAPH_URL env var to your Goldsky deployment URL — the leaderboard, real PnL, and price history will all light up immediately.
            </p>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="rounded-lg p-3" style={{ background: "rgb(var(--surface-2))", border: "1px solid rgb(var(--line))" }}>
                <BarChart3 size={14} className="ink-2 mb-1.5" />
                <div className="text-[12px] font-semibold mb-0.5">Realized PnL</div>
                <div className="text-[11px] ink-3 leading-snug">Aggregated from buy/sell events across every market.</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "rgb(var(--surface-2))", border: "1px solid rgb(var(--line))" }}>
                <Database size={14} className="ink-2 mb-1.5" />
                <div className="text-[12px] font-semibold mb-0.5">Indexer-powered</div>
                <div className="text-[11px] ink-3 leading-snug">Trade history rolled up into per-trader stats.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
