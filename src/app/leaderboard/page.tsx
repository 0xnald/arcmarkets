"use client";

import { motion } from "framer-motion";
import { Trophy, Sparkles, BarChart3, Database } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopStrip } from "@/components/TopStrip";

export default function LeaderboardPage() {
  return (
    <AppShell>
      <TopStrip />

      <main className="px-6 py-6 max-w-[1600px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="font-display text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="ink-2 text-[13px] mt-1">
            Top traders ranked by realized profit, win rate, and volume.
          </p>
        </motion.div>

        <section className="bento">
          <div className="col-span-12 lg:col-span-6 sm:col-span-2">
            <div className="tile p-12 relative overflow-hidden min-h-[420px] flex flex-col items-center justify-center text-center">
              {/* Decorative orbs */}
              <div
                className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-25 pointer-events-none"
                style={{
                  background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)",
                  filter: "blur(40px)",
                }}
              />
              <div
                className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-25 pointer-events-none"
                style={{
                  background: "radial-gradient(circle, #22D3EE 0%, transparent 70%)",
                  filter: "blur(40px)",
                }}
              />

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
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.18em] font-semibold"
                    style={{ color: "#A855F7" }}
                  >
                    Coming soon
                  </span>
                </div>

                <h2 className="font-display text-3xl font-bold mb-3">
                  The <span className="text-gradient">leaderboard</span> is on its way.
                </h2>
                <p className="text-[13.5px] ink-2 leading-relaxed mb-6">
                  We're building a live ranking of top traders by realized PnL, win rate, and total
                  volume. It needs an indexer to crunch the data — and that's the next thing on
                  the roadmap.
                </p>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: "rgb(var(--surface-2))",
                      border: "1px solid rgb(var(--line))",
                    }}
                  >
                    <BarChart3 size={14} className="ink-2 mb-1.5" />
                    <div className="text-[12px] font-semibold mb-0.5">Realized PnL</div>
                    <div className="text-[11px] ink-3 leading-snug">
                      Aggregated from buy/sell events across every market.
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: "rgb(var(--surface-2))",
                      border: "1px solid rgb(var(--line))",
                    }}
                  >
                    <Database size={14} className="ink-2 mb-1.5" />
                    <div className="text-[12px] font-semibold mb-0.5">Indexer-powered</div>
                    <div className="text-[11px] ink-3 leading-snug">
                      Trade history rolled up into per-trader stats. Updates live.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
