import { ZKProof } from "./types";
import { getMerkleProof, calculateCommitment, getCurrentRoot } from "./merkle";

/**
 * Structure of the proof object returned by the API
 */
interface ProofStructure {
  Ar: { X: string; Y: string };
  Krs: { X: string; Y: string };
  Bs: {
    X: { A0: string; A1: string };
    Y: { A0: string; A1: string };
  };
  Commitments?: unknown[];
  CommitmentPok?: { X: number; Y: number };
}

/**
 * Format the complex proof structure returned by API into an array of 8 BigInt values
 * @param proofObj The proof object returned by the API
 * @returns Array of 8 BigInt values in the correct order for contract verification
 */
function formatProofStructureToArray(proofObj: ProofStructure): bigint[] {
  console.log("🔍 Proof structure keys:", Object.keys(proofObj));

  // Validate the proof structure
  if (!proofObj.Ar || !proofObj.Krs || !proofObj.Bs) {
    throw new Error(
      "Proof structure doesn't contain the expected fields: Ar, Krs, Bs"
    );
  }

  try {
    // Extract and convert values in the specific order required by the contract
    const proofValues = [
      // Convert all string values to BigInt
      BigInt(proofObj.Ar.X),
      BigInt(proofObj.Ar.Y),
      BigInt(proofObj.Krs.X),
      BigInt(proofObj.Krs.Y),
      BigInt(proofObj.Bs.X.A0),
      BigInt(proofObj.Bs.X.A1),
      BigInt(proofObj.Bs.Y.A0),
      BigInt(proofObj.Bs.Y.A1),
    ];

    console.log(
      "🔍 Successfully extracted 8 proof values:",
      proofValues.map((v) => v.toString())
    );

    return proofValues;
  } catch (error) {
    console.error("🔍 Error converting proof values to BigInt:", error);
    throw new Error("Failed to convert proof values to BigInt format");
  }
}

/**
 * Convert an array of 8 BigInt values to ZKProof type
 * @param proofValues Array of 8 BigInt values extracted from proof
 * @returns ZKProof type ready for contract use
 */
function createZKProofFromArray(proofValues: bigint[]): ZKProof {
  if (proofValues.length !== 8) {
    throw new Error(`Expected 8 proof values, got ${proofValues.length}`);
  }

  // Convert the array to a fixed-length tuple as required by ZKProof type
  return [
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

  // Real implementation: Calculate commitment and retrieve Merkle proof
  try {
    // Calculate the commitment from user inputs
    const commitment = calculateCommitment(
      secret,
      nullifierValue,
      assetId,
      amount
    );
    setMessage((prev) => prev + "\nCalculated commitment: " + commitment);

    // Get current Merkle root
    setMessage((prev) => prev + "\nRetrieving current Merkle root...");
    const root = await getCurrentRoot();
    setMessage((prev) => prev + "\nCurrent root: " + root);

    // Get Merkle proof for the commitment
    setMessage((prev) => prev + "\nRetrieving Merkle proof...");
    const merkleProofData = await getMerkleProof(commitment);
    setMessage((prev) => prev + "\nMerkle proof retrieved!");

    // Convert the Merkle proof to the format expected by the API
    const merkleProof = merkleProofData.siblings.map((sibling) =>
      sibling.toString()
    );
    const pathIndices = merkleProofData.pathIndices;

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

      // Handle different proof format types
      if (Array.isArray(proofData.proof)) {
        console.log("🔍 Frontend: Proof is an array, processing directly");

        try {
          // Convert string or number values to BigInt
          proofValues = proofData.proof.map((val: unknown) =>
            typeof val === "string" ? BigInt(val) : BigInt(Number(val))
          );

          if (proofValues.length === 8) {
            zkProof = createZKProofFromArray(proofValues);
            console.log("🔍 Frontend: Successfully processed array proof");
          } else {
            console.warn(
              `🔍 Frontend: Array proof has unexpected length: ${proofValues.length}, expected 8`
            );
            throw new Error(
              `Invalid proof array length: ${proofValues.length}`
            );
          }
        } catch (error) {
          console.error("🔍 Error processing array proof:", error);
          throw error; // Re-throw to be caught by the outer try-catch
        }
      } else if (
        typeof proofData.proof === "object" &&
        proofData.proof !== null
      ) {
        console.log("🔍 Frontend: Proof is an object, extracting values");

        try {
          // Use the utility function to convert the proof structure to array
          const proof = proofData.proof as ProofStructure;
          proofValues = formatProofStructureToArray(proof);
          // Convert the array of BigInt values to ZKProof type using the helper function
          zkProof = createZKProofFromArray(proofValues);
          console.log("🔍 Frontend: Successfully processed object proof");
        } catch (error) {
          console.error("🔍 Error processing proof object:", error);
          throw error; // Re-throw to be caught by the outer try-catch
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
        throw new Error("Proof data in unexpected format");
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
