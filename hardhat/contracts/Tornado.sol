// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./NaiveIncrementalMerkleTree.sol";

contract Tornado {
    using NaiveIncrementalMerkleTree for NaiveIncrementalMerkleTree.TreeData;

    uint256 public constant TREE_DEPTH = 10;

    NaiveIncrementalMerkleTree.TreeData private treeData;

    // IVerifier public verifier;
    mapping(bytes32 => bool) public isKnownRoot;
    mapping(bytes32 => bool) public spentNullifiers;

    event Deposit(
        address indexed from,
        bytes32 indexed commitment,
        bytes32 indexed newRoot,
        uint256 amount
    );
    event Withdraw(address indexed to, bytes32 indexed nullifier, bytes32 indexed root);


    constructor() {
        treeData.init(TREE_DEPTH);
        // verifier = IVerifier(_verifeir)
        isKnownRoot[bytes32(0)] = true;
    }

    /**
     * @dev ユーザーがETHを送付し、Merkleツリーに葉(=commitment)を追加する
     * @param commitment hash(secret, nullifier) 等を想定
     */
    function deposit(bytes32 commitment) external payable {
        require(msg.value > 0, "No ETH sent");

        bytes32 newRoot = treeData.insertLeaf(commitment);
        isKnownRoot[newRoot] = true;

        emit Deposit(msg.sender, commitment, newRoot, msg.value);
    }

    function withdraw(
        bytes32 root,
        bytes32 nullifierHash,
        address payable recipient
    ) external{
        require(isKnownRoot[root],"Unknown or invalid root");
        require(!spentNullifiers[nullifierHash],"Nullifier has been spent");
        // bool valid = verifier.verifyProoof(proof, root, nullifierHash, recipient);
        // require(valid,"Invalid proof");

        spentNullifiers[nullifierHash] = true;
        require(address(this).balance >= 1 ether,"Not enough balance");

        (bool success, ) = recipient.call{value: 1 ether}("");
        require(success, "ETH transfer failed");

        emit Withdraw(recipient, nullifierHash, root);
    }

    function getNumberOfLeaves() external view returns (uint256) {
        return treeData.leaves.length;
    }

    function getAllLeaves() external view returns (bytes32[] memory) {
        return treeData.leaves;
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
