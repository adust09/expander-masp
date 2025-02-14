import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { deployContract } from "viem/actions";

import TornadoDepositArtifact from "../artifacts/contracts/TornadoDeposit.sol/TornadoDeposit.json";

// Hardhat ネットワーク (チェーンID=31337) 向けの chain 設定を独自定義
// mainnet を継承して ID や rpcUrls を上書き
const hardhatChain = {
  ...mainnet,
  id: 31337,
  network: "hardhat",
  // デフォルトRPCを Hardhat ノードに
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
};

async function main() {
  // 事前に Hardhat node を起動し、private key をメモしておく
  const PRIVATE_KEY =
    "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e"; // Hardhat が表示するキーに置き換える

  // Viem のアカウント作成
  const account = privateKeyToAccount(PRIVATE_KEY);

  // WalletClient を作成 (ローカルHardhatノードに接続)
  const walletClient = createWalletClient({
    chain: hardhatChain,
    account,
    transport: http(),
  });

  // ABI と Bytecode を取得
  const abi = TornadoDepositArtifact.abi;
  const bytecode = TornadoDepositArtifact.bytecode;

  console.log("Deploying TornadoDeposit...");

  const hash = await deployContract(walletClient, {
    abi,
    account,
    bytecode: `0x${bytecode}`,
    args: [],
  });

  console.log("Deployment transaction hash:", hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
