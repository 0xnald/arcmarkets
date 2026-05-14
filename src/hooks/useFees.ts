"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/contracts";
import { MARKET_FEES_ABI } from "@/lib/contractsAdminExt";
import type { Market } from "@/lib/types";

export interface MarketFees {
  market: Market;
  accumulatedFees: bigint;       // raw on-chain value
  accumulatedFeesUsdc: number;   // human-readable USDC
}

/**
 * useFees — reads `accumulatedFees` from each market contract in parallel.
 *
 * Why a separate hook (not part of useMarkets):
 *   - Only admin views care about this
 *   - It's an extra ~N reads per page load — avoid paying that cost everywhere
 *   - Easy to refetch independently after a successful collect tx
 */
export function useFees(markets: Market[]) {
  const contracts = useMemo(() => {
    if (markets.length === 0) return [];
    return markets.map((m) => ({
      address: m.id as `0x${string}`,
      abi: MARKET_FEES_ABI,
      functionName: "accumulatedFees",
    }));
  }, [markets]);

  const { data, isLoading, refetch } = useReadContracts({
    // @ts-ignore wagmi typing for dynamic arrays
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const fees = useMemo<MarketFees[]>(() => {
    if (!data) return [];
    const result: MarketFees[] = [];
    for (let i = 0; i < markets.length; i++) {
      const r = data[i];
      if (r?.status !== "success") continue;
      const raw = r.result as bigint;
      result.push({
        market: markets[i],
        accumulatedFees: raw,
        accumulatedFeesUsdc: Number(formatUnits(raw, USDC_DECIMALS)),
      });
    }
    // Sort: markets with fees first, then by amount descending
    result.sort((a, b) => {
      if (a.accumulatedFees === 0n && b.accumulatedFees > 0n) return 1;
      if (a.accumulatedFees > 0n && b.accumulatedFees === 0n) return -1;
      return b.accumulatedFeesUsdc - a.accumulatedFeesUsdc;
    });
    return result;
  }, [data, markets]);

  const totalCollectableUsdc = useMemo(
    () => fees.reduce((sum, f) => sum + f.accumulatedFeesUsdc, 0),
    [fees]
  );

  const marketsWithFees = useMemo(
    () => fees.filter((f) => f.accumulatedFees > 0n).length,
    [fees]
  );

  return {
    fees,
    totalCollectableUsdc,
    marketsWithFees,
    isLoading,
    refetch,
  };
}
