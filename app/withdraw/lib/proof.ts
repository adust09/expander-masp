// Functions related to zero-knowledge proof generation and handling

import { ZKProof } from "./types";

/**
 * Generate a zero-knowledge proof for withdrawal
 * @param secret User secret from withdraw note
 * @param nullifierValue Nullifier value from withdraw note
 * @param assetId Asset ID for the withdrawal
 * @param amount Amount to withdraw
 * @param setMessage Function to update UI message state
 * @returns ZK proof array for contract verification
 */
export const generateZKProof = async (
  secret: string,
  nullifierValue: string,
  assetId: bigint,
  amount: bigint,
  setMessage: (value: React.SetStateAction<string>) => void
): Promise<ZKProof> => {
  // Default proof array (all zeros) in case proof generation fails
  let zkProof: ZKProof = [
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
  ] as const;

  setMessage((prev) => prev + "\nGenerating zero-knowledge proof...");

  // Mock Merkle proof data - in a real implementation, this would be computed or retrieved
  const merkleProof = ["789", "101112", "131415"];
  const pathIndices = [0, 0, 0];

  try {
    // Call our API to generate the proof
    console.log("🔍 Frontend: Calling createWithdrawalProof API with params:", {
      secret,
      nullifier: nullifierValue,
      assetId: assetId.toString(),
      amount: amount.toString(),
      merkleProof,
      pathIndices,
    });

    // Make the API call
    // 以下のjsonが返ってくる
    // {"Ar":{"X":"14767007796529545812580174914623770070374080416551996028147997096523618120766","Y":"8502566237852183246853579574529863064146359515312548227807305544212628600939"},"Krs":{"X":"4611893360550607833571749928712210736095695317484351731817759452592224817575","Y":"6604125858117952073986126589201216306308873207233418741557466138648849932487"},"Bs":{"X":{"A0":"20921599151320613933835576223152244407305598097185227233386955687742037992936","A1":"19168240396961999809259048205095027215709295278192660871564546988937863164169"},"Y":{"A0":"15691709395384633955096803066600371829044312914601019478436683350436599428993","A1":"13594299460771082128211822485053857914641063231321014781006008210015869221395"}},"Commitments":[],"CommitmentPok":{"X":0,"Y":0}}
    const proofResponse = await fetch("/api/createWithdrawalProof", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret,
        nullifier: nullifierValue,
        assetId: assetId.toString(),
        amount: amount.toString(),
        merkleProof,
        pathIndices,
      }),
    });

    // Handle error responses
    if (!proofResponse.ok) {
      const responseText = await proofResponse.text();
      console.log("🔍 Frontend: API error response text:", responseText);

      let errorData;
      try {
        errorData = JSON.parse(responseText);
        console.log("🔍 Frontend: API error response parsed:", errorData);
      } catch (parseError) {
        console.error(
          "🔍 Frontend: Failed to parse error response:",
          parseError
        );
        throw new Error(`Failed to generate proof: ${responseText}`);
      }
    }

    const responseText = await proofResponse.text();
    console.log("🔍 Frontend: API response text:", responseText);

    let proofData;
    try {
      proofData = JSON.parse(responseText);
      console.log("🔍 Frontend: API response parsed:", proofData);
    } catch (parseError) {
      console.error("🔍 Frontend: Failed to parse response:", parseError);
      throw new Error(`Failed to parse proof response: ${responseText}`);
    }

    // Process the proof data
    if (proofData.success && proofData.proof) {
      setMessage((prev) => prev + "\nProof generated successfully!");

      // Extract proof values, handling different formats
      let proofValues: bigint[] = [];

      if (Array.isArray(proofData.proof) && proofData.proof.length === 8) {
        // Standard format: array of 8 elements
        console.log("🔍 Frontend: Standard 8-element proof array");
        proofValues = proofData.proof.map((p: unknown) => {
          if (typeof p === "string" && p.startsWith("0x")) {
            return BigInt(p);
          } else if (typeof p === "string") {
            return BigInt(`0x${p}`);
          } else {
            return BigInt(String(p));
          }
        });
      } else if (
        Array.isArray(proofData.proof) &&
        proofData.proof.length === 9
      ) {
        // Take the first 8 elements from a 9-element array
        console.log(
          "🔍 Frontend: Found 9-element proof array, using first 8 elements"
        );
        proofValues = proofData.proof.slice(0, 8).map((p: unknown) => {
          if (typeof p === "string" && p.startsWith("0x")) {
            return BigInt(p);
          } else if (typeof p === "string") {
            return BigInt(`0x${p}`);
          } else {
            return BigInt(String(p));
          }
        });
      } else if (
        !Array.isArray(proofData.proof) &&
        typeof proofData.proof === "object"
      ) {
        // If it's an object with numeric properties, extract values in order
        console.log("🔍 Frontend: Proof is an object, extracting values");
        const values = Object.values(proofData.proof);
        if (values.length >= 8) {
          proofValues = values.slice(0, 8).map((p: unknown) => {
            if (typeof p === "string" && p.startsWith("0x")) {
              return BigInt(p);
            } else if (typeof p === "string") {
              return BigInt(`0x${p}`);
            } else {
              return BigInt(String(p));
            }
          });
        } else {
          console.warn("Insufficient values in proof object");
        }
      } else {
        console.warn(
          "Proof data is not in the expected format:",
          proofData.proof
        );
        setMessage(
          (prev) =>
            prev +
            "\nWarning: Proof data is not in the expected format. Using default proof."
        );
      }

      // Only update zkProof if we successfully extracted 8 values
      if (proofValues.length === 8) {
        console.log(
          "🔍 Frontend: Converted proof values:",
          proofValues.map((v: bigint) => v.toString())
        );

        zkProof = [
          proofValues[0],
          proofValues[1],
          proofValues[2],
          proofValues[3],
          proofValues[4],
          proofValues[5],
          proofValues[6],
          proofValues[7],
        ] as const;
      }
    } else {
      throw new Error("Proof generation failed or returned invalid data");
    }
  } catch (proofError) {
    console.error("Error generating proof:", proofError);
    setMessage(
      (prev) =>
        prev +
        `\nError generating proof: ${
          proofError instanceof Error ? proofError.message : String(proofError)
        }`
    );
    setMessage(
      (prev) =>
        prev +
        "\nUsing default proof values. This will likely fail verification."
    );
  }

  return zkProof;
};

