"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import {
  CONTRACTS,
  FACTORY_ABI,
  MARKET_ABI,
  USDC_DECIMALS,
  MarketStatus,
} from "@/lib/contracts";
import { gqlQuery, HAS_INDEXER } from "@/lib/graphql";
import type { Market } from "@/lib/types";

type PricePoint = { t: number; yes: number };

/**
 * useMarkets — returns the full markets list with prices, reserves, and volume.
 *
 * Strategy:
 *   1. If NEXT_PUBLIC_SUBGRAPH_URL is set → query subgraph (fast, full history)
 *   2. Otherwise → fall back to direct RPC reads (slow, current state only)
 *
 * Both code paths return the same Market[] shape so callers don't need to know
 * which one ran.
 */

// ─────────────────────────────────────────────────────────────────────
//  GraphQL query shapes
// ─────────────────────────────────────────────────────────────────────

const MARKETS_QUERY = `
  query GetMarkets {
    markets(first: 100, orderBy: createdAt, orderDirection: desc) {
      id
      question
      resolutionCriteria
      category
      endsAt
      createdAt
      yesReserve
      noReserve
      yesPrice
      yesPrice24hAgo
      yesSharesOutstanding
      noSharesOutstanding
      tradeCount
      totalVolume
      status
      resolutionResult
      pricePoints(first: 32, orderBy: timestamp, orderDirection: desc) {
        yesPrice
        timestamp
      }
    }
  }
`;

interface RawMarket {
  id: string;
  question: string;
  resolutionCriteria: string;
  category: string;
  endsAt: string;
  createdAt: string;
  yesReserve: string;
  noReserve: string;
  yesPrice: string;
  yesPrice24hAgo: string;
  yesSharesOutstanding: string;
  noSharesOutstanding: string;
  tradeCount: number;
  totalVolume: string;
  status: string;
  resolutionResult: string | null;
  pricePoints: Array<{ yesPrice: string; timestamp: string }>;
}

// ─────────────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────────────

