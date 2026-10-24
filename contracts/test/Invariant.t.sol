// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {TANIToken} from "../src/TANIToken.sol";
import {TaniTraceFunding} from "../src/TaniTraceFunding.sol";

contract Handler is Test {
    TANIToken token;
    TaniTraceFunding funding;
    address public farmer;
    address alice = address(0xA1);
    address bob = address(0xB2);
    uint256 public campaignId;

    constructor(TANIToken t, TaniTraceFunding f) {
        token = t; funding = f;
        farmer = msg.sender;
        campaignId = f.createCampaign("t","c","l","p",100 ether, uint64(block.timestamp+10 days));
    }

    function contributeAlice(uint256 amt) public {
        amt = bound(amt, 1, 50 ether);
        vm.prank(alice);
        try funding.contribute(campaignId, amt) {} catch {}
    }
    function contributeBob(uint256 amt) public {
        amt = bound(amt, 1, 50 ether);
        vm.prank(bob);
        try funding.contribute(campaignId, amt) {} catch {}
    }
    function finalizeCampaign() public {
        vm.warp(block.timestamp + 11 days);
        try funding.finalizeCampaign(campaignId) {} catch {}
    }
    function request(uint256 amt) public {
        amt = bound(amt, 1, 100 ether);
        vm.prank(farmer);
        try funding.requestDisbursement(campaignId, amt, "p", "c") {} catch {}
    }
    function voteAlice(bool s) public {
        vm.prank(alice);
        uint256 rid = funding.requestCount();
        if (rid == 0) return;
        try funding.vote(rid, s) {} catch {}
    }
    function voteBob(bool s) public {
        vm.prank(bob);
        uint256 rid = funding.requestCount();
        if (rid == 0) return;
        try funding.vote(rid, s) {} catch {}
    }
    function finalizeRequest() public {
        vm.warp(block.timestamp + 2 days);
        uint256 rid = funding.requestCount();
        if (rid == 0) return;
        try funding.finalizeRequest(rid) {} catch {}
    }
    function pay() public {
        vm.prank(farmer);
        uint256 rid = funding.requestCount();
        if (rid == 0) return;
        try funding.payDisbursement(rid) {} catch {}
    }
    function refundAlice() public {
        vm.prank(alice);
        try funding.claimRefund(campaignId) {} catch {}
    }
    function refundBob() public {
        vm.prank(bob);
        try funding.claimRefund(campaignId) {} catch {}
    }
    function complete() public {
        vm.prank(farmer);
        try funding.completeCampaign(campaignId) {} catch {}
    }
}

contract InvariantTest is StdInvariant, Test {
    TANIToken token;
    TaniTraceFunding funding;
    Handler handler;

    function setUp() public {
        token = new TANIToken();
        funding = new TaniTraceFunding(token);
        handler = new Handler(token, funding);
        address alice = address(0xA1);
        address bob = address(0xB2);
        token.transfer(alice, 100 ether);
        token.transfer(bob, 100 ether);
        vm.prank(alice); token.approve(address(funding), type(uint256).max);
        vm.prank(bob); token.approve(address(funding), type(uint256).max);
        targetContract(address(handler));
    }

    function invariant_escrow() public view {
        uint256 bal = token.balanceOf(address(funding));
        uint256 avail = funding.availableEscrow(handler.campaignId());
        assertGe(bal, avail);
    }

    function invariant_releasedLeTotal() public view {
        TaniTraceFunding.Campaign memory c = _camp();
        assertLe(c.releasedTotal, c.totalRaised);
    }

    function _camp() internal view returns (TaniTraceFunding.Campaign memory c) {
        (c,,) = funding.getCampaign(handler.campaignId());
    }
}
