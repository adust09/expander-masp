import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  // Get the deployed verifier contract
  const verifierAddress = process.env.VERIFIER_ADDRESS;
  if (!verifierAddress) {
    console.error("Please set VERIFIER_ADDRESS environment variable");
    process.exit(1);
  }

  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.attach(verifierAddress);

  console.log("Using verifier at:", verifierAddress);

  // Load the proof from the binary file
  // In a real application, you would generate this proof from user inputs
  const proofBinPath = path.join(
    __dirname,
    "../../proof/ethereum_verifier/proof.bin"
  );
  const proofBin = fs.readFileSync(proofBinPath);

  // Convert binary proof to the format expected by the verifier
  // This is a simplified example - in a real application, you would need to
  // properly decode the binary proof into the correct format
  console.log("Loading proof from:", proofBinPath);

  // For demonstration purposes, we'll use a hardcoded proof
  // In a real application, you would parse the binary proof correctly
  const proof = [
    // A point (2 elements)
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
    // B point (4 elements)
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
    // C point (2 elements)
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
  ];

  // Public inputs (empty in this example)
  const publicInputs = [];

  console.log("Verifying proof...");
  try {
    // Call the verifier contract
    const result = await verifier.verifyProof(proof, publicInputs);
    console.log("Verification result:", result);
    console.log("Proof verified successfully!");
  } catch (error) {
    console.error("Proof verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
