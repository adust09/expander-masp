import { keccak256, encodePacked } from "viem";

/**
 * Structure of the Merkle proof returned by the API
 */
export interface MerkleProof {
  siblings: `0x${string}`[];
  pathIndices: number[];
}

/**
 * Calculate commitment from user inputs
 * @param secret User secret
 * @param nullifier Nullifier value
 * @param assetId Asset ID
 * @param amount Amount
 * @returns Commitment hash as string
 */
export function calculateCommitment(
  secret: string,
  nullifier: string,
  assetId: bigint,
  amount: bigint
): `0x${string}` {
  // In a production implementation, you would use a ZK-friendly hash like Poseidon
  // This is a simplified version using keccak256
  const encoded = encodePacked(
    ["string", "string", "uint256", "uint256"],
    [secret, nullifier, assetId, amount]
  );

  return keccak256(encoded);
}

/**
 * Get Merkle proof for a commitment from the API
 * @param commitment Commitment hash
 * @returns Promise containing Merkle proof and path indices
 */
export async function getMerkleProof(
  commitment: `0x${string}`
): Promise<MerkleProof> {
  try {
    console.log("🌲 Client: Fetching Merkle proof for commitment:", commitment);

    const response = await fetch("/api/getMerkleProof", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ commitment }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🌲 Client: Failed to get Merkle proof:", errorText);
      throw new Error(`Failed to get Merkle proof: ${errorText}`);
    }

    const data = await response.json();
    console.log("🌲 Client: Merkle proof response:", data);

    if (!data.success) {
      throw new Error(`API error: ${data.error}`);
    }

    return data.merkleProof;
  } catch (error) {
    console.error("🌲 Client: Error fetching Merkle proof:", error);
    throw new Error(
      `Could not retrieve Merkle proof: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get the current Merkle root from the contract
 * @returns Promise containing the current root as a hex string
 */
export async function getCurrentRoot(): Promise<`0x${string}`> {
  try {
    const response = await fetch("/api/getContractRoot", {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🌲 Client: Failed to get current root:", errorText);
      throw new Error(`Failed to get current root: ${errorText}`);
    }

    const data = await response.json();
    console.log("🌲 Client: Current root response:", data);

    if (!data.success) {
      throw new Error(`API error: ${data.error}`);
    }

    return data.root as `0x${string}`;
  } catch (error) {
    console.error("🌲 Client: Error fetching current root:", error);
    throw new Error(
      `Could not retrieve current root: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Check if a commitment exists in the Merkle tree
 * @param commitment Commitment hash to check
 * @returns Promise containing whether the commitment exists and its index
 */
export async function checkCommitmentExists(
  commitment: `0x${string}`
): Promise<{ exists: boolean; index: number }> {
  try {
    console.log("🌲 Client: Checking if commitment exists:", commitment);

    const response = await fetch("/api/checkCommitment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ commitment }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🌲 Client: Failed to check commitment:", errorText);
      throw new Error(`Failed to check commitment: ${errorText}`);
    }

    const data = await response.json();
    console.log("🌲 Client: Commitment check response:", data);

    if (!data.success) {
      throw new Error(`API error: ${data.error}`);
    }

    return {
      exists: data.exists,
      index: data.index,
    };
  } catch (error) {
    console.error("🌲 Client: Error checking commitment:", error);
    throw new Error(
      `Could not check commitment: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Generate a commitment and get its Merkle proof in one operation
 * This is useful for withdrawal operations
 * @param secret User secret
 * @param nullifier Nullifier value
 * @param assetId Asset ID
 * @param amount Amount
 * @returns Promise containing commitment, Merkle proof and current root
 */
export async function generateCommitmentAndProof(
  secret: string,
  nullifier: string,
  assetId: bigint,
  amount: bigint
): Promise<{
  commitment: `0x${string}`;
  merkleProof: MerkleProof;
  root: `0x${string}`;
}> {
  // Calculate the commitment
  const commitment = calculateCommitment(secret, nullifier, assetId, amount);
  console.log("🌲 Client: Generated commitment:", commitment);

  // Get the Merkle proof
  const merkleProof = await getMerkleProof(commitment);

  // Get the current root
  const root = await getCurrentRoot();

  return {
    commitment,
    merkleProof,
    root,
  };
}