export function useMarkets() {
  // ── Path A: indexer (preferred) ─────────────────────────────────────
  const indexer = useQuery({
    queryKey: ["markets", "subgraph"],
    queryFn: async () => {
      const data = await gqlQuery<{ markets: RawMarket[] }>(MARKETS_QUERY);
      return data.markets;
    },
    enabled: HAS_INDEXER,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  // ── Path B: RPC fallback ────────────────────────────────────────────
  const { data: count, isLoading: countLoading, error: countError } =
    useReadContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "marketsCount",
      query: { enabled: !HAS_INDEXER },
    });

  const { data: addresses, isLoading: addrsLoading } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "getMarkets",
    args: [0n, count ?? 0n],
    query: { enabled: !HAS_INDEXER && count !== undefined && count > 0n },
  });

  const rpcContracts = useMemo(() => {
    if (HAS_INDEXER || !addresses) return [];
    return (addresses as readonly `0x${string}`[]).flatMap((addr) => [
      { address: addr, abi: MARKET_ABI, functionName: "question" },
      { address: addr, abi: MARKET_ABI, functionName: "resolutionCriteria" },
      { address: addr, abi: MARKET_ABI, functionName: "category" },
      { address: addr, abi: MARKET_ABI, functionName: "endsAt" },
      { address: addr, abi: MARKET_ABI, functionName: "createdAt" },
      { address: addr, abi: MARKET_ABI, functionName: "status" },
      { address: addr, abi: MARKET_ABI, functionName: "yesReserve" },
      { address: addr, abi: MARKET_ABI, functionName: "noReserve" },
      { address: addr, abi: MARKET_ABI, functionName: "yesSharesOutstanding" },
      { address: addr, abi: MARKET_ABI, functionName: "noSharesOutstanding" },
      { address: addr, abi: MARKET_ABI, functionName: "getYesPrice" },
    ]);
  }, [addresses]);

  const { data: rawRpcData, isLoading: rpcDataLoading, refetch: refetchRpc } =
    useReadContracts({
      // @ts-ignore wagmi typing for dynamic arrays
      contracts: rpcContracts,
      query: { enabled: rpcContracts.length > 0 },
    });

  // ── Transform to Market[] ───────────────────────────────────────────
  const markets = useMemo<Market[]>(() => {
    // Path A
    if (HAS_INDEXER) {
      if (!indexer.data) return [];
      return indexer.data.map((m, i) => {
        const yesPrice = parseFloat(m.yesPrice) || 0;
        const yesPrice24hAgo = parseFloat(m.yesPrice24hAgo) || yesPrice;
        const change24h = yesPrice24hAgo > 0 ? (yesPrice - yesPrice24hAgo) / yesPrice24hAgo : 0;

        // Real price history from subgraph, reversed to chronological
        const history: PricePoint[] = m.pricePoints
          .slice()
          .reverse()
          .map((p) => ({
            t: parseInt(p.timestamp) * 1000,
            yes: parseFloat(p.yesPrice),
          }));

        // If we have fewer than 2 points, synthesize a flat line so charts render
        if (history.length < 2) {
          const now = Date.now();
          history.length = 0;
          for (let j = 0; j < 8; j++) {
            history.push({ t: now - (7 - j) * 60 * 60 * 1000, yes: yesPrice });
          }
        }

        const liquidity =
          (Number(formatUnits(BigInt(m.yesReserve), USDC_DECIMALS)) +
            Number(formatUnits(BigInt(m.noReserve), USDC_DECIMALS))) / 2;
        const volume = Number(formatUnits(BigInt(m.totalVolume), USDC_DECIMALS));

        let resolution: "yes" | "no" | undefined;
        if (m.status === "RESOLVED_YES") resolution = "yes";
        else if (m.status === "RESOLVED_NO") resolution = "no";

        return {
          id: m.id,
          question: m.question,
          description: m.resolutionCriteria,
          category: m.category as any,
          yesPrice,
          change24h,
          volume,
          liquidity,
          endsAt: parseInt(m.endsAt) * 1000,
          createdAt: parseInt(m.createdAt) * 1000,
          history,
          resolution,
          featured: i === 0,
          trending: m.tradeCount >= 3,
        };
      });
    }

    // Path B (RPC fallback)
    if (!addresses || !rawRpcData) return [];
    const addrList = addresses as readonly `0x${string}`[];
    const result: Market[] = [];
    for (let i = 0; i < addrList.length; i++) {
      const base = i * 11;
      const slice = rawRpcData.slice(base, base + 11);
      if (slice.some((r) => r.status !== "success")) continue;
      const [
        question,
        resolutionCriteria,
        category,
        endsAt,
        createdAt,
        status,
        yesReserve,
        noReserve,
        yesSharesOutstanding,
        noSharesOutstanding,
        yesPriceBps,
      ] = slice.map((r) => r.result) as [
        string, string, string,
        bigint, bigint, number,
        bigint, bigint, bigint, bigint, bigint
      ];

      const yesPrice = Number(yesPriceBps) / 10_000;
      const liquidity =
        (Number(formatUnits(yesReserve, USDC_DECIMALS)) +
          Number(formatUnits(noReserve, USDC_DECIMALS))) / 2;
      const volume =
        Number(formatUnits(yesSharesOutstanding, USDC_DECIMALS)) +
        Number(formatUnits(noSharesOutstanding, USDC_DECIMALS));
      const history = Array.from({ length: 32 }, (_, idx) => ({
        t: Date.now() - (31 - idx) * 60 * 60 * 1000,
        yes: yesPrice,
      }));
      result.push({
        id: addrList[i],
        question,
        description: resolutionCriteria,
        category: category as any,
        yesPrice,
        change24h: 0,
        volume,
        liquidity,
        endsAt: Number(endsAt) * 1000,
        createdAt: Number(createdAt) * 1000,
        history,
        resolution:
          status === MarketStatus.RESOLVED_YES ? "yes"
          : status === MarketStatus.RESOLVED_NO ? "no"
          : undefined,
        featured: i === 0,
        trending: i < 3,
      });
    }
    return result;
  }, [indexer.data, addresses, rawRpcData]);

  return {
    markets,
    isLoading: HAS_INDEXER
      ? indexer.isLoading
      : countLoading || addrsLoading || rpcDataLoading,
    error: HAS_INDEXER ? indexer.error : countError,
    count: markets.length,
    refetch: HAS_INDEXER ? indexer.refetch : refetchRpc,
    source: HAS_INDEXER ? ("indexer" as const) : ("rpc" as const),
  };
}

export function useMarketById(id: string | null, markets: Market[]) {
  return useMemo(() => {
    if (!id) return null;
    return markets.find((m) => m.id.toLowerCase() === id.toLowerCase()) || null;
  }, [id, markets]);
}
