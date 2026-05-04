import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arc Markets — Predict. Trade. Win.",
  description:
    "On-chain prediction markets settled in USDC. Trade YES or NO on the future. Built on Arc.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
  },
  openGraph: {
    title: "Arc Markets",
    description: "Predict. Trade. Win. — On-chain prediction markets on Arc.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
