"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import {
  X,
  ExternalLink,
  Bookmark,
  Share2,
  FileText,
  Activity as ActivityIcon,
  Wallet,
} from "lucide-react";
import type { Market } from "@/lib/types";
import { fmtUSD, fmtPct, fmtDate, CATEGORY_META, timeSince } from "@/lib/format";
import { TradePanel } from "./TradePanel";
import { PriceChart } from "./PriceChart";
import { MARKET_ABI, USDC_DECIMALS, Side } from "@/lib/contracts";
import { useActivity } from "@/hooks/useActivity";

interface Props {
  market: Market | null;
  onClose: () => void;
  onTradeSuccess?: () => void;
}

const ARC_EXPLORER = "https://testnet.arcscan.app";

export function MarketDrawer({ market, onClose, onTradeSuccess }: Props) {
  return (
    <AnimatePresence>
      {market && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[820px] overflow-hidden flex flex-col"
            style={{
              background: "rgb(var(--bg))",
              borderLeft: "1px solid rgb(var(--line-2))",
            }}
          >
            <DrawerContent
              market={market}
              onClose={onClose}
              onTradeSuccess={onTradeSuccess}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerContent({
  market,
  onClose,
  onTradeSuccess,
}: {
  market: Market;
  onClose: () => void;
  onTradeSuccess?: () => void;
}) {
  const cat = CATEGORY_META[market.category];
  const positive = market.change24h >= 0;
  const { address, isConnected } = useAccount();

  // User's position in this market
  const { data: yesShares, refetch: refetchYes } = useReadContract({
    address: market.id as `0x${string}`,
    abi: MARKET_ABI,
    functionName: "shares",
    args: address ? [address, Side.YES] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const { data: noShares, refetch: refetchNo } = useReadContract({
    address: market.id as `0x${string}`,
    abi: MARKET_ABI,
    functionName: "shares",
    args: address ? [address, Side.NO] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // Activity for THIS market only
  const { trades: marketTrades, isLoading: tradesLoading } = useActivity([market], {
    marketAddress: market.id,
    limit: 8,
  });

  const yesSharesNum = yesShares ? Number(formatUnits(yesShares as bigint, USDC_DECIMALS)) : 0;
  const noSharesNum = noShares ? Number(formatUnits(noShares as bigint, USDC_DECIMALS)) : 0;
  const hasPosition = yesSharesNum > 0 || noSharesNum > 0;

  const handleTradeSuccess = () => {
    refetchYes();
    refetchNo();
    onTradeSuccess?.();
  };

  return (
    <>
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: "rgb(var(--line))" }}
      >
        <div className="flex items-center gap-2">
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
          <span className="pill">Ends {fmtDate(market.endsAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn btn-sm">
            <Bookmark size={12} />
          </button>
          <button className="btn btn-sm">
            <Share2 size={12} />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-bg-2"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid lg:grid-cols-[1fr_340px] gap-5 p-6">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold leading-tight tracking-tight mb-5">
              {market.question}
            </h1>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="tile p-3">
                <div className="label-overline mb-1">Current</div>
                <div className="font-display text-xl font-bold">
                  {Math.round(market.yesPrice * 100)}
                  <span className="ink-3 text-sm">%</span>
                </div>
                <div
                  className="text-[10.5px] font-mono font-semibold mt-0.5"
                  style={{ color: positive ? "#10B981" : "#EF4444" }}
                >
                  {fmtPct(market.change24h, 1)} 24h
                </div>
              </div>
              <div className="tile p-3">
                <div className="label-overline mb-1">Volume</div>
                <div className="font-display text-xl font-bold">{fmtUSD(market.volume)}</div>
                <div className="text-[10.5px] font-mono ink-3 mt-0.5">Outstanding</div>
              </div>
              <div className="tile p-3">
                <div className="label-overline mb-1">Liquidity</div>
                <div className="font-display text-xl font-bold">{fmtUSD(market.liquidity)}</div>
                <div className="text-[10.5px] font-mono ink-3 mt-0.5">AMM pool</div>
              </div>
            </div>

            <div className="mb-5">
              <PriceChart data={market.history} />
              <div className="text-[10.5px] font-mono ink-3 mt-1.5 px-1">
                * Historical prices appear once an indexer is connected. Live price is real-time.
              </div>
            </div>

            {hasPosition && (
              <div className="tile p-4 mb-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Wallet size={12} className="ink-2" />
                  <span className="label-overline">Your position</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {yesSharesNum > 0 && (
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
                        YES SHARES
                      </div>
                      <div className="font-mono text-lg font-bold">{yesSharesNum.toFixed(2)}</div>
                      <div className="text-[11px] font-mono ink-3 mt-0.5">
                        Value: ${(yesSharesNum * market.yesPrice).toFixed(2)}
                      </div>
                    </div>
                  )}
                  {noSharesNum > 0 && (
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
                        NO SHARES
                      </div>
                      <div className="font-mono text-lg font-bold">{noSharesNum.toFixed(2)}</div>
                      <div className="text-[11px] font-mono ink-3 mt-0.5">
                        Value: ${(noSharesNum * (1 - market.yesPrice)).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="tile p-4 mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText size={12} className="ink-2" />
                <span className="label-overline">Resolution criteria</span>
              </div>
              <p className="text-[13px] ink-2 leading-relaxed">{market.description}</p>
              <div
                className="mt-3 pt-3 border-t flex items-center justify-between text-[11px]"
                style={{ borderColor: "rgb(var(--line))" }}
              >
                <span className="ink-3 font-mono">Created {fmtDate(market.createdAt)}</span>
                <a
                  href={`${ARC_EXPLORER}/address/${market.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ink-2 hover:text-ink flex items-center gap-1"
                >
                  View on Arc Scan <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* Real activity for this market */}
            <div className="tile overflow-hidden">
              <div
                className="flex items-center gap-1.5 px-4 py-3 border-b"
                style={{ borderColor: "rgb(var(--line))" }}
              >
                <ActivityIcon size={12} className="ink-2" />
                <span className="label-overline">Recent activity</span>
                <span className="ml-auto text-[10px] font-mono ink-3">
                  {tradesLoading ? "Loading..." : marketTrades.length === 0 ? "—" : `${marketTrades.length} trades`}
                </span>
              </div>

              {tradesLoading && marketTrades.length === 0 ? (
                <div className="p-6 text-center text-[12px] ink-3 font-mono">
                  Scanning chain for trades...
                </div>
              ) : marketTrades.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-[13px] ink-2 mb-1">No trades yet</div>
                  <div className="text-[11.5px] ink-3 max-w-sm mx-auto leading-relaxed">
                    Be the first to take a position on this market.
                  </div>
                </div>
              ) : (
                <div>
                  {marketTrades.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 px-4 py-2.5 border-b text-[12px]"
                      style={{ borderColor: "rgb(var(--line))" }}
                    >
                      <span className="font-mono ink-2 flex-shrink-0">{t.user}</span>
                      <span className={t.side === "yes" ? "pill pill-yes" : "pill pill-no"}>
                        {t.side.toUpperCase()}
                      </span>
                      <span className="font-mono ink-2">
                        {t.shares.toFixed(2)} @ {Math.round(t.price * 100)}¢
                      </span>
                      <span className="ml-auto font-mono font-semibold">
                        ${t.total.toFixed(2)}
                      </span>
                      <span className="font-mono text-[10px] ink-3 flex-shrink-0">
                        {timeSince(t.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-0 self-start">
            <TradePanel market={market} onTradeSuccess={handleTradeSuccess} />
          </div>
        </div>
      </div>
    </>
  );
}
