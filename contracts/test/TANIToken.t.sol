// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {TANIToken} from "../src/TANIToken.sol";

contract TANITokenTest is Test {
    TANIToken token;
    address deployer = address(0xABCD);
    address alice = address(0x1111);
    address bob = address(0x2222);

    function setUp() public {
        vm.prank(deployer);
        token = new TANIToken();
    }

    function test_InitialSupply() public view {
        assertEq(token.totalSupply(), 1_000_000 ether);
        assertEq(token.balanceOf(deployer), 1_000_000 ether);
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Tani Token");
        assertEq(token.symbol(), "TNC");
        assertEq(token.decimals(), 18);
    }

    function test_Transfer() public {
        vm.prank(deployer);
        token.transfer(alice, 500 ether);
        assertEq(token.balanceOf(alice), 500 ether);
        assertEq(token.balanceOf(deployer), (1_000_000 - 500) * 1 ether);
    }

    function test_ApproveAndTransferFrom() public {
        vm.prank(deployer);
        token.approve(alice, 1000 ether);

        vm.prank(alice);
        token.transferFrom(deployer, bob, 300 ether);

        assertEq(token.balanceOf(bob), 300 ether);
        assertEq(token.allowance(deployer, alice), 700 ether);
    }

    function testFuzz_Transfer(uint96 amount) public {
        vm.assume(amount <= 1_000_000 ether);
        vm.prank(deployer);
        token.transfer(alice, amount);
        assertEq(token.balanceOf(alice), amount);
    }
}
