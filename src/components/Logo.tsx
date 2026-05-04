"use client";

import Link from "next/link";
import Image from "next/image";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="relative" style={{ width: size, height: size }}>
        <Image
          src="/logo.png"
          alt="Arc Markets"
          width={size}
          height={size}
          className="rounded-lg"
          priority
        />
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{
          background: "radial-gradient(circle at center, rgba(139, 92, 246, 0.4), transparent 70%)",
          filter: "blur(8px)",
        }} />
      </div>
      <div className="font-display font-bold text-[17px] tracking-tight">
        arc<span className="text-gradient">markets</span>
      </div>
    </Link>
  );
}
