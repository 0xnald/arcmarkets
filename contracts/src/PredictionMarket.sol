// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PredictionMarket
 * @notice A binary (YES/NO) prediction market using a constant-product AMM.
 *
 * ─────────────────────────────────────────────────────────────────
 *  THE MATH (Polymarket-style "complete set" model)
 * ─────────────────────────────────────────────────────────────────
 *
 *  The pool holds YES and NO tokens with the invariant:
 *      yesReserve * noReserve = k
 *
 *  IMPLIED PROBABILITY of YES is:
 *      P(YES) = noReserve / (yesReserve + noReserve)
 *  (the rarer side in the pool is the one users have been buying,
 *   meaning the market thinks that outcome is more likely)
 *
 *  ─── BUYING YES with X USDC ───
 *
 *  Step 1: 1 USDC = 1 YES + 1 NO (complete set minted from collateral).
 *          So X USDC mints X YES + X NO. User now holds X YES, X NO.
 *
 *  Step 2: User puts ALL X NO shares into the pool, swaps them for YES.
 *          Pool: (yesR, noR) → (yesR - dY, noR + X)
 *          Constant product: (yesR - dY) * (noR + X) = yesR * noR
 *          Solve: dY = yesR * X / (noR + X)
 *          User receives dY additional YES from the pool.
 *
 *  Step 3: User's final YES = X (from minting) + dY (from pool)
 *                          = X + yesR*X / (noR + X)
 *                          = X * (yesR + noR + X) / (noR + X)
 *
 *  Pool ends at: (yesR - dY, noR + X) = (yesR*noR/(noR+X), noR+X)
 *
 *  ─── SELLING YES (returning shares for USDC) ───
 *
 *  Step 1: User gives back S YES shares.
 *  Step 2: We need the pool to "burn" a complete set, so we swap some YES
 *          back into NO via the AMM, then redeem (Y, Y) of the complete
 *          set for Y USDC. The user's USDC out = the largest Y such that:
 *              (yesR + S - Y) * (noR - Y) = yesR * noR
 *          Solving the quadratic:
 *              Y² - (yesR + noR + S)*Y + S*noR = 0
 *              Y = [(yesR + noR + S) - sqrt((yesR + noR + S)² - 4*S*noR)] / 2
 *
 *  Pool ends at: (yesR + S - Y, noR - Y)
 *
 *  This is symmetric for selling NO (swap the variables).
 *
 * ─────────────────────────────────────────────────────────────────
 *  RESOLUTION
 * ─────────────────────────────────────────────────────────────────
 *
 *  After endsAt, a curator calls resolve(YES | NO | INVALID).
 *  - YES wins → each YES share = 1 USDC, NO worthless
 *  - NO wins  → each NO share = 1 USDC, YES worthless
 *  - INVALID  → pro-rata refund based on AMM reserves at resolution
 *
 * ─────────────────────────────────────────────────────────────────
 *  SECURITY
 * ─────────────────────────────────────────────────────────────────
 *
 *  - Checks-effects-interactions: state updates BEFORE external calls
 *  - Admin-only resolution via factory
 *  - Trading impossible after endsAt or after resolution
 *  - Slippage protection on every trade
 */
