// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockUSDC
 * @notice A test-only USDC stand-in for local dev and Arc Testnet.
 *
 * IMPORTANT: This is NOT real USDC. It's only for testing.
 * On Arc Testnet you should use the real testnet USDC issued by Circle
 * once it's available. This contract exists so you can develop without
 * waiting for Circle's faucet or testnet USDC contract address.
 *
 * Anyone can mint to themselves via the public faucet() function — that's
 * intentional for testnet only. Never deploy this to mainnet.
 */
contract MockUSDC {
    string public constant name = "Mock USD Coin";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6; // USDC uses 6 decimals, NOT 18

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice Anyone can mint themselves 10,000 USDC for testing
    function faucet() external {
        uint256 amount = 10_000 * 10**decimals;
        balanceOf[msg.sender] += amount;
        totalSupply += amount;
        emit Transfer(address(0), msg.sender, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        unchecked { balanceOf[to] += amount; }
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        balanceOf[from] -= amount;
        unchecked { balanceOf[to] += amount; }
        emit Transfer(from, to, amount);
        return true;
    }
}
