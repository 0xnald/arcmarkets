"use client";

import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/wagmi";

/**
 * Inner provider — needs `useTheme()` from next-themes so it must be inside ThemeProvider
 * but outside of pages. Picks the RainbowKit theme that matches our dark/light mode.
 */
function RainbowWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <RainbowKitProvider
      theme={
        isDark
          ? darkTheme({
              accentColor: "#8B5CF6",
              accentColorForeground: "white",
              borderRadius: "medium",
              fontStack: "system",
            })
          : lightTheme({
              accentColor: "#8B5CF6",
              accentColorForeground: "white",
              borderRadius: "medium",
              fontStack: "system",
            })
      }
      appInfo={{ appName: "Arc Markets" }}
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 15, // 15s — markets don't change that fast
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowWrapper>{children}</RainbowWrapper>
        </QueryClientProvider>
      </WagmiProvider>
    </NextThemesProvider>
  );
}
