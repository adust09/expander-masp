import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TornadoMASP contract...");

  // Deploy the TornadoMASP contract
  const TornadoMASP = await ethers.getContractFactory("TornadoMASP");
  const tornadoMASP = await TornadoMASP.deploy();

  await tornadoMASP.waitForDeployment();

  const address = await tornadoMASP.getAddress();
  console.log(`TornadoMASP deployed to: ${address}`);

  // Register some example tokens (in a real deployment, you would do this in a separate transaction)
  console.log("Registering example tokens...");

  // DAI (ID: 2)
  await tornadoMASP.addAsset(
    2,
    "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI address on mainnet
    "DAI",
    18
  );
  console.log("DAI registered with ID 2");

  // USDC (ID: 3)
  await tornadoMASP.addAsset(
    3,
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC address on mainnet
    "USDC",
    6
  );
  console.log("USDC registered with ID 3");

  // USDT (ID: 4)
  await tornadoMASP.addAsset(
    4,
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT address on mainnet
    "USDT",
    6
  );
  console.log("USDT registered with ID 4");

  console.log("Deployment and token registration complete!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
