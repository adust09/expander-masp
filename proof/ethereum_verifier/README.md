# Ethereum Verification for MASP Circuit

This directory contains the artifacts needed to verify MASP (Multi Asset Shielded Pool) circuit proofs on Ethereum.

## Files

- `MASPVerifier.sol`: Solidity contract that verifies proofs on Ethereum
- `proving_key.bin`: Key used to generate proofs
- `verification_key.bin`: Key used to verify proofs
- `proof.bin`: Sample proof generated from test data
- `calldata_instructions.txt`: Instructions for using the proof with the verifier

## How to Use

### 1. Deploy the Verifier Contract

Copy the `MASPVerifier.sol` file to your Hardhat/Truffle project's contracts directory and deploy it:

```bash
# Using Hardhat
npx hardhat run scripts/deploy-verifier.js --network <your-network>
```

### 2. Generate Proofs

To generate a proof for a specific deposit or withdrawal:

```bash
cd proof
go run main.go --generate-proof --secret <secret> --nullifier <nullifier> --asset-id <asset-id> --amount <amount>
```

This will generate a proof in the `ethereum_verifier` directory.

### 3. Verify Proofs On-chain

Use the deployed verifier contract to verify proofs:

```javascript
// Using ethers.js
const verifier = await ethers.getContractAt("Verifier", verifierAddress);
const result = await verifier.verifyProof(proof, publicInputs);
```

## Integration with TornadoMASP Contract

To integrate with the TornadoMASP contract:

1. Deploy the verifier contract
2. Update the TornadoMASP contract to use the verifier for deposit and withdrawal verification
3. When a user wants to withdraw, generate a proof and submit it to the TornadoMASP contract

## Technical Details

- The circuit uses the BN254 (alt_bn128) curve, which is supported by Ethereum precompiles
- The proving system is Groth16, which is efficient for on-chain verification
- The verifier contract uses Ethereum's pairing precompiles for efficient verification

## Security Considerations

- Keep the proving key secure, as it can be used to generate fake proofs if the toxic waste is known
- The verification key is public and can be safely shared
- Ensure that nullifiers are properly handled to prevent double-spending
