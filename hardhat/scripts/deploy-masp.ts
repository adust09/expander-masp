import { createWalletClient, http, createPublicClient } from "viem";
import { localhost } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { deployContract } from "viem/actions";

import TornadoArtifact from "../artifacts/contracts/TornadoMASP.sol/TornadoMASP.json";

const hardhatChain = {
  ...localhost,
  id: 1337,
  network: "hardhat",
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
};

export async function deployMASP(verifierAddress: string) {
  console.log("Starting TornadoMASP deployment...");
  console.log("Using verifier address:", verifierAddress);

  const PRIVATE_KEY =
    "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log("Deploying with account:", account.address);

  const walletClient = createWalletClient({
    chain: hardhatChain,
    account,
    transport: http(),
  });

  // Create a public client to get contract address after deployment
  const publicClient = createPublicClient({
    chain: hardhatChain,
    transport: http(),
  });

  const abi = TornadoArtifact.abi;
  const bytecode = TornadoArtifact.bytecode as `0x${string}`;

  console.log("Deploying TornadoMASP...");

  try {
    const hash = await deployContract(walletClient, {
      abi,
      account,
      bytecode,
      args: [verifierAddress],
    });

    console.log("TornadoMASP deployment transaction hash:", hash);

    // Wait for transaction receipt to get contract address
    console.log("Waiting for transaction to be mined...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("TornadoMASP deployed to:", receipt.contractAddress);

    return receipt.contractAddress;
  } catch (error) {
    console.error("Error deploying TornadoMASP contract:", error);
    throw error;
  }
}

// Only run this directly if not being imported
if (require.main === module) {
  // This will fail without a verifier address, but we keep it for backward compatibility
  deployMASP("0x0000000000000000000000000000000000000000")
    .then((address) => {
      console.log("Deployment successful! Contract address:", address);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Deployment failed:", err);
      process.exit(1);
    });
}
