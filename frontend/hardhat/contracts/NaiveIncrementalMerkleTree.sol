// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library NaiveIncrementalMerkleTree {
    struct TreeData {
        uint256 depth;
        bytes32[] leaves;
    }

    function init(TreeData storage self, uint256 _depth) internal {
        require(_depth > 0 && _depth <= 32, "Depth out of range");
        self.depth = _depth;
    }

    function insertLeaf(TreeData storage self, bytes32 leaf) internal returns (bytes32 newRoot) {
        uint256 currentIndex = self.leaves.length;
        require(currentIndex < 2**self.depth, "Tree is full");
        self.leaves.push(leaf);
        newRoot = _computeRoot(self.leaves);
    }

    function _computeRoot(bytes32[] memory leaves) private pure returns (bytes32 root) {
        if (leaves.length == 0) {
            return bytes32(0);
        }

        bytes32[] memory levelNodes = leaves;
        uint256 levelSize = leaves.length;

        while (levelSize > 1) {
            uint256 nextLevelSize = (levelSize + 1) / 2;
            bytes32[] memory nextLevelNodes = new bytes32[](nextLevelSize);

            for (uint256 i = 0; i < levelSize; i += 2) {
                if (i + 1 < levelSize) {
                    nextLevelNodes[i / 2] = keccak256(
                        abi.encodePacked(levelNodes[i], levelNodes[i + 1])
                    );
                } else {
                    nextLevelNodes[i / 2] = levelNodes[i];
                }
            }

            levelNodes = nextLevelNodes;
            levelSize = nextLevelSize;
        }

        root = levelNodes[0];
    }
}
