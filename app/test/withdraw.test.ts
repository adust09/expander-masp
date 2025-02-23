import { describe, it, expect, beforeAll } from "vitest";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import WithdrawArtifact from "../../hardhat/artifacts/contracts/Tornado.sol/Tornado.json" assert { type: "json" };
import { deployContract, getBalance, writeContract } from "viem/actions";

describe("WithdrawContract Tests (viem + wagmi style)", () => {
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
  let withdrawContractAddress: `0x${string}`;

  beforeAll(async () => {
    const account = privateKeyToAccount(PRIVATE_KEY);

    walletClient = createWalletClient({
      chain: localChain,
      account,
      transport: http(),
    });
    publicClient = createPublicClient({
      chain: localChain,
      transport: http(),
    });

    // Deploy WithdrawContract
    const hash = await deployContract(walletClient, {
      abi: WithdrawArtifact.abi,
      bytecode: WithdrawArtifact.bytecode as `0x${string}`,
      args: [],
      account: null,
      chain: undefined,
    });
    console.log("Deploy tx hash (WithdrawContract):", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    withdrawContractAddress = receipt.contractAddress as `0x${string}`;
    console.log("WithdrawContract deployed at:", withdrawContractAddress);
  });

  it("should withdraw 1ETH if root is known and contract has enough ETH", async () => {
    // 1) まずコントラクトに2ETHほど送る
    const sendHash = await walletClient.sendTransaction({
      to: withdrawContractAddress,
      value: parseEther("2"),
      account: null,
      chain: undefined,
    });
    await publicClient.waitForTransactionReceipt({ hash: sendHash });

    let balContract = await getBalance(publicClient, {
      address: withdrawContractAddress,
    });
    expect(balContract).toBe(parseEther("2"));

    // 2) rootを登録
    const root = "0x" + "99".repeat(32);
    const setRootTx = await writeContract(walletClient, {
      address: withdrawContractAddress,
      abi: WithdrawArtifact.abi,
      functionName: "setRoot",
      args: [root],
      chain: undefined,
      account: null,
    });
    await publicClient.waitForTransactionReceipt({ hash: setRootTx });

    // 3) nullifierHash
    const nullifierHash = "0x" + "aa".repeat(32);

    // 4) withdraw
    const withdrawTx = await writeContract(walletClient, {
      address: withdrawContractAddress,
      abi: WithdrawArtifact.abi,
      functionName: "withdraw",
      args: [root, nullifierHash, walletClient.account],
      chain: undefined,
      account: null,
    });
    console.log("Withdraw tx:", withdrawTx);
    const wReceipt = await publicClient.waitForTransactionReceipt({
      hash: withdrawTx,
    });
    expect(wReceipt.status).toBe("success");

    // 5) コントラクト残高が 2ETH → 1ETH に減る
    balContract = await getBalance(publicClient, {
      address: withdrawContractAddress,
    });
    expect(balContract).toBe(parseEther("1"));

    // nullifierHash 再使用はエラー
    await expect(
      writeContract(walletClient, {
        address: withdrawContractAddress,
        abi: WithdrawArtifact.abi,
        functionName: "withdraw",
        args: [root, nullifierHash, walletClient.account],
        chain: undefined,
        account: null,
      })
    ).rejects.toThrowError(/execution reverted/i);
  });

  it("should fail if unknown root", async () => {
    // コントラクト残高まだ1ETHある
    const root = "0x" + "11".repeat(32); // not set
    const nHash = "0x" + "22".repeat(32);

    await expect(
      writeContract(walletClient, {
        address: withdrawContractAddress,
        abi: WithdrawArtifact.abi,
        functionName: "withdraw",
        args: [root, nHash, walletClient.account],
        chain: undefined,
        account: null,
      })
    ).rejects.toThrowError(/Unknown or invalid root/i);
  });

  it("should fail if not enough balance", async () => {
    // コントラクト残高は1ETH (前のテストが終わった後の状態)
    // Withdraw 2回目 -> 1ETH → 0ETH → もう 1ETH 足りない
    const root = "0x" + "33".repeat(32);
    // setRoot
    const sTx = await writeContract(walletClient, {
      address: withdrawContractAddress,
      abi: WithdrawArtifact.abi,
      functionName: "setRoot",
      args: [root],
      chain: undefined,
      account: null,
    });
    await publicClient.waitForTransactionReceipt({ hash: sTx });

    const nHash = "0x" + "44".repeat(32);

    // withdraw → 1ETH => 0ETH
    const wTx = await writeContract(walletClient, {
      address: withdrawContractAddress,
      abi: WithdrawArtifact.abi,
      functionName: "withdraw",
      args: [root, nHash, walletClient.account],
      chain: undefined,
      account: null,
    });
    const rcp = await publicClient.waitForTransactionReceipt({ hash: wTx });
    expect(rcp.status).toBe("success");

    // 次に再度 withdraw しようとすると Not enough balance
    const nHash2 = "0x" + "55".repeat(32);
    await expect(
      writeContract(walletClient, {
        address: withdrawContractAddress,
        abi: WithdrawArtifact.abi,
        functionName: "withdraw",
        args: [root, nHash2, walletClient.account],
        chain: undefined,
        account: null,
      })
    ).rejects.toThrowError(/Not enough balance/i);
  });
});
