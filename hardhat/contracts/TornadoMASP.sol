// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./MerkleTree.sol";
import "./MASPVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TornadoMASP
 * @dev A Multi Asset Shielded Pool implementation of Tornado Cash
 * Supports multiple asset types (ETH and ERC20 tokens)
 */
contract TornadoMASP is Ownable {
    using MerkleTree for MerkleTree.TreeData;
    using SafeERC20 for IERC20;

    uint256 public constant TREE_DEPTH = 10;
    
    // Asset ID constants
    uint256 public constant ETH_ASSET_ID = 1;
    
    // Asset registry
    struct Asset {
        address tokenAddress; // null address for ETH
        string symbol;
        uint8 decimals;
        bool isSupported;
    }
    
    // Mapping from asset ID to asset details
    mapping(uint256 => Asset) public supportedAssets;
    
    // Mapping from asset ID to balance
    mapping(uint256 => uint256) public assetBalances;
    
    MerkleTree.TreeData private treeData;
    
    MASPVerifier public verifier;
    mapping(bytes32 => bool) public isKnownRoot;
    mapping(bytes32 => bool) public spentNullifiers;
    bytes32 public currentRoot;
    
    // Events
    event Deposit(
        address indexed from,
        bytes32 indexed commitment,
        bytes32 indexed newRoot,
        uint256 assetId,
        uint256 amount
    );
    
    event Withdrawal(
        address indexed to,
        bytes32 indexed nullifier,
        bytes32 indexed root,
        uint256 assetId,
        uint256 amount
    );
    
    event AssetAdded(
        uint256 assetId,
        address tokenAddress,
        string symbol,
        uint8 decimals
    );
    
    /**
     * @dev Constructor initializes the contract with ETH as the first asset
     * @param _verifier The address of the MASPVerifier contract
     */
    constructor(address _verifier) Ownable(msg.sender) {
        treeData.init(TREE_DEPTH);
        isKnownRoot[bytes32(0)] = true;
        currentRoot = bytes32(0);
        
        // Set the verifier contract
        verifier = MASPVerifier(_verifier);
        
        // Register ETH as the first asset
        _addAsset(ETH_ASSET_ID, address(0), "ETH", 18);
    }
    
    /**
     * @dev Add a new supported asset
     * @param assetId The ID of the asset
     * @param tokenAddress The address of the ERC20 token (address(0) for ETH)
     * @param symbol The symbol of the token
     * @param decimals The number of decimals of the token
     */
    function addAsset(
        uint256 assetId,
        address tokenAddress,
        string memory symbol,
        uint8 decimals
    ) external onlyOwner {
        _addAsset(assetId, tokenAddress, symbol, decimals);
    }
    
    /**
     * @dev Internal function to add a new supported asset
     */
    function _addAsset(
        uint256 assetId,
        address tokenAddress,
        string memory symbol,
        uint8 decimals
    ) internal {
        require(!supportedAssets[assetId].isSupported, "Asset already supported");
        supportedAssets[assetId] = Asset({
            tokenAddress: tokenAddress,
            symbol: symbol,
            decimals: decimals,
            isSupported: true
        });
        
        emit AssetAdded(assetId, tokenAddress, symbol, decimals);
    }
    
    /**
     * @dev Deposit ETH with a commitment
     * @param commitment The commitment hash
     * @param assetId The asset ID (must be ETH_ASSET_ID)
     */
    function depositEth(bytes32 commitment, uint256 assetId) external payable {
        require(msg.value > 0, "No ETH sent");
        require(assetId == ETH_ASSET_ID, "Invalid asset ID for ETH");
        require(supportedAssets[assetId].isSupported, "Asset not supported");
        
        // Update asset balance
        assetBalances[assetId] += msg.value;
        
        // Insert commitment into Merkle tree
        bytes32 newRoot = treeData.insertLeaf(commitment);
        currentRoot = newRoot;
        isKnownRoot[newRoot] = true;
        
        emit Deposit(msg.sender, commitment, newRoot, assetId, msg.value);
    }
    
    /**
     * @dev Deposit ERC20 tokens with a commitment
     * @param commitment The commitment hash
     * @param assetId The asset ID
     * @param amount The amount of tokens to deposit
     * @param tokenAddress The address of the ERC20 token
     */
    function depositERC20(
        bytes32 commitment,
        uint256 assetId,
        uint256 amount,
        address tokenAddress
    ) external {
        require(amount > 0, "Amount must be greater than 0");
        require(assetId != ETH_ASSET_ID, "Use depositEth for ETH");
        require(supportedAssets[assetId].isSupported, "Asset not supported");
        require(supportedAssets[assetId].tokenAddress == tokenAddress, "Token address mismatch");
        
        // Transfer tokens from sender to contract using SafeERC20
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update asset balance
        assetBalances[assetId] += amount;
        
        // Insert commitment into Merkle tree
        bytes32 newRoot = treeData.insertLeaf(commitment);
        currentRoot = newRoot;
        isKnownRoot[newRoot] = true;
        
        emit Deposit(msg.sender, commitment, newRoot, assetId, amount);
    }
    
    /**
     * @dev Withdraw assets
     * @param recipient The recipient address
     * @param nullifierHash The nullifier hash
     * @param root The Merkle root
     * @param assetId The asset ID
     * @param amount The amount to withdraw
     * @param proof The zero-knowledge proof data
     */
    function withdraw(
        address payable recipient,
        bytes32 nullifierHash,
        bytes32 root,
        uint256 assetId,
        uint256 amount,
        uint256[8] calldata proof
    ) external {
        require(isKnownRoot[root], "Unknown or invalid root");
        require(!spentNullifiers[nullifierHash], "Nullifier has been spent");
        require(supportedAssets[assetId].isSupported, "Asset not supported");
        require(assetBalances[assetId] >= amount, "Insufficient asset balance");
        
        // Mark nullifier as spent
        spentNullifiers[nullifierHash] = true;
        
        // Update asset balance
        assetBalances[assetId] -= amount;
        
        // Create public inputs array for the verifier
        uint256[] memory publicInputs = new uint256[](5);
        publicInputs[0] = uint256(root);
        publicInputs[1] = uint256(nullifierHash);
        publicInputs[2] = uint256(uint160(address(recipient)));
        publicInputs[3] = assetId;
        publicInputs[4] = amount;
        
        // Verify the proof
        verifier.verifyProof(proof, publicInputs);
        
        // Transfer assets to recipient
        if (assetId == ETH_ASSET_ID) {
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            address tokenAddress = supportedAssets[assetId].tokenAddress;
            IERC20(tokenAddress).safeTransfer(recipient, amount);
        }
        
        emit Withdrawal(recipient, nullifierHash, root, assetId, amount);
    }
    
    /**
     * @dev Get the number of leaves in the Merkle tree
     * @return The number of leaves
     */
    function getNumberOfLeaves() external view returns (uint256) {
        return treeData.leaves.length;
    }
    
    /**
     * @dev Get all leaves in the Merkle tree
     * @return Array of all leaves
     */
    function getAllLeaves() external view returns (bytes32[] memory) {
        return treeData.leaves;
    }
    
    /**
     * @dev Get the contract's ETH balance
     * @return The contract's ETH balance
     */
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get the current Merkle root
     * @return The current Merkle root
     */
    function getCurrentRoot() external view returns (bytes32) {
        return currentRoot;
    }
    
    /**
     * @dev Get the balance of a specific asset
     * @param assetId The asset ID
     * @return The balance of the asset
     */
    function getAssetBalance(uint256 assetId) external view returns (uint256) {
        require(supportedAssets[assetId].isSupported, "Asset not supported");
        return assetBalances[assetId];
    }
    
    /**
     * @dev Check if an asset is supported
     * @param assetId The asset ID
     * @return True if the asset is supported, false otherwise
     */
    function isAssetSupported(uint256 assetId) external view returns (bool) {
        return supportedAssets[assetId].isSupported;
    }
    
    /**
     * @dev Check if a commitment exists in the Merkle tree
     * @param commitment The commitment to check
     * @return index The index of the commitment in the tree, or type(uint256).max if not found
     * @return found True if the commitment is found, false otherwise
     */
    function findCommitmentIndex(bytes32 commitment) public view returns (uint256 index, bool found) {
        for (uint256 i = 0; i < treeData.leaves.length; i++) {
            if (treeData.leaves[i] == commitment) {
                return (i, true);
            }
        }
        return (type(uint256).max, false);
    }
    
    /**
     * @dev Get the Merkle proof for a commitment
     * @param commitment The commitment to get the proof for
     * @return siblings The sibling nodes of the Merkle path
     * @return pathIndices The path indices of the Merkle path
     */
    function getMerkleProof(bytes32 commitment) external view returns (
        bytes32[] memory siblings,
        uint8[] memory pathIndices
    ) {
        // Find the commitment in the tree
        (uint256 index, bool found) = findCommitmentIndex(commitment);
        require(found, "Commitment not found in the tree");
        
        // Initialize arrays
        siblings = new bytes32[](TREE_DEPTH);
        pathIndices = new uint8[](TREE_DEPTH);
        
        // Calculate the Merkle proof
        bytes32 currentHash = commitment;
        bytes32 left;
        bytes32 right;
        
        for (uint8 i = 0; i < TREE_DEPTH; i++) {
            uint256 neighborIndex;
            uint8 pathIndex;
            
            // Determine if we are left or right node
            if (index % 2 == 0) {
                // We are the left node
                neighborIndex = index + 1;
                pathIndex = 0;
                left = currentHash;
                
                // If we are at the edge of the tree, use zero value
                right = neighborIndex < treeData.leaves.length
                    ? treeData.leaves[neighborIndex]
                    : bytes32(0);
            } else {
                // We are the right node
                neighborIndex = index - 1;
                pathIndex = 1;
                left = treeData.leaves[neighborIndex];
                right = currentHash;
            }
            
            // Store path information
            siblings[i] = neighborIndex < treeData.leaves.length
                ? treeData.leaves[neighborIndex]
                : bytes32(0);
            pathIndices[i] = pathIndex;
            
            // Move up to the parent
            currentHash = keccak256(abi.encodePacked(left, right));
            index = index / 2;
        }
        
        return (siblings, pathIndices);
    }
    
}
