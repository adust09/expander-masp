import { task } from "hardhat/config";
import type { HardhatUserConfig } from "hardhat/config";

import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox-viem";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 1337,
    },
  },
};

task("sendEth", "Send eth to the specified address").setAction(
  async (_, { ethers }) => {
    const recipientAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
    const amount = ethers.parseEther("100");
    const sender = await ethers.provider.getSigner();
    const tx = await sender.sendTransaction({
      to: recipientAddress,
      value: amount,
    });

    console.log("Transaction hash:", tx.hash);
  }
);

task(
  "sendTokens",
  "Send DAI, USDC, and USDT to the specified address"
).setAction(async (_, { ethers }) => {
  const recipientAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  const sender = await ethers.provider.getSigner();

  // Token addresses from constants/tokens.ts
  const tokenAddresses = {
    DAI: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    USDC: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    USDT: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  };

  // Token decimals
  const tokenDecimals = {
    DAI: 18,
    USDC: 6,
    USDT: 6,
  };

  // ERC20 ABI for transfer function
  const erc20Abi = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
  ];

  // Send 1000 of each token
  for (const [symbol, address] of Object.entries(tokenAddresses)) {
    try {
      const decimals = tokenDecimals[symbol as keyof typeof tokenDecimals];
      const amount = ethers.parseUnits("1000", decimals);

      const tokenContract = new ethers.Contract(address, erc20Abi, sender);

      // Send tokens
      const tx = await tokenContract.transfer(recipientAddress, amount);
      await tx.wait();

      console.log(`Sent 1000 ${symbol} to ${recipientAddress}`);
      console.log(`Transaction hash: ${tx.hash}`);
    } catch (error) {
      console.error(`Error sending ${symbol}:`, error);
    }
  }

  console.log("Token transfers completed");
});

export default config;
