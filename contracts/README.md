# Arc Markets Contracts

The smart contracts behind Arc Markets — a binary prediction market with a CPMM AMM, settled in USDC, deployed on Arc.

This README is written assuming **you've never deployed a Solidity contract before**. It walks through everything step by step.

---

## What you're about to deploy

Three contracts:

1. **`MockUSDC.sol`** — A test USDC for the testnet. Has a public `faucet()` that mints 10,000 tokens to anyone who calls it. Replace with real Arc USDC when you go to mainnet.
2. **`PredictionMarket.sol`** — One of these is deployed per market. Holds USDC, runs the AMM, tracks user positions, handles resolution and claims.
3. **`MarketFactory.sol`** — The contract you'll interact with most. Deploys new markets, manages curators, pays out fees.

---

## Prerequisites

You need these installed:

### 1. Foundry (the development framework)

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Then verify:
```bash
forge --version
```

You should see something like `forge 0.2.0 (abc123 2024-...)`.

### 2. A wallet for deployment

**DO NOT use a wallet that holds real money for testnet deployments.** Spin up a fresh MetaMask or use `cast wallet new` to generate a throwaway wallet.

You'll need its **private key** (the 64-char string starting with `0x`). To get the private key out of MetaMask: Account details → Show private key.

### 3. Some testnet USDC and gas

- **For Arc Testnet:** USDC is also the gas token. Get USDC from Circle's faucet at https://faucet.circle.com (verify the URL — Circle has had different faucet domains)
- **Verify the Arc Testnet chain ID and RPC URL** at https://docs.arc.network/arc/references/connect-to-arc

### 4. Add Arc Testnet to MetaMask

- Network Name: Arc Testnet
- Chain ID: (check the docs — placeholder is 28230 in our config)
- RPC URL: (check the docs)
- Currency Symbol: USDC
- Block Explorer: (check the docs)

---

## Step 1: Get the project running locally

```bash
cd arc-contracts
forge install foundry-rs/forge-std --no-commit
```

This installs Foundry's standard library which the tests depend on.

Now build:
```bash
forge build
```

You should see something like:
```
[⠊] Compiling...
[⠒] Compiling 3 files with 0.8.24
[⠢] Solc 0.8.24 finished in 1.20s
Compiler run successful
```

If you see errors, paste them at me.

---

## Step 2: Run the tests

This is the most important step. **Tests catch math bugs that would lose users money.**

```bash
forge test -vv
```

You should see ~20 tests pass. The `-vv` flag shows you what each test is doing. If anything fails, **don't deploy** — paste the failure at me and we'll fix it.

To run a specific test:
```bash
forge test --match-test test_FullScenario -vvv
```

To get a gas report:
```bash
forge test --gas-report
```

To run tests with coverage:
```bash
forge coverage
```

---

## Step 3: Set up your environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
```

**Critical:** `.env` is in `.gitignore`. Never commit it. Never paste your private key anywhere.

---

## Step 4: Deploy to Arc Testnet

```bash
source .env
forge script script/Deploy.s.sol \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --broadcast \
  --slow
```

This:
1. Deploys MockUSDC
2. Deploys MarketFactory pointing at MockUSDC
3. Mints 10k USDC to your deployer wallet
4. Prints the addresses

**Save the printed addresses.** They'll look like:
```
NEXT_PUBLIC_USDC_ADDRESS= 0x1234...
NEXT_PUBLIC_FACTORY_ADDRESS= 0x5678...
```

Add these to your `.env`:
```
USDC_ADDRESS=0x1234...
FACTORY_ADDRESS=0x5678...
```

---

## Step 5: Seed initial markets

```bash
source .env
forge script script/SeedMarkets.s.sol \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --broadcast \
  --slow
```

This creates 5 starter markets, each seeded with $500 of USDC liquidity.

After this runs, you can verify by calling the factory's `marketsCount()`:

```bash
cast call $FACTORY_ADDRESS "marketsCount()(uint256)" --rpc-url $ARC_TESTNET_RPC_URL
```

Should return `5`.

---

## Step 6: Try a manual trade with cast

`cast` is Foundry's CLI for interacting with deployed contracts. Let's place a trade:

```bash
# Get the address of the first market
MARKET=$(cast call $FACTORY_ADDRESS "markets(uint256)(address)" 0 --rpc-url $ARC_TESTNET_RPC_URL)
echo "First market: $MARKET"

