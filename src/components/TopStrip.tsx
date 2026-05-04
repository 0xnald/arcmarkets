"use client";

import { Search, Command, AlertTriangle } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ThemeToggle } from "./ThemeToggle";
import { arcTestnet } from "@/lib/chain";

interface Props {
  onSearch?: (q: string) => void;
  searchValue?: string;
}

export function TopStrip({ onSearch, searchValue }: Props) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== arcTestnet.id;

  return (
    <div
      className="sticky top-0 z-20 h-16 flex items-center gap-3 px-6 border-b glass"
      style={{ borderColor: "rgb(var(--line))" }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-2xl">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 ink-3 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search markets, traders, addresses..."
          value={searchValue || ""}
          onChange={(e) => onSearch?.(e.target.value)}
          className="input pl-10 pr-16"
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono"
          style={{
            background: "rgb(var(--surface-2))",
            color: "rgb(var(--ink-3))",
            border: "1px solid rgb(var(--line))",
          }}
        >
          <Command size={10} />K
        </span>
      </div>

      <div className="flex-1" />

      {/* Wrong network warning */}
      {wrongNetwork && (
        <button
          onClick={() => switchChain({ chainId: arcTestnet.id })}
          className="btn"
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            borderColor: "rgba(239, 68, 68, 0.4)",
            color: "#EF4444",
          }}
        >
          <AlertTriangle size={12} />
          Switch to Arc Testnet
        </button>
      )}

      <ThemeToggle />

      {/* Real RainbowKit connect button */}
      <ConnectButton
        chainStatus="none"
        accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
        showBalance={false}
      />
    </div>
  );
}
