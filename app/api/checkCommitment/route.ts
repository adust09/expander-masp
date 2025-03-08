import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { localhost } from "viem/chains";
import { TORNADO_CONTRACT_ADDRESS, ABI } from "@/constants/contract";

// Create a public client for read operations
const publicClient = createPublicClient({
  chain: localhost,
  transport: http(),
});

/**
 * API route handler for checking if a commitment exists in the Merkle tree
 * @param request The incoming request with commitment parameter
 * @returns Status and index of the commitment if found
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🌲 checkCommitment API: Processing request");

    // Parse the request body
    const body = await request.json();
    console.log(
      "🌲 checkCommitment API: Request body:",
      JSON.stringify(body, null, 2)
    );

    // Validate the commitment parameter
    const { commitment } = body;
    if (!commitment) {
      console.log("🌲 checkCommitment API: Missing commitment parameter");
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

    console.log("🌲 checkCommitment API: Calling contract.findCommitmentIndex");

    try {
      const result = await publicClient.readContract({
        address: TORNADO_CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "findCommitmentIndex",
        args: [commitmentHex],
      });

      console.log(
        "🌲 checkCommitment API: Contract response received:",
        result
      );

      // Extract index and found status
      const result1 = result as unknown as [bigint, boolean];
      const [indexBigInt, found] = result1;
      const index = Number(indexBigInt);

      return NextResponse.json({
        success: true,
        exists: found,
        index: found ? index : -1,
        commitment: commitmentHex,
      });
    } catch (contractError) {
      console.error("🌲 checkCommitment API: Contract error:", contractError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to check commitment existence",
          details:
            contractError instanceof Error
              ? contractError.message
              : String(contractError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("🌲 checkCommitment API: Unexpected error:", error);
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
 * API route handler for checking commitment using GET method
 * This allows for easy testing via browser
 * @param request The incoming request with commitment query parameter
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
    console.error("🌲 checkCommitment API GET: Error:", error);
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
