/**
 * Contract addresses and ABIs for Arc Markets on Arc Testnet.
 *
 * If you redeploy contracts, update these addresses (or use env vars in production).
 */

export const CONTRACTS = {
  USDC: "0x6436149Ed4Cb3B9210bb24100DA3a29b740Aeb01" as const,
  FACTORY: "0x11B412F20f99557C56b5e6C601ca4215f1622016" as const,
} as const;

// ============ FACTORY ABI ============
// Only the functions/events the frontend actually calls.
// Generated from MarketFactory.sol — keep in sync if you modify the contract.

export const FACTORY_ABI = [
  {
    type: "function",
    name: "marketsCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "markets",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarkets",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isMarket",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "curators",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createMarket",
    inputs: [
      { name: "question", type: "string" },
      { name: "resolutionCriteria", type: "string" },
      { name: "category", type: "string" },
      { name: "endsAt", type: "uint256" },
      { name: "initialLiquidity", type: "uint256" },
    ],
    outputs: [{ name: "market", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "market", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "question", type: "string", indexed: false },
      { name: "category", type: "string", indexed: false },
      { name: "endsAt", type: "uint256", indexed: false },
      { name: "initialLiquidity", type: "uint256", indexed: false },
    ],
  },
] as const;

// ============ MARKET ABI ============

export const MARKET_ABI = [
  // Question/metadata
  {
    type: "function",
    name: "question",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "resolutionCriteria",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "category",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "endsAt",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createdAt",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },

  // Status (enum: 0=OPEN, 1=RESOLVED_YES, 2=RESOLVED_NO, 3=RESOLVED_INVALID)
  {
    type: "function",
    name: "status",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },

  // Pool reserves
  {
    type: "function",
    name: "yesReserve",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "noReserve",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "yesSharesOutstanding",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "noSharesOutstanding",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "accumulatedFees",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },

  // Pricing
  {
    type: "function",
    name: "getYesPrice",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quoteBuy",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "usdcAmount", type: "uint256" },
    ],
    outputs: [{ name: "sharesOut", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quoteSell",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "shareAmount", type: "uint256" },
    ],
    outputs: [{ name: "usdcOut", type: "uint256" }],
    stateMutability: "view",
  },

  // User state
  {
    type: "function",
    name: "shares",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },

  // Trading
  {
    type: "function",
    name: "buy",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "usdcAmount", type: "uint256" },
      { name: "minSharesOut", type: "uint256" },
    ],
    outputs: [{ name: "sharesOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sell",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "shareAmount", type: "uint256" },
      { name: "minUsdcOut", type: "uint256" },
    ],
    outputs: [{ name: "usdcOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [],
    outputs: [{ name: "usdcPayout", type: "uint256" }],
    stateMutability: "nonpayable",
  },

  // Events (for activity feed when we add it)
  {
    type: "event",
    name: "Trade",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "side", type: "uint8", indexed: false },
      { name: "isBuy", type: "bool", indexed: false },
      { name: "usdcAmount", type: "uint256", indexed: false },
      { name: "sharesAmount", type: "uint256", indexed: false },
      { name: "newYesPrice", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Resolved",
    inputs: [
      { name: "result", type: "uint8", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "sharesRedeemed", type: "uint256", indexed: false },
      { name: "usdcPayout", type: "uint256", indexed: false },
    ],
  },
] as const;

// ============ ERC20 (USDC) ABI ============

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "faucet",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ============ TYPES ============

export enum Side {
  YES = 0,
  NO = 1,
}

export enum MarketStatus {
  OPEN = 0,
  RESOLVED_YES = 1,
  RESOLVED_NO = 2,
  RESOLVED_INVALID = 3,
}

// USDC has 6 decimals via the ERC20 interface (per Arc docs and your MockUSDC)
export const USDC_DECIMALS = 6;
