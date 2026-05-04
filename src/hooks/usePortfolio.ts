"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { MARKET_ABI, USDC_DECIMALS, Side } from "@/lib/contracts";
import type { Market } from "@/lib/types";

export interface PortfolioPosition {
  market: Market;
  yesShares: number;
  noShares: number;
  yesValue: number; // current value if you sold now (approximated)
  noValue: number;
  totalValue: number;
}

/**
 * usePortfolio — given the user's address and the loaded market list,
 * fetch their YES + NO position in each market.
 *
 * Approach: batch one `shares(addr, Side.YES)` and `shares(addr, Side.NO)` call per market.
 * For 10 markets that's 20 reads in a single batch — fast.
 *
 * To compute "current value" of a position, we just multiply by current price
 * (which we already have on the market). This is a rough valuation since selling
 * shares moves the price, but it's accurate enough for portfolio display.
 */
export function usePortfolio(markets: Market[]) {
  const { address, isConnected } = useAccount();

  // Build the batch of contract reads — 2 per market (YES shares + NO shares)
  const contracts = useMemo(() => {
    if (!address || !isConnected || markets.length === 0) return [];
    return markets.flatMap((m) => [
      {
        address: m.id as `0x${string}`,
        abi: MARKET_ABI,
        functionName: "shares",
        args: [address, Side.YES],
      },
      {
        address: m.id as `0x${string}`,
        abi: MARKET_ABI,
        functionName: "shares",
        args: [address, Side.NO],
      },
    ]);
  }, [address, isConnected, markets]);

  const { data: rawData, isLoading, refetch } = useReadContracts({
    // @ts-expect-error wagmi typing for dynamic contract arrays
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const positions = useMemo<PortfolioPosition[]>(() => {
    if (!rawData || markets.length === 0) return [];

    const result: PortfolioPosition[] = [];

    for (let i = 0; i < markets.length; i++) {
      const yesResult = rawData[i * 2];
      const noResult = rawData[i * 2 + 1];

      if (yesResult?.status !== "success" || noResult?.status !== "success") continue;

      const yesSharesRaw = yesResult.result as bigint;
      const noSharesRaw = noResult.result as bigint;

      // Skip markets where user has no position
      if (yesSharesRaw === 0n && noSharesRaw === 0n) continue;

      const yesShares = Number(formatUnits(yesSharesRaw, USDC_DECIMALS));
      const noShares = Number(formatUnits(noSharesRaw, USDC_DECIMALS));
      const market = markets[i];

      // Approximate value at current price
      const yesValue = yesShares * market.yesPrice;
      const noValue = noShares * (1 - market.yesPrice);

      result.push({
        market,
        yesShares,
        noShares,
        yesValue,
        noValue,
        totalValue: yesValue + noValue,
      });
    }

    return result;
  }, [rawData, markets]);

  const summary = useMemo(() => {
    const totalValue = positions.reduce((sum, p) => sum + p.totalValue, 0);
    const totalYes = positions.reduce((sum, p) => sum + p.yesShares, 0);
    const totalNo = positions.reduce((sum, p) => sum + p.noShares, 0);
    const yesMarkets = positions.filter((p) => p.yesShares > 0).length;
    const noMarkets = positions.filter((p) => p.noShares > 0).length;
    return {
      totalValue,
      totalYesShares: totalYes,
      totalNoShares: totalNo,
      activePositions: positions.length,
      yesMarkets,
      noMarkets,
    };
  }, [positions]);

  return {
    positions,
    summary,
    isLoading,
    refetch,
    isConnected,
  };
}
