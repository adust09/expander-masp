import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { ABI, TORNADO_CONTRACT_ADDRESS } from "@/constants/contract";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress = TORNADO_CONTRACT_ADDRESS } = body;

    // Create a public client to interact with the blockchain
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    // Call the contractBalance function on the Tornado contract
    const balance = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: ABI,
      functionName: "contractBalance",
    });

    // Convert balance from wei to ether
    const balanceInEther = Number(balance) / 10 ** 18;

    return NextResponse.json({
      success: true,
      balance: balanceInEther,
      rawBalance: balance.toString(),
    });
  } catch (error) {
    console.error("Error getting contract balance:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