# Approve the market to spend 100 USDC of yours
cast send $USDC_ADDRESS "approve(address,uint256)" $MARKET 100000000 \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Buy YES with 100 USDC, accepting any slippage (minSharesOut = 0)
# Side enum: 0 = YES, 1 = NO
cast send $MARKET "buy(uint8,uint256,uint256)" 0 100000000 0 \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $ARC_TESTNET_RPC_URL

# Check your YES shares
cast call $MARKET "shares(address,uint8)(uint256)" \
  $(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY) 0 \
  --rpc-url $ARC_TESTNET_RPC_URL
```

If all that works, **your contracts are live and functional.**

---

## How market creation actually works (your operational flow)

Once contracts are deployed, here's how you (or your team) creates new markets in production:

### Option A: Via the admin panel UI (recommended once we build it)
You go to `arcmarkets.app/admin`, fill in a form, click "Create market", sign a transaction in MetaMask. Done.

### Option B: Via cast (fast, technical)

```bash
# 1. Approve factory to take your USDC
cast send $USDC_ADDRESS "approve(address,uint256)" $FACTORY_ADDRESS 500000000 \
  --private-key $YOUR_KEY --rpc-url $RPC

# 2. Create market
cast send $FACTORY_ADDRESS "createMarket(string,string,string,uint256,uint256)" \
  "Will SpaceX land on Mars in 2027?" \
  "Resolves YES if SpaceX confirms Starship landing on Mars before Jan 1, 2028." \
  "science" \
  $(($(date +%s) + 365 * 86400)) \
  500000000 \
  --private-key $YOUR_KEY --rpc-url $RPC
```

### Option C: Via Foundry script (good for batch creation)
Modify `script/SeedMarkets.s.sol` and run it again — it'll add more markets to the factory.

---

## How resolution works

When a market ends:

```bash
# Resolve YES (Status.RESOLVED_YES = 1)
cast send $FACTORY_ADDRESS "resolveMarket(address,uint8)" $MARKET 1 \
  --private-key $YOUR_KEY --rpc-url $RPC

# Or resolve NO (Status.RESOLVED_NO = 2)
cast send $FACTORY_ADDRESS "resolveMarket(address,uint8)" $MARKET 2 \
  --private-key $YOUR_KEY --rpc-url $RPC

# Or resolve INVALID (Status.RESOLVED_INVALID = 3)
cast send $FACTORY_ADDRESS "resolveMarket(address,uint8)" $MARKET 3 \
  --private-key $YOUR_KEY --rpc-url $RPC
```

Status enum values: `0=OPEN, 1=RESOLVED_YES, 2=RESOLVED_NO, 3=RESOLVED_INVALID`

After resolution, users call `claim()` on the market to receive their winnings.

---

## Adding curators (delegating market creation to teammates)

Anyone you add as a curator can create and resolve markets, but **cannot** transfer ownership or remove other curators (only the owner can do that).

```bash
# Add a curator
cast send $FACTORY_ADDRESS "addCurator(address)" 0xTEAMMATE_ADDRESS \
  --private-key $OWNER_KEY --rpc-url $RPC

# Remove a curator
cast send $FACTORY_ADDRESS "removeCurator(address)" 0xTEAMMATE_ADDRESS \
  --private-key $OWNER_KEY --rpc-url $RPC
```

---

## Collecting trading fees

Every trade pays a 2% fee. To collect accumulated fees from a specific market:

```bash
# Owner-only
cast send $FACTORY_ADDRESS "collectFees(address)" $MARKET \
  --private-key $OWNER_KEY --rpc-url $RPC
