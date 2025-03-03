import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MASP Verifier...");

  // Deploy the verifier contract
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();

  await verifier.deployed();

  console.log("MASP Verifier deployed to:", verifier.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
