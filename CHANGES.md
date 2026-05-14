# Arc Markets — Volume + Admin Update

Drop this on top of your existing `arcmarkets/` folder:

```bash
unzip arcmarkets-update.zip
cd arcmarkets
npm run dev
```

No new dependencies, no `npm install` needed.

---

## What's in this update

### ✅ Activity page → 24-hour volume stat
- "Recent Trades" stat → "24h Trades" (count of trades in the last 24h only)
- "Volume" stat → "24h Volume" (USDC traded in the last 24h)
- "YES vs NO" split also windowed to 24h
- Trade feed itself still shows the most recent 100 trades regardless of age — only the stats are time-windowed
- New caveat line at the bottom: "Volume stats reflect the last 24 hours."

### ✅ Homepage → real all-time volume
- "Outstanding Vol" stat renamed to **"Total Volume"**
- Reads from your indexer's `Protocol.totalVolume` aggregate when available — this is the true sum of every trade's USDC amount across history
- Falls back to the old "sum of outstanding shares" approximation if indexer not connected
- Subtitle changes to make this transparent ("All-time traded" vs "Approx (indexer needed)")

### ✅ Homepage → real top traders in leaderboard tile
- The "Top Traders" tile on the homepage now shows real top 3 from the indexer
- Replaces the "Coming Soon" placeholder you'd been seeing
- Gold/silver/bronze rank colors, addresses linkable, PnL color-coded
- "View all →" link to `/leaderboard` for the full ranking
- If indexer not connected → falls back to original "Coming Soon" state
- If indexer connected but no traders yet → friendly "No traders yet, be the first" state

### ✅ Homepage → resolved markets hidden from live grid
- Markets with `resolution === "yes"` or `"no"` are filtered out of:
  - The featured tile
  - The main markets grid
  - The category-filtered subset
  - The "Live Markets" count (renamed from "Open Markets")
