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

    console.log("🔍 Frontend: API response status:", proofResponse.status);
    console.log(
      "🔍 Frontend: API response headers:",
      Object.fromEntries(Array.from(proofResponse.headers.entries()))
    );

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

      throw new Error(
        `Failed to generate proof: ${
          errorData.error || JSON.stringify(errorData)
        }`
      );
    }

    // Parse successful response
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

    // Add detailed logging of the API response
    console.log(
      "createWithdrawalProof API response:",
      JSON.stringify(proofData, null, 2)
    );
    console.log("Response type:", typeof proofData);
    console.log("Response structure:", Object.keys(proofData));

    // Process the proof data
    if (proofData.success && proofData.proof) {
      setMessage((prev) => prev + "\nProof generated successfully!");
      console.log("Proof data:", proofData.proof);
      console.log("Proof type:", typeof proofData.proof);
      console.log("Is array:", Array.isArray(proofData.proof));

      if (proofData.proof.length) {
        console.log("Proof length:", proofData.proof.length);
        console.log("First proof element type:", typeof proofData.proof[0]);
      }

      // Convert proof data to the format expected by the contract
      // The proof should be an array of 8 uint256 values
      if (Array.isArray(proofData.proof) && proofData.proof.length === 8) {
        console.log("🔍 Frontend: Converting proof to BigInt values");

        // Convert each proof element to BigInt
        // For hex strings, we need to ensure they're properly formatted
        const proofValues = proofData.proof.map((p: string | number) => {
          if (typeof p === "string" && p.startsWith("0x")) {
            return BigInt(p);
          } else if (typeof p === "string") {
            return BigInt(`0x${p}`);
          } else {
            return BigInt(p);
          }
        });

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
    } else {
      throw new Error("Proof generation failed or returned invalid data");
    }

    // Log the proof data
    console.log("Generated proof data:", proofData);
    console.log("Formatted proof for contract:", zkProof);
    console.log("zkProof type:", typeof zkProof);
    console.log("zkProof is array:", Array.isArray(zkProof));
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
    // We'll continue with default proof values, but this will likely fail verification
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
  ] as const; // Use 'as const' to make TypeScript recognize this as a fixed-length tuple

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
