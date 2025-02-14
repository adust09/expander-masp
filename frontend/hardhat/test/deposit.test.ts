import { test, expect } from "vitest";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { writeContract, readContract } from "viem/actions";

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

const PRIVATE_KEY =
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
const TORNADO_DEPOSIT_ADDRESS = "0x...";

const abi = TornadoDepositArtifact.abi;

test("Deposit 1 ETH", async () => {
  const account = privateKeyToAccount(PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain: hardhatChain,
    transport: http(),
  });
  const walletClient = createWalletClient({
    chain: hardhatChain,
    account,
    transport: http(),
  });

  const commitment = "0x" + "11".repeat(32);

  const txHash = await writeContract(walletClient, {
    address: TORNADO_DEPOSIT_ADDRESS as `0x${string}`,
    abi,
    functionName: "deposit",
    args: [commitment],
    value: parseEther("1"),
  });
  expect(txHash).toMatch(/^0x[0-9a-fA-F]{64}$/);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  expect(receipt.status).toBe("success");

  const balance = await publicClient.getBalance({
    address: TORNADO_DEPOSIT_ADDRESS as `0x${string}`,
  });
  expect(balance).toBe(parseEther("1"));

  const numLeaves = await readContract(publicClient, {
    address: TORNADO_DEPOSIT_ADDRESS as `0x${string}`,
    abi,
    functionName: "getNumberOfLeaves",
  });
  expect(numLeaves).toBe(1n);
});
