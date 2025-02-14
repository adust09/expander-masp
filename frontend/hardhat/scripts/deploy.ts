import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { deployContract } from "viem/actions";

import TornadoDepositArtifact from "../artifacts/contracts/TornadoDeposit.sol/TornadoDeposit.json";

const hardhatChain = {
  ...mainnet,
  id: 31337,
  network: "hardhat",
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
};

async function main() {
  const PRIVATE_KEY =
    "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

  const account = privateKeyToAccount(PRIVATE_KEY);

  const walletClient = createWalletClient({
    chain: hardhatChain,
    account,
    transport: http(),
  });

  const abi = TornadoDepositArtifact.abi;
  const bytecode = TornadoDepositArtifact.bytecode;

  console.log("Deploying TornadoDeposit...");

  const hash = await deployContract(walletClient, {
    abi,
    account,
    bytecode,
    args: [],
  });

  console.log("Deployment transaction hash:", hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
