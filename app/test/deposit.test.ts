// test/Deposit.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  // actions
} from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import DepositArtifact from "../../hardhat/artifacts/contracts/Tornado.sol/Tornado.json" assert { type: "json" };
import {
  deployContract,
  getBalance,
  readContract,
  writeContract,
} from "viem/actions";

describe("DepositContract Tests (viem + wagmi style)", () => {
  const localChain = {
    ...mainnet,
    id: 31337,
    network: "local",
    rpcUrls: {
      default: { http: ["http://127.0.0.1:8545"] },
    },
  };

  const PRIVATE_KEY =
    "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

  let walletClient: ReturnType<typeof createWalletClient>;
  let publicClient: ReturnType<typeof createPublicClient>;
  let depositContractAddress: `0x${string}`;

  // 1) テスト前にクライアント作成 & コントラクトデプロイ
  beforeAll(async () => {
    const account = privateKeyToAccount(PRIVATE_KEY);

    // wagmi/viem のクライアント作成
    walletClient = createWalletClient({
      chain: localChain,
      account,
      transport: http(),
    });
    publicClient = createPublicClient({
      chain: localChain,
      transport: http(),
    });

    // 2) Deploy DepositContract
    const hash = await deployContract(walletClient, {
      abi: DepositArtifact.abi,
      bytecode: DepositArtifact.bytecode as `0x${string}`,
      args: [10],
      account: null,
      chain: undefined,
    });
    console.log("Deploy tx hash (DepositContract):", hash);

    // tx receipt で コントラクトアドレス取得
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    depositContractAddress = receipt.contractAddress as `0x${string}`;
    console.log("DepositContract deployed at:", depositContractAddress);
  });

  it("should deposit 1ETH successfully", async () => {
    // 1) コントラクトの初期残高は0
    const initBalance = await getBalance(publicClient, {
      address: depositContractAddress,
    });
    expect(initBalance).toBe(BigInt(0));

    // 2) deposit call
    const commitment = "0x" + "11".repeat(32); // bytes32 (ダミー)
    const txHash = await writeContract(walletClient, {
      address: depositContractAddress,
      abi: DepositArtifact.abi,
      functionName: "deposit",
      args: [commitment],
      value: parseEther("1"),
      chain: undefined,
      account: null,
    });
    console.log("Deposit txHash:", txHash);

    // 3) トランザクション完了待ち
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    expect(receipt.status).toBe("success");

    // 4) コントラクト残高が 1ETH になっているか
    const balAfter = await getBalance(publicClient, {
      address: depositContractAddress,
    });
    expect(balAfter).toBe(parseEther("1"));

    // 5) leaves.length が1になっているか
    // readContract で getNumberOfLeaves() を呼ぶ
    const leavesCount = await readContract(publicClient, {
      address: depositContractAddress,
      abi: DepositArtifact.abi,
      functionName: "getNumberOfLeaves",
    });
    expect(leavesCount).toBe(BigInt(1));
  });

  it("should fail if no ETH sent", async () => {
    const commitment = "0x" + "22".repeat(32);
    await expect(() =>
      writeContract(walletClient, {
        address: depositContractAddress,
        abi: DepositArtifact.abi,
        functionName: "deposit",
        args: [commitment],
        chain: undefined,
        account: null,
      })
    ).rejects.toThrowError(/execution reverted/);
  });
});
