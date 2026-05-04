"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Wallet,
  Trophy,
  Activity,
  HelpCircle,
  Droplet,
  Shield,
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";

const NAV = [
  { href: "/", icon: LayoutGrid, label: "Markets" },
  { href: "/portfolio", icon: Wallet, label: "Portfolio" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/activity", icon: Activity, label: "Activity" },
  { href: "/faucet", icon: Droplet, label: "Faucet" },
];

export function Rail() {
  const pathname = usePathname();
  const { isAuthorized } = useAdmin();

  // Admin entry is conditionally added at the end of the nav, only for owner/curators
  const navItems = isAuthorized
    ? [...NAV, { href: "/admin", icon: Shield, label: "Admin" }]
    : NAV;

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-14 z-30 flex flex-col items-center py-4 border-r"
      style={{
        borderColor: "rgb(var(--line))",
        background: "rgba(var(--bg), 0.85)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Logo at top */}
      <Link
        href="/"
        className="relative w-9 h-9 rounded-lg overflow-hidden mb-6 group"
      >
        <Image
          src="/logo.png"
          alt="Arc Markets"
          width={36}
          height={36}
          className="rounded-lg"
          priority
        />
        <div
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background:
              "radial-gradient(circle at center, rgba(139, 92, 246, 0.4), transparent 70%)",
            filter: "blur(8px)",
          }}
        />
      </Link>

      {/* Nav icons */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative w-10 h-10 rounded-lg flex items-center justify-center group"
              title={item.label}
            >
              {active && (
                <motion.div
                  layoutId="rail-active"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(34, 211, 238, 0.12) 100%)",
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                  }}
                  transition={{ type: "spring", damping: 24, stiffness: 360 }}
                />
              )}
              <Icon
                size={17}
                className="relative z-10 transition-colors"
                style={{
                  color: active ? "rgb(var(--ink))" : "rgb(var(--ink-3))",
                }}
              />

              {/* Tooltip */}
              <span
                className="absolute left-12 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                style={{
                  background: "rgb(var(--surface))",
                  border: "1px solid rgb(var(--line-2))",
                  color: "rgb(var(--ink))",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: testnet indicator + help */}
      <div className="flex flex-col gap-2 items-center">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center group relative"
          title="Testnet"
        >
          <span className="pulse-dot" style={{ width: 8, height: 8 }} />
          <span
            className="absolute left-12 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
            style={{
              background: "rgb(var(--surface))",
              border: "1px solid rgb(var(--line-2))",
              color: "rgb(var(--ink))",
            }}
          >
            Arc Testnet
          </span>
        </div>
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-bg-2 transition-colors"
          title="Help"
        >
          <HelpCircle size={16} className="ink-3" />
        </button>
      </div>
    </aside>
  );
}
