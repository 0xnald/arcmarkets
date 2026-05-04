"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, TrendingUp, Trophy, Coins, Scale, Zap, Droplet } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Wallet,
    title: "Connect a wallet",
    body:
      "Click Connect Wallet, approve the Arc Testnet network, and you're in. We don't custody your funds — your wallet stays under your control the whole time.",
  },
  {
    icon: Droplet,
    title: "Claim test USDC from the faucet",
    body:
      "Head to the Faucet tab in the sidebar and claim 10,000 mock USDC. You need this to trade on Arc Testnet — it's free, takes one signature, and resets every 24 hours.",
  },
  {
    icon: TrendingUp,
    title: "Pick a side: YES or NO",
    body:
      "Every market is a binary question. Buy YES if you think it'll happen, NO if you don't. The price reflects the market's current implied probability — 70¢ for YES means the crowd thinks it's 70% likely.",
  },
  {
    icon: Coins,
    title: "Place your trade",
    body:
      "Enter how much USDC you want to spend, see your live quote, and confirm. First trade in any market signs two transactions (USDC approval + buy). After that, just one signature per trade.",
  },
  {
    icon: Trophy,
    title: "Win when the market resolves",
    body:
      "When the market ends and resolves in your favor, every share you hold pays out 1 USDC. Wrong side gets nothing. Click Claim on the market page to redeem.",
  },
];

const FACTS = [
  {
    icon: Scale,
    title: "Constant-product AMM",
    body: "Prices move automatically as people trade. Buying YES pulls YES out of the pool, making each next YES share more expensive — same model as Uniswap.",
  },
  {
    icon: Zap,
    title: "2% trading fee",
    body: "Goes to the protocol. Sub-second settlement on Arc means you're not paying mainnet gas premiums.",
  },
];

export function HowItWorksModal({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(0, 0, 0, 0.55)",
              backdropFilter: "blur(8px)",
            }}
          />

          <motion.div
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{
              background: "rgb(var(--surface))",
              border: "1px solid rgb(var(--line-2))",
            }}
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{
                background: "linear-gradient(90deg, #8B5CF6, #3B82F6, #22D3EE)",
              }}
            />

            <div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20 pointer-events-none"
              style={{
                background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            {/* Header */}
            <div
              className="relative flex items-center justify-between p-6 border-b flex-shrink-0"
              style={{ borderColor: "rgb(var(--line))" }}
            >
              <div>
                <div className="font-display text-2xl font-bold mb-1">
                  How <span className="text-gradient">Arc Markets</span> works
                </div>
                <div className="text-[13px] ink-2">
                  Trade YES or NO on real-world events, settled in USDC on Arc.
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-bg-2 flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="relative flex-1 overflow-y-auto p-6">
              {/* Steps */}
              <div className="mb-6">
                <div className="label-overline mb-3">In five steps</div>
                <div className="space-y-3">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex gap-3 p-3 rounded-lg"
                        style={{ background: "rgb(var(--surface-2))" }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(34, 211, 238, 0.15))",
                            border: "1px solid rgba(139, 92, 246, 0.25)",
                          }}
                        >
                          <Icon size={15} style={{ color: "#A855F7" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-[10px] font-mono ink-3 font-bold">
                              0{i + 1}
                            </span>
                            <span className="font-display font-semibold text-[14px]">
                              {step.title}
                            </span>
                          </div>
                          <p className="text-[12.5px] ink-2 leading-relaxed">{step.body}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Facts */}
              <div className="mb-6">
                <div className="label-overline mb-3">Worth knowing</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FACTS.map((fact, i) => {
                    const Icon = fact.icon;
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg"
                        style={{
                          background: "rgb(var(--surface-2))",
                          border: "1px solid rgb(var(--line))",
                        }}
                      >
                        <Icon size={14} className="ink-2 mb-2" />
                        <div className="font-display font-semibold text-[13px] mb-1">
                          {fact.title}
                        </div>
                        <p className="text-[11.5px] ink-3 leading-relaxed">{fact.body}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resolution note */}
              <div
                className="rounded-lg p-3 text-[12px] ink-2 leading-relaxed"
                style={{
                  background: "rgba(139, 92, 246, 0.06)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                }}
              >
                <strong className="font-semibold">A note on resolution:</strong> Markets are
                currently resolved by the Arc Markets team based on the published criteria. As
                the platform matures, we'll move resolution to a decentralized oracle (UMA-style)
                where anyone can dispute incorrect outcomes.
              </div>
            </div>

            {/* Footer */}
            <div
              className="relative flex items-center justify-between p-4 border-t flex-shrink-0"
              style={{
                borderColor: "rgb(var(--line))",
                background: "rgb(var(--bg))",
              }}
            >
              <div className="text-[11px] ink-3 font-mono">
                Testnet · No real funds at risk
              </div>
              <button onClick={onClose} className="btn btn-primary">
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
