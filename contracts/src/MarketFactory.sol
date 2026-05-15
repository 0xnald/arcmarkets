// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PredictionMarket} from "./PredictionMarket.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title MarketFactory
 * @notice Deploys new PredictionMarket contracts and acts as their admin.
 *
 * PERMISSIONS:
 *   - `owner` is the top-level admin (you). Can add/remove curators and update settings.
 *   - `curators` are wallets allowed to create markets and resolve them.
 *     Use this if you want a small team to manage markets without sharing the owner key.
 *
 * CREATING A MARKET:
 *   1. Curator approves the factory to spend X USDC (initial liquidity)
 *   2. Curator calls createMarket() with question, criteria, end date, category, liquidity
 *   3. Factory pulls USDC from curator, deploys a new PredictionMarket, transfers USDC to it
 *   4. Market is registered in `markets` array and emits MarketCreated event
 *
 * RESOLVING A MARKET:
 *   - After endsAt, any curator can call resolveMarket(marketAddr, result)
 *   - Choose RESOLVED_YES, RESOLVED_NO, or RESOLVED_INVALID
 *
 * The frontend reads markets[] to display all markets. The indexer reads MarketCreated
 * events to populate its database.
 */
contract MarketFactory {
    // ============ STATE ============

    address public owner;
    address public immutable usdc;

    /// @notice Wallets authorized to create and resolve markets
    mapping(address => bool) public curators;

    /// @notice All markets ever created, in chronological order
    address[] public markets;

    /// @notice Quick lookup: marketAddress => true if it was created by this factory
    mapping(address => bool) public isMarket;

    // ============ EVENTS ============

    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        string category,
        uint256 endsAt,
        uint256 initialLiquidity
    );

    event MarketResolved(address indexed market, PredictionMarket.Status result);

    event CuratorAdded(address indexed curator);
    event CuratorRemoved(address indexed curator);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event FeesCollected(address indexed market, uint256 amount);

    // ============ ERRORS ============

    error NotOwner();
    error NotCurator();
    error ZeroAddress();
    error NotAMarket();

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyCurator() {
        if (!curators[msg.sender] && msg.sender != owner) revert NotCurator();
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address _usdc) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = _usdc;
        owner = msg.sender;
        curators[msg.sender] = true; // owner is curator by default
        emit OwnershipTransferred(address(0), msg.sender);
        emit CuratorAdded(msg.sender);
    }

    // ============ MARKET CREATION ============

    /**
     * @notice Create a new prediction market.
     * @param question The market question (e.g. "Will BTC hit $150k by 2026?")
     * @param resolutionCriteria Detailed criteria for how this resolves
     * @param category Tag like "crypto", "sports", "politics"
     * @param endsAt Unix timestamp when trading closes
     * @param initialLiquidity USDC amount to seed the AMM (creator must approve first)
     * @return market Address of the newly deployed market contract
     */
    function createMarket(
        string calldata question,
        string calldata resolutionCriteria,
        string calldata category,
        uint256 endsAt,
        uint256 initialLiquidity
    ) external onlyCurator returns (address market) {
        // Pull USDC from curator BEFORE deploying so deployment fails cleanly if no approval
        require(
            IERC20(usdc).transferFrom(msg.sender, address(this), initialLiquidity),
            "USDC pull failed"
        );

        // Deploy new market — `address(this)` becomes its factory/admin
        PredictionMarket m = new PredictionMarket(
            address(this),
            usdc,
            question,
            resolutionCriteria,
            category,
            endsAt,
            initialLiquidity
        );

        market = address(m);

        // Forward the USDC to the new market so it can pay out winners later
        require(IERC20(usdc).transfer(market, initialLiquidity), "USDC forward failed");

        markets.push(market);
        isMarket[market] = true;

        emit MarketCreated(market, msg.sender, question, category, endsAt, initialLiquidity);
    }

    // ============ RESOLUTION ============

    /**
     * @notice Resolve a market. Only curators can call.
     * @param marketAddr The market to resolve
     * @param result RESOLVED_YES, RESOLVED_NO, or RESOLVED_INVALID
     */
    function resolveMarket(address marketAddr, PredictionMarket.Status result)
        external
        onlyCurator
    {
        if (!isMarket[marketAddr]) revert NotAMarket();
        PredictionMarket(marketAddr).resolve(result);
        emit MarketResolved(marketAddr, result);
    }

    /// @notice Pull accumulated trading fees from a market into the factory
    function collectFees(address marketAddr) external onlyOwner returns (uint256 amount) {
        if (!isMarket[marketAddr]) revert NotAMarket();
        amount = PredictionMarket(marketAddr).withdrawFees(owner);
        emit FeesCollected(marketAddr, amount);
    }

    // ============ ADMIN ============

    function addCurator(address curator) external onlyOwner {
        if (curator == address(0)) revert ZeroAddress();
        curators[curator] = true;
        emit CuratorAdded(curator);
    }

    function removeCurator(address curator) external onlyOwner {
        curators[curator] = false;
        emit CuratorRemoved(curator);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ============ VIEWS ============

    function marketsCount() external view returns (uint256) {
        return markets.length;
    }

    /// @notice Get a paginated slice of markets — useful for frontend
    function getMarkets(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = markets.length;
        if (offset >= total) return new address[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 count = end - offset;
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = markets[offset + i];
        }
        return result;
    }
}
