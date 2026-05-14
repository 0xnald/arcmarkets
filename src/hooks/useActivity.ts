"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { formatUnits, parseAbiItem } from "viem";
import { USDC_DECIMALS } from "@/lib/contracts";
import { gqlQuery, HAS_INDEXER } from "@/lib/graphql";
import type { Market, Trade } from "@/lib/types";

const TRADE_EVENT = parseAbiItem(
  "event Trade(address indexed user, uint8 side, bool isBuy, uint256 usdcAmount, uint256 sharesAmount, uint256 newYesPrice)"
);

const LOOKBACK_BLOCKS = 5000n;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface Options {
  marketAddress?: string;
  limit?: number;
}

const ACTIVITY_QUERY = `
  query GetActivity($limit: Int!, $where: Trade_filter) {
    trades(first: $limit, orderBy: timestamp, orderDirection: desc, where: $where) {
      id
      side
      isBuy
      usdcAmount
      sharesAmount
      price
      timestamp
      txHash
      market { id question }
      user { id }
    }
  }
`;

interface RawTrade {
  id: string;
  side: "YES" | "NO";
  isBuy: boolean;
  usdcAmount: string;
  sharesAmount: string;
  price: string;
  timestamp: string;
  txHash: string;
  market: { id: string; question: string };
  user: { id: string };
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function useActivity(markets: Market[], opts: Options = {}) {
  const { marketAddress, limit = 20 } = opts;

  // ── Path A: indexer ────────────────────────────────────────────────
  const indexer = useQuery({
    queryKey: ["activity", marketAddress || "all", limit],
    queryFn: async () => {
      const where = marketAddress
        ? { market: marketAddress.toLowerCase() }
        : undefined;
      const data = await gqlQuery<{ trades: RawTrade[] }>(ACTIVITY_QUERY, {
        limit,
        where,
      });
      return data.trades.map<Trade>((t) => ({
        id: t.id,
        marketId: t.market.id,
        marketQuestion: t.market.question,
        side: t.side === "YES" ? "yes" : "no",
        shares: Number(formatUnits(BigInt(t.sharesAmount), USDC_DECIMALS)),
        price: parseFloat(t.price),
        total: Number(formatUnits(BigInt(t.usdcAmount), USDC_DECIMALS)),
        user: shortAddr(t.user.id),
        timestamp: parseInt(t.timestamp) * 1000,
      }));
    },
    enabled: HAS_INDEXER,
    refetchInterval: 10_000,
  });

  // ── Path B: RPC fallback ───────────────────────────────────────────
  const publicClient = usePublicClient();
  const [rpcTrades, setRpcTrades] = useState<Trade[]>([]);
  const [rpcLoading, setRpcLoading] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  const fetchRpcTrades = useCallback(async () => {
    if (HAS_INDEXER || !publicClient || markets.length === 0) return;
    setRpcLoading(true);
    setRpcError(null);
    try {
      const latest = await publicClient.getBlockNumber();
      const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
      const targets = marketAddress
        ? markets.filter((m) => m.id.toLowerCase() === marketAddress.toLowerCase())
        : markets;

      const logsPerMarket = await Promise.all(
        targets.map((market) =>
          publicClient
            .getLogs({
              address: market.id as `0x${string}`,
              event: TRADE_EVENT,
              fromBlock,
              toBlock: latest,
            })
            .then((logs) => ({ market, logs }))
            .catch(() => ({ market, logs: [] as any[] }))
        )
      );

      const allLogs: { market: Market; log: any }[] = [];
      for (const { market, logs } of logsPerMarket) {
        for (const log of logs) allLogs.push({ market, log });
      }

      const uniqueBlocks = Array.from(new Set(allLogs.map((e) => e.log.blockNumber)));
      const blockTimes = new Map<bigint, number>();
      await Promise.all(
        uniqueBlocks.map(async (bn) => {
          try {
            const b = await publicClient.getBlock({ blockNumber: bn });
            blockTimes.set(bn, Number(b.timestamp) * 1000);
          } catch {
            blockTimes.set(bn, Date.now());
          }
        })
      );

      const result: Trade[] = allLogs.map((entry) => {
        const args = entry.log.args as {
          user: `0x${string}`;
          side: number;
          isBuy: boolean;
          usdcAmount: bigint;
          sharesAmount: bigint;
        };
        const isYes = Number(args.side) === 0;
        const total = Number(formatUnits(args.usdcAmount, USDC_DECIMALS));
        const sharesNum = Number(formatUnits(args.sharesAmount, USDC_DECIMALS));
        return {
          id: `${entry.log.transactionHash}-${entry.log.logIndex}`,
          marketId: entry.market.id,
          marketQuestion: entry.market.question,
          side: isYes ? "yes" : "no",
          shares: sharesNum,
          price: sharesNum > 0 ? total / sharesNum : 0,
          total,
          user: shortAddr(args.user),
          timestamp: blockTimes.get(entry.log.blockNumber) ?? Date.now(),
        };
      });
      result.sort((a, b) => b.timestamp - a.timestamp);
      setRpcTrades(result.slice(0, limit));
    } catch (e: any) {
      setRpcError(e?.message || "Failed");
    } finally {
      setRpcLoading(false);
    }
  }, [publicClient, markets, marketAddress, limit]);

  useEffect(() => {
    if (!HAS_INDEXER) fetchRpcTrades();
  }, [fetchRpcTrades]);

  const trades = HAS_INDEXER ? indexer.data ?? [] : rpcTrades;

  // 24h volume & count — computed from the trade feed.
  // Caveat: if `limit` is small and you have heavy volume, this can undercount.
  // For limit=100 and typical testnet volume this is accurate.
  const { volume24h, tradesCount24h } = useMemo(() => {
    const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
    let vol = 0;
    let count = 0;
    for (const t of trades) {
      if (t.timestamp >= cutoff) {
        vol += t.total;
        count += 1;
      }
    }
    return { volume24h: vol, tradesCount24h: count };
  }, [trades]);

  return {
    trades,
    volume24h,
    tradesCount24h,
    isLoading: HAS_INDEXER ? indexer.isLoading : rpcLoading,
    error: HAS_INDEXER ? (indexer.error?.message ?? null) : rpcError,
    refetch: HAS_INDEXER ? indexer.refetch : fetchRpcTrades,
    source: HAS_INDEXER ? ("indexer" as const) : ("rpc" as const),
  };
}
