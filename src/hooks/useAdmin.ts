"use client";

import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, FACTORY_ABI } from "@/lib/contracts";

/**
 * useAdmin — checks whether the connected wallet has admin privileges.
 *
 * Two roles exist on the factory contract:
 *   - owner: can add/remove curators, transfer ownership, collect fees
 *   - curators: can create markets and resolve them
 *
 * Both are admin-equivalent for the UI's purpose. The contract enforces the
 * specific permissions; our job is to decide what to show.
 *
 * Returns:
 *   - isOwner: true if connectedWallet === factory.owner()
 *   - isCurator: true if factory.curators(connectedWallet) === true
 *   - isAuthorized: either of the above
 *   - isLoading: while we're still checking
 */
export function useAdmin() {
  const { address, isConnected } = useAccount();

  const { data: owner, isLoading: ownerLoading } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "owner",
  });

  const { data: isCuratorRaw, isLoading: curatorLoading } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "curators",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const isOwner =
    !!address && !!owner && (owner as string).toLowerCase() === address.toLowerCase();
  const isCurator = !!isCuratorRaw;
  const isAuthorized = isOwner || isCurator;

  return {
    isOwner,
    isCurator,
    isAuthorized,
    ownerAddress: owner as string | undefined,
    isLoading: ownerLoading || (isConnected && curatorLoading),
    isConnected,
  };
}
