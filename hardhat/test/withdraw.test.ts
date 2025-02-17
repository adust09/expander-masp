import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  keccak256,
  toHex,
  parseAbiItem,
} from "viem";
import { hardhat, root } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  writeContract,
  getLogs,
  waitForTransactionReceipt,
  deployContract,
} from "viem/actions";

import TornadoArtifact from "../artifacts/contracts/Tornado.sol/Tornado.json";
// import VerifierArtifact from "../artifacts/contracts/Verifier.sol/Verifier.json";
const abi = TornadoArtifact.abi;
const abiItem =
  "event Withdraw(bytes32 indexed nullifierHash, address indexed to, bytes32 indexed root)";
const bytecode = TornadoArtifact.bytecode as `0x${string}`;

const hardhatChain = {
  ...hardhat,
  id: 31337,
  network: "hardhat",
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
};

const PRIVATE_KEY =
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
let TORNADO_ADDRESS: `0x${string}`;

describe("Tornado (Withdraw tests with viem)", () => {
  let account: any;
  let publicClient: any;
  let walletClient: any;

  beforeAll(async () => {
    account = privateKeyToAccount(PRIVATE_KEY);
    walletClient = createWalletClient({
      chain: hardhatChain,
      transport: http(),
    });
    publicClient = createPublicClient({
      chain: hardhatChain,
      transport: http(),
    });

    const hash = await deployContract(walletClient, {
      abi,
      account,
      bytecode,
      args: [],
      chain: hardhatChain,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) {
      throw new Error("Contract deployment failed");
    }
    TORNADO_ADDRESS = receipt.contractAddress;
  });

  beforeEach(() => {
    depositCommitment = toHex("commitment1").padEnd(66, "0") as `0x${string}`;
  });

  it("Withdraw -> emits Withdraw event", async () => {
    const proof = toHex("dummy-proof");
    const nullifierHash = toHex("nullifier1").padEnd(66, "0");

    const recipientAddress = account.address;
    const withdrawTxHash = await writeContract(walletClient, {
      address: TORNADO_ADDRESS,
      abi: TornadoArtifact.abi,
      functionName: "withdraw",
      args: [proof, root, nullifierHash, recipientAddress],
      chain: hardhatChain,
      account: account,
    });
    const withdrawReceipt = await waitForTransactionReceipt(publicClient, {
      hash: withdrawTxHash,
    });
    expect(withdrawReceipt.status).toBe("success");

    const withdrawEventAbi = parseAbiItem([abiItem]);
    const logs = await getLogs(publicClient, {
      address: TORNADO_ADDRESS,
      event: withdrawEventAbi,
      fromBlock: withdrawReceipt.blockNumber,
      toBlock: withdrawReceipt.blockNumber,
    });
    expect(logs.length).toBe(1);
    const args = logs[0].args;
    expect(args.nullifierHash).toBe(nullifierHash);
    expect(args.root).toBe(root);
  });

  it("should revert if nullifierHash is reused", async () => {
    // 1) deposit 1 more time

    const commit2 = toHex("commitment2").padEnd(66, "0") as `0x${string}`;
    const depositTx = await writeContract(walletClient, {
      address: TORNADO_ADDRESS,
      abi: TornadoArtifact.abi,
      functionName: "deposit",
      args: [commit2],
      value: parseEther("1"),
      chain: hardhatChain,
      account: account,
    });
    await waitForTransactionReceipt(publicClient, { hash: depositTx });

    const root2 = keccak256(commit2);
    const proof2 = toHex("dummy2");
    const nullifierHash2 = toHex("same-nullifier").padEnd(66, "0");
    const recipientAddress = account.address;

    // 1回目 -> 成功
    const w1 = await writeContract(walletClient, {
      address: TORNADO_ADDRESS,
      abi: TornadoArtifact.abi,
      functionName: "withdraw",
      args: [proof2, root2, nullifierHash2, recipientAddress],
      chain: hardhatChain,
      account: account,
    });
    await waitForTransactionReceipt(publicClient, { hash: w1 });

    // 2回目 同じnullifierHash2 -> revert
    await expect(async () => {
      const w2 = await writeContract(walletClient, {
        address: TORNADO_ADDRESS,
        abi: TornadoArtifact.abi,
        functionName: "withdraw",
        args: [proof2, root2, nullifierHash2, recipientAddress],
        chain: hardhatChain,
        account: account,
      });
      await waitForTransactionReceipt(publicClient, { hash: w2 });
    }).rejects.toThrowError(/reverted|Nullifier has already been spent/i);
  });
});