```

Fees go to the factory owner address.

---

## The math, briefly

The AMM uses **constant product**: `yesReserve × noReserve = k`

- Initial state: 1000 YES + 1000 NO = k = 1,000,000. Implied YES probability = 50%.
- After someone buys $100 worth of YES: roughly 1100 NO, ~909 YES → probability ≈ 55%.

**Implied YES probability** is always `noReserve / (yesReserve + noReserve)`. Why? Because the rarer side in the pool is what people are buying, and what they're buying is what they think will happen.

When the market resolves YES, every YES share is worth exactly $1 in USDC. NO shares are worth $0.

If the market resolves INVALID (e.g., the question becomes ambiguous), users get a pro-rata refund based on the AMM reserves at resolution time — both YES and NO holders get something back.

---

## Security caveats — read these before mainnet

1. **The contracts are unaudited.** Do not deploy to mainnet until you've gotten an audit from a reputable firm ($5k-30k for this size). Recommended firms: Spearbit, Trail of Bits, OpenZeppelin Audits, Code4rena contests.

2. **The admin (you) has unchecked resolution power.** A malicious or compromised admin key can resolve markets fraudulently and drain user funds via wins. For mainnet:
   - Use a multisig wallet (e.g., Safe) as the owner
   - Consider integrating UMA optimistic oracle for resolution disputes
   - Or move to a model where resolution is bonded by curators

3. **There's no time-locked admin.** If your owner key is stolen, the attacker can immediately add themselves as curator and resolve anything. For mainnet, add a 24-48 hour timelock on owner-only functions.

4. **There's no emergency pause.** If a bug is discovered, you can't pause trading. Add a `pause()` modifier on `buy()` and `sell()` for mainnet.

5. **`MockUSDC.faucet()` is mintable by anyone.** Obviously do NOT deploy MockUSDC to mainnet — use the real Arc USDC contract address.

6. **Integer division loses precision.** Trading 0.000001 USDC is technically allowed but rounding errors may make tiny trades unprofitable or even revert. We recommend a frontend minimum of $1 per trade.

7. **No front-running protection.** A malicious sequencer (or MEV bot on permissionless chains) could see your trades and front-run them. Arc has a single sequencer for now, so this is less of a concern, but be aware.

---

## What's NOT included (and what to add later)

- **No upgradability.** Contracts are immutable. If you want to push fixes later, redeploy and migrate users to a new factory. Acceptable for v1.
- **No NFT for shares.** Shares are tracked in a mapping, not as ERC-1155 tokens. Means users can't trade shares on secondary markets like OpenSea. If you want this, switch to ERC-1155.
- **No LP tokens.** Initial liquidity provider (you) cannot withdraw their seed liquidity. For v1 this is fine — you're committing $500/market as a cost of running the platform. For a real LP feature, add a proper Uniswap-style LP token system.
- **No category/tag updating.** Once a market is created, its category is fixed. Add this off-chain in your indexer if needed.
- **No comments/social.** This is purely the financial layer. Comments and social would be a separate database.

---

## Project structure

```
arc-contracts/
├── src/
│   ├── MockUSDC.sol           # Test USDC token
│   ├── PredictionMarket.sol   # AMM market contract
│   └── MarketFactory.sol      # Deploys markets, admin
├── test/
│   └── PredictionMarket.t.sol # ~20 test cases
├── script/
│   ├── Deploy.s.sol           # Initial deploy
│   └── SeedMarkets.s.sol      # Create starter markets
├── foundry.toml               # Foundry config
├── .env.example
└── README.md
```

---

## Common issues you might hit

**"compilation failed: No such file or directory"** — You haven't run `forge install foundry-rs/forge-std --no-commit` yet.

**"insufficient funds for gas"** — Your deployer wallet doesn't have enough native gas token (USDC on Arc) to deploy. Hit the faucet.

**"USDC transfer failed"** — You forgot to approve the factory before calling createMarket. Run `cast send $USDC_ADDRESS "approve..."` first.

**"NotCurator"** — You're trying to call `createMarket` from a wallet that hasn't been added as a curator. Either use the deployer wallet or have the owner add yours.

**Tests pass locally but transactions revert on testnet** — Often a slow RPC. Add `--slow` to your forge script command.

**My contracts deployed but the frontend can't see them** — Either you have the wrong address in `.env.local`, or your wallet is connected to the wrong network. Double-check both.

---

## Next steps

After this is deployed and working on Arc Testnet:

1. **Wire up the frontend** — replace `data/markets.ts` mocks with real reads from `factory.markets()` and per-market `getYesPrice()`. We'll do this together in the next step.
2. **Build the admin panel** — a `/admin` route in the Next.js app for creating markets without using `cast`.
3. **Set up an indexer** — Goldsky or The Graph subgraph that reads events into a database for fast queries.
4. **Add oracles for automated resolution** — for crypto markets (BTC price etc.) you can use Pyth or Chainlink. For everything else, you resolve manually for v1.
5. **Get a security audit** before mainnet.

---

## License

MIT.