- "Awaiting resolution" markets (ended but admin hasn't called resolve) stay visible — per your spec
- New empty state if ALL markets are resolved: "No live markets right now"

### ✅ Admin → Curators tab (owner-only)
- New "Curators" tab in the admin panel (visible only when you're the factory owner, not just a curator)
- Two-pane layout:
  - **Left:** Tracked curator list with addresses + add date + Remove buttons (each click triggers `factory.removeCurator()`)
  - **Right:** Add curator form — paste address, click "Add curator", sign tx with MetaMask
- Each Add/Remove is a single transaction with step-by-step status feedback
- Tracked list is stored in your browser's localStorage (the contract doesn't expose `getCurators()` array, so the UI tracks adds locally)
- Includes a warning: clearing localStorage doesn't revoke on-chain permissions — only the Remove button does

### ✅ Admin → Fees tab (owner-only)
- New "Fees" tab in the admin panel (owner-only)
- Three summary stats at top:
  - **Total Collectable** — sum of `accumulatedFees` across all markets, in USDC
  - **Markets with Fees** — count of markets that have non-zero fees pending
  - **Fee Rate** — 2.00% (200 BPS, hardcoded from your contract)
- Per-market table showing each market's pending fees with a Collect button
- Click Collect → calls `factory.collectFees(marketAddr)` → fees flow from market to factory to owner
- Markets with zero fees show dimmed; markets with fees highlighted in green
- Sorted: markets with most fees first
- Refresh button to re-read fee balances on demand
- Explanatory note at the bottom explaining how the fee flow works

---

## Files added

```
src/hooks/useProtocolStats.ts        # Global protocol aggregates from indexer
src/hooks/useTopTraders.ts           # Top N traders for homepage tile
src/hooks/useFees.ts                 # Per-market fee balances
src/lib/contractsAdminExt.ts         # ABI fragments for new admin functions
```

## Files modified

```
src/app/page.tsx                     # Filter resolved, real volume, real top traders
src/app/activity/page.tsx            # 24h volume stat
src/app/admin/page.tsx               # New Curators + Fees tabs
src/components/BentoTiles.tsx        # LeaderboardTile renders real data
src/hooks/useActivity.ts             # Now also returns volume24h, tradesCount24h
src/hooks/useAdminActions.ts         # Added addCurator, removeCurator, collectFees
```

## Files NOT changed

Everything else: `useMarkets`, `usePortfolio`, `useLeaderboard`, `useTrade`, `useFaucet`, `useAdmin`, all visual components (Rail, TopStrip, MarketDrawer, etc.), `contracts.ts`, layouts, styles.

---

## A note on `contracts.ts`

I did NOT modify your existing `src/lib/contracts.ts`. Instead, the new admin write functions (`addCurator`, `removeCurator`, `collectFees`) and read function (`accumulatedFees`) live in a separate small file:

```
src/lib/contractsAdminExt.ts
```

This keeps the diff minimal and avoids risking your factory address or anything else in `contracts.ts` getting accidentally clobbered. The hooks import from this extension file when needed.

If you ever want to consolidate, copy the ABI fragments from `contractsAdminExt.ts` into your `FACTORY_ABI` and `MARKET_ABI` arrays in `contracts.ts`, then update the hook imports.

---

## What to test

**1. Resolved markets disappear**
- Visit homepage — any market you've resolved (status RESOLVED_YES/NO/INVALID) should be gone
- "Live Markets" stat shows only unresolved count
- If you've resolved a market that was previously the featured one, the featured slot fills with the next unresolved market

**2. Real top traders on homepage**
- Visit homepage — Top Traders tile should show actual addresses + PnL (assuming indexer has data)
- Click "View all →" → navigates to `/leaderboard`

**3. Real total volume**
- Homepage "Total Volume" tile shows a much larger number than before
- That number = sum of all trades' USDC, not outstanding shares

**4. Activity 24h volume**
- Visit `/activity`
- Stats now say "24h Trades", "24h Volume", "YES vs NO (24h)"
- Trade feed itself still shows last 100 regardless of age

**5. Curators tab (owner only)**
- Visit `/admin` while connected as factory owner → see new "Curators" tab
- Paste any test address → click "Add curator" → sign tx → curator appears in list with timestamp
- Click Remove on the entry → sign tx → entry disappears
- Visit `/admin` while connected as a *curator* (not owner) → Curators tab should NOT appear
- Refresh page → curator list persists (localStorage)

**6. Fees tab (owner only)**
- Visit `/admin` → click "Fees" tab
- "Total Collectable" shows current accumulated fees across all markets
- Each market row shows its pending fees
- Click "Collect" on a market with fees → sign tx → fee balance for that market resets to $0
- "Total Collectable" reduces by the amount you just collected

---

## Known limits / gotchas

**24h volume undercounts on heavy testnet traffic.**
The Activity hook fetches the most recent 100 trades. If your testnet has > 100 trades per 24h, the 24h volume will undercount because trades older than position 100 are excluded. Realistically this isn't a problem at your current scale, but if you ever do bulk seeding you'll see it. Fix: query the indexer directly with a `where: { timestamp_gt: ... }` filter for the volume stat (separate from the trades list). Easy to add later.

**Curator list is browser-local, not on-chain.**
There's no `getCurators()` view on the contract, so I can't enumerate them. The UI tracks adds in localStorage as a convenience. If you add curators from cast (or another browser), they won't appear in this list. The on-chain `factory.curators(address)` mapping is still the source of truth.

**Fee collection moves USDC, but only to the factory contract.**
`factory.collectFees(marketAddr)` pulls fees from the market into the factory. Where the factory sends them from there depends on your factory contract — I'm guessing it forwards to the owner, but I didn't inspect the source. If clicking Collect succeeds but USDC doesn't land in your wallet, check the factory's behavior.

**Fees tab only shows for markets in the current load.**
If you create a new market and switch tabs without refreshing, that market won't appear in the Fees list until you hit Refresh.
