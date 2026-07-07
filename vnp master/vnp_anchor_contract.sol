// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VNP Anchor Contract (Base L2)
 * 
 * Immutable, append-only registry for VNP Merkle roots.
 * 
 * Design:
 * - One entry per hour (Merkle root of that hour's measurements)
 * - Signatures required from VNP issuer (did:vnp:issuer:veklom-foundation)
 * - Gas cost: <$0.001 per anchor (Base L2 is cheap)
 * - Permanent, auditable proof of measurement integrity
 * 
 * DEPLOYMENT: npx hardhat run scripts/deploy-vnp-anchor.js --network base
 */

contract VNPAnchor {
    // ========================================================================
    // STATE
    // ========================================================================
    
    /// Append-only array of Merkle roots (one per hour)
    bytes32[] public merkleRoots;
    
    /// Metadata for each anchor
    mapping(bytes32 => AnchorMetadata) public anchors;
    
    /// VNP Foundation issuer address (multisig recommended in production)
    address public vnp_issuer;
    
    /// Owner (can update issuer address, transfer ownership)
    address public owner;
    
    /// Flag: is contract accepting new anchors
    bool public paused = false;
    
    // ========================================================================
    // STRUCTS
    // ========================================================================
    
    struct AnchorMetadata {
        uint256 blockNumber;
        uint256 timestamp;
        uint256 measurementCount;
        string ipfsHash; // raw measurements stored on IPFS
    }
    
    // ========================================================================
    // EVENTS
    // ========================================================================
    
    event AnchorPublished(
        uint256 indexed index,
        bytes32 indexed merkleRoot,
        uint256 blockNumber,
        uint256 timestamp,
        uint256 measurementCount
    );
    
    event IssuerUpdated(address indexed oldIssuer, address indexed newIssuer);
    
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    
    event ContractPaused(bool paused);
    
    // ========================================================================
    // MODIFIERS
    // ========================================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyIssuer() {
        require(msg.sender == vnp_issuer, "Only VNP issuer");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================
    
    constructor(address _vnp_issuer) {
        require(_vnp_issuer != address(0), "Invalid issuer");
        vnp_issuer = _vnp_issuer;
        owner = msg.sender;
    }
    
    // ========================================================================
    // CORE FUNCTIONS
    // ========================================================================
    
    /**
     * Publish a Merkle root (called hourly by scoring engine)
     * 
     * PARAMETERS:
     * - _merkleRoot: SHA-256 hash of all measurements collected in the hour
     * - _measurementCount: number of measurements in this batch
     * - _ipfsHash: IPFS hash of raw measurement data (for auditing)
     */
    function anchorMeasurements(
        bytes32 _merkleRoot,
        uint256 _measurementCount,
        string calldata _ipfsHash
    ) external onlyIssuer whenNotPaused returns (uint256) {
        require(_merkleRoot != bytes32(0), "Invalid merkle root");
        require(_measurementCount > 0, "Invalid measurement count");
        
        // Append to array
        merkleRoots.push(_merkleRoot);
        uint256 index = merkleRoots.length - 1;
        
        // Store metadata
        anchors[_merkleRoot] = AnchorMetadata({
            blockNumber: block.number,
            timestamp: block.timestamp,
            measurementCount: _measurementCount,
            ipfsHash: _ipfsHash
        });
        
        // Emit event
        emit AnchorPublished(
            index,
            _merkleRoot,
            block.number,
            block.timestamp,
            _measurementCount
        );
        
        return index;
    }
    
    /**
     * Get all anchors (paginated)
     * 
     * PARAMETERS:
     * - start: index to start from (0-indexed)
     * - count: number of anchors to return
     * 
     * RETURNS: array of Merkle roots
     */
    function getAnchors(uint256 start, uint256 count)
        external
        view
        returns (bytes32[] memory)
    {
        require(start < merkleRoots.length, "Invalid start index");
        
        uint256 remaining = merkleRoots.length - start;
        uint256 actual_count = count > remaining ? remaining : count;
        
        bytes32[] memory results = new bytes32[](actual_count);
        
        for (uint256 i = 0; i < actual_count; i++) {
            results[i] = merkleRoots[start + i];
        }
        
        return results;
    }
    
    /**
     * Get anchor count
     */
    function getAnchorCount() external view returns (uint256) {
        return merkleRoots.length;
    }
    
    /**
     * Get specific anchor by index
     */
    function getAnchorByIndex(uint256 index)
        external
        view
        returns (bytes32 merkleRoot, AnchorMetadata memory metadata)
    {
        require(index < merkleRoots.length, "Invalid index");
        bytes32 root = merkleRoots[index];
        return (root, anchors[root]);
    }
    
    /**
     * Get anchor metadata by Merkle root
     */
    function getAnchorMetadata(bytes32 merkleRoot)
        external
        view
        returns (AnchorMetadata memory)
    {
        return anchors[merkleRoot];
    }
    
    /**
     * Verify Merkle root was anchored
     */
    function isAnchored(bytes32 merkleRoot) external view returns (bool) {
        return anchors[merkleRoot].blockNumber > 0;
    }
    
    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================
    
    /**
     * Update VNP issuer address
     */
    function setIssuer(address _newIssuer)
        external
        onlyOwner
    {
        require(_newIssuer != address(0), "Invalid issuer");
        address oldIssuer = vnp_issuer;
        vnp_issuer = _newIssuer;
        emit IssuerUpdated(oldIssuer, _newIssuer);
    }
    
    /**
     * Pause contract (emergency stop)
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit ContractPaused(_paused);
    }
    
    /**
     * Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
    
    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
    
    /**
     * Get last N anchors
     */
    function getLatestAnchors(uint256 count)
        external
        view
        returns (bytes32[] memory)
    {
        uint256 total = merkleRoots.length;
        uint256 start = total > count ? total - count : 0;
        
        bytes32[] memory results = new bytes32[](total - start);
        
        for (uint256 i = 0; i < results.length; i++) {
            results[i] = merkleRoots[start + i];
        }
        
        return results;
    }
    
    /**
     * Estimate gas for anchoring
     * (Not on-chain; for reference only)
     */
    function estimateAnchorGas(bytes32 _merkleRoot, string calldata _ipfsHash)
        external
        pure
        returns (uint256)
    {
        // Rough estimate: ~50,000 gas for storage write + event
        // On Base L2: ~$0.001 at 0.2 gwei
        return 50000;
    }
}
