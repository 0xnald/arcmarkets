/**
 * Additional ABI fragments needed for admin operations.
 *
 * Kept in a separate file so the existing src/lib/contracts.ts stays untouched.
 * If you later consolidate, you can merge these into FACTORY_ABI / MARKET_ABI.
 */

export const FACTORY_ADMIN_ABI = [
  {
    type: "function",
    name: "addCurator",
    inputs: [{ name: "curator", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeCurator",
    inputs: [{ name: "curator", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "collectFees",
    inputs: [{ name: "marketAddr", type: "address" }],
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

export const MARKET_FEES_ABI = [
  {
    type: "function",
    name: "accumulatedFees",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
