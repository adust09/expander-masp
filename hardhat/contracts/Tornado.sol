// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./MerkleTree.sol";

contract Tornado {
    using MerkleTree for MerkleTree.TreeData;

    uint256 public constant TREE_DEPTH = 10;

    MerkleTree.TreeData private treeData;

    // IVerifier public verifier;
    mapping(bytes32 => bool) public isKnownRoot;
    mapping(bytes32 => bool) public spentNullifiers;
    bytes32 public currentRoot;

    event Deposit(
        address indexed from,
        bytes32 indexed commitment,
        bytes32 indexed newRoot,
        uint256 amount
    );
    event Withdrawal(address indexed to, bytes32 indexed nullifier, bytes32 indexed root);

    constructor() {
        treeData.init(TREE_DEPTH);
        // verifier = IVerifier(_verifeir)
        isKnownRoot[bytes32(0)] = true;
        currentRoot = bytes32(0);
    }

    function deposit(bytes32 commitment) external payable {
        require(msg.value > 0, "No ETH sent");

        bytes32 newRoot = treeData.insertLeaf(commitment);
        currentRoot = newRoot;
        isKnownRoot[newRoot] = true;

        emit Deposit(msg.sender, commitment, newRoot, msg.value);
    }

    function withdraw(
        address payable recipient,
        bytes32 nullifierHash,
        bytes32 root
    ) external payable{
        require(isKnownRoot[root],"Unknown or invalid root");
        require(!spentNullifiers[nullifierHash],"Nullifier has been spent");
        require(address(this).balance >= 1 ether,"Not enough balance");
        spentNullifiers[nullifierHash] = true;
        // bool valid = verifier.verifyProoof(proof, root, nullifierHash, recipient);
        // require(valid,"Invalid proof");

        (bool success, ) = recipient.call{value: 100 ether}("");
        require(success, "ETH transfer failed");

        emit Withdrawal(recipient, nullifierHash, root);
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

    function getCurrentRoot() external view returns (bytes32) {
        return currentRoot;
    }
}
