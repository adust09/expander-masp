import { describe, it, expect, beforeAll } from "vitest";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { hardhat } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { writeContract, readContract, deployContract } from "viem/actions";

import TornadoArtifact from "../artifacts/contracts/Tornado.sol/Tornado.json";
const abi = TornadoArtifact.abi;
const bytecode = TornadoArtifact.bytecode as `0x${string}`;

const hardhatChain = {
  ...hardhat,
  id: 1337,
  network: "hardhat",
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
};

const PRIVATE_KEY =
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
let TORNADO_ADDRESS: `0x${string}`;

describe("Tornado Deposit Tests", () => {
  let account: any;
  let publicClient: any;
  let walletClient: any;

  beforeAll(async () => {
    account = privateKeyToAccount(PRIVATE_KEY);
    publicClient = createPublicClient({
      chain: hardhatChain,
      transport: http(),
    });
    walletClient = createWalletClient({
      chain: hardhatChain,
      account,
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

  it("should deposit 1 ETH successfully", async () => {
    const commitment = "0x" + "11".repeat(32);

    const txHash = await writeContract(walletClient, {
      address: TORNADO_ADDRESS,
      abi,
      functionName: "deposit",
      args: [commitment],
      value: parseEther("1"),
      chain: hardhatChain,
      account: account,
    });
    expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    expect(receipt.status).toBe("success");

    const balance = await publicClient.getBalance({
      address: TORNADO_ADDRESS,
    });
    expect(balance).toBe(parseEther("1"));

    const numLeaves = await readContract(publicClient, {
      address: TORNADO_ADDRESS as `0x${string}`,
      abi,
      functionName: "getNumberOfLeaves",
    });
    expect(numLeaves).toBe(1);
  });

  it("should fail when depositing with zero ETH", async () => {
    const commitment = "0x" + "22".repeat(32);

    await expect(
      writeContract(walletClient, {
        address: TORNADO_ADDRESS,
        abi,
        functionName: "deposit",
        args: [commitment],
        value: parseEther("0"),
        chain: hardhatChain,
        account: account,
      })
    ).rejects.toThrowError(/reverted|No ETH sent/i);
  });

  it("should increment leaves correctly with multiple deposits", async () => {
    // First deposit
    const commitment1 = "0x" + "33".repeat(32);
    await writeContract(walletClient, {
      address: TORNADO_ADDRESS,
      abi,
      functionName: "deposit",
      args: [commitment1],
      value: parseEther("1"),
      chain: hardhatChain,
      account: account,
    });

    // Second deposit
    const commitment2 = "0x" + "44".repeat(32);
    await writeContract(walletClient, {
      address: TORNADO_ADDRESS,
      abi,
      functionName: "deposit",
      args: [commitment2],
      value: parseEther("1"),
      chain: hardhatChain,
      account: account,
    });

    const numLeaves = await readContract(publicClient, {
      address: TORNADO_ADDRESS,
      abi,
      functionName: "getNumberOfLeaves",
    });
    expect(numLeaves).toBe(2n);

    const balance = await publicClient.getBalance({
      address: TORNADO_ADDRESS,
    });
    expect(balance).toBe(parseEther("2"));
  });

  it("should fail when using duplicate commitment", async () => {
    const commitment = "0x" + "55".repeat(32);

    // First deposit should succeed
    await writeContract(walletClient, {
      address: TORNADO_ADDRESS,
      abi,
      functionName: "deposit",
      args: [commitment],
      value: parseEther("1"),
      chain: hardhatChain,
      account: account,
    });

    // Second deposit with same commitment should fail
    await expect(
      writeContract(walletClient, {
        address: TORNADO_ADDRESS,
        abi,
        functionName: "deposit",
        args: [commitment],
        value: parseEther("1"),
        chain: hardhatChain,
        account: account,
      })
    ).rejects.toThrowError(/reverted|Commitment already exists/i);
  });
});
