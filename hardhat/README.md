# Tornado MASP Hardhat Project

This project contains the smart contracts and deployment scripts for the Tornado Multi-Asset Shielded Pool (MASP) implementation. It includes the TornadoMASP contract, MASPVerifier for zero-knowledge proof verification, and mock ERC20 tokens for testing.

## Getting Started

First, install the dependencies:

```shell
cd hardhat
npm install
```

Start a local Hardhat node:
```shell
npx hardhat node
```

## Deployment Scripts

The project includes several deployment scripts:

### Complete Deployment

To deploy all contracts in the correct order (verifier, MASP, and mock tokens) and update configuration files:

```shell
npx hardhat run scripts/deploy-all.ts --network localhost
```

This script performs the following steps:
1. Deploys the MASPVerifier contract
2. Deploys the TornadoMASP contract with the verifier address
3. Updates the tornado address in deploy-mock-tokens.ts
4. Deploys mock ERC20 tokens and registers them with TornadoMASP
5. Updates the TORNADO_CONTRACT_ADDRESS in constants/contract.ts

### Individual Deployment Scripts

You can also run the individual deployment scripts if needed:

```shell
# Deploy only the MASPVerifier
npx hardhat run scripts/deploy-verifier.ts --network localhost

# Deploy only the TornadoMASP (requires verifier address)
npx hardhat run scripts/deploy-masp.ts --network localhost

# Deploy mock tokens and register them with TornadoMASP
npx hardhat run scripts/deploy-mock-tokens.ts --network localhost
```

## Testing

Run the tests to verify the contracts are working correctly:

```shell
npx hardhat test
# or with gas reporting
REPORT_GAS=true npx hardhat test
```

## Contract Verification

After deployment to a public network, you can verify the contracts:

```shell
npx hardhat verify --network <network> <deployed-contract-address> <constructor-arguments>
```
