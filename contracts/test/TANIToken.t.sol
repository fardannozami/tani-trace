// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, stdStorage, StdStorage} from "forge-std/Test.sol";
import {TANIToken} from "../src/TANIToken.sol";

contract TANITokenTest is Test {
    using stdStorage for StdStorage;

    TANIToken token;
    address deployer = address(0xABCD);
    address farmer = address(0x1001);
    address investorA = address(0x2001);
    address investorB = address(0x2002);
    address straggler = address(0x9999);

    uint256 constant TARGET_AMOUNT = 1000 ether;
    uint64 fundingDeadline;

    event Claimed(address indexed account, uint256 amount);
    event CampaignCreated(uint256 indexed campaignId, address indexed farmer, string title, uint256 targetAmount, uint256 fundingDeadline);
    event ContributionMade(uint256 indexed campaignId, address indexed contributor, uint256 amount, uint256 totalRaised);
    event CampaignActivated(uint256 indexed campaignId, uint256 totalRaised, uint256 activatedAt);
    event CampaignFailed(uint256 indexed campaignId);
    event DisbursementRequested(uint256 indexed requestId, uint256 indexed campaignId, address farmer, uint256 amount, string evidenceCid, bytes32 manifestHash, uint256 votingDeadline);
    event VoteCast(uint256 indexed requestId, uint256 indexed campaignId, address voter, bool support, uint256 weight);
    event RequestFinalized(uint256 indexed requestId, uint256 indexed campaignId, TANIToken.RequestStatus status, uint256 yesWeight, uint256 noWeight);
    event DisbursementPaid(uint256 indexed requestId, uint256 indexed campaignId, address farmer, uint256 amount);
    event RefundClaimed(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event CampaignCompleted(uint256 indexed campaignId, address indexed farmer, uint256 releasedTotal);

    function setUp() public {
        vm.startPrank(deployer);
        token = new TANIToken();
        fundingDeadline = uint64(block.timestamp + 7 days);
        // Distribute some tokens to investors for testing
        token.transfer(investorA, 10_000 ether);
        token.transfer(investorB, 10_000 ether);
        vm.stopPrank();
    }

    // ==========================================
    // ERC-20 Tests
    // ==========================================
    function test_InitialSupplyAndAllocation() public view {
        assertEq(token.totalSupply(), 1_000_000 ether);
        assertEq(token.balanceOf(deployer), 800_000 ether - 20_000 ether);
        assertEq(token.balanceOf(address(token)), 200_000 ether);
        assertEq(token.faucetRemaining(), 200_000 ether);
        assertEq(token.claimAmount(), 100 ether);
        assertEq(token.totalEscrowed(), 0);
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Tani Token");
        assertEq(token.symbol(), "TNC");
        assertEq(token.decimals(), 18);
    }

    function test_Transfer() public {
        vm.prank(investorA);
        token.transfer(straggler, 500 ether);
        assertEq(token.balanceOf(straggler), 500 ether);
        assertEq(token.balanceOf(investorA), 9_500 ether);
    }

    function test_ApproveAndTransferFrom() public {
        vm.prank(investorA);
        token.approve(straggler, 1000 ether);

        vm.prank(straggler);
        token.transferFrom(investorA, investorB, 300 ether);

        assertEq(token.balanceOf(investorB), 10_300 ether);
        assertEq(token.allowance(investorA, straggler), 700 ether);
    }

    function testFuzz_Transfer(uint96 amount) public {
        vm.assume(amount <= 10_000 ether);
        vm.prank(investorA);
        token.transfer(straggler, amount);
        assertEq(token.balanceOf(straggler), amount);
    }

    // ==========================================
    // Faucet Tests
    // ==========================================
    function test_ClaimFaucetSuccess() public {
        vm.expectEmit(true, false, false, true);
        emit Claimed(straggler, 100 ether);

        vm.prank(straggler);
        token.claim();

        assertEq(token.balanceOf(straggler), 100 ether);
        assertTrue(token.claimed(straggler));
        assertEq(token.faucetRemaining(), 200_000 ether - 100 ether);
    }

    function test_ClaimFaucetAlreadyClaimed() public {
        vm.prank(straggler);
        token.claim();

        vm.prank(straggler);
        vm.expectRevert(TANIToken.AlreadyClaimed.selector);
        token.claim();
    }

    function test_ClaimFaucetWhenEmpty() public {
        stdstore.target(address(token)).sig("faucetRemaining()").checked_write(uint256(0));

        vm.prank(straggler);
        vm.expectRevert(TANIToken.FaucetEmpty.selector);
        token.claim();
    }

    // ==========================================
    // Funding Tests - Campaign Creation
    // ==========================================
    function test_CreateCampaign() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Kopi Gayo", "Kopi", "Aceh Gayo", "Pembelian bibit dan pupuk", TARGET_AMOUNT, fundingDeadline);

        assertEq(id, 1);
        assertEq(token.campaignCount(), 1);

        (
            address cFarmer,
            string memory cTitle,
            string memory cCrop,
            string memory cLoc,
            string memory cPlan,
            uint256 cTarget,
            uint256 cRaised,
            uint256 cReleased,
            uint64 cDeadline,
            TANIToken.CampaignStatus cStatus
        ) = token.campaigns(1);

        assertEq(cFarmer, farmer);
        assertEq(cTitle, "Kopi Gayo");
        assertEq(cCrop, "Kopi");
        assertEq(cLoc, "Aceh Gayo");
        assertEq(cPlan, "Pembelian bibit dan pupuk");
        assertEq(cTarget, TARGET_AMOUNT);
        assertEq(cRaised, 0);
        assertEq(cReleased, 0);
        assertEq(cDeadline, fundingDeadline);
        assertEq(uint8(cStatus), uint8(TANIToken.CampaignStatus.FUNDING));
    }

    function test_CreateCampaignStringValidation() public {
        string memory longTitle = new string(97);

        vm.prank(farmer);
        vm.expectRevert(TANIToken.StringLengthExceeded.selector);
        token.createCampaign(longTitle, "Kopi", "Aceh", "Plan", TARGET_AMOUNT, fundingDeadline);
    }

    function test_CreateCampaignZeroTargetReverts() public {
        vm.prank(farmer);
        vm.expectRevert(TANIToken.InvalidAmount.selector);
        token.createCampaign("Title", "Crop", "Loc", "Plan", 0, fundingDeadline);
    }

    function test_CreateCampaignPastDeadlineReverts() public {
        vm.prank(farmer);
        vm.expectRevert(TANIToken.InvalidAmount.selector);
        token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, uint64(block.timestamp));
    }

    // ==========================================
    // Funding Tests - Contributions & Escrow
    // ==========================================
    function test_ContributeAndActivate() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Kopi Gayo", "Kopi", "Aceh", "Plan", TARGET_AMOUNT, fundingDeadline);

        vm.prank(investorA);
        token.contribute(id, 600 ether);

        assertEq(token.contributionOf(id, investorA), 600 ether);
        assertEq(token.totalEscrowed(), 600 ether);

        vm.prank(investorB);
        token.contribute(id, 400 ether);

        (, , , , , , uint256 raised, , , TANIToken.CampaignStatus status) = token.campaigns(id);
        assertEq(raised, TARGET_AMOUNT);
        assertEq(token.totalEscrowed(), TARGET_AMOUNT);
        assertEq(uint8(status), uint8(TANIToken.CampaignStatus.ACTIVE));
    }

    function test_ContributeExceedRemainingReverts() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", 500 ether, fundingDeadline);

        vm.prank(investorA);
        vm.expectRevert(TANIToken.InvalidAmount.selector);
        token.contribute(id, 600 ether);
    }

    function test_ContributeCampaignNotFound() public {
        vm.prank(investorA);
        vm.expectRevert(TANIToken.CampaignNotFound.selector);
        token.contribute(999, 100 ether);
    }

    function test_FinalizeCampaignUnderTargetBecomesFailed() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 300 ether);

        vm.warp(fundingDeadline + 1);

        vm.expectEmit(true, false, false, true);
        emit CampaignFailed(id);

        token.finalizeCampaign(id);

        (, , , , , , , , , TANIToken.CampaignStatus status) = token.campaigns(id);
        assertEq(uint8(status), uint8(TANIToken.CampaignStatus.FAILED));
    }

    // ==========================================
    // Funding Tests - Disbursement & Voting
    // ==========================================
    function test_RequestDisbursementSuccess() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Kopi Gayo", "Kopi", "Aceh", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, TARGET_AMOUNT);

        bytes32 expectedHash = token.computeManifestHash(
            id,
            1,
            farmer,
            300 ether,
            "Beli Bibit",
            "bafytest123",
            uint64(block.timestamp)
        );

        vm.prank(farmer);
        uint256 reqId = token.requestDisbursement(id, 300 ether, "Beli Bibit", "bafytest123");

        assertEq(reqId, 1);
        assertEq(token.requestCount(), 1);

        (
            uint256 rCampaignId,
            address rFarmer,
            uint256 rAmount,
            string memory rPurpose,
            string memory rEvidenceCid,
            bytes32 rManifestHash,
            ,
            uint64 rVotingDeadline,
            uint256 rYesWeight,
            uint256 rNoWeight,
            TANIToken.RequestStatus rStatus
        ) = token.requests(1);

        assertEq(rCampaignId, id);
        assertEq(rFarmer, farmer);
        assertEq(rAmount, 300 ether);
        assertEq(rPurpose, "Beli Bibit");
        assertEq(rEvidenceCid, "bafytest123");
        assertEq(rManifestHash, expectedHash);
        assertEq(rVotingDeadline, block.timestamp + 1 days);
        assertEq(rYesWeight, 0);
        assertEq(rNoWeight, 0);
        assertEq(uint8(rStatus), uint8(TANIToken.RequestStatus.PENDING));
        assertEq(token.pendingRequestId(id), 1);
        assertEq(token.approvedRequestId(id), 0);
    }

    function test_RequestDisbursementNotFarmerReverts() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, TARGET_AMOUNT);

        vm.prank(straggler);
        vm.expectRevert(TANIToken.InvalidStatus.selector);
        token.requestDisbursement(id, 100 ether, "Purpose", "CID");
    }

    function test_RequestDisbursementExceedsEscrowReverts() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", 500 ether, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 500 ether);

        vm.prank(farmer);
        vm.expectRevert(TANIToken.EscrowShortfall.selector);
        token.requestDisbursement(id, 600 ether, "Purpose", "CID");
    }

    function test_RequestDisbursementNoDuplicatePending() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, TARGET_AMOUNT);

        vm.prank(farmer);
        token.requestDisbursement(id, 100 ether, "P1", "CID1");

        vm.prank(farmer);
        vm.expectRevert(TANIToken.InvalidStatus.selector);
        token.requestDisbursement(id, 100 ether, "P2", "CID2");
    }

    function test_VoteSuccess() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Kopi Gayo", "Kopi", "Aceh", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 600 ether);
        vm.prank(investorB);
        token.contribute(id, 400 ether);

        vm.prank(farmer);
        uint256 reqId = token.requestDisbursement(id, 300 ether, "Purpose", "CID");

        vm.prank(investorA);
        token.vote(reqId, true);

        assertTrue(token.getVote(reqId, investorA));
    }

    function test_VoteNotContributorReverts() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, TARGET_AMOUNT);

        vm.prank(farmer);
        uint256 reqId = token.requestDisbursement(id, 100 ether, "Purpose", "CID");

        vm.prank(straggler);
        vm.expectRevert(TANIToken.NotContributor.selector);
        token.vote(reqId, true);
    }

    function test_VoteDuplicateReverts() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, TARGET_AMOUNT);

        vm.prank(farmer);
        uint256 reqId = token.requestDisbursement(id, 100 ether, "Purpose", "CID");

        vm.prank(investorA);
        token.vote(reqId, true);

        vm.prank(investorA);
        vm.expectRevert(TANIToken.AlreadyVoted.selector);
        token.vote(reqId, true);
    }

    function test_FinalizeRequestApproved() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 600 ether);
        vm.prank(investorB);
        token.contribute(id, 400 ether);

        vm.prank(farmer);
        uint256 reqId = token.requestDisbursement(id, 100 ether, "Purpose", "CID");

        vm.prank(investorA);
        token.vote(reqId, true);

        vm.warp(block.timestamp + 1 days + 1);

        vm.expectEmit(true, true, false, true);
        emit RequestFinalized(reqId, id, TANIToken.RequestStatus.APPROVED, 600 ether, 0);

        token.finalizeRequest(reqId);

        (, , , , , , , , , , TANIToken.RequestStatus status) = token.requests(reqId);
        assertEq(uint8(status), uint8(TANIToken.RequestStatus.APPROVED));
        assertEq(token.approvedRequestId(id), reqId);
        assertEq(token.pendingRequestId(id), 0);
    }

    function test_FinalizeRequestExpiredQuorumNotMet() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", 1000 ether, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 400 ether);
        vm.prank(investorB);
        token.contribute(id, 600 ether);

        vm.prank(farmer);
        uint256 reqId = token.requestDisbursement(id, 100 ether, "Purpose", "CID");

        // investorA has 400 ether weight < 500 quorum
        vm.prank(investorA);
        token.vote(reqId, true);

        vm.warp(block.timestamp + 1 days + 1);

        token.finalizeRequest(reqId);

        (, , , , , , , , , , TANIToken.RequestStatus status) = token.requests(reqId);
        assertEq(uint8(status), uint8(TANIToken.RequestStatus.EXPIRED));
    }

    function test_FinalizeRequestRejected() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 600 ether);
        vm.prank(investorB);
        token.contribute(id, 400 ether);

        vm.prank(farmer);
        uint256 reqId = token.requestDisbursement(id, 100 ether, "Purpose", "CID");

        vm.prank(investorA);
        token.vote(reqId, false);

        vm.warp(block.timestamp + 1 days + 1);

        token.finalizeRequest(reqId);

        (, , , , , , , , , , TANIToken.RequestStatus status) = token.requests(reqId);
        assertEq(uint8(status), uint8(TANIToken.RequestStatus.REJECTED));
    }

    function test_PayDisbursementSuccess() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 600 ether);
        vm.prank(investorB);
        token.contribute(id, 400 ether);

        vm.prank(farmer);
        uint256 reqId = token.requestDisbursement(id, 300 ether, "Purpose", "CID");

        vm.prank(investorA);
        token.vote(reqId, true);

        vm.warp(block.timestamp + 1 days + 1);
        token.finalizeRequest(reqId);

        uint256 farmerBalBefore = token.balanceOf(farmer);

        vm.prank(farmer);
        token.payDisbursement(reqId);

        uint256 farmerBalAfter = token.balanceOf(farmer);
        assertEq(farmerBalAfter - farmerBalBefore, 300 ether);
        assertEq(token.totalEscrowed(), 700 ether);

        (, , , , , , , , , , TANIToken.RequestStatus status) = token.requests(reqId);
        assertEq(uint8(status), uint8(TANIToken.RequestStatus.PAID));
        assertEq(token.availableEscrow(id), 700 ether);
    }

    function test_PayDisbursementNotFarmerReverts() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 600 ether);
        vm.prank(investorB);
        token.contribute(id, 400 ether);

        vm.prank(farmer);
        uint256 reqId = token.requestDisbursement(id, 300 ether, "Purpose", "CID");

        vm.prank(investorA);
        token.vote(reqId, true);

        vm.warp(block.timestamp + 1 days + 1);
        token.finalizeRequest(reqId);

        vm.prank(straggler);
        vm.expectRevert(TANIToken.InvalidStatus.selector);
        token.payDisbursement(reqId);
    }

    function test_ClaimRefundSuccess() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 300 ether);

        vm.warp(fundingDeadline + 1);
        token.finalizeCampaign(id);

        uint256 invBalBefore = token.balanceOf(investorA);

        vm.prank(investorA);
        token.claimRefund(id);

        uint256 invBalAfter = token.balanceOf(investorA);
        assertEq(invBalAfter - invBalBefore, 300 ether);
        assertTrue(token.refunded(id, investorA));
        assertEq(token.totalEscrowed(), 0);
    }

    function test_ClaimRefundActiveCampaignReverts() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, 300 ether);

        vm.prank(investorA);
        vm.expectRevert(TANIToken.InvalidStatus.selector);
        token.claimRefund(id);
    }

    function test_CompleteCampaignSuccess() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, TARGET_AMOUNT);

        vm.prank(farmer);
        token.completeCampaign(id);

        (, , , , , , , , , TANIToken.CampaignStatus status) = token.campaigns(id);
        assertEq(uint8(status), uint8(TANIToken.CampaignStatus.COMPLETED));
    }

    function test_CompleteCampaignHasPendingRequestReverts() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);
        vm.prank(investorA);
        token.contribute(id, TARGET_AMOUNT);

        vm.prank(farmer);
        token.requestDisbursement(id, 100 ether, "Purpose", "CID");

        vm.prank(farmer);
        vm.expectRevert(TANIToken.InvalidStatus.selector);
        token.completeCampaign(id);
    }

    // ==========================================
    // Pagination & View Tests
    // ==========================================
    function test_PaginationCampaignIds() public {
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(farmer);
            token.createCampaign("Title", "Crop", "Loc", "Plan", 100 ether, fundingDeadline);
        }

        uint256[] memory page1 = token.getCampaignIds(0, 3);
        assertEq(page1.length, 3);
        assertEq(page1[0], 1);
        assertEq(page1[1], 2);
        assertEq(page1[2], 3);

        uint256[] memory page2 = token.getCampaignIds(3, 3);
        assertEq(page2.length, 2);
        assertEq(page2[0], 4);
        assertEq(page2[1], 5);
    }

    function test_PaginationContributors() public {
        vm.prank(farmer);
        uint256 id = token.createCampaign("Title", "Crop", "Loc", "Plan", TARGET_AMOUNT, fundingDeadline);

        vm.prank(investorA);
        token.contribute(id, 100 ether);
        vm.prank(investorB);
        token.contribute(id, 200 ether);

        address[] memory cList = token.getContributors(id, 0, 10);
        assertEq(cList.length, 2);
        assertEq(cList[0], investorA);
        assertEq(cList[1], investorB);
    }

    function test_ManifestHashConsistency() public view {
        bytes32 domain = keccak256("TaniTrace.DisbursementManifest.v1");
        bytes32 hash1 = token.computeManifestHash(1, 1, farmer, 100 ether, "Purpose", "CID", uint64(block.timestamp));
        bytes32 hash2 = keccak256(abi.encode(domain, 1, 1, farmer, 100 ether, "Purpose", "CID", block.timestamp));
        assertEq(hash1, hash2);
    }
}
