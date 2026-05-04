/**
 * This file used to contain mock markets, trades, and leaderboard entries.
 * As of this update, all data comes from on-chain reads via:
 *   - useMarkets() — markets and prices
 *   - useActivity() — trade events
 *   - usePortfolio() — user positions
 *
 * This file is intentionally kept (mostly empty) so existing imports don't break,
 * and so you have a place to drop test fixtures if you want to demo offline.
 */

import type { Market } from "@/lib/types";

export const MARKETS: Market[] = [];
export const RECENT_TRADES = [];
export const LEADERBOARD = [];

/**
 * Find a market by ID. Use this only for static lookups; for live data
 * use the `useMarketById` hook with `useMarkets()`.
 */
export function findMarket(id: string): Market | undefined {
  return undefined;
}
