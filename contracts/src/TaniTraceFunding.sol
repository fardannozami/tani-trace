// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TaniTraceFunding is ReentrancyGuard {
    enum CampaignStatus { FUNDING, ACTIVE, FAILED, COMPLETED }
    enum RequestStatus { PENDING, APPROVED, REJECTED, EXPIRED, PAID }
    uint256 public constant VOTING_PERIOD = 1 days;
    uint256 public constant QUORUM_BPS = 5_000;
    IERC20 public immutable token;
    uint256 public campaignCount;
    uint256 public requestCount;

    struct Campaign { address farmer; string title; string crop; string location; string plan; uint256 targetAmount; uint256 totalRaised; uint256 releasedTotal; uint64 fundingDeadline; CampaignStatus status; address[] contributors; }
    struct Request { uint256 campaignId; address farmer; uint256 amount; string purpose; string evidenceCid; bytes32 manifestHash; uint64 requestedAt; uint64 votingDeadline; uint256 yesWeight; uint256 noWeight; RequestStatus status; }
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Request) public requests;
    mapping(uint256 => mapping(address => uint256)) public contributionOf;
    mapping(uint256 => mapping(address => bool)) public voted;
    mapping(uint256 => mapping(address => bool)) public refunded;
    mapping(uint256 => uint256[]) public campaignRequestIds;

    event CampaignCreated(uint256 indexed campaignId, address indexed farmer, string title, uint256 targetAmount, uint256 fundingDeadline);
    event ContributionMade(uint256 indexed campaignId, address indexed contributor, uint256 amount, uint256 totalRaised);
    event CampaignActivated(uint256 indexed campaignId, uint256 totalRaised, uint256 activatedAt);
    event CampaignFailed(uint256 indexed campaignId);
    event DisbursementRequested(uint256 indexed requestId, uint256 indexed campaignId, address farmer, uint256 amount, string evidenceCid, bytes32 manifestHash, uint256 votingDeadline);
    event VoteCast(uint256 indexed requestId, uint256 indexed campaignId, address voter, bool support, uint256 weight);
    event RequestFinalized(uint256 indexed requestId, uint256 indexed campaignId, RequestStatus status, uint256 yesWeight, uint256 noWeight);
    event DisbursementPaid(uint256 indexed requestId, uint256 indexed campaignId, address farmer, uint256 amount);
    event RefundClaimed(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event CampaignCompleted(uint256 indexed campaignId, address indexed farmer, uint256 releasedTotal);

    error InvalidStatus(); error InvalidAmount(); error DeadlinePassed(); error NotFarmer(); error NotContributor(); error AlreadyVoted(); error VotingStillOpen(); error EscrowShortfall();
    constructor(IERC20 token_) { token = token_; }

    function createCampaign(string calldata title, string calldata crop, string calldata location, string calldata plan, uint256 targetAmount, uint64 fundingDeadline) external returns (uint256 id) {
        if (targetAmount == 0 || fundingDeadline <= block.timestamp) revert InvalidAmount();
        id = ++campaignCount;
        Campaign storage c = campaigns[id]; c.farmer = msg.sender; c.title = title; c.crop = crop; c.location = location; c.plan = plan; c.targetAmount = targetAmount; c.fundingDeadline = fundingDeadline; c.status = CampaignStatus.FUNDING;
        emit CampaignCreated(id, msg.sender, title, targetAmount, fundingDeadline);
    }
    function contribute(uint256 id, uint256 amount) external nonReentrant {
        Campaign storage c = campaigns[id]; if (c.status != CampaignStatus.FUNDING || block.timestamp > c.fundingDeadline || amount == 0) revert InvalidStatus();
        uint256 remaining = c.targetAmount - c.totalRaised; if (amount > remaining) revert InvalidAmount();
        if (contributionOf[id][msg.sender] == 0) c.contributors.push(msg.sender);
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed"); contributionOf[id][msg.sender] += amount; c.totalRaised += amount;
        emit ContributionMade(id, msg.sender, amount, c.totalRaised);
        if (c.totalRaised == c.targetAmount) { c.status = CampaignStatus.ACTIVE; emit CampaignActivated(id, c.totalRaised, block.timestamp); }
    }
    function finalizeCampaign(uint256 id) external { Campaign storage c = campaigns[id]; if (c.status != CampaignStatus.FUNDING || block.timestamp <= c.fundingDeadline) revert InvalidStatus(); c.status = CampaignStatus.FAILED; emit CampaignFailed(id); }
    function requestDisbursement(uint256 id, uint256 amount, string calldata purpose, string calldata evidenceCid) external returns (uint256 requestId) {
        Campaign storage c = campaigns[id]; if (c.status != CampaignStatus.ACTIVE || msg.sender != c.farmer || amount == 0 || amount > c.totalRaised - c.releasedTotal) revert InvalidStatus();
        requestId = ++requestCount; bytes32 domain = keccak256("TaniTrace.DisbursementManifest.v1"); uint64 now_ = uint64(block.timestamp);
        bytes32 manifest = keccak256(abi.encode(domain, id, requestId, msg.sender, amount, purpose, evidenceCid, now_));
        requests[requestId] = Request(id, msg.sender, amount, purpose, evidenceCid, manifest, now_, now_ + uint64(VOTING_PERIOD), 0, 0, RequestStatus.PENDING); campaignRequestIds[id].push(requestId);
        emit DisbursementRequested(requestId, id, msg.sender, amount, evidenceCid, manifest, now_ + VOTING_PERIOD);
    }
    function vote(uint256 requestId, bool support) external { Request storage r = requests[requestId]; uint256 weight = contributionOf[r.campaignId][msg.sender]; if (weight == 0) revert NotContributor(); if (r.status != RequestStatus.PENDING || block.timestamp > r.votingDeadline) revert InvalidStatus(); if (voted[requestId][msg.sender]) revert AlreadyVoted(); voted[requestId][msg.sender] = true; if (support) r.yesWeight += weight; else r.noWeight += weight; emit VoteCast(requestId, r.campaignId, msg.sender, support, weight); }
    function finalizeRequest(uint256 requestId) external { Request storage r = requests[requestId]; if (r.status != RequestStatus.PENDING || block.timestamp <= r.votingDeadline) revert VotingStillOpen(); Campaign storage c = campaigns[r.campaignId]; uint256 quorum = (c.totalRaised * QUORUM_BPS + 9999) / 10000; uint256 votedWeight = r.yesWeight + r.noWeight; r.status = votedWeight < quorum ? RequestStatus.EXPIRED : (r.yesWeight > r.noWeight ? RequestStatus.APPROVED : RequestStatus.REJECTED); emit RequestFinalized(requestId, r.campaignId, r.status, r.yesWeight, r.noWeight); }
    function payDisbursement(uint256 requestId) external nonReentrant { Request storage r = requests[requestId]; if (r.status != RequestStatus.APPROVED || msg.sender != r.farmer) revert InvalidStatus(); Campaign storage c = campaigns[r.campaignId]; if (r.amount > c.totalRaised - c.releasedTotal) revert EscrowShortfall(); r.status = RequestStatus.PAID; c.releasedTotal += r.amount; require(token.transfer(r.farmer, r.amount), "transfer failed"); emit DisbursementPaid(requestId, r.campaignId, r.farmer, r.amount); }
    function claimRefund(uint256 id) external nonReentrant { Campaign storage c = campaigns[id]; if (c.status == CampaignStatus.FUNDING && block.timestamp > c.fundingDeadline) { c.status = CampaignStatus.FAILED; emit CampaignFailed(id); } if (c.status != CampaignStatus.FAILED || refunded[id][msg.sender]) revert InvalidStatus(); uint256 amount = contributionOf[id][msg.sender]; if (amount == 0) revert NotContributor(); refunded[id][msg.sender] = true; c.releasedTotal += amount; require(token.transfer(msg.sender, amount), "transfer failed"); emit RefundClaimed(id, msg.sender, amount); }
    function completeCampaign(uint256 id) external { Campaign storage c = campaigns[id]; if (c.status != CampaignStatus.ACTIVE || c.farmer != msg.sender) revert InvalidStatus(); c.status = CampaignStatus.COMPLETED; emit CampaignCompleted(id, msg.sender, c.releasedTotal); }
    function getCampaignContributors(uint256 id) external view returns (address[] memory) { return campaigns[id].contributors; }
    function getCampaignRequestIds(uint256 id) external view returns (uint256[] memory) { return campaignRequestIds[id]; }
}
