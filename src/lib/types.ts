export type Category =
  | "crypto"
  | "politics"
  | "sports"
  | "tech"
  | "culture"
  | "macro"
  | "science"
  | "arc";

export interface PricePoint {
  t: number; // timestamp
  yes: number; // 0..1
}

export interface Market {
  id: string;
  question: string;
  description: string;
  category: Category;
  yesPrice: number; // 0..1 — implied probability
  change24h: number; // -1..1
  volume: number; // USDC
  liquidity: number;
  endsAt: number; // unix ms
  createdAt: number;
  resolution?: "yes" | "no";
  history: PricePoint[];
  featured?: boolean;
  trending?: boolean;
}

export interface Position {
  marketId: string;
  side: "yes" | "no";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  invested: number;
}

export interface Trade {
  id: string;
  marketId: string;
  marketQuestion: string;
  side: "yes" | "no";
  shares: number;
  price: number;
  total: number;
  user: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  username?: string;
  pnl: number;
  volume: number;
  winRate: number;
  trades: number;
}
