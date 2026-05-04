# Arc Markets — Update package #3

Drop on top of your existing `arcmarkets/` folder.

## How to apply

```bash
unzip arcmarkets-update.zip
cd arcmarkets
npm run dev
```

No new dependencies, no `npm install` needed.

---

## What's in this update

### ✅ "How it works" modal updated
- Added a new step (#2 of 5) telling users to claim mock USDC from the faucet before trading
- Updated step count from "four steps" to "five steps"
- The Droplet icon matches the sidebar Faucet entry, so users can mentally connect the dots

### ✅ Admin dashboard at `/admin`
A full admin UI replacing the cast/forge command-line workflow.

**Access control:**
- Reads `factory.owner()` and `factory.curators(yourAddress)` on load
- If your wallet is the factory owner OR a registered curator, you get in
- Otherwise: clean "Not authorized" page showing the actual factory owner address
- Sidebar "Admin" link only appears if you're authorized — invisible to regular users
- The contract enforces all permissions, so even if someone hacked the UI they can't actually do anything they're not authorized for

**Stats dashboard (top of page):**
- Total markets · open vs resolved breakdown
- Total liquidity across all pools
- Outstanding volume in active shares
- Number of markets awaiting resolution (past their end date but not resolved yet) — turns amber if there are any pending

**Create market tab:**
- Form: question (140 char limit), resolution criteria (500 char limit), category dropdown, end date/time picker, initial liquidity input
- Quick-pick buttons for $100/$250/$500/$1000/$2500 liquidity
- Live preview tile on the right that updates as you type — shows exactly what users will see in the bento
- Two-tx flow: approves USDC for the factory, then calls `factory.createMarket()`
- Step-by-step status: "Approving..." → "Creating market..." → "Market created!" with view-tx link
- "Create another" button after success to clear the form

**Manage markets tab:**
- Lists every market in chronological order, with ended-but-unresolved markets at the top
- Each row shows category, status badge (Open / Awaiting resolution / Resolved YES / Resolved NO), question, end date, liquidity, market address (linkable to Arc Scan)
- For ended markets without resolution: three buttons appear — **Resolve YES** (green), **Resolve NO** (red), **Invalid** (refunds users pro-rata if the question turned out to be ambiguous)
- One signature per resolve. Status updates inline.
- Open markets show a countdown ("Resolves in 12d 4h") instead of buttons

---

## Files added

```
src/app/admin/page.tsx           # The admin page itself
src/hooks/useAdmin.ts            # owner/curator check
src/hooks/useAdminActions.ts     # createMarket + resolveMarket flows
```

## Files modified

```
src/lib/contracts.ts                       # Added resolveMarket to FACTORY_ABI
src/components/Rail.tsx                    # Conditional Admin nav entry
src/components/HowItWorksModal.tsx         # Added faucet step
```

## Files NOT changed

Everything else stays exactly as you had it.

---

## What to test

**1. Admin gating works**
- Open the app. The sidebar should NOT show the Admin (Shield) icon (since you haven't connected as owner yet).
- Connect your deployer wallet (the one that ran the Deploy script — that's the factory owner).
- The Admin icon should now appear in the sidebar.
- Disconnect, the Admin icon disappears.

**2. Visit `/admin`**
- Stats tiles populate at the top
- "Create market" tab is selected by default
- "Owner" badge shows next to your name (or "Curator" if you're a curator and not the owner)

**3. Create a market via the UI**
- Fill in the form. The live preview on the right updates as you type.
- Pick an end date in the future (say, 30 days from now)
- Click "Create market". MetaMask prompts twice: USDC approval + createMarket.
- After success, the form shows a "Create another" button.
- Switch to the homepage — your new market appears in the bento grid.

**4. Resolve a market via the UI**
- This requires a market that's past its end date. For testing, you can create one with `endsAt = now + 1 minute`, wait for it, then come back.
- In the Manage tab, the market shows up at the top with "Awaiting resolution" status and three buttons.
- Click "Resolve YES" → MetaMask prompts → status updates to "Resolved YES" inline.
- Users holding YES shares can now claim from the market drawer.

**5. Non-admin gating**
- Connect with a different wallet (not owner, not curator).
- Visit `/admin` directly via URL.
- See the "Not authorized" page with the factory owner address shown.
- Sidebar doesn't show the Admin link for that wallet.

**6. How it works modal**
- Click "How it works" on the homepage hero.
- Modal now has 5 steps (01 through 05), with the new faucet step in position 02.

---

## Sequencing for adding curators (if you want a teammate)

There's no UI for `addCurator()` in this update — managing curators is a rare admin action and dangerous to one-click. For now, do it via cast:

```bash
cast send $FACTORY_ADDRESS "addCurator(address)" 0xTeammateAddress \
  --private-key $OWNER_KEY --rpc-url $RPC
```

Once they're added, they can connect their wallet and the Admin sidebar entry will light up for them automatically. They can create and resolve markets, but only the owner can add/remove curators or transfer ownership.

We can add a curator-management UI in a later update if you start delegating regularly.

---

## Known limits & deferred items

- **No fee collection UI.** The contract has `collectFees(market)` for pulling accumulated trading fees but no UI button yet. Use cast or add it in a future update.
- **No `addCurator` UI.** Use cast for now.
- **Admin actions don't auto-refetch the markets list immediately.** After creating a market, you may need to wait ~5-10 seconds and refresh the homepage for the new market to appear (depends on RPC caching). The admin page itself refetches automatically.
- **The "Awaiting resolution" count** is computed at page-load time based on `endsAt < Date.now()`. It only updates on next page navigation.
