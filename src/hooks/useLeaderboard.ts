"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/contracts";
import { gqlQuery, HAS_INDEXER } from "@/lib/graphql";

export interface LeaderboardEntry {
  rank: number;
  address: string;
  realizedPnL: number;
  totalVolume: number;
  winRate: number;
  tradeCount: number;
  marketsTraded: number;
  marketsWon: number;
  marketsLost: number;
}

const LEADERBOARD_QUERY = `
  query GetLeaderboard($first: Int!) {
    users(
      first: $first
      orderBy: realizedPnL
      orderDirection: desc
      where: { tradeCount_gt: 0 }
    ) {
      id
      realizedPnL
      totalVolume
      winRate
      tradeCount
      marketsTraded
      marketsWon
      marketsLost
    }
  }
`;

interface RawUser {
  id: string;
  realizedPnL: string;
  totalVolume: string;
  winRate: string;
  tradeCount: number;
  marketsTraded: number;
  marketsWon: number;
  marketsLost: number;
}

/**
 * useLeaderboard — top traders ranked by realized PnL.
 *
 * Only available if the indexer is connected (HAS_INDEXER).
 * If not, returns an empty array and `isAvailable: false` so the UI can show
 * the "coming soon" state instead.
 */
export function useLeaderboard(limit: number = 50) {
  const query = useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async () => {
      const data = await gqlQuery<{ users: RawUser[] }>(LEADERBOARD_QUERY, {
        first: limit,
      });
      return data.users;
    },
    enabled: HAS_INDEXER,
    refetchInterval: 30_000,
  });

  const entries: LeaderboardEntry[] = (query.data ?? []).map((u, i) => ({
    rank: i + 1,
    address: u.id,
    realizedPnL: Number(formatUnits(BigInt(u.realizedPnL), USDC_DECIMALS)),
    totalVolume: Number(formatUnits(BigInt(u.totalVolume), USDC_DECIMALS)),
    winRate: parseFloat(u.winRate),
    tradeCount: u.tradeCount,
    marketsTraded: u.marketsTraded,
    marketsWon: u.marketsWon,
    marketsLost: u.marketsLost,
  }));

  return {
    entries,
    isLoading: HAS_INDEXER && query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isAvailable: HAS_INDEXER,
  };
}
