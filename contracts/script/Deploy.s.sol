// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MarketFactory} from "../src/MarketFactory.sol";

/**
 * Deploy script — deploys MockUSDC and MarketFactory to whatever network you're connected to.
 *
 * USAGE:
 *   1. Make sure your .env has DEPLOYER_PRIVATE_KEY set
 *   2. Make sure your wallet has Arc Testnet gas (USDC on Arc, ETH on Sepolia, etc.)
 *   3. Run: forge script script/Deploy.s.sol --rpc-url $ARC_TESTNET_RPC_URL --broadcast
 *
 * After deploy, copy the printed addresses into your frontend config.
 */
contract Deploy is Script {
    function run() external returns (MockUSDC usdc, MarketFactory factory) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("==========================================");
        console2.log("Deploying as:", deployer);
        console2.log("Network chainid:", block.chainid);
        console2.log("==========================================");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy mock USDC (skip this on mainnet — use real USDC address)
        usdc = new MockUSDC();
        console2.log("MockUSDC deployed at:", address(usdc));

        // 2. Deploy factory pointing at USDC
        factory = new MarketFactory(address(usdc));
        console2.log("MarketFactory deployed at:", address(factory));

        // 3. Mint deployer some USDC for creating initial markets
        usdc.faucet(); // 10k USDC to deployer

        vm.stopBroadcast();

        console2.log("==========================================");
        console2.log("Deployment complete!");
        console2.log("Add these to your frontend .env.local:");
        console2.log("NEXT_PUBLIC_USDC_ADDRESS=", address(usdc));
        console2.log("NEXT_PUBLIC_FACTORY_ADDRESS=", address(factory));
        console2.log("==========================================");
    }
}
