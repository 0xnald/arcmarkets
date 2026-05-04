"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { CONTRACTS, ERC20_ABI } from "@/lib/contracts";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h
const FAUCET_AMOUNT = 10_000;
const STORAGE_PREFIX = "arcmarkets:faucet:lastClaim:";

export type FaucetStep =
  | { kind: "idle" }
  | { kind: "claiming"; txHash?: `0x${string}` }
  | { kind: "success"; txHash: `0x${string}`; amount: number }
  | { kind: "cooldown"; nextAvailableAt: number }
  | { kind: "error"; message: string };

function readLastClaim(addr: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + addr.toLowerCase());
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

function writeLastClaim(addr: string, ts: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + addr.toLowerCase(), String(ts));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * useFaucet — handles the claim flow plus 24h frontend cooldown.
 *
 * Flow:
 *   1. Check localStorage for the last claim timestamp for this address
 *   2. If <24h since last claim, return cooldown state with nextAvailableAt
 *   3. Otherwise call MockUSDC.faucet() — user signs → 10,000 USDC minted to their wallet
 *   4. On success, write the timestamp to localStorage
 *
 * NOTE: cooldown is enforced client-side. Anyone who clears localStorage or calls
 * the contract directly via cast can bypass it. That's an accepted tradeoff for
 * a testnet faucet — the real protection is the contract on mainnet (which we'd
 * replace with a proper FaucetGate contract).
 */
export function useFaucet() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<FaucetStep>({ kind: "idle" });

  // Check cooldown for the connected address whenever it changes
  useEffect(() => {
    if (!address) {
      setStep({ kind: "idle" });
      return;
    }
    const last = readLastClaim(address);
    if (last && Date.now() - last < COOLDOWN_MS) {
      setStep({ kind: "cooldown", nextAvailableAt: last + COOLDOWN_MS });
    } else {
      setStep({ kind: "idle" });
    }
  }, [address]);

  // Claim from a provided address (which must equal the connected wallet, since
  // MockUSDC.faucet() mints to msg.sender)
  const claim = useCallback(
    async (recipient: string) => {
      if (!address || !publicClient) {
        setStep({ kind: "error", message: "Connect a wallet to claim." });
        return;
      }

      // Sanity: the recipient must equal the connected wallet because faucet() uses msg.sender.
      // If the user pasted a different address, surface this clearly.
      if (recipient.toLowerCase() !== address.toLowerCase()) {
        setStep({
          kind: "error",
          message:
            "USDC will be sent to your connected wallet, which doesn't match the address you entered. Connect the matching wallet, or change the address back to yours.",
        });
        return;
      }

      // Check cooldown
      const last = readLastClaim(recipient);
      if (last && Date.now() - last < COOLDOWN_MS) {
        setStep({ kind: "cooldown", nextAvailableAt: last + COOLDOWN_MS });
        return;
      }

      try {
        setStep({ kind: "claiming" });
        const hash = await writeContractAsync({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: "faucet",
          args: [],
        });
        setStep({ kind: "claiming", txHash: hash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === "success") {
          writeLastClaim(recipient, Date.now());
          setStep({ kind: "success", txHash: hash, amount: FAUCET_AMOUNT });
        } else {
          setStep({ kind: "error", message: "Transaction reverted." });
        }
      } catch (e: any) {
        console.error("[useFaucet] claim failed:", e);
        const msg =
          e?.shortMessage || e?.cause?.shortMessage || e?.message || "Claim failed.";
        setStep({ kind: "error", message: msg });
      }
    },
    [address, publicClient, writeContractAsync]
  );

  const reset = useCallback(() => {
    if (!address) {
      setStep({ kind: "idle" });
      return;
    }
    const last = readLastClaim(address);
    if (last && Date.now() - last < COOLDOWN_MS) {
      setStep({ kind: "cooldown", nextAvailableAt: last + COOLDOWN_MS });
    } else {
      setStep({ kind: "idle" });
    }
  }, [address]);

  return {
    step,
    claim,
    reset,
    cooldownMs: COOLDOWN_MS,
    faucetAmount: FAUCET_AMOUNT,
  };
}

/// Format a remaining duration in ms as "Xh Ym" or "Ym Zs"
export function formatCooldown(remainingMs: number): string {
  if (remainingMs <= 0) return "Ready";
  const totalSec = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
