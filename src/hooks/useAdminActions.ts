"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useReadContract, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import {
  CONTRACTS,
  FACTORY_ABI,
  ERC20_ABI,
  USDC_DECIMALS,
  MarketStatus,
} from "@/lib/contracts";

export type AdminStep =
  | { kind: "idle" }
  | { kind: "checking_allowance" }
  | { kind: "approving"; txHash?: `0x${string}` }
  | { kind: "creating"; txHash?: `0x${string}` }
  | { kind: "resolving"; txHash?: `0x${string}` }
  | { kind: "success"; txHash: `0x${string}`; action: "create" | "resolve" }
  | { kind: "error"; message: string };

export interface CreateMarketParams {
  question: string;
  resolutionCriteria: string;
  category: string;
  endsAt: number; // unix seconds
  initialLiquidity: string; // human-readable USDC amount, e.g. "500"
}

/**
 * useAdminActions — admin write operations.
 *
 * createMarket flow:
 *   1. Check USDC allowance for the factory
 *   2. If needed, prompt approve(factory, initialLiquidity)
 *   3. Call factory.createMarket(question, criteria, category, endsAt, liquidity)
 *   4. Wait for receipt
 *
 * resolveMarket flow:
 *   1. Single call to factory.resolveMarket(marketAddress, status)
 *   2. Wait for receipt
 */
export function useAdminActions() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<AdminStep>({ kind: "idle" });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.FACTORY] : undefined,
    query: { enabled: !!address },
  });

  const reset = useCallback(() => setStep({ kind: "idle" }), []);

  const createMarket = useCallback(
    async (params: CreateMarketParams) => {
      if (!address || !publicClient) {
        setStep({ kind: "error", message: "Wallet not connected." });
        return;
      }

      try {
        const liquidityWei = parseUnits(params.initialLiquidity, USDC_DECIMALS);

        // 1. Check allowance
        setStep({ kind: "checking_allowance" });
        await refetchAllowance();
        const currentAllowance = (allowance as bigint | undefined) ?? 0n;

        if (currentAllowance < liquidityWei) {
          setStep({ kind: "approving" });
          const approveHash = await writeContractAsync({
            address: CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [CONTRACTS.FACTORY, liquidityWei],
          });
          setStep({ kind: "approving", txHash: approveHash });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        // 2. Create
        setStep({ kind: "creating" });
        const createHash = await writeContractAsync({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "createMarket",
          args: [
            params.question,
            params.resolutionCriteria,
            params.category,
            BigInt(params.endsAt),
            liquidityWei,
          ],
        });
        setStep({ kind: "creating", txHash: createHash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

        if (receipt.status === "success") {
          setStep({ kind: "success", txHash: createHash, action: "create" });
        } else {
          setStep({ kind: "error", message: "Transaction reverted." });
        }
      } catch (e: any) {
        console.error("[useAdminActions] createMarket failed:", e);
        const msg = e?.shortMessage || e?.message || "Create failed.";
        setStep({ kind: "error", message: msg });
      }
    },
    [address, publicClient, writeContractAsync, allowance, refetchAllowance]
  );

  const resolveMarket = useCallback(
    async (marketAddress: string, status: MarketStatus) => {
      if (!address || !publicClient) {
        setStep({ kind: "error", message: "Wallet not connected." });
        return;
      }

      try {
        setStep({ kind: "resolving" });
        const hash = await writeContractAsync({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "resolveMarket",
          args: [marketAddress as `0x${string}`, status],
        });
        setStep({ kind: "resolving", txHash: hash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === "success") {
          setStep({ kind: "success", txHash: hash, action: "resolve" });
        } else {
          setStep({ kind: "error", message: "Transaction reverted." });
        }
      } catch (e: any) {
        console.error("[useAdminActions] resolveMarket failed:", e);
        const msg = e?.shortMessage || e?.message || "Resolve failed.";
        setStep({ kind: "error", message: msg });
      }
    },
    [address, publicClient, writeContractAsync]
  );

  return { step, createMarket, resolveMarket, reset };
}
