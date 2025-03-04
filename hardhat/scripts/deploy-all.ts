import fs from "fs";
import path from "path";
import { deployVerifier } from "./deploy-verifier";
import { deployMASP } from "./deploy-masp";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

async function updateTornadoAddressInMockTokens(tornadoAddress: string) {
  console.log("\nUpdating tornadoAddress in deploy-mock-tokens.ts...");

  const filePath = path.join(__dirname, "deploy-mock-tokens.ts");
  let content = fs.readFileSync(filePath, "utf8");

  // Replace the tornadoAddress with the new one
  content = content.replace(
    /const tornadoAddress = ".*?"/,
    `const tornadoAddress = "${tornadoAddress}"`
  );

  fs.writeFileSync(filePath, content);
  console.log(
    `Updated tornadoAddress to ${tornadoAddress} in deploy-mock-tokens.ts`
  );
}

async function updateTornadoAddressInConstants(tornadoAddress: string) {
  console.log(
    "\nUpdating TORNADO_CONTRACT_ADDRESS in constants/contract.ts..."
  );

  const filePath = path.join(__dirname, "../../constants/contract.ts");
  let content = fs.readFileSync(filePath, "utf8");

  // Replace the TORNADO_CONTRACT_ADDRESS with the new one
  content = content.replace(
    /export const TORNADO_CONTRACT_ADDRESS =\s*".*?"/,
    `export const TORNADO_CONTRACT_ADDRESS = "${tornadoAddress}"`
  );

  fs.writeFileSync(filePath, content);
  console.log(
    `Updated TORNADO_CONTRACT_ADDRESS to ${tornadoAddress} in constants/contract.ts`
  );
}

async function main() {
  console.log("Starting complete deployment process...");

  try {
    // 1. Deploy the verifier
    console.log("\n=== Step 1: Deploying MASP Verifier ===");
    const verifierAddress = (await deployVerifier()) as string;
    if (!verifierAddress) {
      throw new Error(
        "Failed to deploy MASP Verifier: No contract address returned"
      );
    }
    console.log(`MASP Verifier deployed at: ${verifierAddress}`);

    // 2. Deploy the MASP contract with the verifier address
    console.log("\n=== Step 2: Deploying TornadoMASP ===");
    const tornadoAddress = (await deployMASP(verifierAddress)) as string;
    if (!tornadoAddress) {
      throw new Error(
        "Failed to deploy TornadoMASP: No contract address returned"
      );
    }
    console.log(`TornadoMASP deployed at: ${tornadoAddress}`);

    // 3. Update tornadoAddress in deploy-mock-tokens.ts
    console.log(
      "\n=== Step 3: Updating tornadoAddress in deploy-mock-tokens.ts ==="
    );
    await updateTornadoAddressInMockTokens(tornadoAddress as string);

    // 4. Run deploy-mock-tokens.ts
    console.log("\n=== Step 4: Deploying Mock Tokens ===");
    const { stdout, stderr } = await execPromise(
      "npx hardhat run scripts/deploy-mock-tokens.ts --network localhost"
    );
    console.log(stdout);
    if (stderr) console.error(stderr);

    // 5. Update TORNADO_CONTRACT_ADDRESS in constants/contract.ts
    console.log(
      "\n=== Step 5: Updating TORNADO_CONTRACT_ADDRESS in constants/contract.ts ==="
    );
    await updateTornadoAddressInConstants(tornadoAddress as string);

    console.log("\n=== Deployment Complete ===");
    console.log(`MASP Verifier: ${verifierAddress}`);
    console.log(`TornadoMASP: ${tornadoAddress}`);
    console.log(
      "Mock tokens have been deployed and registered with TornadoMASP"
    );
    console.log(
      "All configuration files have been updated with the new addresses"
    );

    return { verifierAddress, tornadoAddress };
  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

// Only run this directly if not being imported
if (require.main === module) {
  main()
    .then(() => {
      console.log("All deployment steps completed successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Deployment process failed:", err);
      process.exit(1);
    });
}
