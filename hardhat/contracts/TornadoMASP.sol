// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./MerkleTree.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
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
    
    // IVerifier public verifier;
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
     */
    constructor() Ownable(msg.sender) {
        treeData.init(TREE_DEPTH);
        isKnownRoot[bytes32(0)] = true;
        currentRoot = bytes32(0);
        
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
     */
    function withdraw(
        address payable recipient,
        bytes32 nullifierHash,
        bytes32 root,
        uint256 assetId,
        uint256 amount
    ) external {
        require(isKnownRoot[root], "Unknown or invalid root");
        require(!spentNullifiers[nullifierHash], "Nullifier has been spent");
        require(supportedAssets[assetId].isSupported, "Asset not supported");
        require(assetBalances[assetId] >= amount, "Insufficient asset balance");
        
        // Mark nullifier as spent
        spentNullifiers[nullifierHash] = true;
        
        // Update asset balance
        assetBalances[assetId] -= amount;
        
        // bool valid = verifier.verifyProof(proof, root, nullifierHash, recipient, assetId, amount);
        // require(valid, "Invalid proof");
        
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
}
