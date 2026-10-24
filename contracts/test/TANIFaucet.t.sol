// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {TANIToken} from "../src/TANIToken.sol";
import {TANIFaucet} from "../src/TANIFaucet.sol";

contract TANIFaucetTest is Test {
    TANIToken token;
    TANIFaucet faucet;

    address deployer = address(0xABCD);
    address alice = address(0x1111);
    address bob = address(0x2222);

    uint256 constant CLAIM_AMOUNT = 100 ether;
    uint256 constant FAUCET_FUNDING = 200_000 ether;

    event Claimed(address indexed account, uint256 amount);

    function setUp() public {
        vm.startPrank(deployer);
        token = new TANIToken();
        faucet = new TANIFaucet(token, CLAIM_AMOUNT);
        token.transfer(address(faucet), FAUCET_FUNDING);
        vm.stopPrank();
    }

    function test_InitialState() public view {
        assertEq(address(faucet.token()), address(token));
        assertEq(faucet.claimAmount(), CLAIM_AMOUNT);
        assertEq(token.balanceOf(address(faucet)), FAUCET_FUNDING);
        assertFalse(faucet.claimed(alice));
    }

    function test_ClaimSuccess() public {
        vm.expectEmit(true, false, false, true);
        emit Claimed(alice, CLAIM_AMOUNT);

        vm.prank(alice);
        faucet.claim();

        assertTrue(faucet.claimed(alice));
        assertEq(token.balanceOf(alice), CLAIM_AMOUNT);
        assertEq(token.balanceOf(address(faucet)), FAUCET_FUNDING - CLAIM_AMOUNT);
    }

    function test_RevertWhen_AlreadyClaimed() public {
        vm.prank(alice);
        faucet.claim();

        vm.expectRevert(TANIFaucet.AlreadyClaimed.selector);
        vm.prank(alice);
        faucet.claim();
    }

    function test_MultipleUsersCanClaimOnce() public {
        vm.prank(alice);
        faucet.claim();

        vm.prank(bob);
        faucet.claim();

        assertEq(token.balanceOf(alice), CLAIM_AMOUNT);
        assertEq(token.balanceOf(bob), CLAIM_AMOUNT);
        assertEq(token.balanceOf(address(faucet)), FAUCET_FUNDING - (2 * CLAIM_AMOUNT));
    }

    function test_RevertWhen_FaucetEmpty() public {
        vm.prank(deployer);
        TANIFaucet emptyFaucet = new TANIFaucet(token, CLAIM_AMOUNT);

        vm.expectRevert(TANIFaucet.FaucetEmpty.selector);
        vm.prank(alice);
        emptyFaucet.claim();
    }
}
