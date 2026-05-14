"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/contracts";
import { gqlQuery, HAS_INDEXER } from "@/lib/graphql";

const PROTOCOL_QUERY = `
  query GetProtocol {
    protocol(id: "arcmarkets") {
      marketCount
      tradeCount
      totalVolume
      userCount
    }
  }
`;

interface RawProtocol {
  protocol: {
    marketCount: number;
    tradeCount: number;
    totalVolume: string;
    userCount: number;
  } | null;
}

export interface ProtocolStats {
  marketCount: number;
  tradeCount: number;
  totalVolume: number; // human-readable USDC
  userCount: number;
  isAvailable: boolean;
}

/**
 * useProtocolStats — global protocol aggregates (all-time totals).
 *
 * Returns isAvailable=false if the indexer isn't configured, so the UI can
 * fall back to local computation from markets[].
 */
export function useProtocolStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["protocol-stats"],
    queryFn: async () => {
      const result = await gqlQuery<RawProtocol>(PROTOCOL_QUERY);
      return result.protocol;
    },
    enabled: HAS_INDEXER,
    refetchInterval: 30_000,
  });

  const stats: ProtocolStats = {
    marketCount: data?.marketCount ?? 0,
    tradeCount: data?.tradeCount ?? 0,
    totalVolume: data
      ? Number(formatUnits(BigInt(data.totalVolume), USDC_DECIMALS))
      : 0,
    userCount: data?.userCount ?? 0,
    isAvailable: HAS_INDEXER && !!data,
  };

  return { stats, isLoading, error, refetch };
}
