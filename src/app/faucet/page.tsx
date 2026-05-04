"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Droplet,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Clock,
  Wallet,
} from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppShell } from "@/components/AppShell";
import { TopStrip } from "@/components/TopStrip";
import { useFaucet, formatCooldown } from "@/hooks/useFaucet";

const ARC_EXPLORER = "https://testnet.arcscan.app";

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { step, claim, reset, faucetAmount } = useFaucet();
  const [pastedAddress, setPastedAddress] = useState("");
  const [now, setNow] = useState(Date.now());

  // Auto-fill the address field when the wallet connects (or changes)
  useEffect(() => {
    if (address) setPastedAddress(address);
  }, [address]);

  // Tick every second so the cooldown countdown updates
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs =
    step.kind === "cooldown" ? Math.max(0, step.nextAvailableAt - now) : 0;

  // Once the cooldown expires while the user is staring at the page,
  // flip back to idle so the button activates.
  useEffect(() => {
    if (step.kind === "cooldown" && remainingMs <= 0) {
      reset();
    }
  }, [remainingMs, step.kind, reset]);

  const isWorking = step.kind === "claiming";

  return (
    <AppShell>
      <TopStrip />

      <main className="px-6 py-6 max-w-[900px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight">Faucet</h1>
          <p className="ink-2 text-[13px] mt-1">
            Get test USDC on Arc Testnet to start trading. {faucetAmount.toLocaleString()} USDC per
            wallet, every 24 hours.
          </p>
        </motion.div>

        <section className="bento mb-3">
          {/* Main faucet tile */}
          <div className="col-span-12 lg:col-span-6 sm:col-span-2">
            <div className="tile p-8 relative overflow-hidden min-h-[420px]">
              {/* Decorative orb */}
              <div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20 pointer-events-none"
                style={{
                  background: "radial-gradient(circle, #22D3EE 0%, transparent 70%)",
                  filter: "blur(40px)",
                }}
              />

              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(34, 211, 238, 0.2))",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                    }}
                  >
                    <Droplet size={18} style={{ color: "#22D3EE" }} />
                  </div>
                  <div>
                    <div className="font-display text-xl font-bold leading-tight">
                      Mock USDC faucet
                    </div>
                    <div className="text-[12px] ink-3 mt-0.5 font-mono">
                      Arc Testnet · Mock token only
                    </div>
                  </div>
                </div>

                {/* Address input */}
                <div className="mb-4">
                  <label className="label-overline mb-2 block">Recipient address</label>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
                    style={{
                      borderColor: "rgb(var(--line-2))",
                      background: "rgb(var(--surface-2))",
                    }}
                  >
                    <Wallet size={14} className="ink-3 flex-shrink-0" />
                    <input
                      type="text"
                      value={pastedAddress}
                      onChange={(e) => setPastedAddress(e.target.value.trim())}
                      className="flex-1 bg-transparent outline-none font-mono text-[13px] min-w-0"
                      placeholder="0x..."
                      disabled={isWorking}
                    />
                    {address && pastedAddress !== address && (
                      <button
                        onClick={() => setPastedAddress(address)}
                        className="btn btn-sm flex-shrink-0"
                      >
                        Use mine
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] ink-3 mt-2 leading-relaxed">
                    USDC will be minted to the connected wallet, so this needs to match. Paste a
                    different address only if you connect that wallet first.
                  </p>
                </div>

                {/* Claim button area — different states */}
                {!isConnected ? (
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <button
                        onClick={openConnectModal}
                        className="w-full py-3.5 rounded-lg font-bold text-[14px] btn-primary"
                      >
                        Connect wallet to claim
                      </button>
                    )}
                  </ConnectButton.Custom>
                ) : step.kind === "cooldown" ? (
                  <CooldownButton remainingMs={remainingMs} />
                ) : step.kind === "success" ? (
                  <SuccessButton txHash={step.txHash} amount={step.amount} onAgain={reset} />
                ) : (
                  <button
                    onClick={() => claim(pastedAddress)}
                    disabled={isWorking || !pastedAddress}
                    className="w-full py-3.5 rounded-lg font-bold text-[14px] btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isWorking ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-2 inline" />
                        Claiming...
                      </>
                    ) : (
                      <>Claim {faucetAmount.toLocaleString()} USDC</>
                    )}
                  </button>
                )}

                {/* Step feedback */}
                <StepFeedback step={step} />

                {/* Info row */}
                <div
                  className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t"
                  style={{ borderColor: "rgb(var(--line))" }}
                >
                  <div>
                    <div className="label-overline mb-1">Per claim</div>
                    <div className="font-mono font-semibold text-[13px]">
                      {faucetAmount.toLocaleString()} USDC
                    </div>
                  </div>
                  <div>
                    <div className="label-overline mb-1">Cooldown</div>
                    <div className="font-mono font-semibold text-[13px]">24 hours</div>
                  </div>
                  <div>
                    <div className="label-overline mb-1">Network</div>
                    <div className="font-mono font-semibold text-[13px]">Arc Testnet</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side info tile */}
          <div className="col-span-12 lg:col-span-6 sm:col-span-2">
            <div className="tile p-6 min-h-[420px] flex flex-col">
              <div className="label-overline mb-3">How to use it</div>

              <ol className="space-y-3 mb-6">
                {[
                  {
                    title: "Connect your wallet",
                    body: "Use MetaMask, Rainbow, or any WalletConnect-compatible wallet. The address you connect is the one that gets the USDC.",
                  },
                  {
                    title: "Click claim",
                    body: "Sign the transaction in your wallet. It calls MockUSDC.faucet() which mints 10,000 USDC to you.",
                  },
                  {
                    title: "Wait ~1-2 seconds",
                    body: "Once the transaction confirms, the USDC lands in your wallet. Head back to Markets and start trading.",
                  },
                  {
                    title: "Come back tomorrow",
                    body: "The 24-hour cooldown resets, you can claim again. Cooldown is per address.",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center font-mono text-[11px] font-bold flex-shrink-0"
                      style={{
                        background: "rgb(var(--surface-2))",
                        color: "rgb(var(--ink-2))",
                        border: "1px solid rgb(var(--line))",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-[13px] mb-0.5">
                        {item.title}
                      </div>
                      <p className="text-[11.5px] ink-3 leading-relaxed">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Caveat */}
              <div
                className="rounded-lg p-3 text-[11.5px] ink-2 leading-relaxed mt-auto"
                style={{
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                }}
              >
                <strong className="font-semibold">Heads up:</strong> This is mock USDC for
                testnet. It has no real value. Cooldown is enforced in your browser — clear your
                site data and you can claim again. We track this client-side for convenience, not
                security.
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

// ============ Sub-components ============

function CooldownButton({ remainingMs }: { remainingMs: number }) {
  return (
    <div
      className="w-full py-3.5 rounded-lg font-bold text-[14px] flex items-center justify-center gap-2"
      style={{
        background: "rgb(var(--surface-2))",
        color: "rgb(var(--ink-2))",
        border: "1px solid rgb(var(--line))",
      }}
    >
      <Clock size={14} />
      Next claim in {formatCooldown(remainingMs)}
    </div>
  );
}

function SuccessButton({
  txHash,
  amount,
  onAgain,
}: {
  txHash: string;
  amount: number;
  onAgain: () => void;
}) {
  return (
    <div className="space-y-2">
      <div
        className="w-full py-3.5 rounded-lg font-bold text-[14px] flex items-center justify-center gap-2"
        style={{
          background: "rgba(16, 185, 129, 0.12)",
          color: "#10B981",
          border: "1px solid rgba(16, 185, 129, 0.3)",
        }}
      >
        <CheckCircle2 size={14} />
        Claimed {amount.toLocaleString()} USDC
      </div>
      <a
        href={`${ARC_EXPLORER}/tx/${txHash}`}
        target="_blank"
        rel="noreferrer"
        className="btn w-full"
      >
        View on Arc Scan
        <ExternalLink size={12} />
      </a>
    </div>
  );
}

function StepFeedback({ step }: { step: ReturnType<typeof useFaucet>["step"] }) {
  if (step.kind === "claiming" && step.txHash) {
    return (
      <div
        className="mt-3 p-2.5 rounded-lg text-[11.5px] flex items-center gap-2"
        style={{
          background: "rgb(var(--surface-2))",
          border: "1px solid rgb(var(--line))",
          color: "rgb(var(--ink-2))",
        }}
      >
        <Loader2 size={12} className="animate-spin flex-shrink-0" />
        <span className="flex-1">Waiting for confirmation...</span>
        <a
          href={`${ARC_EXPLORER}/tx/${step.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 underline opacity-80 hover:opacity-100"
        >
          View tx <ExternalLink size={10} />
        </a>
      </div>
    );
  }

  if (step.kind === "error") {
    return (
      <div
        className="mt-3 p-2.5 rounded-lg text-[11.5px] flex items-start gap-2"
        style={{
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          color: "#EF4444",
        }}
      >
        <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
        <span className="break-words">{step.message}</span>
      </div>
    );
  }

  return null;
}
