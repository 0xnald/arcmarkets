// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MarketFactory} from "../src/MarketFactory.sol";

contract PredictionMarketTest is Test {
    MockUSDC usdc;
    MarketFactory factory;
    PredictionMarket market;

    address owner = address(0xA1);
    address curator = address(0xC1);
    address alice = address(0xA1A);
    address bob = address(0xB0B);
    address carol = address(0xCA);

    uint256 constant SEED_LIQUIDITY = 1_000 * 10**6; // $1,000 USDC
    uint256 endsAt;

    function setUp() public {
        // Deploy USDC and factory as owner
        vm.startPrank(owner);
        usdc = new MockUSDC();
        factory = new MarketFactory(address(usdc));
        factory.addCurator(curator);
        vm.stopPrank();

        // Mint USDC to test users
        _fund(curator, 100_000 * 10**6);
        _fund(alice, 10_000 * 10**6);
        _fund(bob, 10_000 * 10**6);
        _fund(carol, 10_000 * 10**6);

        // Curator creates a market ending in 7 days
        endsAt = block.timestamp + 7 days;
        vm.startPrank(curator);
        usdc.approve(address(factory), SEED_LIQUIDITY);
        address marketAddr = factory.createMarket(
            "Will BTC hit $150k by end of 2026?",
            "Resolves YES if BTC closes above $150,000 on Dec 31, 2026 per Coinbase spot.",
            "crypto",
            endsAt,
            SEED_LIQUIDITY
        );
        market = PredictionMarket(marketAddr);
        vm.stopPrank();
    }

    function _fund(address user, uint256 amount) internal {
        vm.prank(user);
        usdc.faucet();
        // faucet gives 10k; if we want more, call multiple times
        while (usdc.balanceOf(user) < amount) {
            vm.prank(user);
            usdc.faucet();
        }
    }

    // ============ FACTORY TESTS ============

    function test_CreateMarket_StoresInRegistry() public {
        assertEq(factory.marketsCount(), 1);
        assertEq(factory.markets(0), address(market));
        assertTrue(factory.isMarket(address(market)));
    }

    function test_CreateMarket_TransfersLiquidity() public {
        // Market should hold the seed liquidity in USDC
        assertEq(usdc.balanceOf(address(market)), SEED_LIQUIDITY);
        // Reserves should match
        assertEq(market.yesReserve(), SEED_LIQUIDITY);
        assertEq(market.noReserve(), SEED_LIQUIDITY);
    }

    function test_CreateMarket_RevertsIfNotCurator() public {
        vm.startPrank(alice);
        usdc.approve(address(factory), SEED_LIQUIDITY);
        vm.expectRevert(MarketFactory.NotCurator.selector);
        factory.createMarket("Q", "C", "cat", block.timestamp + 1 days, SEED_LIQUIDITY);
        vm.stopPrank();
    }

    function test_AddRemoveCurator() public {
        vm.startPrank(owner);
        factory.addCurator(alice);
        assertTrue(factory.curators(alice));
        factory.removeCurator(alice);
        assertFalse(factory.curators(alice));
        vm.stopPrank();
    }

    function test_TransferOwnership() public {
        vm.prank(owner);
        factory.transferOwnership(alice);
        assertEq(factory.owner(), alice);
    }

    // ============ PRICING TESTS ============

    function test_InitialPrice_Is50Percent() public {
        // Equal reserves means 50% probability
        assertEq(market.getYesPrice(), 5000); // 5000 bps = 50%
    }

    function test_PriceMovesAfterBuy() public {
        // Buying YES should make YES more expensive (price > 50%)
        uint256 buyAmount = 100 * 10**6;
        vm.startPrank(alice);
        usdc.approve(address(market), buyAmount);
        market.buy(PredictionMarket.Side.YES, buyAmount, 0);
        vm.stopPrank();

        uint256 newPrice = market.getYesPrice();
        assertGt(newPrice, 5000, "YES price should rise after buying YES");
    }

    function test_QuoteBuy_RoughlyMatchesShares() public {
        uint256 buyAmount = 100 * 10**6;
        uint256 quoted = market.quoteBuy(PredictionMarket.Side.YES, buyAmount);

        vm.startPrank(alice);
        usdc.approve(address(market), buyAmount);
        uint256 actual = market.buy(PredictionMarket.Side.YES, buyAmount, 0);
        vm.stopPrank();

        assertEq(actual, quoted, "Quote should match actual");
    }

    // ============ TRADING TESTS ============

    function test_Buy_CreditsShares() public {
        uint256 buyAmount = 100 * 10**6;
        vm.startPrank(alice);
        usdc.approve(address(market), buyAmount);
        uint256 shares = market.buy(PredictionMarket.Side.YES, buyAmount, 0);
        vm.stopPrank();

        assertEq(market.shares(alice, PredictionMarket.Side.YES), shares);
        assertGt(shares, 0);
    }

    function test_Buy_RevertsIfSlippageExceeded() public {
        uint256 buyAmount = 100 * 10**6;
        uint256 quoted = market.quoteBuy(PredictionMarket.Side.YES, buyAmount);

        vm.startPrank(alice);
        usdc.approve(address(market), buyAmount);
        vm.expectRevert(PredictionMarket.SlippageExceeded.selector);
        market.buy(PredictionMarket.Side.YES, buyAmount, quoted + 1);
        vm.stopPrank();
    }

    function test_Buy_RevertsIfMarketEnded() public {
        vm.warp(endsAt + 1);
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * 10**6);
        vm.expectRevert(PredictionMarket.TradingEnded.selector);
        market.buy(PredictionMarket.Side.YES, 100 * 10**6, 0);
        vm.stopPrank();
    }

    function test_Sell_ReturnsUSDC() public {
        // Buy first
        uint256 buyAmount = 100 * 10**6;
        vm.startPrank(alice);
        usdc.approve(address(market), buyAmount);
        uint256 shares = market.buy(PredictionMarket.Side.YES, buyAmount, 0);

        // Sell back half
        uint256 balanceBefore = usdc.balanceOf(alice);
        market.sell(PredictionMarket.Side.YES, shares / 2, 0);
        uint256 balanceAfter = usdc.balanceOf(alice);
        vm.stopPrank();

        assertGt(balanceAfter, balanceBefore, "Should receive USDC from sell");
    }

    function test_Sell_RevertsIfInsufficientShares() public {
        vm.startPrank(alice);
        vm.expectRevert(PredictionMarket.InsufficientShares.selector);
        market.sell(PredictionMarket.Side.YES, 1000 * 10**6, 0);
        vm.stopPrank();
    }

    // ============ RESOLUTION TESTS ============

    function test_Resolve_RevertsBeforeEnd() public {
        vm.prank(curator);
        vm.expectRevert(PredictionMarket.TradingNotEnded.selector);
        factory.resolveMarket(address(market), PredictionMarket.Status.RESOLVED_YES);
    }

    function test_Resolve_OnlyByCurator() public {
        vm.warp(endsAt + 1);
        vm.prank(alice);
        vm.expectRevert(MarketFactory.NotCurator.selector);
        factory.resolveMarket(address(market), PredictionMarket.Status.RESOLVED_YES);
    }

    function test_Resolve_SetsStatus() public {
        vm.warp(endsAt + 1);
        vm.prank(curator);
        factory.resolveMarket(address(market), PredictionMarket.Status.RESOLVED_YES);
        assertEq(uint256(market.status()), uint256(PredictionMarket.Status.RESOLVED_YES));
    }

    function test_Resolve_CannotResolveTwice() public {
        vm.warp(endsAt + 1);
        vm.prank(curator);
        factory.resolveMarket(address(market), PredictionMarket.Status.RESOLVED_YES);

        vm.prank(curator);
        vm.expectRevert(PredictionMarket.MarketAlreadyResolved.selector);
        factory.resolveMarket(address(market), PredictionMarket.Status.RESOLVED_NO);
    }

    // ============ CLAIM TESTS ============

    function test_Claim_YesWins() public {
        // Alice buys YES, market resolves YES
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * 10**6);
        uint256 shares = market.buy(PredictionMarket.Side.YES, 100 * 10**6, 0);
        vm.stopPrank();

        vm.warp(endsAt + 1);
        vm.prank(curator);
        factory.resolveMarket(address(market), PredictionMarket.Status.RESOLVED_YES);

        uint256 balanceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = market.claim();
        uint256 balanceAfter = usdc.balanceOf(alice);

        assertEq(payout, shares, "Each YES share = 1 USDC");
        assertEq(balanceAfter - balanceBefore, shares);
    }

    function test_Claim_LosingShares_ReturnZero() public {
        // Alice buys NO, market resolves YES
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * 10**6);
        market.buy(PredictionMarket.Side.NO, 100 * 10**6, 0);
        vm.stopPrank();

        vm.warp(endsAt + 1);
        vm.prank(curator);
        factory.resolveMarket(address(market), PredictionMarket.Status.RESOLVED_YES);

        uint256 balanceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = market.claim();
        uint256 balanceAfter = usdc.balanceOf(alice);

        assertEq(payout, 0);
        assertEq(balanceBefore, balanceAfter);
    }

    function test_Claim_InvalidMarket_PaysProRata() public {
        // Both alice and bob buy
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * 10**6);
        market.buy(PredictionMarket.Side.YES, 100 * 10**6, 0);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(market), 100 * 10**6);
        market.buy(PredictionMarket.Side.NO, 100 * 10**6, 0);
        vm.stopPrank();

        vm.warp(endsAt + 1);
        vm.prank(curator);
        factory.resolveMarket(address(market), PredictionMarket.Status.RESOLVED_INVALID);

        // Both should be able to claim something
        vm.prank(alice);
        uint256 alicePayout = market.claim();

        vm.prank(bob);
        uint256 bobPayout = market.claim();

        assertGt(alicePayout, 0, "Alice should get pro-rata refund");
        assertGt(bobPayout, 0, "Bob should get pro-rata refund");
    }

    function test_Claim_RevertsIfNotResolved() public {
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.MarketNotResolved.selector);
        market.claim();
    }

    // ============ FEE TESTS ============

    function test_Fees_Accumulate() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * 10**6);
        market.buy(PredictionMarket.Side.YES, 100 * 10**6, 0);
        vm.stopPrank();

        // 2% of 100 USDC = 2 USDC
        assertEq(market.accumulatedFees(), 2 * 10**6);
    }

    function test_Fees_OnlyOwnerCanCollect() public {
        vm.startPrank(alice);
        usdc.approve(address(market), 100 * 10**6);
        market.buy(PredictionMarket.Side.YES, 100 * 10**6, 0);
        vm.stopPrank();

        vm.prank(curator); // curator is not owner
        vm.expectRevert(MarketFactory.NotOwner.selector);
        factory.collectFees(address(market));

        uint256 ownerBalanceBefore = usdc.balanceOf(owner);
        vm.prank(owner);
        uint256 collected = factory.collectFees(address(market));
        uint256 ownerBalanceAfter = usdc.balanceOf(owner);

        assertEq(collected, 2 * 10**6);
        assertEq(ownerBalanceAfter - ownerBalanceBefore, 2 * 10**6);
    }

    // ============ MATH INVARIANT TESTS ============

    function test_BuyYes_PreservesTotalUSDCBacking() public {
        // After a buy, contract USDC should equal: initial_seed + buyAmount
        // (regardless of how it's distributed between fees and pool)
        uint256 contractUSDCBefore = usdc.balanceOf(address(market));
        assertEq(contractUSDCBefore, SEED_LIQUIDITY);

        uint256 buyAmount = 100 * 10**6;
        vm.startPrank(alice);
        usdc.approve(address(market), buyAmount);
        market.buy(PredictionMarket.Side.YES, buyAmount, 0);
        vm.stopPrank();

        uint256 contractUSDCAfter = usdc.balanceOf(address(market));
        assertEq(contractUSDCAfter, SEED_LIQUIDITY + buyAmount);
    }

    function test_BuyAndSell_ApproximatelyRoundTrips() public {
        // If alice buys then immediately sells, she should lose only ~2x fee (4%)
        uint256 buyAmount = 100 * 10**6;
        uint256 balanceBefore = usdc.balanceOf(alice);

        vm.startPrank(alice);
        usdc.approve(address(market), buyAmount);
        uint256 shares = market.buy(PredictionMarket.Side.YES, buyAmount, 0);
        market.sell(PredictionMarket.Side.YES, shares, 0);
        vm.stopPrank();

        uint256 balanceAfter = usdc.balanceOf(alice);
        uint256 lost = balanceBefore - balanceAfter;

        // Should lose ~4% (2% buy fee + 2% sell fee)
        assertLt(lost, buyAmount * 5 / 100, "Roundtrip loss should be under 5%");
        assertGt(lost, buyAmount * 3 / 100, "Roundtrip loss should be over 3%");
    }

    function test_PriceMonotonicity() public {
        // Each successive YES buy should push price higher
        uint256 buyAmount = 50 * 10**6;
        uint256 prevPrice = market.getYesPrice();

        for (uint256 i = 0; i < 5; i++) {
            vm.startPrank(alice);
            usdc.approve(address(market), buyAmount);
            market.buy(PredictionMarket.Side.YES, buyAmount, 0);
            vm.stopPrank();

            uint256 currentPrice = market.getYesPrice();
            assertGt(currentPrice, prevPrice, "Price should rise with each YES buy");
            prevPrice = currentPrice;
        }
    }

    // ============ INTEGRATION TEST ============

    function test_FullScenario() public {
        // 1. Three users buy on different sides
        vm.startPrank(alice);
        usdc.approve(address(market), 500 * 10**6);
        market.buy(PredictionMarket.Side.YES, 500 * 10**6, 0);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(market), 200 * 10**6);
        market.buy(PredictionMarket.Side.NO, 200 * 10**6, 0);
        vm.stopPrank();

        vm.startPrank(carol);
        usdc.approve(address(market), 300 * 10**6);
        market.buy(PredictionMarket.Side.YES, 300 * 10**6, 0);
        vm.stopPrank();

        // 2. Alice sells half her position
        uint256 aliceShares = market.shares(alice, PredictionMarket.Side.YES);
        vm.prank(alice);
        market.sell(PredictionMarket.Side.YES, aliceShares / 2, 0);

        // 3. Market ends and resolves YES
        vm.warp(endsAt + 1);
        vm.prank(curator);
        factory.resolveMarket(address(market), PredictionMarket.Status.RESOLVED_YES);

        // 4. Winners claim
        vm.prank(alice);
        market.claim();
        vm.prank(carol);
        market.claim();
        vm.prank(bob);
        market.claim(); // gets nothing

        // 5. Owner collects fees
        vm.prank(owner);
        uint256 fees = factory.collectFees(address(market));
        assertGt(fees, 0);

        // System solvent: alice + carol payouts + bob (0) + remaining USDC = total deposits + seed
        // (Some dust may remain due to integer math — expected)
    }
}
