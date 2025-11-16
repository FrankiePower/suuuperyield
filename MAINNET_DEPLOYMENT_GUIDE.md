# SuperYield Mainnet Deployment Guide

## Prerequisites

### 1. Required Accounts & API Keys

- [ ] **HyperEVM Mainnet RPC**: Get from [Alchemy](https://www.alchemy.com/rpc/hyperliquid) or use public RPC
- [ ] **Deployer Wallet**: Funded with sufficient HYPE tokens for gas
  - Recommended: 5-10 HYPE for deployment + testing
  - Must have private key securely stored
- [ ] **GlueX API Credentials**: Already have (from .env)
- [ ] **Block Explorer**: For contract verification (if available)

### 2. Environment Setup

```bash
# Navigate to foundry package
cd /Users/user/SuperFranky/suuuperyield/packages/foundry

# Create mainnet .env (copy from .env and update)
cp .env .env.mainnet
```

### 3. Update .env.mainnet

```bash
# Mainnet RPC
HYPEREVM_RPC_MAINNET_URL=https://api.hyperliquid.xyz/evm
# OR use Alchemy:
# HYPEREVM_RPC_MAINNET_URL=https://hyperliquid.g.alchemy.com/v2/YOUR_API_KEY

# Deployer wallet (SECURE THIS!)
DEPLOYER_PRIVATE_KEY=0x...  # Your funded mainnet wallet

# Agent wallet (SECURE THIS!)
AGENT_DEFAULT_PRIVATE_KEY=0x...  # Separate wallet for AI agent

# Keep existing API keys
GLUEX_API_KEY=XYSzoBEgRQz0in19QSGgruzMCNAY6n0N
GLUEX_UNIQUE_PID=432b22ed26f1c5b0b5b6850494a44aeb3b2228302cd53c2888f02fc6d1d75cb3
```

---

## Step 1: Pre-Deployment Checklist

### Verify Contract Compilation

```bash
# Clean and rebuild
forge clean
forge build

# Expected output: All contracts compile successfully
# - SuperYieldVault.sol
# - StrategyManager.sol
# - DepositTeller.sol
# - YieldAccountant.sol
# - RolesAuthority (from boring-vault)
```

### Run Full Test Suite

```bash
# Run all tests
forge test -vvv

# Expected: All tests pass (11/11)
# If any fail, DO NOT PROCEED - fix tests first
```

### Review GlueX Mainnet Vault Addresses

**CRITICAL**: Update the vault addresses in contracts if they differ on mainnet!

Check current addresses in:
- `contracts/SuperYieldVault.sol` (line 29-35)
- `contracts/StrategyManager.sol` (line 25-31)

**Mainnet GlueX Vaults** (verify these are correct):
```solidity
address[5] public glueXVaults = [
    0xE25514992597786E07872e6C5517FE1906C0CAdD,  // Vault 1
    0xCdc3975df9D1cf054F44ED238Edfb708880292EA,  // Vault 2
    0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a,  // Vault 3
    0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7,  // Vault 4
    0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be   // Vault 5
];
```

⚠️ **Action Required**:
1. Visit GlueX documentation or contact team to confirm mainnet addresses
2. If different, update both contract files before deployment

---

## Step 2: Update Deployment Script for Mainnet

### Review DeploySuperYield.s.sol

```bash
# Open deployment script
cat script/DeploySuperYield.s.sol
```

Verify these parameters:
- Owner address (should be your multisig or secure wallet)
- Decimals (18 for most tokens)
- Initial share token name/symbol

### Optional: Customize Deployment Parameters

```solidity
// In script/DeploySuperYield.s.sol

// Update these if needed:
string memory vaultName = "SuperYield Vault";
string memory vaultSymbol = "syETH";
uint8 decimals = 18;
```

---

## Step 3: Deploy to Mainnet

### Enable Big Blocks (REQUIRED)

HyperEVM requires big blocks for contract deployment (30M gas vs 2M default).

```bash
# Load environment variables
source .env.mainnet

# Enable big blocks
echo "y" | npx @layerzerolabs/hyperliquid-composer set-block \
  --size big \
  --network mainnet \
  --private-key $DEPLOYER_PRIVATE_KEY

# Expected output: "Transaction successful"
```

**Note**: Big blocks mine at ~1 transaction per minute. Deployment will take 10-15 minutes.

### Dry Run (Simulation)

```bash
# Simulate deployment WITHOUT broadcasting
forge script script/DeploySuperYield.s.sol:DeploySuperYield \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --legacy

# Check output for:
# ✅ All contracts deploy successfully
# ✅ No revert errors
# ✅ Gas estimates are reasonable
# ✅ Contract addresses are generated
```

### Execute Deployment

**⚠️ FINAL CHECK BEFORE PROCEEDING**:
- [ ] Deployer wallet has sufficient HYPE for gas
- [ ] Big blocks enabled
- [ ] Simulation passed
- [ ] GlueX vault addresses verified
- [ ] Agent wallet private key secured

```bash
# MAINNET DEPLOYMENT - IRREVERSIBLE!
export AGENT_DEFAULT_PRIVATE_KEY=$AGENT_DEFAULT_PRIVATE_KEY

forge script script/DeploySuperYield.s.sol:DeploySuperYield \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --legacy \
  --skip-simulation

# This will take 10-15 minutes due to big blocks (1 tx/minute)
# Monitor progress in terminal
```

### Expected Output

```
== Logs ==
  Deploying SuperYield contracts...
  Deployer address: 0x...

1. Deploying RolesAuthority...
  RolesAuthority deployed at: 0x...

2. Deploying SuperYieldVault...
  SuperYieldVault deployed at: 0x...

3. Deploying YieldAccountant...
  YieldAccountant deployed at: 0x...

4. Deploying StrategyManager...
  StrategyManager deployed at: 0x...

5. Deploying DepositTeller...
  DepositTeller deployed at: 0x...

6. Setting up roles and permissions...
  Roles configured successfully

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.
```

### Save Deployment Addresses

```bash
# Deployment info is automatically saved to:
cat deployments/superyield.md

# Also saved in broadcast directory:
cat broadcast/DeploySuperYield.s.sol/999/run-latest.json  # Chain ID 999 for mainnet
```

---

## Step 4: Post-Deployment Verification

### Verify Contract Deployment

```bash
# Check each contract has code deployed
cast code <ROLES_AUTHORITY_ADDRESS> --rpc-url $HYPEREVM_RPC_MAINNET_URL
cast code <VAULT_ADDRESS> --rpc-url $HYPEREVM_RPC_MAINNET_URL
cast code <ACCOUNTANT_ADDRESS> --rpc-url $HYPEREVM_RPC_MAINNET_URL
cast code <MANAGER_ADDRESS> --rpc-url $HYPEREVM_RPC_MAINNET_URL
cast code <TELLER_ADDRESS> --rpc-url $HYPEREVM_RPC_MAINNET_URL

# Each should return bytecode (long hex string starting with 0x608060405...)
# If returns 0x, deployment failed!
```

### Verify Roles Configuration

```bash
# Check vault owner
cast call <VAULT_ADDRESS> "owner()" --rpc-url $HYPEREVM_RPC_MAINNET_URL

# Check authority is set
cast call <VAULT_ADDRESS> "authority()" --rpc-url $HYPEREVM_RPC_MAINNET_URL

# Verify agent wallet has MANAGER_ROLE (role 0)
cast call <ROLES_AUTHORITY_ADDRESS> \
  "doesUserHaveRole(address,uint8)(bool)" \
  <AGENT_WALLET_ADDRESS> \
  0 \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL

# Expected: true
```

### Verify GlueX Vaults Whitelisted

```bash
# Check whitelisted vaults
cast call <VAULT_ADDRESS> "getWhitelistedVaults()(address[5])" \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL

# Expected: Array of 5 GlueX vault addresses

# Verify each vault individually
cast call <VAULT_ADDRESS> \
  "isVaultWhitelisted(address)(bool)" \
  0xE25514992597786E07872e6C5517FE1906C0CAdD \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL

# Expected: true (repeat for all 5 vaults)
```

---

## Step 5: Update Frontend Environment

### Update .env.local (Next.js)

```bash
cd /Users/user/SuperFranky/suuuperyield/packages/nextjs

# Edit .env.local
nano .env.local
```

**Update these values**:

```bash
# Blockchain (HyperEVM Mainnet)
HYPEREVM_RPC_URL=https://api.hyperliquid.xyz/evm
NEXT_PUBLIC_CHAIN_ID=999  # HyperEVM mainnet chain ID

# Agent Wallet (MAINNET - SECURE THIS!)
AGENT_DEFAULT_PRIVATE_KEY=0x...  # Your mainnet agent wallet
AGENT_ALLOW_ONCHAIN=true

# Deployed Contracts (HyperEVM Mainnet - Chain ID 999)
NEXT_PUBLIC_ROLES_AUTHORITY=0x...  # From deployment output
NEXT_PUBLIC_VAULT=0x...            # From deployment output
NEXT_PUBLIC_ACCOUNTANT=0x...       # From deployment output
NEXT_PUBLIC_MANAGER=0x...          # From deployment output
NEXT_PUBLIC_TELLER=0x...           # From deployment output

# GlueX APIs (same as before)
GLUEX_API_KEY=XYSzoBEgRQz0in19QSGgruzMCNAY6n0N
GLUEX_UNIQUE_PID=432b22ed26f1c5b0b5b6850494a44aeb3b2228302cd53c2888f02fc6d1d75cb3

# AI Providers (same as before)
OPENAI_KEY=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
GPT_MODEL=gpt-4o
GEMINI_API_KEY=AIzaSyC_31aV9SA-CMcIaXMx5fpIEWsoRXBcp20

# Authentication
NEXT_PUBLIC_PRIVY_APP_ID=cmi0l792y01n7kz0c8oqkxmip
```

---

## Step 6: Switch Back to Small Blocks

**IMPORTANT**: After deployment, switch back to small blocks for normal operations.

```bash
echo "y" | npx @layerzerolabs/hyperliquid-composer set-block \
  --size small \
  --network mainnet \
  --private-key $DEPLOYER_PRIVATE_KEY
```

Small blocks provide:
- Faster transaction confirmation (~2-3 seconds)
- Lower gas costs
- Better for normal operations

**Only use big blocks for**:
- Contract deployments
- Large batch transactions
- Merkle tree updates

---

## Step 7: Initial Testing on Mainnet

### Test Read Operations

```bash
# Check vault total supply
cast call <VAULT_ADDRESS> "totalSupply()(uint256)" \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL

# Should return 0 (no deposits yet)

# Check share price
cast call <ACCOUNTANT_ADDRESS> "getRate()(uint256)" \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL

# Should return base rate (1e18)
```

### Test Small Deposit (Recommended)

```bash
# Use agent wallet to make a small test deposit
cast send <TELLER_ADDRESS> \
  "deposit(address,uint256,address)" \
  <ASSET_ADDRESS> \
  1000000000000000000 \
  <AGENT_WALLET_ADDRESS> \
  --private-key $AGENT_DEFAULT_PRIVATE_KEY \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL \
  --value 1000000000000000000

# Monitor transaction
# Verify shares minted
```

---

## Step 8: Frontend Testing

### Start Development Server

```bash
cd packages/nextjs
pnpm dev
```

Visit `http://localhost:3001/superyield`

**Test Flow**:
1. [ ] Connect wallet (Privy)
2. [ ] View yield opportunities (should show real GlueX vaults)
3. [ ] Check vault status (should show deployed vault)
4. [ ] Test deposit (small amount)
5. [ ] Test AI optimization
6. [ ] Verify contract interactions work

---

## Step 9: Security Checklist

### Before Going Live

- [ ] **Transfer Ownership**: Move vault ownership from deployer to multisig
  ```bash
  cast send <VAULT_ADDRESS> \
    "transferOwnership(address)" \
    <MULTISIG_ADDRESS> \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --rpc-url $HYPEREVM_RPC_MAINNET_URL
  ```

- [ ] **Secure Private Keys**:
  - Store deployer key in hardware wallet or vault
  - Store agent key in secure key management system
  - Remove from .env files on production servers

- [ ] **Rate Limiting**: Add API rate limits to prevent abuse

- [ ] **Monitoring**: Set up alerts for:
  - Large withdrawals
  - Abnormal APY changes
  - Failed transactions
  - Agent wallet balance low

- [ ] **Audit**: Consider security audit before significant TVL

---

## Step 10: Deploy to Production (Vercel/Railway)

### Environment Variables

Add all variables from `.env.local` to your hosting platform:

**Vercel**:
```bash
vercel env add NEXT_PUBLIC_VAULT production
vercel env add AGENT_DEFAULT_PRIVATE_KEY production
# ... etc for all variables
```

**Railway**:
- Add in Railway dashboard under "Variables"
- Mark sensitive vars as "Secret"

### Deploy

```bash
# Vercel
vercel --prod

# Railway
railway up
```

---

## Troubleshooting

### Issue: "Exceeds block gas limit"
**Solution**: Switch to big blocks (see Step 3)

### Issue: "Nonce too high"
**Solution**:
```bash
# Reset nonce by sending a transaction with correct nonce
cast nonce <YOUR_ADDRESS> --rpc-url $HYPEREVM_RPC_MAINNET_URL
```

### Issue: Contract has no code
**Solution**: Deployment failed. Check:
- Sufficient gas/HYPE in deployer wallet
- Big blocks enabled
- RPC endpoint working

### Issue: "Unauthorized" when agent tries to manage
**Solution**: Agent wallet doesn't have MANAGER_ROLE
```bash
# Grant role (as owner)
cast send <ROLES_AUTHORITY_ADDRESS> \
  "setUserRole(address,uint8,bool)" \
  <AGENT_WALLET> \
  0 \
  true \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL
```

---

## Emergency Procedures

### Pause Contract (if needed)
```bash
# Pause deposits (owner only)
cast send <TELLER_ADDRESS> "pause()" \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL
```

### Emergency Withdrawal
```bash
# As owner, can force-withdraw from vault
cast send <VAULT_ADDRESS> \
  "emergencyWithdraw(address,uint256)" \
  <ASSET> \
  <AMOUNT> \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url $HYPEREVM_RPC_MAINNET_URL
```

---

## Post-Deployment Checklist

- [ ] All contracts deployed successfully
- [ ] Contract addresses saved securely
- [ ] Roles configured correctly
- [ ] GlueX vaults whitelisted
- [ ] Frontend environment updated
- [ ] Small test deposit successful
- [ ] Frontend tested end-to-end
- [ ] Ownership transferred to multisig
- [ ] Private keys secured
- [ ] Monitoring set up
- [ ] Production deployment successful
- [ ] Switch back to small blocks

---

## Support & Resources

- **HyperEVM Docs**: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm
- **GlueX Docs**: https://docs.gluex.xyz
- **BoringVault**: https://github.com/Se7en-Seas/boring-vault
- **Foundry Book**: https://book.getfoundry.sh

---

## Quick Reference

**Mainnet Chain ID**: 999
**Testnet Chain ID**: 998

**Default Gas Settings**:
- Small blocks: 2M gas limit
- Big blocks: 30M gas limit
- Block time: ~2-3 seconds

**Contract Addresses** (fill after deployment):
```
RolesAuthority: 0x...
SuperYieldVault: 0x...
YieldAccountant: 0x...
StrategyManager: 0x...
DepositTeller: 0x...
```

---

**Created**: 2025-11-16
**Last Updated**: 2025-11-16
**Version**: 1.0
