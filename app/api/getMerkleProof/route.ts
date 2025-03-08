import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/constants/contract";

// Create a public client for read operations
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

/**
 * API route handler for retrieving Merkle proofs
 * @param request The incoming request with commitment parameter
 * @returns Merkle proof data or error response
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🌲 getMerkleProof API: Processing request");

    // Parse the request body
    const body = await request.json();
    console.log(
      "🌲 getMerkleProof API: Request body:",
      JSON.stringify(body, null, 2)
    );

    // Validate the commitment parameter
    const { commitment } = body;
    if (!commitment) {
      console.log("🌲 getMerkleProof API: Missing commitment parameter");
      return NextResponse.json(
        {
          success: false,
          error: "Missing commitment parameter",
        },
        { status: 400 }
      );
    }

    // Ensure commitment is properly formatted as a bytes32 hex string
    const commitmentHex = commitment.startsWith("0x")
      ? (commitment as `0x${string}`)
      : (`0x${commitment}` as `0x${string}`);

    console.log("🌲 getMerkleProof API: Calling contract.getMerkleProof");

    try {
      // Call the getMerkleProof function on the contract
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "getMerkleProof",
        args: [commitmentHex],
      });

      console.log("🌲 getMerkleProof API: Contract response received:", result);

      // Format the response
      // The contract returns [bytes32[] siblings, uint8[] pathIndices]
      const result1 = result as unknown as [
        readonly `0x${string}`[],
        readonly bigint[]
      ];
      const [siblings, pathIndices] = result1;

      return NextResponse.json({
        success: true,
        merkleProof: {
          siblings: siblings,
          pathIndices: pathIndices.map((index) => Number(index)),
        },
      });
    } catch (contractError) {
      console.error("🌲 getMerkleProof API: Contract error:", contractError);

      // Check if commitment exists in the tree
      try {
        const findResult = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "findCommitmentIndex",
          args: [commitmentHex],
        });

        // Use array destructuring to extract only what we need (ignoring index)
        const [, found] = findResult as [bigint, boolean];

        if (!found) {
          return NextResponse.json(
            {
              success: false,
              error: "Commitment not found in the Merkle tree",
              details: {
                commitment: commitmentHex,
                exists: false,
              },
            },
            { status: 404 }
          );
        }
      } catch (findError) {
        console.error(
          "🌲 getMerkleProof API: Error checking commitment:",
          findError
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve Merkle proof from contract",
          details:
            contractError instanceof Error
              ? contractError.message
              : String(contractError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("🌲 getMerkleProof API: Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * API route handler for retrieving Merkle proofs using GET method
 * This allows for easy testing via browser
 * @param request The incoming request with commitment query parameter
 * @returns Merkle proof data or error response
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const commitment = url.searchParams.get("commitment");

    if (!commitment) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing commitment query parameter",
        },
        { status: 400 }
      );
    }

    // Create a POST request body from the query parameter
    const body = { commitment };

    // Reuse the POST handler logic
    return POST(
      new Request(request.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }) as NextRequest
    );
  } catch (error) {
    console.error("🌲 getMerkleProof API GET: Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process GET request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
