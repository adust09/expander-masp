import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Updates the constants files with deployed contract addresses
 */
function updateConstantsFiles(
  tornadoAddress: string,
  daiAddress: string,
  usdcAddress: string,
  usdtAddress: string
) {
  // Update tokens.ts
  const tokensPath = path.resolve(__dirname, "../../constants/tokens.ts");
  if (fs.existsSync(tokensPath)) {
    let content = fs.readFileSync(tokensPath, "utf8");

    content = content.replace(
      /id: 2,\s+symbol: "DAI",\s+name: "Dai Stablecoin",\s+address: "[^"]+"/,
      `id: 2,\n    symbol: "DAI",\n    name: "Dai Stablecoin",\n    address: "${daiAddress}"`
    );

    content = content.replace(
      /id: 3,\s+symbol: "USDC",\s+name: "USD Coin",\s+address: "[^"]+"/,
      `id: 3,\n    symbol: "USDC",\n    name: "USD Coin",\n    address: "${usdcAddress}"`
    );

    content = content.replace(
      /id: 4,\s+symbol: "USDT",\s+name: "Tether USD",\s+address: "[^"]+"/,
      `id: 4,\n    symbol: "USDT",\n    name: "Tether USD",\n    address: "${usdtAddress}"`
    );

    fs.writeFileSync(tokensPath, content);
    console.log(`Updated token addresses in ${tokensPath}`);
  } else {
    console.warn(`Warning: Could not find ${tokensPath}`);
  }

  // Update contract.ts
  const contractPath = path.resolve(__dirname, "../../constants/contract.ts");
  if (fs.existsSync(contractPath)) {
    let content = fs.readFileSync(contractPath, "utf8");

    content = content.replace(
      /export const TORNADO_CONTRACT_ADDRESS =\s+"[^"]+"/,
      `export const TORNADO_CONTRACT_ADDRESS = "${tornadoAddress}"`
    );

    fs.writeFileSync(contractPath, content);
    console.log(`Updated TornadoMASP address in ${contractPath}`);
  } else {
    console.warn(`Warning: Could not find ${contractPath}`);
  }
}

async function main() {
  console.log("Starting deployment of all contracts...");
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // 1. Deploy MockERC20 tokens
  console.log("\n=== Deploying MockERC20 tokens ===");

  // Deploy MockERC20 contract factory
  const MockERC20 = await ethers.getContractFactory("MockERC20");

  // Deploy DAI mock
  const mockDAI = await MockERC20.deploy("Mock DAI", "mDAI", 18);
  await mockDAI.waitForDeployment();
  const daiAddress = await mockDAI.getAddress();
  console.log(`Mock DAI deployed to: ${daiAddress}`);

  // Deploy USDC mock
  const mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log(`Mock USDC deployed to: ${usdcAddress}`);

  // Deploy USDT mock
  const mockUSDT = await MockERC20.deploy("Mock USDT", "mUSDT", 6);
  await mockUSDT.waitForDeployment();
  const usdtAddress = await mockUSDT.getAddress();
  console.log(`Mock USDT deployed to: ${usdtAddress}`);

  // Mint some tokens to the deployer
  const mintAmount = ethers.parseUnits("1000000", 18); // 1 million tokens
  const usdcMintAmount = ethers.parseUnits("1000000", 6); // 1 million USDC
  const usdtMintAmount = ethers.parseUnits("1000000", 6); // 1 million USDT

  console.log("Minting tokens to deployer...");

  await mockDAI.mint(deployer.address, mintAmount);
  console.log(
    `Minted ${ethers.formatUnits(mintAmount, 18)} mDAI to ${deployer.address}`
  );

  await mockUSDC.mint(deployer.address, usdcMintAmount);
  console.log(
    `Minted ${ethers.formatUnits(usdcMintAmount, 6)} mUSDC to ${
      deployer.address
    }`
  );

  await mockUSDT.mint(deployer.address, usdtMintAmount);
  console.log(
    `Minted ${ethers.formatUnits(usdtMintAmount, 6)} mUSDT to ${
      deployer.address
    }`
  );

  // 2. Deploy TornadoMASP contract
  console.log("\n=== Deploying TornadoMASP contract ===");

  const TornadoMASP = await ethers.getContractFactory("TornadoMASP");
  const tornadoMASP = await TornadoMASP.deploy();
  await tornadoMASP.waitForDeployment();
  const tornadoAddress = await tornadoMASP.getAddress();
  console.log(`TornadoMASP deployed to: ${tornadoAddress}`);

  // Register the mock tokens in TornadoMASP
  console.log("\nRegistering mock tokens in TornadoMASP...");

  // DAI (ID: 2)
  await tornadoMASP.addAsset(2, daiAddress, "mDAI", 18);
  console.log("Mock DAI registered with ID 2");

  // USDC (ID: 3)
  await tornadoMASP.addAsset(3, usdcAddress, "mUSDC", 6);
  console.log("Mock USDC registered with ID 3");

  // USDT (ID: 4)
  await tornadoMASP.addAsset(4, usdtAddress, "mUSDT", 6);
  console.log("Mock USDT registered with ID 4");

  // Deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("Mock Tokens:");
  console.log(`- Mock DAI (mDAI): ${daiAddress}`);
  console.log(`- Mock USDC (mUSDC): ${usdcAddress}`);
  console.log(`- Mock USDT (mUSDT): ${usdtAddress}`);
  console.log("\nTornadoMASP:");
  console.log(`- TornadoMASP: ${tornadoAddress}`);

  // Update constants files with deployed addresses
  console.log("\n=== Updating Constants Files ===");
  try {
    updateConstantsFiles(tornadoAddress, daiAddress, usdcAddress, usdtAddress);
    console.log("Constants files updated successfully!");
  } catch (error) {
    console.error("Error updating constants files:", error);
    console.log(
      "You may need to manually update your constants/tokens.ts and constants/contract.ts files with these addresses."
    );
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
