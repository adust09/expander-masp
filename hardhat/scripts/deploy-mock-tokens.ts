import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MockERC20 tokens...");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

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

  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log(`Mock DAI (mDAI): ${daiAddress}`);
  console.log(`Mock USDC (mUSDC): ${usdcAddress}`);
  console.log(`Mock USDT (mUSDT): ${usdtAddress}`);
  console.log("\nUpdate your constants/tokens.ts file with these addresses.");

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
