import { createWalletClient, http, createPublicClient } from "viem";
import { localhost } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { deployContract } from "viem/actions";

import MASPVerifierArtifact from "../artifacts/contracts/MASPVerifier.sol/MASPVerifier.json";

const hardhatChain = {
  ...localhost,
  id: 1337,
  network: "hardhat",
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
};

export async function deployVerifier() {
  console.log("Starting MASP Verifier deployment...");

  const PRIVATE_KEY =
    "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

  console.log("Creating account from private key...");
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log("Account created:", account.address);

  console.log("Creating wallet client...");
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

  console.log("Loading contract artifacts...");
  const abi = MASPVerifierArtifact.abi;
  const bytecode = MASPVerifierArtifact.bytecode as `0x${string}`;

  console.log("Deploying MASP Verifier...");
  try {
    const hash = await deployContract(walletClient, {
      abi,
      account,
      bytecode,
      args: [],
    });

    console.log("MASP Verifier deployment transaction hash:", hash);

    // Wait for transaction receipt to get contract address
    console.log("Waiting for transaction to be mined...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("MASP Verifier deployed to:", receipt.contractAddress);

    return receipt.contractAddress;
  } catch (error) {
    console.error("Error deploying contract:", error);
    throw error;
  }
}

// Only run this directly if not being imported
if (require.main === module) {
  deployVerifier()
    .then((address) => {
      console.log("Deployment successful! Contract address:", address);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Deployment failed:", err);
      process.exit(1);
    });
}
