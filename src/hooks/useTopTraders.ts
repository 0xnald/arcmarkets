"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/contracts";
import { gqlQuery, HAS_INDEXER } from "@/lib/graphql";

export interface TopTrader {
  rank: number;
  address: string;
  realizedPnL: number;
  tradeCount: number;
}

const TOP_TRADERS_QUERY = `
  query GetTopTraders($first: Int!) {
    users(
      first: $first
      orderBy: realizedPnL
      orderDirection: desc
      where: { tradeCount_gt: 0 }
    ) {
      id
      realizedPnL
      tradeCount
    }
  }
`;

interface RawTopTrader {
  id: string;
  realizedPnL: string;
  tradeCount: number;
}

/**
 * useTopTraders — top N traders for compact display (e.g. homepage tile).
 *
 * Returns `isAvailable: false` if indexer isn't connected, so the tile can
 * show a fallback state instead of mock data.
 */
export function useTopTraders(limit: number = 3) {
  const query = useQuery({
    queryKey: ["top-traders", limit],
    queryFn: async () => {
      const data = await gqlQuery<{ users: RawTopTrader[] }>(TOP_TRADERS_QUERY, {
        first: limit,
      });
      return data.users;
    },
    enabled: HAS_INDEXER,
    refetchInterval: 30_000,
  });

  const traders: TopTrader[] = (query.data ?? []).map((u, i) => ({
    rank: i + 1,
    address: u.id,
    realizedPnL: Number(formatUnits(BigInt(u.realizedPnL), USDC_DECIMALS)),
    tradeCount: u.tradeCount,
  }));

  return {
    traders,
    isLoading: HAS_INDEXER && query.isLoading,
    isAvailable: HAS_INDEXER,
  };
}
