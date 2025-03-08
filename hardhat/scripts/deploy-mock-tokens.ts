import { createWalletClient, http, parseUnits, formatUnits } from "viem";
import { localhost } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { deployContract, writeContract } from "viem/actions";

import MockERC20Artifact from "../artifacts/contracts/MockERC20.sol/MockERC20.json";
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

async function main() {
  console.log("Deploying MockERC20 tokens...");

  // Use the default hardhat private key for local development
  const PRIVATE_KEY =
    "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`Deploying with account: ${account.address}`);

  const walletClient = createWalletClient({
    chain: hardhatChain,
    account,
    transport: http(),
  });

  const mockERC20Abi = MockERC20Artifact.abi;
  const mockERC20Bytecode = MockERC20Artifact.bytecode as `0x${string}`;
  const tornadoAbi = TornadoArtifact.abi;

  // Deploy DAI mock
  console.log("Deploying Mock DAI...");
  const daiHash = await deployContract(walletClient, {
    abi: mockERC20Abi,
    account,
    bytecode: mockERC20Bytecode,
    args: ["Mock DAI", "mDAI", 18],
  });
  console.log(`Mock DAI deployment transaction hash: ${daiHash}`);

  // Wait for transaction receipt to get the contract address
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Simple delay to ensure contract is deployed

  // For simplicity, we'll use predefined addresses based on deployment order
  // In a production environment, you would get these from transaction receipts
  const daiAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  console.log(`Mock DAI deployed to: ${daiAddress}`);

  // Deploy USDC mock
  console.log("Deploying Mock USDC...");
  const usdcHash = await deployContract(walletClient, {
    abi: mockERC20Abi,
    account,
    bytecode: mockERC20Bytecode,
    args: ["Mock USDC", "mUSDC", 6],
  });
  console.log(`Mock USDC deployment transaction hash: ${usdcHash}`);

  await new Promise((resolve) => setTimeout(resolve, 2000));
  const usdcAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  console.log(`Mock USDC deployed to: ${usdcAddress}`);

  // Deploy USDT mock
  console.log("Deploying Mock USDT...");
  const usdtHash = await deployContract(walletClient, {
    abi: mockERC20Abi,
    account,
    bytecode: mockERC20Bytecode,
    args: ["Mock USDT", "mUSDT", 6],
  });
  console.log(`Mock USDT deployment transaction hash: ${usdtHash}`);

  await new Promise((resolve) => setTimeout(resolve, 2000));
  const usdtAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  console.log(`Mock USDT deployed to: ${usdtAddress}`);

  // Mint some tokens to the deployer
  const mintAmount = parseUnits("1000000", 18); // 1 million tokens
  const usdcMintAmount = parseUnits("1000000", 6); // 1 million USDC
  const usdtMintAmount = parseUnits("1000000", 6); // 1 million USDT

  console.log("Minting tokens to deployer...");

  // Mint DAI
  const daiMintHash = await writeContract(walletClient, {
    address: daiAddress,
    abi: mockERC20Abi,
    functionName: "mint",
    args: [account.address, mintAmount],
  });
  console.log(
    `Minted ${formatUnits(mintAmount, 18)} mDAI to ${account.address}`
  );
  console.log(`Transaction hash: ${daiMintHash}`);

  // Mint USDC
  const usdcMintHash = await writeContract(walletClient, {
    address: usdcAddress,
    abi: mockERC20Abi,
    functionName: "mint",
    args: [account.address, usdcMintAmount],
  });
  console.log(
    `Minted ${formatUnits(usdcMintAmount, 6)} mUSDC to ${account.address}`
  );
  console.log(`Transaction hash: ${usdcMintHash}`);

  // Mint USDT
  const usdtMintHash = await writeContract(walletClient, {
    address: usdtAddress,
    abi: mockERC20Abi,
    functionName: "mint",
    args: [account.address, usdtMintAmount],
  });
  console.log(
    `Minted ${formatUnits(usdtMintAmount, 6)} mUSDT to ${account.address}`
  );
  console.log(`Transaction hash: ${usdtMintHash}`);

  // Transfer tokens to specified address
  const recipientAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  console.log(`\nTransferring tokens to ${recipientAddress}...`);

  // Transfer 1000 DAI (18 decimals)
  const daiTransferAmount = parseUnits("1000", 18);
  const daiTransferHash = await writeContract(walletClient, {
    address: daiAddress,
    abi: mockERC20Abi,
    functionName: "transfer",
    args: [recipientAddress, daiTransferAmount],
  });
  console.log(
    `Transferred ${formatUnits(
      daiTransferAmount,
      18
    )} mDAI to ${recipientAddress}`
  );
  console.log(`Transaction hash: ${daiTransferHash}`);

  // Transfer 1000 USDC (6 decimals)
  const usdcTransferAmount = parseUnits("1000", 6);
  const usdcTransferHash = await writeContract(walletClient, {
    address: usdcAddress,
    abi: mockERC20Abi,
    functionName: "transfer",
    args: [recipientAddress, usdcTransferAmount],
  });
  console.log(
    `Transferred ${formatUnits(
      usdcTransferAmount,
      6
    )} mUSDC to ${recipientAddress}`
  );
  console.log(`Transaction hash: ${usdcTransferHash}`);

  // Transfer 1000 USDT (6 decimals)
  const usdtTransferAmount = parseUnits("1000", 6);
  const usdtTransferHash = await writeContract(walletClient, {
    address: usdtAddress,
    abi: mockERC20Abi,
    functionName: "transfer",
    args: [recipientAddress, usdtTransferAmount],
  });
  console.log(
    `Transferred ${formatUnits(
      usdtTransferAmount,
      6
    )} mUSDT to ${recipientAddress}`
  );
  console.log(`Transaction hash: ${usdtTransferHash}`);

  // Register tokens with TornadoMASP
  console.log("\nRegistering tokens with TornadoMASP...");

  // For simplicity, we'll use a predefined address for TornadoMASP
  // In a production environment, you would get this from a deployment or configuration
  const tornadoAddress = "0xb581c9264f59bf0289fa76d61b2d0746dce3c30d";

  // Define asset IDs for each token
  const DAI_ASSET_ID = 2; // ETH is 1 by default
  const USDC_ASSET_ID = 3;
  const USDT_ASSET_ID = 4;

  // Register DAI
  console.log(`Registering DAI with asset ID ${DAI_ASSET_ID}...`);
  const daiRegisterHash = await writeContract(walletClient, {
    address: tornadoAddress,
    abi: tornadoAbi,
    functionName: "addAsset",
    args: [DAI_ASSET_ID, daiAddress, "mDAI", 18],
  });
  console.log(`DAI registration transaction hash: ${daiRegisterHash}`);

  // Register USDC
  console.log(`Registering USDC with asset ID ${USDC_ASSET_ID}...`);
  const usdcRegisterHash = await writeContract(walletClient, {
    address: tornadoAddress,
    abi: tornadoAbi,
    functionName: "addAsset",
    args: [USDC_ASSET_ID, usdcAddress, "mUSDC", 6],
  });
  console.log(`USDC registration transaction hash: ${usdcRegisterHash}`);

  // Register USDT
  console.log(`Registering USDT with asset ID ${USDT_ASSET_ID}...`);
  const usdtRegisterHash = await writeContract(walletClient, {
    address: tornadoAddress,
    abi: tornadoAbi,
    functionName: "addAsset",
    args: [USDT_ASSET_ID, usdtAddress, "mUSDT", 6],
  });
  console.log(`USDT registration transaction hash: ${usdtRegisterHash}`);

  console.log("\nDeployment and Registration Summary:");
  console.log("----------------------------------");
  console.log(`Mock DAI (mDAI): ${daiAddress} - Asset ID: ${DAI_ASSET_ID}`);
  console.log(`Mock USDC (mUSDC): ${usdcAddress} - Asset ID: ${USDC_ASSET_ID}`);
  console.log(`Mock USDT (mUSDT): ${usdtAddress} - Asset ID: ${USDT_ASSET_ID}`);
  console.log(`TornadoMASP: ${tornadoAddress}`);
  console.log(
    "\nUpdate your constants/tokens.ts file with these addresses and asset IDs."
  );

  // Create a combined deployment script that deploys both tokens and TornadoMASP
  console.log("\nTo deploy both tokens and TornadoMASP, you can run:");
  console.log("npx hardhat run scripts/deploy-all.ts --network <network>");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
