import { describe, it, expect, beforeAll } from "vitest";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  keccak256,
  toHex,
} from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  deployContract,
  writeContract,
  getLogs,
  parseAbiItem,
  waitForTransactionReceipt,
} from "viem/actions";

// Tornado コントラクトのアーティファクト (Hardhat などでコンパイルされた JSON)
import TornadoArtifact from "../artifacts/contracts/Tornado.sol/Tornado.json";

// Verifier(ダミー) のアーティファクトなどを用意しているなら同様にimport
// import VerifierArtifact from "../artifacts/contracts/Verifier.sol/Verifier.json";

describe("Tornado (Withdraw tests with viem)", () => {
  const localChain = {
    ...mainnet,
    id: 31337,
    network: "localHardhat",
    rpcUrls: {
      default: { http: ["http://127.0.0.1:8545"] },
    },
  };

  const PRIVATE_KEY =
    "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
  const account = privateKeyToAccount(PRIVATE_KEY);

  const walletClient = createWalletClient({
    chain: localChain,
    transport: http(),
    account,
  });
  const publicClient = createPublicClient({
    chain: localChain,
    transport: http(),
  });

  let tornadoAddress: `0x${string}`; // デプロイ後のコントラクトアドレス
  let depositCommitment: `0x${string}`;

  // -------------------------
  // 1) 前準備: コントラクトのデプロイ
  // -------------------------
  beforeAll(async () => {
    // もし Verifier が必要なら先に deployContract() する
    // const verifierHash = await deployContract(walletClient, {
    //   abi: VerifierArtifact.abi,
    //   bytecode: VerifierArtifact.bytecode,
    // });
    // const verifierReceipt = await waitForTransactionReceipt(publicClient, { hash: verifierHash });
    // const verifierAddress = verifierReceipt.contractAddress;

    // 今回はダミーで "0x0000..." とするか、本当に deploy したアドレスを差し込む
    const verifierAddress = "0x0000000000000000000000000000000000000000"; // 例

    // Tornado をデプロイ
    const tornadoHash = await deployContract(walletClient, {
      abi: TornadoArtifact.abi,
      bytecode: TornadoArtifact.bytecode,
      args: [verifierAddress], // constructor(address _verifier)
    });
    console.log("Tornado deploy tx hash:", tornadoHash);

    // デプロイ完了
    const receipt = await waitForTransactionReceipt(publicClient, {
      hash: tornadoHash,
    });
    tornadoAddress = receipt.contractAddress as `0x${string}`;
    console.log("Tornado deployed at:", tornadoAddress);
  });

  // -------------------------
  // 2) Deposit テスト
  // -------------------------
  it("Deposit 1ETH -> emits Deposit event", async () => {
    // deposit() は payable => overrides.value で 1ETH
    depositCommitment = toHex("commitment1").padEnd(66, "0"); // bytes32 用

    const depositTxHash = await writeContract(walletClient, {
      address: tornadoAddress,
      abi: TornadoArtifact.abi,
      functionName: "deposit",
      args: [depositCommitment],
      value: parseEther("1"), // 1ETH
    });
    console.log("Deposit txHash:", depositTxHash);
    const depositReceipt = await waitForTransactionReceipt(publicClient, {
      hash: depositTxHash,
    });
    expect(depositReceipt.status).toBe("success");

    // イベント "Deposit" をログから検証
    const depositEventAbi = parseAbiItem({
      type: "event",
      name: "Deposit",
      inputs: [
        { type: "bytes32", name: "commitment", indexed: true },
        { type: "bytes32", name: "root", indexed: true },
        { type: "address", name: "depositor", indexed: true },
      ],
    });

    const logs = await getLogs(publicClient, {
      address: tornadoAddress,
      event: depositEventAbi,
      fromBlock: depositReceipt.blockNumber,
      toBlock: depositReceipt.blockNumber,
    });
    expect(logs.length).toBe(1);
    const args = logs[0].args;
    expect(args.commitment).toBe(depositCommitment);
    console.log("Deposit event root:", args.root);
  });

  // -------------------------
  // 3) Withdraw テスト
  // -------------------------
  it("Withdraw -> emits Withdraw event", async () => {
    const root = keccak256(depositCommitment);

    const proof = toHex("dummy-proof");
    const nullifierHash = toHex("nullifier1").padEnd(66, "0"); // bytes32

    const recipientAddress = account.address;
    const withdrawTxHash = await writeContract(walletClient, {
      address: tornadoAddress,
      abi: TornadoArtifact.abi,
      functionName: "withdraw",
      args: [proof, root, nullifierHash, recipientAddress],
    });
    console.log("Withdraw txHash:", withdrawTxHash);
    const withdrawReceipt = await waitForTransactionReceipt(publicClient, {
      hash: withdrawTxHash,
    });
    expect(withdrawReceipt.status).toBe("success");

    const withdrawEventAbi = parseAbiItem({
      type: "event",
      name: "Withdraw",
      inputs: [
        { type: "address", name: "to", indexed: true },
        { type: "bytes32", name: "nullifierHash", indexed: true },
        { type: "bytes32", name: "root", indexed: true },
      ],
    });
    const logs = await getLogs(publicClient, {
      address: tornadoAddress,
      event: withdrawEventAbi,
      fromBlock: withdrawReceipt.blockNumber,
      toBlock: withdrawReceipt.blockNumber,
    });
    expect(logs.length).toBe(1);
    const args = logs[0].args;
    expect(args.nullifierHash).toBe(nullifierHash);
    expect(args.root).toBe(root);
    console.log("Withdraw event to:", args.to);
  });

  it("should revert if nullifierHash is reused", async () => {
    // 1) deposit 1 more time
    const commit2 = toHex("commitment2").padEnd(66, "0");
    const depositTx = await writeContract(walletClient, {
      address: tornadoAddress,
      abi: TornadoArtifact.abi,
      functionName: "deposit",
      args: [commit2],
      value: parseEther("1"),
    });
    await waitForTransactionReceipt(publicClient, { hash: depositTx });

    const root2 = keccak256(commit2);
    const proof2 = toHex("dummy2");
    const nullifierHash2 = toHex("same-nullifier").padEnd(66, "0");
    const recipientAddress = account.address;

    // 1回目 -> 成功
    const w1 = await writeContract(walletClient, {
      address: tornadoAddress,
      abi: TornadoArtifact.abi,
      functionName: "withdraw",
      args: [proof2, root2, nullifierHash2, recipientAddress],
    });
    await waitForTransactionReceipt(publicClient, { hash: w1 });

    // 2回目 同じnullifierHash2 -> revert
    await expect(async () => {
      const w2 = await writeContract(walletClient, {
        address: tornadoAddress,
        abi: TornadoArtifact.abi,
        functionName: "withdraw",
        args: [proof2, root2, nullifierHash2, recipientAddress],
      });
      await waitForTransactionReceipt(publicClient, { hash: w2 });
    }).rejects.toThrowError(/reverted|Nullifier has already been spent/i);
  });
});
