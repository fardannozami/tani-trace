// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {TANIToken} from "../src/TANIToken.sol";
import {TaniTraceFunding} from "../src/TaniTraceFunding.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {FeeOnTransferToken} from "./mocks/FeeOnTransferToken.sol";

contract TaniTraceFundingTest is Test {
    TANIToken token;
    TaniTraceFunding funding;
    function _camp(uint256 id) internal view returns (TaniTraceFunding.Campaign memory c) { (c,,) = funding.getCampaign(id); }
    function _req(uint256 id) internal view returns (TaniTraceFunding.Request memory r) { r = funding.getRequest(id); }
    address farmer = address(0xF1);
    address alice = address(0xA1);
    address bob = address(0xB2);

    function setUp() public {
        token = new TANIToken();
        funding = new TaniTraceFunding(token);
        // distribute tokens
        token.transfer(alice, 10_000 ether);
        token.transfer(bob, 10_000 ether);
        token.transfer(farmer, 1_000 ether);
    }

    function _approve(address user, uint256 amount) internal {
        vm.prank(user);
        token.approve(address(funding), amount);
    }

    function _createCampaign(address f, uint256 target, uint64 deadline) internal returns (uint256) {
        vm.prank(f);
        return funding.createCampaign("title", "crop", "loc", "plan", target, deadline);
    }

    function _contribute(address user, uint256 id, uint256 amount) internal {
        vm.prank(user);
        token.approve(address(funding), amount);
        vm.prank(user);
        funding.contribute(id, amount);
    }

    // ---- createCampaign ----
    function test_createCampaign_success() public {
        uint64 dl = uint64(block.timestamp + 1 days);
        vm.prank(farmer);
        uint256 id = funding.createCampaign("t","c","l","p",100 ether, dl);
        assertEq(id, 1);
    }

    function test_createCampaign_zeroTarget_reverts() public {
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidAmount.selector);
        funding.createCampaign("t","c","l","p",0, uint64(block.timestamp+1));
    }

    function test_createCampaign_pastDeadline_reverts() public {
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidAmount.selector);
        funding.createCampaign("t","c","l","p",100 ether, uint64(block.timestamp));
    }

    function test_createCampaign_titleTooLong_reverts() public {
        string memory s = new string(97);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.StringLengthExceeded.selector);
        funding.createCampaign(s,"c","l","p",100 ether, uint64(block.timestamp+1));
    }

    function test_createCampaign_cropTooLong_reverts() public {
        string memory s = new string(49);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.StringLengthExceeded.selector);
        funding.createCampaign("t",s,"l","p",100 ether, uint64(block.timestamp+1));
    }

    function test_createCampaign_locationTooLong_reverts() public {
        string memory s = new string(121);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.StringLengthExceeded.selector);
        funding.createCampaign("t","c",s,"p",100 ether, uint64(block.timestamp+1));
    }

    function test_createCampaign_planTooLong_reverts() public {
        string memory s = new string(601);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.StringLengthExceeded.selector);
        funding.createCampaign("t","c","l",s,100 ether, uint64(block.timestamp+1));
    }

    function test_createCampaign_permissionless() public {
        vm.prank(alice);
        uint256 id = funding.createCampaign("t","c","l","p",100 ether, uint64(block.timestamp+1));
        assertEq(_camp(id).farmer, alice);
    }

    // ---- contribute ----
    function test_contribute_success() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        _contribute(alice, id, 40 ether);
        assertEq(funding.contributionOf(id, alice), 40 ether);
        assertEq(_camp(id).totalRaised, 40 ether);
    }

    function test_contribute_activatesWhenTargetReached() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        _contribute(alice, id, 60 ether);
        _contribute(bob, id, 40 ether);
        assertEq(uint256(_camp(id).status), uint256(TaniTraceFunding.CampaignStatus.ACTIVE));
    }

    function test_contribute_zeroAmount_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        vm.prank(alice);
        token.approve(address(funding), 10 ether);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.contribute(id, 0);
    }

    function test_contribute_notFunding_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        // finalize to failed by time
        vm.warp(block.timestamp + 11 days);
        funding.finalizeCampaign(id);
        vm.prank(alice);
        token.approve(address(funding), 10 ether);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.contribute(id, 10 ether);
    }

    function test_contribute_afterDeadline_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        vm.warp(block.timestamp + 2 days);
        vm.prank(alice);
        token.approve(address(funding), 10 ether);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.contribute(id, 10 ether);
    }

    function test_contribute_exceedRemaining_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        _contribute(alice, id, 60 ether);
        vm.prank(bob);
        token.approve(address(funding), 50 ether);
        vm.prank(bob);
        vm.expectRevert(TaniTraceFunding.InvalidAmount.selector);
        funding.contribute(id, 50 ether);
    }

    function test_contribute_feeOnTransfer_reverts() public {
        FeeOnTransferToken ft = new FeeOnTransferToken();
        TaniTraceFunding f2 = new TaniTraceFunding(ft);
        ft.mint(alice, 100 ether);
        vm.prank(alice);
        ft.approve(address(f2), 100 ether);
        vm.prank(farmer);
        uint256 id = f2.createCampaign("t","c","l","p",100 ether, uint64(block.timestamp+10 days));
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.FeeOnTransfer.selector);
        f2.contribute(id, 10 ether);
    }

    function test_contribute_multipleContributors() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        _contribute(alice, id, 30 ether);
        _contribute(bob, id, 20 ether);
        address[] memory contribs = funding.getContributors(id, 0, 10);
        assertEq(contribs.length, 2);
    }

    // ---- finalizeCampaign ----
    function test_finalizeCampaign_failedAfterDeadline() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        _contribute(alice, id, 40 ether);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeCampaign(id);
        assertEq(uint256(_camp(id).status), uint256(TaniTraceFunding.CampaignStatus.FAILED));
    }

    function test_finalizeCampaign_defensiveActivation() public {
        // manually impossible via contribute auto; test branch by warping? target reached auto activates, so status ACTIVE.
        // Instead test that if status FUNDING and deadline passed but target reached -> ACTIVE.
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        _contribute(alice, id, 100 ether);
        // already ACTIVE; warp and call should revert InvalidStatus
        vm.warp(block.timestamp + 2 days);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.finalizeCampaign(id);
    }

    function test_finalizeCampaign_beforeDeadline_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.finalizeCampaign(id);
    }

    function test_finalizeCampaign_nonFunding_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        vm.warp(block.timestamp + 2 days);
        funding.finalizeCampaign(id);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.finalizeCampaign(id);
    }

    // ---- requestDisbursement ----
    function _activateCampaign() internal returns (uint256 id) {
        id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        _contribute(alice, id, 60 ether);
        _contribute(bob, id, 40 ether);
    }

    function test_requestDisbursement_success() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 50 ether, "purpose", "QmCid");
        assertEq(rid, 1);
        assertEq(funding.pendingRequestId(id), rid);
    }

    function test_requestDisbursement_nonFarmer_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.requestDisbursement(id, 50 ether, "purpose", "QmCid");
    }

    function test_requestDisbursement_nonActive_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
    }

    function test_requestDisbursement_zeroAmount_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.requestDisbursement(id, 0, "purpose", "QmCid");
    }

    function test_requestDisbursement_exceedEscrow_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.EscrowShortfall.selector);
        funding.requestDisbursement(id, 200 ether, "purpose", "QmCid");
    }

    function test_requestDisbursement_purposeTooLong_reverts() public {
        uint256 id = _activateCampaign();
        string memory s = new string(97);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.StringLengthExceeded.selector);
        funding.requestDisbursement(id, 10 ether, s, "QmCid");
    }

    function test_requestDisbursement_cidTooLong_reverts() public {
        uint256 id = _activateCampaign();
        string memory s = new string(129);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.StringLengthExceeded.selector);
        funding.requestDisbursement(id, 10 ether, "purpose", s);
    }

    function test_requestDisbursement_guardPending_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.requestDisbursement(id, 10 ether, "purpose2", "QmCid2");
    }

    function test_requestDisbursement_onFailedCampaign_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        vm.warp(block.timestamp + 2 days);
        funding.finalizeCampaign(id);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
    }

    function test_requestDisbursement_onCompletedCampaign_reverts() public {
        uint256 id = _activateCampaign();
        // complete with no requests
        vm.prank(farmer);
        funding.completeCampaign(id);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
    }

    // ---- vote ----
    function test_vote_success() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        assertEq(funding.voted(rid, alice), true);
    }

    function test_vote_nonInvestor_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        address carol = address(0xC3);
        vm.prank(carol);
        vm.expectRevert(TaniTraceFunding.NotContributor.selector);
        funding.vote(rid, true);
    }

    function test_vote_double_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.AlreadyVoted.selector);
        funding.vote(rid, false);
    }

    function test_vote_afterDeadline_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.warp(block.timestamp + 41 seconds);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.vote(rid, true);
    }

    function test_votingDeadline_is40Seconds() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        (, , , , , , uint64 requestedAt, uint64 votingDeadline, , , ) = funding.requests(rid);
        assertEq(votingDeadline - requestedAt, 40 seconds);
    }

    function test_vote_nonPending_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.vote(rid, true);
    }

    // ---- finalizeRequest ----
    function test_finalizeRequest_yesMajority_approved() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        assertEq(uint256(_req(rid).status), uint256(TaniTraceFunding.RequestStatus.APPROVED));
        assertEq(funding.approvedRequestId(id), rid);
        assertEq(funding.pendingRequestId(id), 0);
    }

    function test_finalizeRequest_noMajority_rejected() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, false);
        vm.prank(bob);
        funding.vote(rid, false);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        assertEq(uint256(_req(rid).status), uint256(TaniTraceFunding.RequestStatus.REJECTED));
        assertEq(funding.pendingRequestId(id), 0);
    }

    function test_finalizeRequest_tie_rejected() public {
        // equal contributions
        // create campaign target 100 with alice and bob 50 each
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        _contribute(alice, id, 50 ether);
        _contribute(bob, id, 50 ether);
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, false);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        assertEq(uint256(_req(rid).status), uint256(TaniTraceFunding.RequestStatus.REJECTED));
    }

    function test_finalizeRequest_noVotes_expired() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        assertEq(uint256(_req(rid).status), uint256(TaniTraceFunding.RequestStatus.EXPIRED));
    }

    function test_finalizeRequest_quorumRounding() public {
        // totalRaised=100, quorum=ceil(100*5000/10000)=50
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        // alice contributes 60, need quorum 50; alice alone 60 >=50 -> approved if yes
        // but alice already contributor weight 60
        vm.prank(alice);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        assertEq(uint256(_req(rid).status), uint256(TaniTraceFunding.RequestStatus.APPROVED));
    }

    function test_finalizeRequest_beforeDeadline_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.expectRevert(TaniTraceFunding.VotingStillOpen.selector);
        funding.finalizeRequest(rid);
    }

    function test_finalizeRequest_quorumFail_expired() public {
        // bob alone votes (weight 40) < quorum 50 -> expired
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        assertEq(uint256(_req(rid).status), uint256(TaniTraceFunding.RequestStatus.EXPIRED));
    }

    // ---- payDisbursement ----
    function test_payDisbursement_success() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        uint256 before = token.balanceOf(farmer);
        vm.prank(farmer);
        funding.payDisbursement(rid);
        assertEq(token.balanceOf(farmer), before + 10 ether);
        assertEq(funding.approvedRequestId(id), 0);
        assertEq(uint256(_req(rid).status), uint256(TaniTraceFunding.RequestStatus.PAID));
    }

    function test_payDisbursement_nonFarmer_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.payDisbursement(rid);
    }

    function test_payDisbursement_notApproved_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.payDisbursement(rid);
    }

    function test_payDisbursement_twice_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        vm.prank(farmer);
        funding.payDisbursement(rid);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.payDisbursement(rid);
    }

    function test_payDisbursement_guardApprovedCleared_allowsNewRequest() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        vm.prank(farmer);
        funding.payDisbursement(rid);
        // new request allowed
        vm.prank(farmer);
        uint256 rid2 = funding.requestDisbursement(id, 5 ether, "p2", "QmCid2");
        assertEq(rid2, 2);
    }

    // ---- claimRefund ----
    function test_claimRefund_failedCampaign() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        _contribute(alice, id, 40 ether);
        vm.warp(block.timestamp + 2 days);
        // lazy transition via claimRefund
        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        funding.claimRefund(id);
        assertEq(token.balanceOf(alice), before + 40 ether);
        assertEq(funding.refunded(id, alice), true);
    }

    function test_claimRefund_lazyTransition() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        _contribute(alice, id, 40 ether);
        vm.warp(block.timestamp + 2 days);
        assertEq(uint256(_camp(id).status), uint256(TaniTraceFunding.CampaignStatus.FUNDING));
        vm.prank(alice);
        funding.claimRefund(id);
        assertEq(uint256(_camp(id).status), uint256(TaniTraceFunding.CampaignStatus.FAILED));
    }

    function test_claimRefund_double_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        _contribute(alice, id, 40 ether);
        vm.warp(block.timestamp + 2 days);
        vm.prank(alice);
        funding.claimRefund(id);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.claimRefund(id);
    }

    function test_claimRefund_successCampaign_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.claimRefund(id);
    }

    function test_claimRefund_noContribution_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        vm.warp(block.timestamp + 2 days);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.NotContributor.selector);
        funding.claimRefund(id);
    }

    // ---- completeCampaign ----
    function test_completeCampaign_success() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        funding.completeCampaign(id);
        assertEq(uint256(_camp(id).status), uint256(TaniTraceFunding.CampaignStatus.COMPLETED));
    }

    function test_completeCampaign_withPending_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.completeCampaign(id);
    }

    function test_completeCampaign_withApprovedUnpaid_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.completeCampaign(id);
    }

    function test_expireApprovedDisbursement_releasesCampaignLock() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);

        vm.expectRevert(TaniTraceFunding.PaymentStillOpen.selector);
        funding.expireApprovedDisbursement(rid);

        vm.warp(block.timestamp + funding.PAYMENT_PERIOD() + 1);
        funding.expireApprovedDisbursement(rid);
        assertEq(uint256(_req(rid).status), uint256(TaniTraceFunding.RequestStatus.EXPIRED));
        assertEq(funding.approvedRequestId(id), 0);

        vm.prank(farmer);
        funding.requestDisbursement(id, 10 ether, "purpose2", "QmCid2");
    }

    function test_completeCampaign_nonFarmer_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.completeCampaign(id);
    }

    function test_completeCampaign_nonActive_reverts() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.completeCampaign(id);
    }

    // ---- views ----
    function test_getCampaign_invalid_reverts() public {
        vm.expectRevert(TaniTraceFunding.CampaignNotFound.selector);
        funding.getCampaign(999);
    }

    function test_getCampaign_returnsFull() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        (TaniTraceFunding.Campaign memory c, address[] memory contribs, uint256[] memory reqs) = funding.getCampaign(id);
        assertEq(c.contributors.length, 2);
        assertEq(contribs.length, 2);
        assertEq(reqs.length, 1);
    }

    function test_getRequest_invalid_reverts() public {
        vm.expectRevert(TaniTraceFunding.RequestNotFound.selector);
        funding.getRequest(999);
    }

    function test_getVote_returnsBool() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        assertEq(funding.getVote(rid, alice), false);
        vm.prank(alice);
        funding.vote(rid, true);
        assertEq(funding.getVote(rid, alice), true);
    }

    function test_availableEscrow() public {
        uint256 id = _activateCampaign();
        assertEq(funding.availableEscrow(id), 100 ether);
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        vm.prank(farmer);
        funding.payDisbursement(rid);
        assertEq(funding.availableEscrow(id), 90 ether);
    }

    function test_computeManifestHash_parity() public {
        bytes32 h = funding.computeManifestHash(1, 1, farmer, 10 ether, "purpose", "QmCid", 123);
        bytes32 domain = keccak256("TaniTrace.DisbursementManifest.v1");
        bytes32 expected = keccak256(abi.encode(domain, uint256(1), uint256(1), farmer, 10 ether, "purpose", "QmCid", uint64(123)));
        assertEq(h, expected);
    }

    function test_getCampaignIds_pagination() public {
        for (uint256 i = 0; i < 5; i++) {
            _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        }
        uint256[] memory page = funding.getCampaignIds(0, 2);
        assertEq(page.length, 2);
        assertEq(page[0], 1);
        assertEq(page[1], 2);
        uint256[] memory page2 = funding.getCampaignIds(4, 10);
        assertEq(page2.length, 1);
        assertEq(page2[0], 5);
        uint256[] memory empty = funding.getCampaignIds(10, 5);
        assertEq(empty.length, 0);
    }

    function test_getCampaignIds_clamp() public {
        for (uint256 i = 0; i < 5; i++) {
            _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        }
        uint256[] memory page = funding.getCampaignIds(0, 200);
        assertEq(page.length, 5);
    }

    function test_getContributors_pagination() public {
        uint256 id = _createCampaign(farmer, 1000 ether, uint64(block.timestamp+10 days));
        for (uint256 i = 0; i < 3; i++) {
            address u = address(uint160(0x1000 + i));
            token.transfer(u, 100 ether);
            _contribute(u, id, 10 ether);
        }
        address[] memory page = funding.getContributors(id, 1, 1);
        assertEq(page.length, 1);
        uint256[] memory ids = funding.getCampaignRequestIds(id, 0, 10);
        assertEq(ids.length, 0);
    }

    function test_getCampaignRequestIds_pagination() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        funding.requestDisbursement(id, 5 ether, "p", "c");
        // finalize? need clear approved/pending: first request pending; cannot second until finalize. 
        // finalize as expired by warp
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(1);
        vm.prank(farmer);
        funding.requestDisbursement(id, 5 ether, "p2", "c2");
        uint256[] memory page = funding.getCampaignRequestIds(id, 0, 1);
        assertEq(page.length, 1);
        assertEq(page[0], 1);
        uint256[] memory all = funding.getCampaignRequestIds(id, 0, 10);
        assertEq(all.length, 2);
    }

    function test_getCampaignRequestIds_clamp() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        funding.requestDisbursement(id, 5 ether, "p", "c");
        uint256[] memory page = funding.getCampaignRequestIds(id, 0, 200);
        assertEq(page.length, 1);
    }

    // ---- events ----
    function test_events_emitted() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        vm.recordLogs();
        _contribute(alice, id, 100 ether);
        assertGt(vm.getRecordedLogs().length, 0);
    }

    // ---- fuzz ----
    function testFuzz_contribute_amount(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        // ensure alice has enough (she has 10000)
        _contribute(alice, id, amount);
        assertEq(funding.contributionOf(id, alice), amount);
    }

    function testFuzz_createCampaign_target(uint256 target) public {
        target = bound(target, 1, 1_000_000 ether);
        vm.prank(farmer);
        uint256 id = funding.createCampaign("t","c","l","p", target, uint64(block.timestamp+10 days));
        assertEq(_camp(id).targetAmount, target);
    }

    function test_createCampaign_exactMaxLengths_ok() public {
        string memory t = new string(96);
        string memory c = new string(48);
        string memory l = new string(120);
        string memory p_ = new string(600);
        vm.prank(farmer);
        uint256 id = funding.createCampaign(t,c,l,p_,100 ether, uint64(block.timestamp+1));
        assertEq(id, 1);
    }

    function test_requestDisbursement_exactMaxLengths_ok() public {
        uint256 id = _activateCampaign();
        string memory pu = new string(96);
        string memory ci = new string(128);
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, pu, ci);
        assertEq(rid, 1);
    }

    function test_requestDisbursement_guardApproved_reverts() public {
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, 10 ether, "purpose", "QmCid");
        vm.prank(alice);
        funding.vote(rid, true);
        vm.prank(bob);
        funding.vote(rid, true);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeRequest(rid);
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.InvalidStatus.selector);
        funding.requestDisbursement(id, 5 ether, "p2", "c2");
    }

    function test_contribute_invalidCampaign_reverts() public {
        vm.prank(alice);
        token.approve(address(funding), 10 ether);
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.CampaignNotFound.selector);
        funding.contribute(999, 10 ether);
    }

    function test_finalizeCampaign_invalidCampaign_reverts() public {
        vm.expectRevert(TaniTraceFunding.CampaignNotFound.selector);
        funding.finalizeCampaign(999);
    }

    function test_requestDisbursement_invalidCampaign_reverts() public {
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.CampaignNotFound.selector);
        funding.requestDisbursement(999, 10 ether, "p", "c");
    }

    function test_vote_invalidRequest_reverts() public {
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.RequestNotFound.selector);
        funding.vote(999, true);
    }

    function test_finalizeRequest_invalidRequest_reverts() public {
        vm.expectRevert(TaniTraceFunding.RequestNotFound.selector);
        funding.finalizeRequest(999);
    }

    function test_payDisbursement_invalidRequest_reverts() public {
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.RequestNotFound.selector);
        funding.payDisbursement(999);
    }

    function test_claimRefund_invalidCampaign_reverts() public {
        vm.prank(alice);
        vm.expectRevert(TaniTraceFunding.CampaignNotFound.selector);
        funding.claimRefund(999);
    }

    function test_completeCampaign_invalidCampaign_reverts() public {
        vm.prank(farmer);
        vm.expectRevert(TaniTraceFunding.CampaignNotFound.selector);
        funding.completeCampaign(999);
    }

    function test_getRequest_invalid_reverts2() public {
        vm.expectRevert(TaniTraceFunding.RequestNotFound.selector);
        funding.getRequest(0);
    }

    function test_getVote_invalid_reverts() public {
        vm.expectRevert(TaniTraceFunding.RequestNotFound.selector);
        funding.getVote(0, alice);
    }

    function test_availableEscrow_invalid_reverts() public {
        vm.expectRevert(TaniTraceFunding.CampaignNotFound.selector);
        funding.availableEscrow(0);
    }

    function test_getContributors_invalid_reverts() public {
        vm.expectRevert(TaniTraceFunding.CampaignNotFound.selector);
        funding.getContributors(0,0,10);
    }

    function test_getCampaignRequestIds_invalid_reverts() public {
        vm.expectRevert(TaniTraceFunding.CampaignNotFound.selector);
        funding.getCampaignRequestIds(0,0,10);
    }

    function test_getCampaignIds_emptyWhenOffsetBeyond() public {
        uint256[] memory page = funding.getCampaignIds(5, 10);
        assertEq(page.length, 0);
    }

    function test_getContributors_emptyWhenOffsetBeyond() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        address[] memory page = funding.getContributors(id, 5, 10);
        assertEq(page.length, 0);
    }

    function test_getCampaignRequestIds_emptyWhenOffsetBeyond() public {
        uint256 id = _activateCampaign();
        uint256[] memory page = funding.getCampaignRequestIds(id, 5, 10);
        assertEq(page.length, 0);
    }

    function test_contribute_addsContributorOnce() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        _contribute(alice, id, 10 ether);
        _contribute(alice, id, 10 ether);
        address[] memory c = funding.getContributors(id,0,10);
        assertEq(c.length, 1);
    }

    function test_refund_increasesReleasedTotal() public {
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+1 days));
        _contribute(alice, id, 40 ether);
        vm.warp(block.timestamp + 2 days);
        funding.finalizeCampaign(id);
        vm.prank(alice);
        funding.claimRefund(id);
        assertEq(funding.availableEscrow(id), 0);
    }

    function testFuzz_requestAmount(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        uint256 id = _activateCampaign();
        vm.prank(farmer);
        uint256 rid = funding.requestDisbursement(id, amount, "p", "c");
        assertEq(_req(rid).amount, amount);
    }

    function testFuzz_contribute2(uint256 amount) public {
        amount = bound(amount, 1, 50 ether);
        uint256 id = _createCampaign(farmer, 100 ether, uint64(block.timestamp+10 days));
        _contribute(alice, id, amount);
        assertEq(funding.contributionOf(id, alice), amount);
    }
}
