"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { MARKET_ABI, USDC_DECIMALS, Side } from "@/lib/contracts";
import { gqlQuery, HAS_INDEXER } from "@/lib/graphql";
import type { Market } from "@/lib/types";

export interface PortfolioPosition {
  market: Market;
  yesShares: number;
  noShares: number;
  yesValue: number;
  noValue: number;
  totalValue: number;
  // From indexer only — null in RPC mode
  yesCostBasis: number | null;
  noCostBasis: number | null;
  unrealizedPnL: number | null;
  claimed: boolean;
}

// ─────────────────────────────────────────────────────────────────────
//  GraphQL query — pull all positions for the user
// ─────────────────────────────────────────────────────────────────────

const PORTFOLIO_QUERY = `
  query GetPortfolio($user: ID!) {
    user(id: $user) {
      id
      realizedPnL
      totalSpent
      totalReceived
      tradeCount
      marketsTraded
      marketsWon
      marketsLost
      winRate
    }
    positions(where: { user: $user }, first: 100) {
      yesShares
      noShares
      yesCostBasis
      noCostBasis
      claimed
      claimedAmount
      market { id }
    }
  }
`;

interface RawPortfolio {
  user: {
    id: string;
    realizedPnL: string;
    totalSpent: string;
    totalReceived: string;
    tradeCount: number;
    marketsTraded: number;
    marketsWon: number;
    marketsLost: number;
    winRate: string;
  } | null;
  positions: Array<{
    yesShares: string;
    noShares: string;
    yesCostBasis: string;
    noCostBasis: string;
    claimed: boolean;
    claimedAmount: string;
    market: { id: string };
  }>;
}

// ─────────────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────────────

export function usePortfolio(markets: Market[]) {
  const { address, isConnected } = useAccount();
  const userAddr = address?.toLowerCase();

  // ── Path A: indexer ────────────────────────────────────────────────
  const indexer = useQuery({
    queryKey: ["portfolio", userAddr],
    queryFn: async () => {
      if (!userAddr) throw new Error("No address");
      return await gqlQuery<RawPortfolio>(PORTFOLIO_QUERY, { user: userAddr });
    },
    enabled: HAS_INDEXER && isConnected && !!userAddr,
    refetchInterval: 15_000,
  });

  // ── Path B: RPC fallback ───────────────────────────────────────────
  const rpcContracts = useMemo(() => {
    if (HAS_INDEXER || !address || !isConnected || markets.length === 0) return [];
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

  const { data: rpcData, isLoading: rpcLoading, refetch: refetchRpc } =
    useReadContracts({
      // @ts-ignore wagmi typing for dynamic arrays
      contracts: rpcContracts,
      query: { enabled: rpcContracts.length > 0 },
    });

  // ── Transform to PortfolioPosition[] ──────────────────────────────
  const positions = useMemo<PortfolioPosition[]>(() => {
    if (HAS_INDEXER) {
      if (!indexer.data) return [];
      const result: PortfolioPosition[] = [];
      for (const raw of indexer.data.positions) {
        const market = markets.find(
          (m) => m.id.toLowerCase() === raw.market.id.toLowerCase()
        );
        if (!market) continue;

        const yesShares = Number(formatUnits(BigInt(raw.yesShares), USDC_DECIMALS));
        const noShares = Number(formatUnits(BigInt(raw.noShares), USDC_DECIMALS));
        if (yesShares === 0 && noShares === 0 && !raw.claimed) continue;

        const yesCost = Number(formatUnits(BigInt(raw.yesCostBasis), USDC_DECIMALS));
        const noCost = Number(formatUnits(BigInt(raw.noCostBasis), USDC_DECIMALS));
        const yesValue = yesShares * market.yesPrice;
        const noValue = noShares * (1 - market.yesPrice);
        const totalValue = yesValue + noValue;
        const totalCost = yesCost + noCost;
        const unrealizedPnL = totalValue - totalCost;

        result.push({
          market,
          yesShares,
          noShares,
          yesValue,
          noValue,
          totalValue,
          yesCostBasis: yesCost,
          noCostBasis: noCost,
          unrealizedPnL,
          claimed: raw.claimed,
        });
      }
      return result;
    }

    // RPC fallback
    if (!rpcData || markets.length === 0) return [];
    const result: PortfolioPosition[] = [];
    for (let i = 0; i < markets.length; i++) {
      const yesR = rpcData[i * 2];
      const noR = rpcData[i * 2 + 1];
      if (yesR?.status !== "success" || noR?.status !== "success") continue;
      const yesSharesRaw = yesR.result as bigint;
      const noSharesRaw = noR.result as bigint;
      if (yesSharesRaw === 0n && noSharesRaw === 0n) continue;

      const yesShares = Number(formatUnits(yesSharesRaw, USDC_DECIMALS));
      const noShares = Number(formatUnits(noSharesRaw, USDC_DECIMALS));
      const market = markets[i];
      const yesValue = yesShares * market.yesPrice;
      const noValue = noShares * (1 - market.yesPrice);

      result.push({
        market,
        yesShares,
        noShares,
        yesValue,
        noValue,
        totalValue: yesValue + noValue,
        yesCostBasis: null,
        noCostBasis: null,
        unrealizedPnL: null,
        claimed: false,
      });
    }
    return result;
  }, [indexer.data, rpcData, markets]);

  const summary = useMemo(() => {
    const totalValue = positions.reduce((s, p) => s + p.totalValue, 0);
    const totalYes = positions.reduce((s, p) => s + p.yesShares, 0);
    const totalNo = positions.reduce((s, p) => s + p.noShares, 0);
    const yesMarkets = positions.filter((p) => p.yesShares > 0).length;
    const noMarkets = positions.filter((p) => p.noShares > 0).length;

    // Indexer-only fields
    const user = HAS_INDEXER ? indexer.data?.user : null;
    const realizedPnL = user
      ? Number(formatUnits(BigInt(user.realizedPnL), USDC_DECIMALS))
      : 0;
    const totalSpent = user
      ? Number(formatUnits(BigInt(user.totalSpent), USDC_DECIMALS))
      : 0;
    const totalReceived = user
      ? Number(formatUnits(BigInt(user.totalReceived), USDC_DECIMALS))
      : 0;
    const unrealizedPnL = positions.reduce(
      (s, p) => s + (p.unrealizedPnL ?? 0),
      0
    );
    const winRate = user ? parseFloat(user.winRate) : 0;

    return {
      totalValue,
      totalYesShares: totalYes,
      totalNoShares: totalNo,
      activePositions: positions.length,
      yesMarkets,
      noMarkets,
      realizedPnL,
      unrealizedPnL,
      totalSpent,
      totalReceived,
      winRate,
      marketsWon: user?.marketsWon ?? 0,
      marketsLost: user?.marketsLost ?? 0,
      tradeCount: user?.tradeCount ?? 0,
    };
  }, [positions, indexer.data]);

  return {
    positions,
    summary,
    isLoading: HAS_INDEXER ? indexer.isLoading : rpcLoading,
    refetch: HAS_INDEXER ? indexer.refetch : refetchRpc,
    isConnected,
    source: HAS_INDEXER ? ("indexer" as const) : ("rpc" as const),
  };
}
