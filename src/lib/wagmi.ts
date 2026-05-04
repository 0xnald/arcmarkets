import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { arcTestnet } from "./chain";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "DEMO_PROJECT_ID";

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && typeof window !== "undefined") {
  console.warn(
    "[Arc Markets] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set. " +
      "Get a free one at https://cloud.reown.com — without it, WalletConnect won't work but injected wallets (MetaMask) will."
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Arc Markets",
  projectId,
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
  },
  ssr: true,
});
