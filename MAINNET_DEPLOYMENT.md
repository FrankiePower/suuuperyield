# SuperYield Mainnet Deployment Record

**Deployment Date**: November 16, 2025
**Network**: HyperEVM Mainnet (Chain ID 999)
**Deployer**: 0x08026df060a235f7171e7abd6af2de02b98730f6f697855a344d1f65e2df3887

## Contract Addresses

| Contract | Address | Transaction |
|----------|---------|-------------|
| RolesAuthority | `0x86f11a6db84635f566430e7cB0224F6C4ac6a28F` | Confirmed |
| SuperYieldVault | `0x8851862f714f2984c3E3Bcfc9Fafb57D67dB6845` | Confirmed |
| YieldAccountant | `0xf4F3b37236Dd3e0bbcDe9EAA1C6553220A30B9aE` | Confirmed |
| StrategyManager | `0x4E46c6826166AAD7ed6Ca0cdFCcd46818ea602aa` | Confirmed |
| DepositTeller | `0x2f245E60EE78Acb2847D8FE1336725307C7B38Df` | Confirmed |

## Deployment Summary

- **Total Transactions**: 12
- **Total Gas Used**: 0.0009523529 HYPE
- **Deployment Script**: `DeploySuperYield.s.sol`
- **Broadcast File**: `/packages/foundry/broadcast/DeploySuperYield.s.sol/999/run-latest.json`

## Network Details

- **RPC URL**: https://rpc.hyperliquid.xyz/evm
- **Explorer**: https://explorer.hyperliquid.xyz
- **Block Configuration**: Big Blocks (30M gas limit)

## Configuration Files Updated

- ✅ `/packages/nextjs/contracts/deployedContracts.ts`
- ✅ `/packages/nextjs/.env.local`
- ✅ `/packages/nextjs/scaffold.config.ts`
- ✅ `/packages/nextjs/utils/chains.ts`

## Verification

All contracts deployed successfully to HyperEVM mainnet and are ready for integration with the frontend.
