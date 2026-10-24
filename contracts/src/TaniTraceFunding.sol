// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TaniTraceFunding is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum CampaignStatus { FUNDING, ACTIVE, FAILED, COMPLETED }
    enum RequestStatus { PENDING, APPROVED, REJECTED, EXPIRED, PAID }

    uint256 public constant VOTING_PERIOD = 1 days;
    uint256 public constant QUORUM_BPS = 5_000;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_TITLE_LENGTH = 96;
    uint256 public constant MAX_CROP_TYPE_LENGTH = 48;
    uint256 public constant MAX_LOCATION_LENGTH = 120;
    uint256 public constant MAX_PLAN_LENGTH = 600;
    uint256 public constant MAX_PURPOSE_LENGTH = 96;
    uint256 public constant MAX_CID_LENGTH = 128;
    uint256 public constant MAX_PAGE_SIZE = 100;

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
    // Satu pengajuan aktif (pending) dan satu pengajuan APPROVED belum dibayar per campaign.
    mapping(uint256 => uint256) public pendingRequestId;
    mapping(uint256 => uint256) public approvedRequestId;

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

    error InvalidStatus();
    error InvalidAmount();
    error DeadlinePassed();
    error NotFarmer();
    error NotContributor();
    error AlreadyVoted();
    error VotingStillOpen();
    error EscrowShortfall();
    error CampaignNotFound();
    error RequestNotFound();
    error StringLengthExceeded();
    error FeeOnTransfer();

    constructor(IERC20 token_) { token = token_; }

    function createCampaign(string calldata title, string calldata crop, string calldata location, string calldata plan, uint256 targetAmount, uint64 fundingDeadline) external returns (uint256 id) {
        if (targetAmount == 0 || fundingDeadline <= block.timestamp) revert InvalidAmount();
        if (bytes(title).length > MAX_TITLE_LENGTH ||
            bytes(crop).length > MAX_CROP_TYPE_LENGTH ||
            bytes(location).length > MAX_LOCATION_LENGTH ||
            bytes(plan).length > MAX_PLAN_LENGTH) revert StringLengthExceeded();
        id = ++campaignCount;
        Campaign storage c = campaigns[id];
        c.farmer = msg.sender;
        c.title = title;
        c.crop = crop;
        c.location = location;
        c.plan = plan;
        c.targetAmount = targetAmount;
        c.fundingDeadline = fundingDeadline;
        c.status = CampaignStatus.FUNDING;
        emit CampaignCreated(id, msg.sender, title, targetAmount, fundingDeadline);
    }

    function contribute(uint256 id, uint256 amount) external nonReentrant {
        Campaign storage c = campaigns[id];
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        if (c.status != CampaignStatus.FUNDING || block.timestamp > c.fundingDeadline || amount == 0) revert InvalidStatus();
        uint256 remaining = c.targetAmount - c.totalRaised;
        if (amount > remaining) revert InvalidAmount();
        if (contributionOf[id][msg.sender] == 0) c.contributors.push(msg.sender);
        uint256 beforeBal = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 afterBal = token.balanceOf(address(this));
        if (afterBal - beforeBal != amount) revert FeeOnTransfer();
        contributionOf[id][msg.sender] += amount;
        c.totalRaised += amount;
        emit ContributionMade(id, msg.sender, amount, c.totalRaised);
        if (c.totalRaised == c.targetAmount) {
            c.status = CampaignStatus.ACTIVE;
            emit CampaignActivated(id, c.totalRaised, block.timestamp);
        }
    }

    function finalizeCampaign(uint256 id) external {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        Campaign storage c = campaigns[id];
        if (c.status != CampaignStatus.FUNDING) revert InvalidStatus();
        if (block.timestamp <= c.fundingDeadline) revert InvalidStatus();
        if (c.totalRaised >= c.targetAmount) {
            c.status = CampaignStatus.ACTIVE;
            emit CampaignActivated(id, c.totalRaised, block.timestamp);
        } else {
            c.status = CampaignStatus.FAILED;
            emit CampaignFailed(id);
        }
    }

    function requestDisbursement(uint256 id, uint256 amount, string calldata purpose, string calldata evidenceCid) external returns (uint256 requestId) {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        Campaign storage c = campaigns[id];
        if (c.status != CampaignStatus.ACTIVE || msg.sender != c.farmer || amount == 0) revert InvalidStatus();
        if (amount > c.totalRaised - c.releasedTotal) revert EscrowShortfall();
        if (bytes(purpose).length > MAX_PURPOSE_LENGTH || bytes(evidenceCid).length > MAX_CID_LENGTH) revert StringLengthExceeded();
        if (pendingRequestId[id] != 0 || approvedRequestId[id] != 0) revert InvalidStatus();

        requestId = ++requestCount;
        bytes32 domain = keccak256("TaniTrace.DisbursementManifest.v1");
        uint64 now_ = uint64(block.timestamp);
        bytes32 manifest = keccak256(abi.encode(domain, id, requestId, msg.sender, amount, purpose, evidenceCid, now_));
        requests[requestId] = Request(id, msg.sender, amount, purpose, evidenceCid, manifest, now_, now_ + uint64(VOTING_PERIOD), 0, 0, RequestStatus.PENDING);
        campaignRequestIds[id].push(requestId);
        pendingRequestId[id] = requestId;
        emit DisbursementRequested(requestId, id, msg.sender, amount, evidenceCid, manifest, now_ + VOTING_PERIOD);
    }

    function vote(uint256 requestId, bool support) external {
        if (requestId == 0 || requestId > requestCount) revert RequestNotFound();
        Request storage r = requests[requestId];
        uint256 weight = contributionOf[r.campaignId][msg.sender];
        if (weight == 0) revert NotContributor();
        if (r.status != RequestStatus.PENDING || block.timestamp > r.votingDeadline) revert InvalidStatus();
        if (voted[requestId][msg.sender]) revert AlreadyVoted();
        voted[requestId][msg.sender] = true;
        if (support) r.yesWeight += weight; else r.noWeight += weight;
        emit VoteCast(requestId, r.campaignId, msg.sender, support, weight);
    }

    function finalizeRequest(uint256 requestId) external {
        if (requestId == 0 || requestId > requestCount) revert RequestNotFound();
        Request storage r = requests[requestId];
        if (r.status != RequestStatus.PENDING || block.timestamp <= r.votingDeadline) revert VotingStillOpen();
        Campaign storage c = campaigns[r.campaignId];
        uint256 quorum = (c.totalRaised * QUORUM_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        uint256 votedWeight = r.yesWeight + r.noWeight;
        if (votedWeight < quorum) {
            r.status = RequestStatus.EXPIRED;
        } else if (r.yesWeight > r.noWeight) {
            r.status = RequestStatus.APPROVED;
        } else {
            r.status = RequestStatus.REJECTED;
        }
        if (r.status == RequestStatus.APPROVED) {
            approvedRequestId[r.campaignId] = requestId;
            pendingRequestId[r.campaignId] = 0;
        } else {
            pendingRequestId[r.campaignId] = 0;
        }
        emit RequestFinalized(requestId, r.campaignId, r.status, r.yesWeight, r.noWeight);
    }

    function payDisbursement(uint256 requestId) external nonReentrant {
        if (requestId == 0 || requestId > requestCount) revert RequestNotFound();
        Request storage r = requests[requestId];
        if (r.status != RequestStatus.APPROVED || msg.sender != r.farmer) revert InvalidStatus();
        Campaign storage c = campaigns[r.campaignId];
        if (r.amount > c.totalRaised - c.releasedTotal) revert EscrowShortfall();
        r.status = RequestStatus.PAID;
        approvedRequestId[r.campaignId] = 0;
        c.releasedTotal += r.amount;
        token.safeTransfer(r.farmer, r.amount);
        emit DisbursementPaid(requestId, r.campaignId, r.farmer, r.amount);
    }

    function claimRefund(uint256 id) external nonReentrant {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        Campaign storage c = campaigns[id];
        if (c.status == CampaignStatus.FUNDING && block.timestamp > c.fundingDeadline) {
            c.status = CampaignStatus.FAILED;
            emit CampaignFailed(id);
        }
        if (c.status != CampaignStatus.FAILED || refunded[id][msg.sender]) revert InvalidStatus();
        uint256 amount = contributionOf[id][msg.sender];
        if (amount == 0) revert NotContributor();
        refunded[id][msg.sender] = true;
        c.releasedTotal += amount;
        token.safeTransfer(msg.sender, amount);
        emit RefundClaimed(id, msg.sender, amount);
    }

    function completeCampaign(uint256 id) external {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        Campaign storage c = campaigns[id];
        if (c.status != CampaignStatus.ACTIVE || c.farmer != msg.sender) revert InvalidStatus();
        if (pendingRequestId[id] != 0 || approvedRequestId[id] != 0) revert InvalidStatus();
        c.status = CampaignStatus.COMPLETED;
        emit CampaignCompleted(id, msg.sender, c.releasedTotal);
    }

    // ---------- Views ----------

    // getCampaign mengembalikan detail campaign utuh beserta contributors[] dan requestIds[] penuh.
    function getCampaign(uint256 id) external view returns (Campaign memory campaign, address[] memory contributors, uint256[] memory requestIds) {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        campaign = campaigns[id];
        contributors = campaigns[id].contributors;
        requestIds = campaignRequestIds[id];
    }

    function getRequest(uint256 id) external view returns (Request memory) {
        if (id == 0 || id > requestCount) revert RequestNotFound();
        return requests[id];
    }

    function getVote(uint256 requestId, address voter) external view returns (bool hasVoted) {
        if (requestId == 0 || requestId > requestCount) revert RequestNotFound();
        return voted[requestId][voter];
    }

    function availableEscrow(uint256 id) external view returns (uint256) {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        Campaign storage c = campaigns[id];
        return c.totalRaised - c.releasedTotal;
    }

    function computeManifestHash(uint256 campaignId, uint256 requestId, address farmer, uint256 amount, string calldata purpose, string calldata evidenceCid, uint64 requestedAt) external pure returns (bytes32) {
        bytes32 domain = keccak256("TaniTrace.DisbursementManifest.v1");
        return keccak256(abi.encode(domain, campaignId, requestId, farmer, amount, purpose, evidenceCid, requestedAt));
    }

    function getCampaignIds(uint256 offset, uint256 limit) external view returns (uint256[] memory out) {
        uint256 total = campaignCount;
        if (offset >= total) return new uint256[](0);
        uint256 lim = limit > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : limit;
        uint256 end = offset + lim;
        if (end > total) end = total;
        // campaign ids are 1..total
        uint256 len = end - offset;
        out = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            out[i] = offset + i + 1;
        }
    }

    function getContributors(uint256 id, uint256 offset, uint256 limit) external view returns (address[] memory out) {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        address[] storage arr = campaigns[id].contributors;
        uint256 total = arr.length;
        if (offset >= total) return new address[](0);
        uint256 lim = limit > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : limit;
        uint256 end = offset + lim;
        if (end > total) end = total;
        uint256 len = end - offset;
        out = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            out[i] = arr[offset + i];
        }
    }

    function getCampaignRequestIds(uint256 id, uint256 offset, uint256 limit) external view returns (uint256[] memory out) {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        uint256[] storage arr = campaignRequestIds[id];
        uint256 total = arr.length;
        if (offset >= total) return new uint256[](0);
        uint256 lim = limit > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : limit;
        uint256 end = offset + lim;
        if (end > total) end = total;
        uint256 len = end - offset;
        out = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            out[i] = arr[offset + i];
        }
    }

    // Legacy helpers (backward compatible)
    function getCampaignContributors(uint256 id) external view returns (address[] memory) {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        return campaigns[id].contributors;
    }
    function getCampaignRequestIds(uint256 id) external view returns (uint256[] memory) {
        if (id == 0 || id > campaignCount) revert CampaignNotFound();
        return campaignRequestIds[id];
    }
}