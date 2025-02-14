// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./NaiveIncrementalMerkleTree.sol";

/**
 * @title TornadoDeposit
 * @dev 単純化した "Deposit Only" コントラクト (Ether を扱う)
 */
contract TornadoDeposit {
    using NaiveIncrementalMerkleTree for NaiveIncrementalMerkleTree.TreeData;

    uint256 public constant TREE_DEPTH = 10;

    NaiveIncrementalMerkleTree.TreeData private treeData;

    mapping(bytes32 => bool) public isKnownRoot;

    event Deposit(
        address indexed from,
        bytes32 indexed commitment,
        bytes32 indexed newRoot,
        uint256 amount
    );

    constructor() {
        treeData.init(TREE_DEPTH);
        // 空のルートを known としておく
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
