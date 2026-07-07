// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VNPAnchor {
    bytes32[] public merkleRoots;
    mapping(bytes32 => AnchorMetadata) public anchors;
    address public vnp_issuer;
    address public owner;
    bool public paused = false;
    
    struct AnchorMetadata {
        uint256 blockNumber;
        uint256 timestamp;
        uint256 measurementCount;
        string ipfsHash;
    }
    
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
    
    constructor(address _vnp_issuer) {
        require(_vnp_issuer != address(0), "Invalid issuer");
        vnp_issuer = _vnp_issuer;
        owner = msg.sender;
    }
    
    function anchorMeasurements(
        bytes32 _merkleRoot,
        uint256 _measurementCount,
        string calldata _ipfsHash
    ) external onlyIssuer whenNotPaused returns (uint256) {
        require(_merkleRoot != bytes32(0), "Invalid merkle root");
        require(_measurementCount > 0, "Invalid measurement count");
        
        merkleRoots.push(_merkleRoot);
        uint256 index = merkleRoots.length - 1;
        
        anchors[_merkleRoot] = AnchorMetadata({
            blockNumber: block.number,
            timestamp: block.timestamp,
            measurementCount: _measurementCount,
            ipfsHash: _ipfsHash
        });
        
        emit AnchorPublished(
            index,
            _merkleRoot,
            block.number,
            block.timestamp,
            _measurementCount
        );
        
        return index;
    }
    
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
    
    function getAnchorCount() external view returns (uint256) {
        return merkleRoots.length;
    }
    
    function getAnchorByIndex(uint256 index)
        external
        view
        returns (bytes32 merkleRoot, AnchorMetadata memory metadata)
    {
        require(index < merkleRoots.length, "Invalid index");
        bytes32 root = merkleRoots[index];
        return (root, anchors[root]);
    }
    
    function getAnchorMetadata(bytes32 merkleRoot)
        external
        view
        returns (AnchorMetadata memory)
    {
        return anchors[merkleRoot];
    }
    
    function isAnchored(bytes32 merkleRoot) external view returns (bool) {
        return anchors[merkleRoot].blockNumber > 0;
    }
    
    function setIssuer(address _newIssuer)
        external
        onlyOwner
    {
        require(_newIssuer != address(0), "Invalid issuer");
        address oldIssuer = vnp_issuer;
        vnp_issuer = _newIssuer;
        emit IssuerUpdated(oldIssuer, _newIssuer);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit ContractPaused(_paused);
    }
    
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
    
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
    
    function estimateAnchorGas(bytes32 _merkleRoot, string calldata _ipfsHash)
        external
        pure
        returns (uint256)
    {
        return 50000;
    }
}
