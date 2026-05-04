"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { useMemo } from "react";
import { formatUnits } from "viem";
import { CONTRACTS, FACTORY_ABI, MARKET_ABI, USDC_DECIMALS, MarketStatus } from "@/lib/contracts";
import type { Market, Category } from "@/lib/types";

/**
 * useMarkets — reads every market from the factory.
 *
 * How it works:
 * 1. Read marketsCount() to know how many markets exist
 * 2. Read getMarkets(0, count) to get all market addresses in one call
 * 3. For each market address, batch-read all its public fields via useReadContracts
 * 4. Transform raw chain data into our Market type
 *
 * For ~5-50 markets this is fast enough without an indexer.
 * Beyond that, we'd add a multicall or subgraph.
 */
export function useMarkets() {
  // Step 1: how many markets exist?
  const { data: count, isLoading: countLoading, error: countError } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "marketsCount",
  });

  // Step 2: get all market addresses
  const { data: addresses, isLoading: addrsLoading } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "getMarkets",
    args: [0n, count ?? 0n],
    query: { enabled: count !== undefined && count > 0n },
  });

  // Step 3: for each market, read all its public state in one batch
  // We make 11 reads per market (question, criteria, category, endsAt, createdAt,
  // status, yesReserve, noReserve, yesShares, noShares, getYesPrice).
  const contracts = useMemo(() => {
    if (!addresses) return [];
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

  const { data: rawData, isLoading: dataLoading, refetch } = useReadContracts({
    // @ts-expect-error wagmi typing for dynamic contract arrays is tricky
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  // Step 4: transform into our Market[] shape
  const markets = useMemo<Market[]>(() => {
    if (!addresses || !rawData) return [];

    const addrList = addresses as readonly `0x${string}`[];
    const result: Market[] = [];

    for (let i = 0; i < addrList.length; i++) {
      const base = i * 11;

      // Each result has shape { result, status, error }. Skip if any failed.
      const slice = rawData.slice(base, base + 11);
      if (slice.some((r) => r.status !== "success")) {
        console.warn(`[Arc Markets] Failed to read market ${addrList[i]}, skipping`);
        continue;
      }

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
        string,
        string,
        string,
        bigint,
        bigint,
        number,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint
      ];

      // Compute derived values
      const yesPrice = Number(yesPriceBps) / 10_000; // basis points → 0..1
      // Liquidity = total USDC backing the pool (= yesReserve + noReserve in 6-decimal units, divided by 2)
      // Actually each USDC backs 1 YES + 1 NO, so liquidity ≈ min(yesR, noR) but a reasonable display value
      // is just the average of the two reserves.
      const liquidity = (Number(formatUnits(yesReserve, USDC_DECIMALS)) +
        Number(formatUnits(noReserve, USDC_DECIMALS))) / 2;

      // Volume: we don't track it on-chain (would need event scan or indexer).
      // For v1 we use total outstanding shares as a proxy for "engagement" on the market.
      const volume =
        Number(formatUnits(yesSharesOutstanding, USDC_DECIMALS)) +
        Number(formatUnits(noSharesOutstanding, USDC_DECIMALS));

      // 24h change — we don't have history yet, so set to 0 until we add an indexer
      const change24h = 0;

      // History: synthesize a flat line at the current price until we add real history
      const history = Array.from({ length: 32 }, (_, idx) => ({
        t: Date.now() - (31 - idx) * 1000 * 60 * 60,
        yes: yesPrice,
      }));

      result.push({
        id: addrList[i],
        question,
        description: resolutionCriteria,
        category: category as Category,
        yesPrice,
        change24h,
        volume,
        liquidity,
        endsAt: Number(endsAt) * 1000, // chain stores seconds, JS uses ms
        createdAt: Number(createdAt) * 1000,
        history,
        resolution:
          status === MarketStatus.RESOLVED_YES
            ? "yes"
            : status === MarketStatus.RESOLVED_NO
            ? "no"
            : undefined,
        // First market gets featured tag for visual variety
        featured: i === 0,
        trending: i < 3,
      });
    }

    return result;
  }, [addresses, rawData]);

  return {
    markets,
    isLoading: countLoading || addrsLoading || dataLoading,
    error: countError,
    count: count ? Number(count) : 0,
    refetch,
  };
}

/**
 * Find a single market by address from the loaded list.
 * Used by the drawer when a tile is clicked.
 */
export function useMarketById(id: string | null, markets: Market[]) {
  return useMemo(() => {
    if (!id) return null;
    return markets.find((m) => m.id.toLowerCase() === id.toLowerCase()) || null;
  }, [id, markets]);
}
