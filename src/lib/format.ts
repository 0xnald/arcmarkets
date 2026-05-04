export function fmtUSD(n: number, opts?: { compact?: boolean; decimals?: number }): string {
  const { compact = true, decimals = 0 } = opts || {};
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  }
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtPct(n: number, decimals: number = 0): string {
  const pct = n * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(decimals)}%`;
}

export function fmtCents(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

export function timeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff < 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months}mo ${days % 30}d`;
  }
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return `<1h`;
}

export function timeSince(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  crypto: { label: "Crypto", color: "#F59E0B" },
  politics: { label: "Politics", color: "#EF4444" },
  sports: { label: "Sports", color: "#10B981" },
  tech: { label: "Tech", color: "#8B5CF6" },
  culture: { label: "Culture", color: "#EC4899" },
  macro: { label: "Macro", color: "#3B82F6" },
  science: { label: "Science", color: "#22D3EE" },
  arc: { label: "Arc", color: "#A855F7" },
};
