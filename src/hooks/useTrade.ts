"use client";

import { useState, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import {
  CONTRACTS,
  ERC20_ABI,
  MARKET_ABI,
  USDC_DECIMALS,
  Side,
  MarketStatus,
} from "@/lib/contracts";
import type { Market } from "@/lib/types";

export type TradeStep =
  | { kind: "idle" }
  | { kind: "checking_allowance" }
  | { kind: "approving"; txHash?: `0x${string}` }
  | { kind: "buying"; txHash?: `0x${string}` }
  | { kind: "selling"; txHash?: `0x${string}` }
  | { kind: "claiming"; txHash?: `0x${string}` }
  | { kind: "success"; txHash: `0x${string}`; action: "buy" | "sell" | "claim" }
  | { kind: "error"; message: string };

/**
 * useTrade — encapsulates the full buy/sell/claim flow for a single market.
 *
 * The buy flow is:
 *   1. Check current USDC allowance for the market
 *   2. If less than amount, prompt approve(market, amount)
 *   3. After approval is mined, prompt buy(side, amount, minSharesOut)
 *   4. Wait for buy tx receipt; report success
 *
 * The sell flow:
 *   1. Just call sell(side, shareAmount, minUsdcOut) — no approval needed since the market
 *      moves shares out of internal mapping, not pulling tokens
 *
 * The claim flow:
 *   1. After resolution, call claim() — payouts come back as a USDC transfer
 *
 * Slippage: 1% by default. We compute minSharesOut/minUsdcOut from the quote × 0.99.
 */
export function useTrade(market: Market) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<TradeStep>({ kind: "idle" });

  // Read current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, market.id as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  const reset = useCallback(() => setStep({ kind: "idle" }), []);

  const buy = useCallback(
    async (side: "yes" | "no", usdcAmountStr: string, expectedSharesOut: bigint) => {
      if (!address || !publicClient) {
        setStep({ kind: "error", message: "Wallet not connected" });
        return;
      }

      try {
        const usdcAmount = parseUnits(usdcAmountStr, USDC_DECIMALS);
        const sideEnum = side === "yes" ? Side.YES : Side.NO;
        // 1% slippage tolerance
        const minSharesOut = (expectedSharesOut * 99n) / 100n;

        // Step 1: check allowance, approve if needed
        setStep({ kind: "checking_allowance" });
        await refetchAllowance();
        const currentAllowance = (allowance as bigint | undefined) ?? 0n;

        if (currentAllowance < usdcAmount) {
          setStep({ kind: "approving" });
          const approveHash = await writeContractAsync({
            address: CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [market.id as `0x${string}`, usdcAmount],
          });
          setStep({ kind: "approving", txHash: approveHash });

          // Wait for approval to be mined before proceeding
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        // Step 2: buy
        setStep({ kind: "buying" });
        const buyHash = await writeContractAsync({
          address: market.id as `0x${string}`,
          abi: MARKET_ABI,
          functionName: "buy",
          args: [sideEnum, usdcAmount, minSharesOut],
        });
        setStep({ kind: "buying", txHash: buyHash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });

        if (receipt.status === "success") {
          setStep({ kind: "success", txHash: buyHash, action: "buy" });
        } else {
          setStep({ kind: "error", message: "Transaction reverted" });
        }
      } catch (e: any) {
        console.error("[useTrade] buy failed:", e);
        const msg =
          e?.shortMessage ||
          e?.cause?.shortMessage ||
          e?.message ||
          "Transaction failed";
        setStep({ kind: "error", message: msg });
      }
    },
    [address, publicClient, writeContractAsync, market.id, allowance, refetchAllowance]
  );

  const sell = useCallback(
    async (side: "yes" | "no", shareAmount: bigint, expectedUsdcOut: bigint) => {
      if (!address || !publicClient) {
        setStep({ kind: "error", message: "Wallet not connected" });
        return;
      }

      try {
        const sideEnum = side === "yes" ? Side.YES : Side.NO;
        const minUsdcOut = (expectedUsdcOut * 99n) / 100n;

        setStep({ kind: "selling" });
        const sellHash = await writeContractAsync({
          address: market.id as `0x${string}`,
          abi: MARKET_ABI,
          functionName: "sell",
          args: [sideEnum, shareAmount, minUsdcOut],
        });
        setStep({ kind: "selling", txHash: sellHash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: sellHash });

        if (receipt.status === "success") {
          setStep({ kind: "success", txHash: sellHash, action: "sell" });
        } else {
          setStep({ kind: "error", message: "Transaction reverted" });
        }
      } catch (e: any) {
        console.error("[useTrade] sell failed:", e);
        const msg = e?.shortMessage || e?.message || "Transaction failed";
        setStep({ kind: "error", message: msg });
      }
    },
    [address, publicClient, writeContractAsync, market.id]
  );

  const claim = useCallback(async () => {
    if (!address || !publicClient) {
      setStep({ kind: "error", message: "Wallet not connected" });
      return;
    }

    try {
      setStep({ kind: "claiming" });
      const claimHash = await writeContractAsync({
        address: market.id as `0x${string}`,
        abi: MARKET_ABI,
        functionName: "claim",
        args: [],
      });
      setStep({ kind: "claiming", txHash: claimHash });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });

      if (receipt.status === "success") {
        setStep({ kind: "success", txHash: claimHash, action: "claim" });
      } else {
        setStep({ kind: "error", message: "Transaction reverted" });
      }
    } catch (e: any) {
      console.error("[useTrade] claim failed:", e);
      const msg = e?.shortMessage || e?.message || "Transaction failed";
      setStep({ kind: "error", message: msg });
    }
  }, [address, publicClient, writeContractAsync, market.id]);

  // Helpers for UI
  const isResolved = market.resolution === "yes" || market.resolution === "no";
  const canTrade = !isResolved && market.endsAt > Date.now();
  const canClaim = isResolved;

  return {
    step,
    buy,
    sell,
    claim,
    reset,
    canTrade,
    canClaim,
    isResolved,
  };
}
