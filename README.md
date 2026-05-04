# Arc Markets — Frontend (v0.2, on-chain reads)

**Predict. Trade. Win.** On-chain prediction markets on Arc.

This version reads markets directly from your deployed `MarketFactory` and `PredictionMarket` contracts on **Arc Testnet**. No more mock data on the homepage.

---

## What's working in v0.2

✅ **Real on-chain reads** — markets pulled from your factory contract  
✅ **Wallet connection** — RainbowKit wired to MetaMask, WalletConnect, Coinbase, Rainbow  
✅ **Live price quotes** — the trade panel calls `quoteBuy()` on the contract for real-time numbers  
✅ **Your position** — the drawer shows your YES/NO shares per market once connected  
✅ **Wrong-network detection** — auto-prompts to switch to Arc Testnet (chain 5042002) if you're elsewhere  
✅ **Block explorer links** — every market links to its Arc Scan page  
✅ **All visual polish from v0.1** — bento grid, light/dark theme, animations, drawer

## What's NOT working yet (next step)

❌ **Trading** — buy/sell buttons show "wires up next" placeholder  
❌ **Activity feed / live trades tile** — still mocked, needs event log scan or indexer  
❌ **Leaderboard** — still mocked, needs aggregated trader data  
❌ **Portfolio page** — still mocked  
❌ **Price history chart** — flat line at current price; will populate once an indexer is connected  
❌ **24h change %** — shows 0; needs price snapshots from an indexer  
❌ **Volume** — currently shows total outstanding shares as a proxy

---

## Configured contracts

These are baked into `src/lib/contracts.ts`:

```
USDC:    0x6436149Ed4Cb3B9210bb24100DA3a29b740Aeb01
FACTORY: 0x11B412F20f99557C56b5e6C601ca4215f1622016
```

If you redeploy, update `CONTRACTS` in that file.

---

## Getting started

```bash
cp .env.example .env.local
# Optional: paste a WalletConnect Project ID (free at cloud.reown.com)

npm install
npm run dev
```

Open http://localhost:3000.

You should see:
1. A loading spinner ("Reading on-chain data via RPC...")
2. After a couple seconds, the bento grid populates with your **real markets** from Arc Testnet
3. Top-right: "Connect Wallet" button
4. Connect your MetaMask → if you're on Arc Testnet, you're all set; if not, a red "Switch to Arc Testnet" pill appears

Click any market tile → drawer opens with real chart placeholder, real resolution criteria, and a working trade panel that quotes real prices.

---

## How the on-chain integration works

`src/hooks/useMarkets.ts` is the brain. It:

1. Calls `factory.marketsCount()` to know how many markets exist
2. Calls `factory.getMarkets(0, count)` to get all market addresses
3. Batches reads via `useReadContracts` — for each market, reads question, criteria, category, endsAt, status, reserves, shares outstanding, current YES price (~11 reads per market in one batch RPC call)
4. Transforms raw chain data into the `Market` type your components already understand
5. Returns `{ markets, isLoading, error, refetch }`

The result is plug-and-play with the bento UI from v0.1 — components didn't have to change.

For your current scale (5–50 markets) this is fast enough without an indexer. Beyond that we'd add a subgraph (Goldsky / The Graph).

---

## How the trade panel works (read side)

When you type an amount, the panel calls `market.quoteBuy(side, amount)` on-chain via `useReadContract`. The result updates with each keystroke (debounced by React Query's caching). So:

- Typing "100" → quote: "234.5 shares, avg 42.6¢, potential payout $234.50, +$134.50 return"
- Switch to NO → quote re-fetches with the NO side
- Numbers are 100% real from the AMM, not estimated client-side

When trading wires up next, the panel will:
1. Call `usdc.approve(marketAddress, amount)` — sign #1
2. Call `market.buy(side, amount, minSharesOut)` — sign #2
3. On success, refetch `useMarkets()` so the new state appears immediately

---

## Project structure

```
src/
├── lib/
│   ├── chain.ts           # Arc Testnet definition for viem/wagmi
│   ├── contracts.ts       # Addresses + ABIs + Side/Status enums
│   ├── wagmi.ts           # wagmi + RainbowKit config
│   ├── format.ts          # Currency/time formatters
│   └── types.ts           # Market, Trade, etc.
├── hooks/
│   └── useMarkets.ts      # The core on-chain read hook
├── components/
│   ├── Providers.tsx      # WagmiProvider + RainbowKitProvider + ThemeProvider
│   ├── AppShell.tsx       # Layout: Rail + main column
│   ├── Rail.tsx           # Vertical icon nav
│   ├── TopStrip.tsx       # Search + theme + ConnectButton (real RainbowKit)
│   ├── BentoTiles.tsx     # All the tile variants
│   ├── MarketDrawer.tsx   # Slide-in detail panel
│   ├── TradePanel.tsx     # Live quote + connect-or-trade button
│   ├── PriceChart.tsx     # Recharts chart
│   ├── Sparkline.tsx      # Inline SVG sparkline
│   ├── ThemeToggle.tsx
│   └── Logo.tsx
├── data/
│   └── markets.ts         # Mock data — only used for activity feed + leaderboard now
└── app/
    ├── page.tsx           # Markets bento — uses useMarkets()
    ├── portfolio/         # Still mock for now
    ├── leaderboard/       # Still mock for now
    ├── activity/          # Still mock for now
    ├── layout.tsx
    └── globals.css
```

---

## What you'll see when you load the page

**If the connection works:** loading spinner for 1-2 seconds, then your real markets populate the bento grid. The featured tile shows the first market in your factory. Stats tiles show real counts and liquidity.

**If something's wrong:** an error state with a "Retry" button. Most common causes:
- RPC down → try refreshing
- Wallet connected to wrong chain → use the "Switch to Arc Testnet" button in the top bar
- Factory address mismatch → check `src/lib/contracts.ts` matches your deployed address

---

## Next steps (in order)

1. **Wire up trading** — make the trade panel button actually call `approve()` + `buy()`. ~1 file change.
2. **Wire up portfolio page** — read user's positions across all markets. ~1 hook + 1 page change.
3. **Build admin panel** — `/admin` route with create-market form and resolve-market buttons.
4. **Set up an indexer (Goldsky)** — to populate activity feed, leaderboard, real volume, real price history.
5. **Final polish + soft launch.**

Once all of those are done, you have a fully functional prediction market on Arc Testnet.

---

## License

MIT.
