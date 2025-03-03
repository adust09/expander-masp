import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, nullifier, assetId, amount, merkleProof, pathIndices } =
      body;

    if (
      !secret ||
      !nullifier ||
      !assetId ||
      !amount ||
      !merkleProof ||
      !pathIndices
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    // Validate that merkleProof and pathIndices have the correct length
    if (!Array.isArray(merkleProof) || !Array.isArray(pathIndices)) {
      return NextResponse.json(
        {
          success: false,
          error: "merkleProof and pathIndices must be arrays",
        },
        { status: 400 }
      );
    }

    // Format the parameters for the Go program
    const params = JSON.stringify({
      secret,
      nullifier,
      assetId,
      amount,
      merkleProof,
      pathIndices,
    });

    // Execute the Go program with the parameters
    const proofDir = path.join(process.cwd(), "proof");
    const { stdout, stderr } = await execAsync(
      `cd ${proofDir} && ./pq-tornado generate-proof '${params}'`
    );

    if (stderr) {
      console.error("Error generating proof:", stderr);
      return NextResponse.json(
        {
          success: false,
          error: stderr,
        },
        { status: 500 }
      );
    }

    // Parse the proof from stdout
    const proofData = JSON.parse(stdout);

    return NextResponse.json({
      success: true,
      proof: proofData,
    });
  } catch (error) {
    console.error("Error generating withdrawal proof:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