contract PredictionMarket {
    // ============ CONSTANTS ============

    /// @notice Trading fee in basis points. 200 = 2%
    uint256 public constant FEE_BPS = 200;
    uint256 public constant FEE_DENOMINATOR = 10_000;

    /// @notice Minimum initial liquidity required (in USDC, 6 decimals)
    uint256 public constant MIN_INITIAL_LIQUIDITY = 100 * 10**6; // $100

    // ============ ENUMS ============

    enum Side { YES, NO }
    enum Status { OPEN, RESOLVED_YES, RESOLVED_NO, RESOLVED_INVALID }

    // ============ IMMUTABLE STATE ============

    address public immutable factory;
    IERC20 public immutable usdc;
    string public question;
    string public resolutionCriteria;
    string public category;
    uint256 public immutable endsAt;
    uint256 public immutable createdAt;

    // ============ MUTABLE STATE ============

    Status public status;
    uint256 public yesReserve;
    uint256 public noReserve;
    uint256 public yesSharesOutstanding;
    uint256 public noSharesOutstanding;
    mapping(address => mapping(Side => uint256)) public shares;
    uint256 public accumulatedFees;

    // ============ EVENTS ============

    event Trade(
        address indexed user,
        Side side,
        bool isBuy,
        uint256 usdcAmount,
        uint256 sharesAmount,
        uint256 newYesPrice
    );
    event Resolved(Status indexed result, uint256 timestamp);
    event Claimed(address indexed user, uint256 sharesRedeemed, uint256 usdcPayout);

    // ============ ERRORS ============

    error OnlyFactory();
    error MarketClosed();
    error MarketNotResolved();
    error MarketAlreadyResolved();
    error TradingEnded();
    error TradingNotEnded();
    error InsufficientShares();
    error ZeroAmount();
    error SlippageExceeded();
    error InvalidStatus();

    // ============ MODIFIERS ============

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    modifier whileOpen() {
        if (status != Status.OPEN) revert MarketClosed();
        if (block.timestamp >= endsAt) revert TradingEnded();
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _factory,
        address _usdc,
        string memory _question,
        string memory _resolutionCriteria,
        string memory _category,
        uint256 _endsAt,
        uint256 _initialLiquidity
    ) {
        require(_endsAt > block.timestamp, "End must be in future");
        require(_initialLiquidity >= MIN_INITIAL_LIQUIDITY, "Insufficient initial liquidity");

        factory = _factory;
        usdc = IERC20(_usdc);
        question = _question;
        resolutionCriteria = _resolutionCriteria;
        category = _category;
        endsAt = _endsAt;
        createdAt = block.timestamp;
        status = Status.OPEN;

        // Seed the AMM with equal YES and NO reserves.
        // The factory transfers the seed USDC to us right after construction;
        // we record reserves here. P(YES) starts at 50%.
        yesReserve = _initialLiquidity;
        noReserve = _initialLiquidity;
    }

    // ============ PUBLIC VIEWS ============

    /// @notice Current implied probability of YES, in basis points (0-10000)
    function getYesPrice() public view returns (uint256) {
        return (noReserve * FEE_DENOMINATOR) / (yesReserve + noReserve);
    }

    /**
     * @notice Quote how many shares a user would receive for `usdcAmount` USDC.
     *
     * Math:
     *  amountAfterFee = usdcAmount * (1 - feeBps)
     *  Buying YES: shares = X * (yesR + noR + X) / (noR + X)
     *      where X = amountAfterFee, (yesR, noR) = current reserves
     *  Buying NO: shares = X * (yesR + noR + X) / (yesR + X)  (symmetric)
     */
    function quoteBuy(Side side, uint256 usdcAmount) public view returns (uint256 sharesOut) {
        if (usdcAmount == 0) return 0;

        uint256 fee = (usdcAmount * FEE_BPS) / FEE_DENOMINATOR;
        uint256 X = usdcAmount - fee;

        uint256 yesR = yesReserve;
        uint256 noR = noReserve;

        if (side == Side.YES) {
            // sharesOut = X * (yesR + noR + X) / (noR + X)
            sharesOut = (X * (yesR + noR + X)) / (noR + X);
        } else {
            // sharesOut = X * (yesR + noR + X) / (yesR + X)
            sharesOut = (X * (yesR + noR + X)) / (yesR + X);
        }
    }

    /**
     * @notice Quote how many USDC a user would receive for selling `shareAmount` shares.
     *
     * Math (selling YES):
     *  We solve for Y in (yesR + S - Y)(noR - Y) = yesR*noR
     *  Y² - (yesR + noR + S)Y + S*noR = 0
     *  Y = [(yesR + noR + S) - sqrt((yesR + noR + S)² - 4*S*noR)] / 2
     *
     *  Then deduct fee: usdcOut = Y * (1 - feeBps)
     */
    function quoteSell(Side side, uint256 shareAmount) public view returns (uint256 usdcOut) {
        if (shareAmount == 0) return 0;

        uint256 yesR = yesReserve;
        uint256 noR = noReserve;
        uint256 S = shareAmount;

        uint256 b; // (yesR + noR + S)
        uint256 fourAC; // 4 * S * <opposite reserve>

        if (side == Side.YES) {
            b = yesR + noR + S;
            fourAC = 4 * S * noR;
        } else {
            b = yesR + noR + S;
            fourAC = 4 * S * yesR;
        }

        // Discriminant = b² - 4*S*<opp>
        // For valid trades discriminant should be > 0 since b > 2*sqrt(S*<opp>)
        // (Selling more than the opposite reserve isn't allowed — see require below)
        uint256 disc = b * b - fourAC;
        uint256 sqrtDisc = _sqrt(disc);

        // Y is the smaller root (selling can never give more than (b/2))
        uint256 Y = (b - sqrtDisc) / 2;

        // Sanity: cannot withdraw more than the opposite reserve
        uint256 oppReserve = side == Side.YES ? noR : yesR;
        require(Y < oppReserve, "Trade too large");

        // Apply fee
        uint256 fee = (Y * FEE_BPS) / FEE_DENOMINATOR;
        usdcOut = Y - fee;
    }

    // ============ TRADING ============

    function buy(Side side, uint256 usdcAmount, uint256 minSharesOut)
        external
        whileOpen
        returns (uint256 sharesOut)
    {
        if (usdcAmount == 0) revert ZeroAmount();

        sharesOut = quoteBuy(side, usdcAmount);
        if (sharesOut < minSharesOut) revert SlippageExceeded();

        // Pull USDC from user
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transferFrom failed");

        // Track fee
        uint256 fee = (usdcAmount * FEE_BPS) / FEE_DENOMINATOR;
        accumulatedFees += fee;
        uint256 X = usdcAmount - fee;

        // Update reserves: complete-set mint + swap
        // For BUY YES: pool ends at (yesR*noR/(noR+X), noR+X)
        // For BUY NO:  pool ends at (yesR+X, yesR*noR/(yesR+X))
        if (side == Side.YES) {
            uint256 newNo = noReserve + X;
            uint256 newYes = (yesReserve * noReserve) / newNo;
            yesReserve = newYes;
            noReserve = newNo;
        } else {
            uint256 newYes = yesReserve + X;
            uint256 newNo = (yesReserve * noReserve) / newYes;
            yesReserve = newYes;
            noReserve = newNo;
        }

        shares[msg.sender][side] += sharesOut;
        if (side == Side.YES) {
            yesSharesOutstanding += sharesOut;
        } else {
            noSharesOutstanding += sharesOut;
        }

        emit Trade(msg.sender, side, true, usdcAmount, sharesOut, getYesPrice());
    }

    function sell(Side side, uint256 shareAmount, uint256 minUsdcOut)
        external
        whileOpen
        returns (uint256 usdcOut)
    {
        if (shareAmount == 0) revert ZeroAmount();
        if (shares[msg.sender][side] < shareAmount) revert InsufficientShares();

        usdcOut = quoteSell(side, shareAmount);
        if (usdcOut < minUsdcOut) revert SlippageExceeded();

        // Compute Y (the pre-fee USDC amount + how reserves shift) — recompute
        uint256 yesR = yesReserve;
        uint256 noR = noReserve;
        uint256 S = shareAmount;
        uint256 b = yesR + noR + S;
        uint256 fourAC = side == Side.YES ? 4 * S * noR : 4 * S * yesR;
        uint256 sqrtDisc = _sqrt(b * b - fourAC);
        uint256 Y = (b - sqrtDisc) / 2;

        uint256 fee = (Y * FEE_BPS) / FEE_DENOMINATOR;
        accumulatedFees += fee;

        // State update BEFORE transfer
        shares[msg.sender][side] -= shareAmount;

        if (side == Side.YES) {
            yesSharesOutstanding -= shareAmount;
            // Pool: (yesR + S - Y, noR - Y)
            yesReserve = yesR + S - Y;
            noReserve = noR - Y;
        } else {
            noSharesOutstanding -= shareAmount;
            yesReserve = yesR - Y;
            noReserve = noR + S - Y;
        }

        require(usdc.transfer(msg.sender, usdcOut), "USDC transfer failed");

        emit Trade(msg.sender, side, false, usdcOut, shareAmount, getYesPrice());
    }

    // ============ RESOLUTION ============

    function resolve(Status result) external onlyFactory {
        if (status != Status.OPEN) revert MarketAlreadyResolved();
        if (block.timestamp < endsAt) revert TradingNotEnded();
        if (
            result != Status.RESOLVED_YES &&
            result != Status.RESOLVED_NO &&
            result != Status.RESOLVED_INVALID
        ) revert InvalidStatus();

        status = result;
        emit Resolved(result, block.timestamp);
    }

    function claim() external returns (uint256 usdcPayout) {
        if (status == Status.OPEN) revert MarketNotResolved();

        uint256 userYes = shares[msg.sender][Side.YES];
        uint256 userNo = shares[msg.sender][Side.NO];

        if (userYes == 0 && userNo == 0) return 0;

        // Reset balances first (CEI)
        shares[msg.sender][Side.YES] = 0;
        shares[msg.sender][Side.NO] = 0;

        if (status == Status.RESOLVED_YES) {
            usdcPayout = userYes;
            yesSharesOutstanding -= userYes;
        } else if (status == Status.RESOLVED_NO) {
            usdcPayout = userNo;
            noSharesOutstanding -= userNo;
        } else {
            // INVALID: pro-rata based on final reserves
            uint256 totalReserves = yesReserve + noReserve;
            if (totalReserves > 0) {
                uint256 yesPayout = (userYes * yesReserve) / totalReserves;
                uint256 noPayout = (userNo * noReserve) / totalReserves;
                usdcPayout = yesPayout + noPayout;
            }
            yesSharesOutstanding -= userYes;
            noSharesOutstanding -= userNo;
        }

        if (usdcPayout > 0) {
            require(usdc.transfer(msg.sender, usdcPayout), "USDC transfer failed");
        }

        emit Claimed(msg.sender, userYes + userNo, usdcPayout);
    }

    // ============ ADMIN ============

    function withdrawFees(address to) external onlyFactory returns (uint256 amount) {
        amount = accumulatedFees;
        accumulatedFees = 0;
        if (amount > 0) {
            require(usdc.transfer(to, amount), "USDC transfer failed");
        }
    }

    // ============ INTERNAL ============

    /// @dev Babylonian sqrt — same as OpenZeppelin's, for use in sell quadratic
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
