import * as fs from "fs";
import * as path from "path";

/**
 * Helper script to update the constants files with deployed contract addresses
 * Run this script after deployment with the addresses as arguments:
 *
 * Example:
 * ts-node scripts/update-constants.ts \
 *   --tornado 0x123... \
 *   --dai 0x456... \
 *   --usdc 0x789... \
 *   --usdt 0xabc...
 */

interface Args {
  tornado?: string;
  dai?: string;
  usdc?: string;
  usdt?: string;
}

function parseArgs(): Args {
  const args: Args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace("--", "");
    const value = process.argv[i + 1];
    args[key as keyof Args] = value;
  }
  return args;
}

function updateTokensFile(
  daiAddress?: string,
  usdcAddress?: string,
  usdtAddress?: string
) {
  const tokensPath = path.resolve(__dirname, "../../constants/tokens.ts");

  if (!fs.existsSync(tokensPath)) {
    console.error(`File not found: ${tokensPath}`);
    return;
  }

  let content = fs.readFileSync(tokensPath, "utf8");

  if (daiAddress) {
    content = content.replace(
      /id: 2,\s+symbol: "DAI",\s+name: "Dai Stablecoin",\s+address: "[^"]+"/,
      `id: 2,\n    symbol: "DAI",\n    name: "Dai Stablecoin",\n    address: "${daiAddress}"`
    );
  }

  if (usdcAddress) {
    content = content.replace(
      /id: 3,\s+symbol: "USDC",\s+name: "USD Coin",\s+address: "[^"]+"/,
      `id: 3,\n    symbol: "USDC",\n    name: "USD Coin",\n    address: "${usdcAddress}"`
    );
  }

  if (usdtAddress) {
    content = content.replace(
      /id: 4,\s+symbol: "USDT",\s+name: "Tether USD",\s+address: "[^"]+"/,
      `id: 4,\n    symbol: "USDT",\n    name: "Tether USD",\n    address: "${usdtAddress}"`
    );
  }

  fs.writeFileSync(tokensPath, content);
  console.log(`Updated token addresses in ${tokensPath}`);
}

function updateContractFile(tornadoAddress?: string) {
  const contractPath = path.resolve(__dirname, "../../constants/contract.ts");

  if (!fs.existsSync(contractPath)) {
    console.error(`File not found: ${contractPath}`);
    return;
  }

  if (tornadoAddress) {
    let content = fs.readFileSync(contractPath, "utf8");
    content = content.replace(
      /export const TORNADO_CONTRACT_ADDRESS =\s+"[^"]+"/,
      `export const TORNADO_CONTRACT_ADDRESS = "${tornadoAddress}"`
    );
    fs.writeFileSync(contractPath, content);
    console.log(`Updated TornadoMASP address in ${contractPath}`);
  }
}

function main() {
  const args = parseArgs();

  if (Object.keys(args).length === 0) {
    console.log(`
Usage: ts-node scripts/update-constants.ts [options]

Options:
  --tornado ADDRESS    TornadoMASP contract address
  --dai ADDRESS        Mock DAI contract address
  --usdc ADDRESS       Mock USDC contract address
  --usdt ADDRESS       Mock USDT contract address

Example:
  ts-node scripts/update-constants.ts --tornado 0x123... --dai 0x456... --usdc 0x789... --usdt 0xabc...
`);
    return;
  }

  updateTokensFile(args.dai, args.usdc, args.usdt);
  updateContractFile(args.tornado);

  console.log("Constants files updated successfully!");
}

main();
