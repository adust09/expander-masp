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

export default config;
