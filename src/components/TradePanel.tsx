"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useChainId } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { Info, Loader2, ExternalLink, CheckCircle2, AlertCircle, ArrowDownLeft } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { Market } from "@/lib/types";
import { fmtCents } from "@/lib/format";
import { MARKET_ABI, USDC_DECIMALS, Side } from "@/lib/contracts";
import { arcTestnet } from "@/lib/chain";
import { useTrade } from "@/hooks/useTrade";

interface Props {
  market: Market;
  onTradeSuccess?: () => void;
}

const ARC_EXPLORER = "https://testnet.arcscan.app";

export function TradePanel({ market, onTradeSuccess }: Props) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;

  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("10");

  const { step, buy, sell, claim, reset, canTrade, canClaim, isResolved } = useTrade(market);

  // Reset transient states after success
  useEffect(() => {
    if (step.kind === "success") {
      onTradeSuccess?.();
      const timer = setTimeout(() => reset(), 3500);
      return () => clearTimeout(timer);
    }
  }, [step, onTradeSuccess, reset]);

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount > 0 && !isNaN(numAmount);
  const sideEnum = side === "yes" ? Side.YES : Side.NO;
  const usdcInWei = isValid ? parseUnits(amount, USDC_DECIMALS) : 0n;

  // For SELL mode, "amount" represents shares the user wants to sell
  const sharesInWei = isValid ? parseUnits(amount, USDC_DECIMALS) : 0n;

  // Read user's shares for SELL mode
  const { data: userShares } = useReadContract({
    address: market.id as `0x${string}`,
    abi: MARKET_ABI,
    functionName: "shares",
    args: address ? [address, sideEnum] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const userSharesNum = userShares ? Number(formatUnits(userShares as bigint, USDC_DECIMALS)) : 0;

  // Live quote
  const { data: quotedShares } = useReadContract({
    address: market.id as `0x${string}`,
    abi: MARKET_ABI,
    functionName: "quoteBuy",
    args: [sideEnum, usdcInWei],
    query: { enabled: mode === "buy" && isValid && usdcInWei > 0n },
  });

  const { data: quotedUsdc } = useReadContract({
    address: market.id as `0x${string}`,
    abi: MARKET_ABI,
    functionName: "quoteSell",
    args: [sideEnum, sharesInWei],
    query: {
      enabled: mode === "sell" && isValid && sharesInWei > 0n && sharesInWei <= (userShares as bigint ?? 0n),
    },
  });

  const sharesOut = quotedShares ? Number(formatUnits(quotedShares as bigint, USDC_DECIMALS)) : 0;
  const usdcOut = quotedUsdc ? Number(formatUnits(quotedUsdc as bigint, USDC_DECIMALS)) : 0;

  const avgPrice = mode === "buy" && sharesOut > 0 ? numAmount / sharesOut : 0;
  const potentialPayout = sharesOut;
  const potentialProfit = potentialPayout - numAmount;
  const potentialReturnPct = numAmount > 0 ? (potentialProfit / numAmount) * 100 : 0;

  const handleBuy = () => {
    if (!quotedShares) return;
    buy(side, amount, quotedShares as bigint);
  };

  const handleSell = () => {
    if (!quotedUsdc) return;
    sell(side, sharesInWei, quotedUsdc as bigint);
  };

  // Resolved markets show claim UI instead of trade UI
  if (isResolved) {
    return (
      <div className="card p-5 tile">
        <div className="text-center mb-4">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{
              background:
                market.resolution === "yes"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(239, 68, 68, 0.15)",
              color: market.resolution === "yes" ? "#10B981" : "#EF4444",
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div className="font-display text-xl font-bold mb-1">Market resolved</div>
          <div
            className="text-[12px] font-mono uppercase tracking-wider mb-3"
            style={{ color: market.resolution === "yes" ? "#10B981" : "#EF4444" }}
          >
            {market.resolution} won
          </div>
          <p className="text-[13px] ink-2 leading-relaxed">
            Each winning share is worth $1.00. Claim your payout.
          </p>
        </div>

        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button onClick={openConnectModal} className="btn btn-primary w-full">
                Connect to claim
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <button
            onClick={claim}
            disabled={step.kind !== "idle" && step.kind !== "error"}
            className="w-full py-3 rounded-lg font-bold text-[14px] btn-primary disabled:opacity-60"
          >
            {step.kind === "claiming" && (
              <Loader2 size={14} className="animate-spin mr-2 inline" />
            )}
            {step.kind === "claiming" ? "Claiming..." : "Claim winnings"}
          </button>
        )}

        <StepFeedback step={step} />
      </div>
    );
  }

  return (
    <div className="card p-5 tile">
      {/* Buy/Sell tabs */}
      <div
        className="flex p-1 rounded-lg mb-4"
        style={{ background: "rgb(var(--surface-2))" }}
      >
        <button
          onClick={() => setMode("buy")}
          className="flex-1 py-1.5 rounded-md text-[13px] font-semibold transition-all"
          style={{
            background: mode === "buy" ? "rgb(var(--surface))" : "transparent",
            color: mode === "buy" ? "rgb(var(--ink))" : "rgb(var(--ink-3))",
            boxShadow: mode === "buy" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
          }}
        >
          Buy
        </button>
        <button
          onClick={() => setMode("sell")}
          disabled={!isConnected}
          className="flex-1 py-1.5 rounded-md text-[13px] font-semibold transition-all disabled:opacity-50"
          style={{
            background: mode === "sell" ? "rgb(var(--surface))" : "transparent",
            color: mode === "sell" ? "rgb(var(--ink))" : "rgb(var(--ink-3))",
            boxShadow: mode === "sell" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
          }}
        >
          Sell
        </button>
      </div>

      {/* Yes/No selector */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setSide("yes")}
          className="py-3 rounded-lg font-bold text-[14px] transition-all"
          style={{
            background:
              side === "yes" ? "rgba(16, 185, 129, 0.18)" : "rgb(var(--surface-2))",
            color: side === "yes" ? "#10B981" : "rgb(var(--ink-2))",
            border: `1.5px solid ${side === "yes" ? "#10B981" : "transparent"}`,
          }}
        >
          <div className="text-[11px] font-semibold opacity-80 mb-0.5">YES</div>
          {fmtCents(market.yesPrice)}
        </button>
        <button
          onClick={() => setSide("no")}
          className="py-3 rounded-lg font-bold text-[14px] transition-all"
          style={{
            background:
              side === "no" ? "rgba(239, 68, 68, 0.18)" : "rgb(var(--surface-2))",
            color: side === "no" ? "#EF4444" : "rgb(var(--ink-2))",
            border: `1.5px solid ${side === "no" ? "#EF4444" : "transparent"}`,
          }}
        >
          <div className="text-[11px] font-semibold opacity-80 mb-0.5">NO</div>
          {fmtCents(1 - market.yesPrice)}
        </button>
      </div>

      {/* Amount input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="label-overline">
            {mode === "buy" ? "Amount" : "Shares to sell"}
          </label>
          {mode === "sell" && isConnected && userSharesNum > 0 && (
            <button
              onClick={() => setAmount(userSharesNum.toFixed(2))}
              className="text-[10px] font-mono ink-3 hover:text-ink transition-colors"
            >
              Max: {userSharesNum.toFixed(2)}
            </button>
          )}
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
          style={{
            borderColor: "rgb(var(--line))",
            background: "rgb(var(--surface-2))",
          }}
        >
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="flex-1 bg-transparent outline-none font-display text-2xl font-semibold"
            placeholder="0"
            disabled={step.kind !== "idle" && step.kind !== "error"}
          />
          <div className="flex items-center gap-1.5">
            {mode === "buy" ? (
              <>
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "#2775CA" }}
                >
                  $
                </span>
                <span className="font-mono font-semibold text-sm">USDC</span>
              </>
            ) : (
              <span className="font-mono font-semibold text-sm">shares</span>
            )}
          </div>
        </div>
        {mode === "buy" && (
          <div className="flex gap-1 mt-2">
            {[10, 50, 100, 500].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="flex-1 py-1.5 rounded-md text-[11px] font-mono ink-2 hover:text-ink transition-colors"
                style={{ background: "rgb(var(--surface-2))" }}
              >
                ${v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quote summary */}
      <div
        className="rounded-lg p-3 mb-4 space-y-1.5 text-[12px]"
        style={{ background: "rgb(var(--surface-2))" }}
      >
        {mode === "buy" ? (
          <>
            <div className="flex justify-between">
              <span className="ink-3">You receive</span>
              <span className="font-mono">{sharesOut.toFixed(2)} shares</span>
            </div>
            <div className="flex justify-between">
              <span className="ink-3">Avg price</span>
              <span className="font-mono">
                {avgPrice > 0 ? `${(avgPrice * 100).toFixed(1)}¢` : "—"}
              </span>
            </div>
            <div
              className="flex justify-between border-t pt-1.5 mt-1.5"
              style={{ borderColor: "rgb(var(--line))" }}
            >
              <span className="ink-3">Potential payout</span>
              <span className="font-mono font-semibold" style={{ color: "#10B981" }}>
                ${potentialPayout.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="ink-3">Potential return</span>
              <span className="font-mono font-semibold" style={{ color: "#10B981" }}>
                +${potentialProfit.toFixed(2)} ({potentialReturnPct.toFixed(0)}%)
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="ink-3">You receive</span>
              <span className="font-mono font-semibold">${usdcOut.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="ink-3">Your balance</span>
              <span className="font-mono">{userSharesNum.toFixed(2)} shares</span>
            </div>
          </>
        )}
      </div>

      {/* Action button */}
      {!isConnected ? (
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="w-full py-3 rounded-lg font-bold text-[14px] btn-primary"
            >
              Connect wallet to trade
            </button>
          )}
        </ConnectButton.Custom>
      ) : wrongNetwork ? (
        <div
          className="w-full py-3 rounded-lg font-semibold text-[13px] text-center"
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            color: "#EF4444",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          Switch to Arc Testnet to trade
        </div>
      ) : !canTrade ? (
        <div
          className="w-full py-3 rounded-lg font-semibold text-[13px] text-center"
          style={{
            background: "rgb(var(--surface-2))",
            color: "rgb(var(--ink-3))",
            border: "1px dashed rgb(var(--line-2))",
          }}
        >
          Trading closed
        </div>
      ) : mode === "buy" ? (
        <button
          onClick={handleBuy}
          disabled={!isValid || (step.kind !== "idle" && step.kind !== "error" && step.kind !== "success")}
          className={`w-full py-3 rounded-lg font-bold text-[14px] ${
            side === "yes" ? "btn-yes" : "btn-no"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {(step.kind === "checking_allowance" ||
            step.kind === "approving" ||
            step.kind === "buying") && (
            <Loader2 size={14} className="animate-spin mr-2 inline" />
          )}
          {step.kind === "checking_allowance"
            ? "Checking..."
            : step.kind === "approving"
            ? "Approving USDC..."
            : step.kind === "buying"
            ? "Buying..."
            : `Buy ${side.toUpperCase()} for $${numAmount.toFixed(2)}`}
        </button>
      ) : (
        <button
          onClick={handleSell}
          disabled={
            !isValid ||
            sharesInWei > (userShares as bigint ?? 0n) ||
            (step.kind !== "idle" && step.kind !== "error" && step.kind !== "success")
          }
          className="w-full py-3 rounded-lg font-bold text-[14px] btn disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "rgb(var(--ink))", color: "rgb(var(--bg))" }}
        >
          {step.kind === "selling" && <Loader2 size={14} className="animate-spin mr-2 inline" />}
          {step.kind === "selling"
            ? "Selling..."
            : sharesInWei > (userShares as bigint ?? 0n)
            ? "Insufficient shares"
            : `Sell ${side.toUpperCase()} for $${usdcOut.toFixed(2)}`}
        </button>
      )}

      <StepFeedback step={step} />

      <div className="mt-3 flex items-start gap-2 text-[11px] ink-3">
        <Info size={11} className="flex-shrink-0 mt-0.5" />
        <span>
          Live quote from the AMM. 1% slippage tolerance. 2% trading fee.
        </span>
      </div>
    </div>
  );
}

function StepFeedback({ step }: { step: ReturnType<typeof useTrade>["step"] }) {
  if (step.kind === "idle") return null;

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

  if (step.kind === "success") {
    return (
      <div
        className="mt-3 p-2.5 rounded-lg text-[11.5px] flex items-start gap-2"
        style={{
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          color: "#10B981",
        }}
      >
        <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" />
        <span className="flex-1">
          {step.action === "buy"
            ? "Trade complete!"
            : step.action === "sell"
            ? "Sold successfully!"
            : "Winnings claimed!"}
        </span>
        <a
          href={`${ARC_EXPLORER}/tx/${step.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 underline opacity-90 hover:opacity-100"
        >
          View tx <ExternalLink size={10} />
        </a>
      </div>
    );
  }

  // pending steps with optional txHash
  if ("txHash" in step && step.txHash) {
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

  return null;
}