/**
 * Format ZK proof for contract interaction
 * @param zkProof Raw ZK proof tuple
 * @returns Formatted proof ready for the contract
 */
export const formatProofForContract = (zkProof: ZKProof): ZKProof => {
  // Convert the zkProof from a tuple to a proper array
  // This is crucial because the contract expects a uint256[8] array
  // Ensure we have exactly 8 elements to satisfy TypeScript
  const formattedProof = [
    zkProof[0],
    zkProof[1],
    zkProof[2],
    zkProof[3],
    zkProof[4],
    zkProof[5],
    zkProof[6],
    zkProof[7],
  ] as const;

  // Log the exact format of the proof being sent to the contract
  console.log("🔍 Final proof format for contract:", {
    type: typeof formattedProof,
    isArray: Array.isArray(formattedProof),
    length: formattedProof.length,
    values: formattedProof.map((v) => v.toString()),
    valueTypes: formattedProof.map((v) => typeof v),
  });

  return formattedProof;
};

/**
 * Types for the proof data structures
 */
interface ProofInput {
  proof: unknown;
  publicInputs?: unknown[];
  success?: boolean;
}

/**
 * Structure expected by the verifier contract
 */
interface VerifierProofFormat {
  a: [unknown, unknown];
  b: [[unknown, unknown], [unknown, unknown]];
  c: [unknown, unknown];
  inputs: unknown[];
}

/**
 * Type guards to check proof data structure
 */
function isProofArray(proof: unknown): proof is unknown[] {
  return Array.isArray(proof);
}

function isProofObject(proof: unknown): proof is Record<string, unknown> {
  return typeof proof === "object" && proof !== null && !Array.isArray(proof);
}

function hasProofStructure(proof: unknown): proof is {
  a: unknown;
  b: unknown;
  c: unknown;
} {
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
    return false;
  }

  const p = proof as Record<string, unknown>;
  return "a" in p && "b" in p && "c" in p;
}

/**
 * Parse a proof from various formats to the standard format expected by the verifier contract.
 * @param proofData The proof data from the API or other source
 * @returns Properly formatted proof structure for the verifier contract
 */
export function parseProof(proofData: ProofInput): VerifierProofFormat {
  if (!proofData) {
    throw new Error("No proof data provided");
  }

  console.log("Parsing proof data:", JSON.stringify(proofData, null, 2));

  // Check if proofData.proof is an array
  const { proof, publicInputs = [] } = proofData;
  const isArray = isProofArray(proof);

  console.log("Is proof an array?", isArray);
  if (isArray) {
    console.log("Proof array length:", proof.length);

    // Case 1: proof is an array of 8 elements
    if (proof.length === 8) {
      console.log("Using standard 8-element proof array");
      return {
        a: [proof[0], proof[1]],
        b: [
          [proof[2], proof[3]],
          [proof[4], proof[5]],
        ],
        c: [proof[6], proof[7]],
        inputs: publicInputs,
      };
    }

    // Case 2: proof is an array of 9 elements (taking the first 8)
    if (proof.length === 9) {
      console.log("Using first 8 elements from 9-element proof array");
      return {
        a: [proof[0], proof[1]],
        b: [
          [proof[2], proof[3]],
          [proof[4], proof[5]],
        ],
        c: [proof[6], proof[7]],
        inputs: publicInputs,
      };
    }
  }

  // If proof is an object, check for different object structures
  if (isProofObject(proof)) {
    console.log("Proof object keys:", Object.keys(proof));

    // Case 3: proof is an object with nested a, b, c structure
    if (hasProofStructure(proof)) {
      console.log("Using nested proof object structure");
      // Safe to access a, b, c as we've verified they exist
      return {
        a: proof.a as [unknown, unknown],
        b: proof.b as [[unknown, unknown], [unknown, unknown]],
        c: proof.c as [unknown, unknown],
        inputs: publicInputs,
      };
    }

    // Case 4: proof is an object with numeric properties
    const values = Object.values(proof);
    if (values.length >= 8) {
      console.log("Proof is an object with properties, extracting values");
      return {
        a: [values[0], values[1]] as [unknown, unknown],
        b: [
          [values[2], values[3]] as [unknown, unknown],
          [values[4], values[5]] as [unknown, unknown],
        ],
        c: [values[6], values[7]] as [unknown, unknown],
        inputs: publicInputs,
      };
    }
  }

  // If we've reached here, none of the known formats matched
  console.error(
    "Proof data is not in the expected format:",
    JSON.stringify(proofData, null, 2)
  );
  console.error("Proof type:", typeof proof);

  if (proof) {
    if (isProofArray(proof)) {
      console.error("Proof array elements:", proof);
    } else if (isProofObject(proof)) {
      console.error("Proof object keys:", Object.keys(proof));
      for (const key in proof) {
        console.error(`proof[${key}] =`, typeof proof[key], proof[key]);
      }
    }
  }

  throw new Error("Proof data is not in the expected format");
}
