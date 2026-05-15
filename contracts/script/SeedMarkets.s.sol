// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MarketFactory} from "../src/MarketFactory.sol";

/**
 * SeedMarkets — creates a handful of starter markets after deploy.
 *
 * USAGE:
 *   1. Set FACTORY_ADDRESS and USDC_ADDRESS in .env after running Deploy.s.sol
 *   2. Run: forge script script/SeedMarkets.s.sol --rpc-url $ARC_TESTNET_RPC_URL --broadcast
 *
 * This is purely a convenience for getting markets visible in your frontend immediately.
 * Production market creation should happen through your admin panel UI, not this script.
 */
contract SeedMarkets is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address factoryAddr = vm.envAddress("FACTORY_ADDRESS");
        address usdcAddr = vm.envAddress("USDC_ADDRESS");

        MarketFactory factory = MarketFactory(factoryAddr);
        MockUSDC usdc = MockUSDC(usdcAddr);

        uint256 perMarketLiquidity = 500 * 10**6; // $500 each
        uint256 totalNeeded = perMarketLiquidity * 5;

        vm.startBroadcast(pk);

        // Make sure deployer has enough USDC
        while (usdc.balanceOf(vm.addr(pk)) < totalNeeded) {
            usdc.faucet();
        }

        // Approve factory once for total
        usdc.approve(factoryAddr, totalNeeded);

        // Create 5 starter markets
        factory.createMarket(
            "Will Bitcoin close above $150,000 by end of 2026?",
            "Resolves YES if BTC/USD spot price closes above $150,000 on December 31, 2026 (UTC) per Coinbase exchange data.",
            "crypto",
            block.timestamp + 365 days,
            perMarketLiquidity
        );

        factory.createMarket(
            "Will Arc mainnet launch before October 1, 2026?",
            "Resolves YES if Circle officially announces Arc Layer 1 mainnet as live and accepting external transactions before October 1, 2026 (00:00 UTC).",
            "arc",
            block.timestamp + 180 days,
            perMarketLiquidity
        );

        factory.createMarket(
            "Will the US enter a technical recession in 2026?",
            "Resolves YES if the US economy records two consecutive quarters of negative real GDP growth during 2026, per BEA data.",
            "macro",
            block.timestamp + 365 days,
            perMarketLiquidity
        );

        factory.createMarket(
            "Will the Fed cut rates at the June 2026 FOMC meeting?",
            "Resolves YES if the FOMC announces a federal funds rate cut at the June 2026 meeting.",
            "macro",
            block.timestamp + 60 days,
            perMarketLiquidity
        );

        factory.createMarket(
            "Will USDC market cap exceed $100B in 2026?",
            "Resolves YES if USDC's circulating supply exceeds $100 billion at any point during 2026, per Circle's transparency page.",
            "crypto",
            block.timestamp + 365 days,
            perMarketLiquidity
        );

        vm.stopBroadcast();

        console2.log("Created 5 starter markets");
        console2.log("Total markets in factory:", factory.marketsCount());
    }
}
