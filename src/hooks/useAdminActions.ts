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
import { FACTORY_ADMIN_ABI } from "@/lib/contractsAdminExt";

export type AdminStep =
  | { kind: "idle" }
  | { kind: "checking_allowance" }
  | { kind: "approving"; txHash?: `0x${string}` }
  | { kind: "creating"; txHash?: `0x${string}` }
  | { kind: "resolving"; txHash?: `0x${string}` }
  | { kind: "adding_curator"; txHash?: `0x${string}` }
  | { kind: "removing_curator"; txHash?: `0x${string}` }
  | { kind: "collecting_fees"; txHash?: `0x${string}` }
  | {
      kind: "success";
      txHash: `0x${string}`;
      action:
        | "create"
        | "resolve"
        | "add_curator"
        | "remove_curator"
        | "collect_fees";
      // Optional metadata for collect_fees
      amount?: bigint;
    }
  | { kind: "error"; message: string };

export interface CreateMarketParams {
  question: string;
  resolutionCriteria: string;
  category: string;
  endsAt: number;
  initialLiquidity: string;
}

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

  /**
   * addCurator — owner-only. Grants the given address curator permissions
   * (can createMarket and resolveMarket).
   *
   * Reverts on the contract if:
   *   - msg.sender is not the owner
   *   - the address is already a curator (depends on contract)
   */
  const addCurator = useCallback(
    async (curatorAddress: string) => {
      if (!address || !publicClient) {
        setStep({ kind: "error", message: "Wallet not connected." });
        return;
      }
      // Sanity check the address format before sending
      if (!/^0x[a-fA-F0-9]{40}$/.test(curatorAddress)) {
        setStep({ kind: "error", message: "Invalid address format." });
        return;
      }
      try {
        setStep({ kind: "adding_curator" });
        const hash = await writeContractAsync({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ADMIN_ABI,
          functionName: "addCurator",
          args: [curatorAddress as `0x${string}`],
        });
        setStep({ kind: "adding_curator", txHash: hash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          setStep({ kind: "success", txHash: hash, action: "add_curator" });
        } else {
          setStep({ kind: "error", message: "Transaction reverted." });
        }
      } catch (e: any) {
        console.error("[useAdminActions] addCurator failed:", e);
        const msg = e?.shortMessage || e?.message || "Add curator failed.";
        setStep({ kind: "error", message: msg });
      }
    },
    [address, publicClient, writeContractAsync]
  );

  /**
   * removeCurator — owner-only. Revokes curator permissions.
   */
  const removeCurator = useCallback(
    async (curatorAddress: string) => {
      if (!address || !publicClient) {
        setStep({ kind: "error", message: "Wallet not connected." });
        return;
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(curatorAddress)) {
        setStep({ kind: "error", message: "Invalid address format." });
        return;
      }
      try {
        setStep({ kind: "removing_curator" });
        const hash = await writeContractAsync({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ADMIN_ABI,
          functionName: "removeCurator",
          args: [curatorAddress as `0x${string}`],
        });
        setStep({ kind: "removing_curator", txHash: hash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          setStep({ kind: "success", txHash: hash, action: "remove_curator" });
        } else {
          setStep({ kind: "error", message: "Transaction reverted." });
        }
      } catch (e: any) {
        console.error("[useAdminActions] removeCurator failed:", e);
        const msg = e?.shortMessage || e?.message || "Remove curator failed.";
        setStep({ kind: "error", message: msg });
      }
    },
    [address, publicClient, writeContractAsync]
  );

  /**
   * collectFees — owner-only. Pulls accumulated trading fees from one market
   * into the factory (and then onward to the owner per the factory's logic).
   *
   * Reverts on the contract if:
   *   - msg.sender is not the owner
   *   - the market has no fees to collect (depending on contract)
   */
  const collectFees = useCallback(
    async (marketAddress: string) => {
      if (!address || !publicClient) {
        setStep({ kind: "error", message: "Wallet not connected." });
        return;
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(marketAddress)) {
        setStep({ kind: "error", message: "Invalid market address." });
        return;
      }
      try {
        setStep({ kind: "collecting_fees" });
        const hash = await writeContractAsync({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ADMIN_ABI,
          functionName: "collectFees",
          args: [marketAddress as `0x${string}`],
        });
        setStep({ kind: "collecting_fees", txHash: hash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          setStep({ kind: "success", txHash: hash, action: "collect_fees" });
        } else {
          setStep({ kind: "error", message: "Transaction reverted." });
        }
      } catch (e: any) {
        console.error("[useAdminActions] collectFees failed:", e);
        const msg = e?.shortMessage || e?.message || "Collect fees failed.";
        setStep({ kind: "error", message: msg });
      }
    },
    [address, publicClient, writeContractAsync]
  );

  return {
    step,
    createMarket,
    resolveMarket,
    addCurator,
    removeCurator,
    collectFees,
    reset,
  };
}
