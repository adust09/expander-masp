export const TOKENS = [
  {
    id: 1,
    symbol: "ETH",
    name: "Ethereum",
    address: null,
    decimals: 18,
  },
  {
    id: 2,
    symbol: "DAI",
    name: "Dai Stablecoin",
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    decimals: 18,
  },
  {
    id: 3,
    symbol: "USDC",
    name: "USD Coin",
    address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    decimals: 6,
  },
  {
    id: 4,
    symbol: "USDT",
    name: "Tether USD",
    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    decimals: 6,
  },
];

// Helper function to convert amount to token's smallest unit
export function toTokenUnit(amount: string, tokenSymbol: string): bigint {
  const token = TOKENS.find((t) => t.symbol === tokenSymbol);
  if (!token) throw new Error(`Token ${tokenSymbol} not found`);

  const decimals = token.decimals;
  const amountFloat = parseFloat(amount);
  const amountInSmallestUnit = BigInt(Math.floor(amountFloat * 10 ** decimals));

  return amountInSmallestUnit;
}

// Helper function to convert from token's smallest unit to human-readable format
export function fromTokenUnit(amount: bigint, tokenSymbol: string): string {
  const token = TOKENS.find((t) => t.symbol === tokenSymbol);
  if (!token) throw new Error(`Token ${tokenSymbol} not found`);

  const decimals = token.decimals;
  const amountFloat = Number(amount) / 10 ** decimals;

  return amountFloat.toString();
}

// Get token ID by symbol
export function getTokenId(symbol: string): number {
  const token = TOKENS.find((t) => t.symbol === symbol);
  if (!token) throw new Error(`Token ${symbol} not found`);
  return token.id;
}

// Get token by ID
export function getTokenById(id: number): (typeof TOKENS)[0] {
  const token = TOKENS.find((t) => t.id === id);
  if (!token) throw new Error(`Token with ID ${id} not found`);
  return token;
}
