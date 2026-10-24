// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TANIFaucet is ReentrancyGuard {
    IERC20 public immutable token;
    uint256 public immutable claimAmount;
    mapping(address => bool) public claimed;

    event Claimed(address indexed account, uint256 amount);
    error AlreadyClaimed();
    error FaucetEmpty();

    constructor(IERC20 token_, uint256 claimAmount_) {
        token = token_;
        claimAmount = claimAmount_;
    }

    function claim() external nonReentrant {
        if (claimed[msg.sender]) revert AlreadyClaimed();
        if (token.balanceOf(address(this)) < claimAmount) revert FaucetEmpty();
        claimed[msg.sender] = true;
        require(token.transfer(msg.sender, claimAmount), "transfer failed");
        emit Claimed(msg.sender, claimAmount);
    }
}
