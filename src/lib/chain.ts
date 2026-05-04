import { defineChain } from "viem";

/**
 * Arc Testnet — chain definition for viem/wagmi.
 *
 * Verified against Arc docs (Apr 2026):
 *   Chain ID: 5042002
 *   RPC:      https://rpc.testnet.arc.network
 *   Explorer: https://testnet.arcscan.app
 *   Native gas token: USDC (18 decimals at the native level)
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
    public: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Scan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});
