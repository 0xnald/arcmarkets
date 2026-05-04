# Arc Markets — Update package

Drop this on top of your existing `arcmarkets/` folder. The folder structure inside this zip mirrors your project, so unzipping into the right place will replace files in-place.

## How to apply

```bash
# In your project's parent directory:
unzip arcmarkets-update.zip

# This replaces files inside arcmarkets/ with the new versions.
# Then reinstall (in case any deps changed) and run:
cd arcmarkets
npm install
npm run dev
```

If you're paranoid, copy your current `arcmarkets/` folder somewhere first as a backup before unzipping.

---

## What's in this update

### ✅ Real trading wired up
The Buy/Sell button in the trade panel now actually executes transactions:
- **Buy:** checks USDC allowance → prompts approve if needed → calls `buy()` → waits for receipt
- **Sell:** calls `sell()` directly (no approval needed since shares are internal)
- **Claim:** for resolved markets, calls `claim()` to redeem winning shares for USDC
- All flows show step-by-step status (approving → buying → confirmed → success), with view-tx links

### ✅ Real Portfolio page
- Replaced the mock positions table with `usePortfolio()` hook
- Reads your actual YES/NO shares from every market on-chain
- Shows portfolio summary (total value, YES/NO counts, active markets)
- Each position card opens the drawer for that market — sell or claim from there
- Empty state when you don't hold any positions; connect-wallet prompt when disconnected

### ✅ Real Activity feed
- Replaced mock trade list with `useActivity()` hook
- Scans the last ~5000 blocks of `Trade` events from every market via `eth_getLogs`
- Each row links to the actual transaction on Arc Scan
- Auto-refresh button + status indicator
- Same hook is used inline on the homepage's "Live trades" tile and inside the market drawer for per-market activity

### ⚠️ Leaderboard set to "Coming Soon"
- Replaced fake leaderboard data with a clean "Coming Soon" page that explains *why* (needs an indexer to aggregate trader stats)
- Same treatment in the homepage `LeaderboardTile`
- This is the honest move — it's better to clearly communicate "this lights up later" than show fabricated rankings

### 🧹 Mock data wiped
- `src/data/markets.ts` is now an empty stub (kept so old imports don't crash)
- No component imports `RECENT_TRADES`, `LEADERBOARD`, or `MARKETS` from it anymore

---

## Files added

```
src/hooks/usePortfolio.ts    # Read user positions across all markets
src/hooks/useActivity.ts     # Scan Trade events from chain
src/hooks/useTrade.ts        # Approve + buy/sell/claim flow
```

## Files replaced

```
src/components/TradePanel.tsx      # Wired to real trading
src/components/MarketDrawer.tsx    # Real per-market activity, refetch on trade success
src/components/BentoTiles.tsx      # LiveActivityTile gets empty/loading states; LeaderboardTile is "coming soon"
src/app/page.tsx                   # Uses useActivity instead of mock RECENT_TRADES
src/app/portfolio/page.tsx         # Full rewrite — real portfolio data
src/app/leaderboard/page.tsx       # Coming soon page
src/app/activity/page.tsx          # Full rewrite — real on-chain activity
src/data/markets.ts                # Mock data stripped
```

## Files NOT changed

Everything else stays as you had it:
- Contract config (`src/lib/contracts.ts`)
- Wagmi config (`src/lib/wagmi.ts`)
- Hooks: `useMarkets.ts`
- All visual components: `AppShell`, `Rail`, `TopStrip`, `Sparkline`, `PriceChart`, `Logo`, `ThemeToggle`, `Providers`, `BentoTiles` (only LiveActivity + Leaderboard touched)
- Layout, globals.css, Tailwind config, Next config, package.json

---

## What to test after applying

**1. Markets still load on the homepage**
If they don't, your `src/lib/contracts.ts` factory address might've gotten dropped. Check it.

**2. Click any market → drawer opens**
Should now show live activity for that market (or "no trades yet" if no one has traded it).

**3. Try a buy**
- Click any market
- Type an amount, click "Buy YES" or "Buy NO"
- MetaMask prompts twice: approve, then buy
- Watch the status: "Approving USDC..." → "Buying..." → "Trade complete!" with a tx link

**4. Check Portfolio**
After a successful buy, navigate to Portfolio. Your new position should appear within a few seconds (the page auto-reads from chain).

**5. Check Activity**
Your trade should appear in the feed within ~5-15 seconds (depends on block confirmation + the page's refetch timing).

**6. Sell**
Switch the trade panel to "Sell" mode. Type a share amount up to your balance. Click "Sell YES" — only one transaction, no approval needed.

---

## Known limits (these are the next things to fix)

- **Activity scans last ~5000 blocks only.** Older trades won't appear. Indexer fixes this.
- **Public RPC may rate-limit** under heavy use of `getLogs`. Consider Alchemy or Quicknode RPC for production.
- **Portfolio "value" is approximate** at current price. Selling moves the price, so actual sell-out values differ slightly.
- **24h change still shows 0%.** Needs price snapshots from an indexer.
- **Price history chart is a flat line.** Same — indexer needed.

These are all fixed by the indexer setup, which is the natural next step.
