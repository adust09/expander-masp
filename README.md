# Tornado Multi-Asset Shielded Pool (MASP)

This project implements a privacy-focused Multi-Asset Shielded Pool inspired by Tornado Cash, with zero-knowledge proof verification. It allows users to deposit and withdraw ETH and ERC20 tokens while maintaining privacy.

## Project Structure

- **Frontend**: Next.js application for interacting with the MASP contracts
- **Smart Contracts**: Solidity contracts in the `hardhat` directory
- **Proof Generation**: Zero-knowledge proof generation in the `proof` directory

## Features

- Deposit and withdraw ETH and ERC20 tokens
- Privacy-preserving transactions using zero-knowledge proofs
- Multi-asset support in a single shielded pool
- Web interface for easy interaction

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- Go 1.20 or later (for proof generation)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install frontend dependencies
npm install

# Setup node
cd hardhat
npx next node
```

>We have a deploy script for smart contract, you can see the README.md in hardhat dir.

### Smart Contract Deployment

See the [Hardhat README](./hardhat/README.md) for detailed instructions on deploying the smart contracts.

### Running the Frontend

Start the development server:

```bash
npx next build
npx next start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## User Flow

See the [User Flow Documentation](./docs/user-flow.md) for a detailed explanation of the deposit and withdrawal process, including proof generation and verification.

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/getting-started/)
- [Zero-Knowledge Proofs](https://z.cash/technology/zksnarks/)
