"use client";

import { useEffect, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits, parseAbiItem, type Log } from "viem";
import { MARKET_ABI, USDC_DECIMALS } from "@/lib/contracts";
import type { Market, Trade } from "@/lib/types";

// The Trade event ABI item — extracted for getLogs filtering
const TRADE_EVENT = parseAbiItem(
  "event Trade(address indexed user, uint8 side, bool isBuy, uint256 usdcAmount, uint256 sharesAmount, uint256 newYesPrice)"
);

/**
 * useActivity — fetches recent Trade events from a set of markets via on-chain log scanning.
 *
 * This is a pragmatic mid-step between mock data and a proper indexer:
 *   - Calls eth_getLogs for each market contract
 *   - Looks back ~5000 blocks (roughly the last 1-2 hours on Arc, depending on block time)
 *   - Aggregates, sorts by recency, returns the top N
 *
 * Limitations:
 *   - RPC may rate-limit getLogs calls; if so, we degrade gracefully to empty
 *   - Only shows trades from the lookback window — older history requires an indexer
 *   - Does not show buys vs sells differently in the activity feed (just direction)
 *
 * For production: replace this with a Goldsky/Graph subgraph that exposes a /trades endpoint.
 */

const LOOKBACK_BLOCKS = 5000n;

interface Options {
  marketAddress?: string; // if provided, only fetch from this one market
  limit?: number;
}

export function useActivity(markets: Market[], opts: Options = {}) {
  const { marketAddress, limit = 20 } = opts;
  const publicClient = usePublicClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!publicClient || markets.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Determine block range
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;

      // Determine which markets to scan
      const targets = marketAddress
        ? markets.filter((m) => m.id.toLowerCase() === marketAddress.toLowerCase())
        : markets;

      // Fetch logs for each market in parallel
      const logsPerMarket = await Promise.all(
        targets.map((market) =>
          publicClient
            .getLogs({
              address: market.id as `0x${string}`,
              event: TRADE_EVENT,
              fromBlock,
              toBlock: latestBlock,
            })
            .then((logs) => ({ market, logs }))
            .catch((err) => {
              console.warn(`[useActivity] getLogs failed for ${market.id}:`, err.message);
              return { market, logs: [] as Log[] };
            })
        )
      );

      // Need block timestamps to convert blocks to wall-clock time.
      // We batch this — get a list of unique blocks and fetch their timestamps once.
      const allLogs: { market: Market; log: any }[] = [];
      for (const { market, logs } of logsPerMarket) {
        for (const log of logs) {
          allLogs.push({ market, log });
        }
      }

      // Get timestamps for blocks (with dedup)
      const uniqueBlocks = Array.from(new Set(allLogs.map((entry) => entry.log.blockNumber)));
      const blockTimestamps = new Map<bigint, number>();

      await Promise.all(
        uniqueBlocks.map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps.set(bn, Number(block.timestamp) * 1000);
          } catch {
            blockTimestamps.set(bn, Date.now());
          }
        })
      );

      // Transform into our Trade type
      const result: Trade[] = allLogs.map((entry, idx) => {
        const args = entry.log.args as {
          user: `0x${string}`;
          side: number;
          isBuy: boolean;
          usdcAmount: bigint;
          sharesAmount: bigint;
          newYesPrice: bigint;
        };

        const isYes = Number(args.side) === 0;
        const total = Number(formatUnits(args.usdcAmount, USDC_DECIMALS));
        const sharesNum = Number(formatUnits(args.sharesAmount, USDC_DECIMALS));
        const price = sharesNum > 0 ? total / sharesNum : 0;

        return {
          id: `${entry.log.transactionHash}-${entry.log.logIndex}`,
          marketId: entry.market.id,
          marketQuestion: entry.market.question,
          side: isYes ? "yes" : "no",
          shares: sharesNum,
          price,
          total,
          user: `${args.user.slice(0, 6)}…${args.user.slice(-4)}`,
          timestamp: blockTimestamps.get(entry.log.blockNumber) ?? Date.now(),
        };
      });

      // Sort newest first, slice to limit
      result.sort((a, b) => b.timestamp - a.timestamp);
      setTrades(result.slice(0, limit));
    } catch (e: any) {
      console.error("[useActivity] error:", e);
      setError(e?.message || "Failed to fetch activity");
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, markets, marketAddress, limit]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return { trades, isLoading, error, refetch: fetchTrades };
}
