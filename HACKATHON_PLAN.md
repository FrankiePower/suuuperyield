# GlueX Yield Optimizer Hackathon - Implementation Plan

## Executive Summary

**Project**: SuperYield - AI-Powered Yield Optimizer using GlueX APIs
**Bounty**: $3,000 (Winner takes all)
**Timeline**: 10-20 hours estimated
**Deadline**: [To be confirmed]

**Hackathon Requirements**:
1. Use ERC-7540 or BoringVault for asset custody
2. Use GlueX Yields API to identify highest yield opportunities
3. Use GlueX Router API to reallocate assets
4. Include GlueX Vaults in whitelisted allocation targets

**Our Approach**: Combine AJEY's AI agent architecture with BoringVault custody + GlueX APIs for a production-ready yield optimizer on HyperEVM.

---

## 1. Architecture Design

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  - User deposits/withdrawals                                     │
│  - Real-time AI reasoning display                               │
│  - Yield opportunity dashboard                                   │
│  - Activity feed with SSE streaming                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API Routes                          │
│  /api/gluex/yields     - Fetch yield opportunities              │
│  /api/agents/optimize  - Trigger AI optimization                │
│  /api/vault/status     - Vault state and metrics                │
└────────────────┬────────────────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        ▼                  ▼
┌──────────────┐    ┌──────────────────┐
│  AI Agents   │    │  GlueX APIs      │
│  (GPT-5 /    │    │  - Yields API    │
│   Gemini)    │    │  - Router API    │
└──────┬───────┘    └────────┬─────────┘
       │                     │
       └──────────┬──────────┘
                  ▼
         ┌──────────────────┐
         │  Smart Contracts │
         │  - BoringVault   │
         │  - Manager       │
         │  - Teller        │
         │  - Accountant    │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  HyperEVM        │
         │  - GlueX Vaults  │
         │  - Aave v3       │
         │  - Other DeFi    │
         └──────────────────┘
```

### Component Breakdown

**1. Smart Contracts (BoringVault Architecture)**

```solidity
contracts/
├── SuperYieldVault.sol           # Main vault (BoringVault core)
├── StrategyManager.sol            # Manager with merkle verification
├── DepositTeller.sol              # User entry/exit (Teller)
├── YieldAccountant.sol            # Exchange rate oracle (Accountant)
├── decoders/
│   ├── GlueXVaultDecoder.sol     # Sanitizer for GlueX vaults
│   ├── AaveDecoder.sol            # Sanitizer for Aave
│   └── RouterDecoder.sol          # Sanitizer for GlueX Router
└── interfaces/
    ├── IGlueXVault.sol
    └── IGlueXRouter.sol
```

**2. AI Agent System (AJEY-inspired)**

```typescript
lib/agents/
├── openai.ts                      # GPT-5 integration
├── gemini.ts                      # Gemini 2.5 integration
├── yield-optimizer.ts             # Yield optimization agent
├── wallet.ts                      # Custodial agent wallet
└── workflow.ts                    # On-chain execution
```

**3. GlueX Integration Services**

```typescript
lib/services/
├── gluex-yields.ts                # Yields API client
├── gluex-router.ts                # Router API client
├── vault-manager.ts               # BoringVault interface
└── market-aggregator.ts           # Aggregate all yield sources
```

**4. Frontend Components**

```typescript
components/
├── VaultDashboard.tsx             # Main UI (inspired by AJEY ProductCard)
├── YieldOpportunities.tsx         # Display available yields
├── AIReasoningPanel.tsx           # Live agent reasoning trace
├── ActivityFeed.tsx               # Transaction history
└── DepositWithdraw.tsx            # User actions
```

---

## 2. Core Requirements Implementation

### Requirement 1: ERC-7540 or BoringVault Custody

**Decision: BoringVault Architecture**

**Rationale**:
- Better fit for active yield optimization
- Proven security ($3B TVL in production)
- Granular control via merkle trees
- MEV protection built-in
- Supports multi-protocol strategies

**Implementation**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {BoringVault} from "boring-vault/BoringVault.sol";
import {Auth} from "boring-vault/Auth.sol";

contract SuperYieldVault is BoringVault {
    constructor(
        address _owner,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) BoringVault(_owner, _name, _symbol, _decimals) {}
}
```

**Whitelisting GlueX Vaults**:

```solidity
contract StrategyManager is ManagerWithMerkleVerification {
    // GlueX vault addresses from task requirements
    address[] public glueXVaults = [
        0xe25514992597786e07872e6c5517fe1906c0cadd,
        0xcdc3975df9d1cf054f44ed238edfb708880292ea,
        0x8f9291606862eef771a97e5b71e4b98fd1fa216a,
        0x9f75eac57d1c6f7248bd2aede58c95689f3827f7,
        0x63cf7ee583d9954febf649ad1c40c97a6493b1be
    ];

    mapping(address => bool) public isWhitelistedVault;

    constructor() {
        for (uint i = 0; i < glueXVaults.length; i++) {
            isWhitelistedVault[glueXVaults[i]] = true;
        }
    }

    modifier onlyWhitelistedVault(address vault) {
        require(isWhitelistedVault[vault], "Vault not whitelisted");
        _;
    }
}
```

**Merkle Tree for GlueX Operations**:

```javascript
// scripts/generate-merkle-tree.js
const { MerkleTree } = require('merkletreejs');
const { keccak256 } = require('ethers');

// Define allowed operations
const allowedActions = [
  // GlueX Vault deposits
  {
    target: '0xe25514992597786e07872e6c5517fe1906c0cadd',
    selector: '0xb6b55f25', // deposit(uint256,address)
    decoder: GLUEX_DECODER_ADDRESS,
    sendEth: false
  },
  // GlueX Vault withdrawals
  {
    target: '0xe25514992597786e07872e6c5517fe1906c0cadd',
    selector: '0x2e1a7d4d', // withdraw(uint256)
    decoder: GLUEX_DECODER_ADDRESS,
    sendEth: false
  },
  // GlueX Router swaps
  {
    target: GLUEX_ROUTER_ADDRESS,
    selector: '0x...', // Router execute function
    decoder: ROUTER_DECODER_ADDRESS,
    sendEth: true
  }
  // ... repeat for all 5 GlueX vaults
];

// Generate merkle tree
const leaves = allowedActions.map(action =>
  keccak256(
    ethers.solidityPacked(
      ['address', 'bytes4', 'address', 'bool'],
      [action.target, action.selector, action.decoder, action.sendEth]
    )
  )
);

const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const root = tree.getHexRoot();

console.log('Merkle Root:', root);
// Store this root in StrategyManager.manageRoot[strategistAddress]
```

### Requirement 2: Use GlueX Yields API

**Implementation**:

```typescript
// lib/services/gluex-yields.ts

interface YieldOpportunity {
  vaultAddress: string;
  chain: string;
  apy: number;
  tvl: number;
  availableLiquidity: number;
  dilutedApy: number;  // After our deposit
  sharpe: number;       // Risk-adjusted metric
}

export async function fetchGlueXYields(
  depositAmount: string
): Promise<YieldOpportunity[]> {
  const GLUEX_VAULTS = [
    '0xe25514992597786e07872e6c5517fe1906c0cadd',
    '0xcdc3975df9d1cf054f44ed238edfb708880292ea',
    '0x8f9291606862eef771a97e5b71e4b98fd1fa216a',
    '0x9f75eac57d1c6f7248bd2aede58c95689f3827f7',
    '0x63cf7ee583d9954febf649ad1c40c97a6493b1be'
  ];

  const opportunities = await Promise.all(
    GLUEX_VAULTS.map(async (vaultAddress) => {
      // Fetch historical APY
      const historicalYield = await axios.post(
        'https://yield-api.gluex.xyz/historical-apy',
        {
          chain: 'hyperevm',  // or appropriate chain
          pool_address: vaultAddress
        }
      );

      // Fetch diluted APY (with our deposit amount)
      const dilutedYield = await axios.post(
        'https://yield-api.gluex.xyz/diluted-apy',
        {
          chain: 'hyperevm',
          pool_address: vaultAddress,
          input_amount: depositAmount
        }
      );

      // Fetch TVL
      const tvlData = await axios.post(
        'https://yield-api.gluex.xyz/tvl',
        {
          chain: 'hyperevm',
          pool_address: vaultAddress
        }
      );

      // Calculate Sharpe ratio (simplified)
      // Higher APY, higher TVL = better Sharpe
      const sharpe = dilutedYield.diluted_yield.apy /
                     Math.log(tvlData.tvl.tvl + 1);

      return {
        vaultAddress,
        chain: 'hyperevm',
        apy: historicalYield.historic_yield.apy,
        tvl: tvlData.tvl.tvl,
        availableLiquidity: tvlData.tvl.tvl, // Simplification
        dilutedApy: dilutedYield.diluted_yield.apy,
        sharpe
      };
    })
  );

  // Sort by Sharpe ratio (best risk-adjusted yield)
  return opportunities.sort((a, b) => b.sharpe - a.sharpe);
}
```

**API Route**:

```typescript
// app/api/gluex/yields/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const amount = searchParams.get('amount') || '1000000000000000000'; // 1 ETH default

  try {
    const opportunities = await fetchGlueXYields(amount);

    return Response.json({
      success: true,
      opportunities,
      timestamp: Date.now()
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Requirement 3: Use GlueX Router API

**Implementation**:

```typescript
// lib/services/gluex-router.ts

interface RouterQuote {
  router: string;
  calldata: string;
  value: string;
  outputAmount: string;
  minOutputAmount: string;
}

export async function getGlueXRouterQuote(
  fromToken: string,
  toToken: string,
  amount: string,
  userAddress: string
): Promise<RouterQuote> {
  const response = await axios.post(
    'https://router.gluex.xyz/v1/quote',
    {
      chainID: 'hyperevm',
      inputToken: fromToken,
      outputToken: toToken,
      inputAmount: amount,
      orderType: 'SELL',
      userAddress: userAddress,
      outputReceiver: userAddress,
      uniquePID: process.env.GLUEX_UNIQUE_PID,
      isPermit2: false,
      isPartialFill: false
    },
    {
      headers: {
        'x-api-key': process.env.GLUEX_API_KEY
      }
    }
  );

  return {
    router: response.data.result.router,
    calldata: response.data.result.calldata,
    value: response.data.result.value,
    outputAmount: response.data.result.outputAmount,
    minOutputAmount: response.data.result.minOutputAmount
  };
}

export async function executeReallocation(
  currentVault: string,
  targetVault: string,
  amount: string
): Promise<string> {
  // 1. Withdraw from current vault
  const agentWallet = getAgentWallet();
  const vaultContract = getVaultContract();

  // Execute via BoringVault.manage()
  const withdrawCalldata = encodeFunctionData({
    abi: glueXVaultAbi,
    functionName: 'withdraw',
    args: [amount]
  });

  await vaultContract.write.manage([
    currentVault,
    withdrawCalldata,
    0n
  ]);

  // 2. Get quote for any necessary swap
  const currentAsset = await getCurrentVaultAsset(currentVault);
  const targetAsset = await getTargetVaultAsset(targetVault);

  if (currentAsset !== targetAsset) {
    const quote = await getGlueXRouterQuote(
      currentAsset,
      targetAsset,
      amount,
      vaultContract.address
    );

    // 3. Execute swap via BoringVault.manage()
    await vaultContract.write.manage([
      quote.router,
      quote.calldata,
      BigInt(quote.value)
    ]);
  }

  // 4. Deposit to target vault
  const depositCalldata = encodeFunctionData({
    abi: glueXVaultAbi,
    functionName: 'deposit',
    args: [amount, vaultContract.address]
  });

  const tx = await vaultContract.write.manage([
    targetVault,
    depositCalldata,
    0n
  ]);

  return tx;
}
```

### Requirement 4: Include GlueX Vaults in Whitelist

**Already implemented in Requirement 1** - All 5 GlueX vaults are:
- Added to `glueXVaults` array
- Marked in `isWhitelistedVault` mapping
- Included in merkle tree permissions
- Available for AI agent allocation

---

## 3. AI Agent Integration

### Agent Architecture (AJEY-inspired)

```typescript
// lib/agents/yield-optimizer.ts

interface YieldOptimizationContext {
  vaultState: {
    totalAssets: string;
    idleAssets: string;
    currentAllocations: Allocation[];
  };
  opportunities: YieldOpportunity[];
  constraints: {
    minTVL: number;
    maxDilution: number;  // Max acceptable APY dilution
    minSharpe: number;    // Min risk-adjusted return
  };
}

interface AllocationDecision {
  targetVault: string;
  amount: string;
  reasoning: string;
  expectedAPY: number;
  swapRequired: boolean;
}

export async function runYieldOptimizationAgent(
  context: YieldOptimizationContext
): Promise<AllocationDecision | null> {
  const systemPrompt = `
You are a DeFi yield optimization agent. Your goal is to maximize risk-adjusted returns (Sharpe ratio) for user capital.

RULES:
1. Only allocate to vaults with TVL > $100k (reduces smart contract risk)
2. Prefer higher Sharpe ratios (balance yield vs risk)
3. Consider APY dilution - avoid overcrowding small pools
4. Diversification: Don't put >50% in single vault
5. Always explain your reasoning

AVAILABLE VAULTS:
${JSON.stringify(context.opportunities, null, 2)}

CURRENT VAULT STATE:
${JSON.stringify(context.vaultState, null, 2)}

TASK:
Analyze the yield opportunities and decide optimal allocation for idle assets.
Return your decision in the following JSON format.
`;

  // Use OpenAI or Gemini with structured output
  const response = await openai.chat.completions.create({
    model: process.env.GPT_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'What is the optimal yield allocation?' }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'allocation_decision',
        schema: {
          type: 'object',
          properties: {
            targetVault: { type: 'string' },
            amount: { type: 'string' },
            reasoning: { type: 'string' },
            expectedAPY: { type: 'number' },
            swapRequired: { type: 'boolean' }
          },
          required: ['targetVault', 'amount', 'reasoning', 'expectedAPY']
        }
      }
    }
  });

  const decision = JSON.parse(response.choices[0].message.content);

  // Validate decision
  const targetOpportunity = context.opportunities.find(
    o => o.vaultAddress === decision.targetVault
  );

  if (!targetOpportunity) {
    throw new Error('Invalid target vault selected');
  }

  if (targetOpportunity.tvl < context.constraints.minTVL) {
    throw new Error('Target vault TVL too low');
  }

  return decision;
}
```

### Real-Time Reasoning Display

```typescript
// components/AIReasoningPanel.tsx (AJEY-inspired)

export function AIReasoningPanel() {
  const [trace, setTrace] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  useEffect(() => {
    const eventSource = new EventSource('/api/activity/stream');

    eventSource.addEventListener('reasoning:trace', (e) => {
      const { line } = JSON.parse(e.data);
      setTrace(prev => [...prev, line].slice(-8)); // Last 8 lines
    });

    eventSource.addEventListener('reasoning:complete', (e) => {
      const { status: newStatus } = JSON.parse(e.data);
      setStatus(newStatus);

      if (newStatus === 'success') {
        setTimeout(() => setTrace([]), 10000); // Clear after 10s
      }
    });

    return () => eventSource.close();
  }, []);

  if (trace.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/20 bg-black/50 backdrop-blur-xl p-6">
      <h3 className="text-lg font-semibold mb-4">AI Agent Reasoning</h3>
      <div className="space-y-2 font-mono text-sm">
        {trace.map((line, i) => (
          <div
            key={i}
            className="animate-slideUpFade"
            style={{ opacity: Math.max(0.4, 1 - (trace.length - i) * 0.1) }}
          >
            {line}
          </div>
        ))}
      </div>
      {status === 'success' && (
        <div className="mt-4 text-green-400 flex items-center gap-2">
          ✓ Optimization complete
        </div>
      )}
    </div>
  );
}
```

---

## 4. Frontend Implementation

### Main Dashboard

```typescript
// app/home/page.tsx

export default function Dashboard() {
  const [vaultState, setVaultState] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Fetch vault state
  useEffect(() => {
    async function fetchVaultState() {
      const response = await fetch('/api/vault/status');
      const data = await response.json();
      setVaultState(data);
    }
    fetchVaultState();
    const interval = setInterval(fetchVaultState, 30000); // Every 30s
    return () => clearInterval(interval);
  }, []);

  // Fetch yield opportunities
  useEffect(() => {
    async function fetchOpportunities() {
      const response = await fetch('/api/gluex/yields?amount=1000000000000000000');
      const data = await response.json();
      setOpportunities(data.opportunities);
    }
    fetchOpportunities();
    const interval = setInterval(fetchOpportunities, 60000); // Every 60s
    return () => clearInterval(interval);
  }, []);

  // Trigger optimization
  async function handleOptimize() {
    setIsOptimizing(true);
    try {
      await fetch('/api/agents/optimize', { method: 'POST' });
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Account Status Bar */}
      <AccountStatusBar />

      {/* Vault Overview */}
      <VaultOverview
        totalAssets={vaultState?.totalAssets}
        userShares={vaultState?.userShares}
        currentAPY={vaultState?.weightedAPY}
      />

      {/* Yield Opportunities */}
      <YieldOpportunities
        opportunities={opportunities}
        onOptimize={handleOptimize}
        isOptimizing={isOptimizing}
      />

      {/* AI Reasoning Panel */}
      <AIReasoningPanel />

      {/* Deposit/Withdraw */}
      <DepositWithdraw vaultAddress={VAULT_ADDRESS} />

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  );
}
```

### Yield Opportunities Display

```typescript
// components/YieldOpportunities.tsx

interface YieldOpportunitiesProps {
  opportunities: YieldOpportunity[];
  onOptimize: () => void;
  isOptimizing: boolean;
}

export function YieldOpportunities({
  opportunities,
  onOptimize,
  isOptimizing
}: YieldOpportunitiesProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-black/10 dark:bg-black/50 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Available Yield Opportunities</h2>
        <button
          onClick={onOptimize}
          disabled={isOptimizing}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isOptimizing ? 'Optimizing...' : 'Optimize Allocation'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunities.map((opp) => (
          <div
            key={opp.vaultAddress}
            className="border border-white/10 rounded-xl p-4 hover:border-white/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">GlueX Vault</span>
              <span className="text-xs text-gray-500">
                {opp.vaultAddress.slice(0, 6)}...{opp.vaultAddress.slice(-4)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">APY</span>
                <span className="text-green-400 font-bold">
                  {opp.apy.toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Diluted APY</span>
                <span className="text-yellow-400 font-semibold">
                  {opp.dilutedApy.toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">TVL</span>
                <span className="text-white">
                  ${(opp.tvl / 1000000).toFixed(2)}M
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Sharpe Ratio</span>
                <span className="text-purple-400 font-semibold">
                  {opp.sharpe.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Implementation Timeline

### Phase 1: Smart Contracts (4-6 hours)

**Day 1 Morning**:
- [ ] Clone BoringVault repository
- [ ] Deploy SuperYieldVault (BoringVault core)
- [ ] Deploy YieldAccountant (pricing oracle)
- [ ] Deploy DepositTeller (user entry/exit)
- [ ] Deploy StrategyManager (merkle verification)

**Day 1 Afternoon**:
- [ ] Build GlueXVaultDecoder (argument sanitizer)
- [ ] Build RouterDecoder for GlueX Router
- [ ] Generate merkle tree for GlueX vault operations
- [ ] Write deployment scripts
- [ ] Deploy to HyperEVM testnet

**Testing**:
- [ ] Unit tests for each contract
- [ ] Integration test: deposit → allocate → withdraw
- [ ] Test merkle verification for GlueX operations

### Phase 2: Backend Integration (3-4 hours)

**Day 1 Evening**:
- [ ] Set up GlueX API credentials at portal.gluex.xyz
- [ ] Implement GlueX Yields API client
- [ ] Implement GlueX Router API client
- [ ] Build market aggregator service

**Day 2 Morning**:
- [ ] Implement AI agent (yield-optimizer.ts)
- [ ] Build agent wallet management
- [ ] Create workflow execution logic
- [ ] Add activity tracking with Redis

**API Routes**:
- [ ] GET /api/gluex/yields - Fetch opportunities
- [ ] POST /api/agents/optimize - Trigger AI optimization
- [ ] GET /api/vault/status - Vault state
- [ ] GET /api/activity/stream - SSE for real-time updates

### Phase 3: Frontend Development (3-4 hours)

**Day 2 Afternoon**:
- [ ] Set up Privy authentication
- [ ] Build VaultDashboard component
- [ ] Build YieldOpportunities display
- [ ] Implement DepositWithdraw UI
- [ ] Add AIReasoningPanel with SSE

**Styling**:
- [ ] Apply glass morphism design (AJEY-inspired)
- [ ] Add dark mode support
- [ ] Implement animations (framer-motion)
- [ ] Responsive design

### Phase 4: Testing & Polish (2-3 hours)

**Day 2 Evening**:
- [ ] End-to-end testing on testnet
- [ ] Test all user flows
- [ ] Fix bugs and edge cases
- [ ] Performance optimization
- [ ] Security review

### Phase 5: Documentation & Demo (2-3 hours)

**Day 3**:
- [ ] Write comprehensive README
- [ ] Add setup instructions
- [ ] Document environment variables
- [ ] Create deployment guide
- [ ] Record demo video (≤3 minutes)

**Demo Video Script**:
1. Introduction (30s) - Project overview
2. User deposits (30s) - Show deposit flow
3. Yield opportunities (45s) - Display GlueX yields
4. AI optimization (60s) - Agent reasoning + execution
5. Results (15s) - Show reallocation success

---

## 6. Environment Setup

### Required Accounts & Credentials

```bash
# GlueX Portal
1. Visit https://portal.gluex.xyz
2. Create account
3. Generate API key and Unique PID

# Privy (Authentication)
1. Visit https://privy.io
2. Create app
3. Get App ID

# OpenAI or Google (AI Agents)
1. Get API key from platform.openai.com OR aistudio.google.com

# Redis (Activity Tracking)
1. Use local Redis OR Upstash (cloud)
```

### Environment Variables

```bash
# .env.local

# Blockchain
HYPEREVM_RPC_URL=https://rpc.hyperevm.xyz
NEXT_PUBLIC_VAULT=0x...  # Deployed SuperYieldVault address

# GlueX
GLUEX_API_KEY=sk_...
GLUEX_UNIQUE_PID=...

# AI Agents
OPENAI_KEY=sk-...
GPT_MODEL=gpt-4o
GPT_REASONING_MODEL=gpt-4o

# Alternative: Gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
GEMINI_REASONING_MODEL=gemini-1.5-pro

# Agent Wallet (TESTNET ONLY)
AGENT_DEFAULT_PRIVATE_KEY=0x...
AGENT_ALLOW_ONCHAIN=true

# Authentication
NEXT_PUBLIC_PRIVY_APP_ID=...

# Persistence
REDIS_URL=redis://localhost:6379
```

### Installation

```bash
# Clone repository
cd /Users/user/SuperFranky/suuuperyield

# Install dependencies
cd packages/foundry
forge install Se7en-Seas/boring-vault

cd ../nextjs
pnpm install

# Set up environment
cp .env.example .env.local
# Fill in credentials

# Deploy contracts (testnet)
cd ../foundry
forge script script/Deploy.s.sol --rpc-url $HYPEREVM_RPC_URL --broadcast

# Run frontend
cd ../nextjs
pnpm dev
```

---

## 7. Key Differentiators

### What Makes Our Submission Stand Out

**1. AI-Powered Optimization**
- Not just using APIs - AI agent makes intelligent decisions
- Real-time reasoning display (unique UX)
- Considers Sharpe ratio (risk-adjusted returns)
- Transparent decision-making process

**2. Production-Grade Security**
- BoringVault architecture ($3B TVL proven)
- Merkle tree restrictions on vault operations
- MEV protection via share locking
- Rate-limited pricing oracle

**3. Superior UX**
- Glass morphism design (modern, professional)
- Real-time SSE updates
- Progressive trace animations
- Embedded wallet (email login via Privy)

**4. Multi-Source Yield Aggregation**
- GlueX Vaults (required)
- Aave v3 (bonus diversity)
- Compound v3 (stretch goal)
- Unified interface for all sources

**5. Comprehensive Implementation**
- Full stack: contracts + backend + frontend
- Automated rebalancing
- Activity history and analytics
- Mobile-responsive design

---

## 8. Risk Mitigation

### Technical Risks

**Risk**: GlueX API rate limits
- **Mitigation**: Cache yields for 60s, implement retry with backoff

**Risk**: AI agent makes bad allocation
- **Mitigation**: Validation rules (min TVL, max dilution, Sharpe threshold)

**Risk**: Smart contract bugs
- **Mitigation**: Use battle-tested BoringVault base, extensive testing

**Risk**: Testnet RPC instability
- **Mitigation**: Fallback RPC endpoints, graceful error handling

### Timeline Risks

**Risk**: 10-20 hour estimate is tight
- **Mitigation**:
  - Reuse AJEY frontend components
  - Use BoringVault reference implementation
  - Pre-build merkle tree generator
  - Have backup features to cut if needed

**Cut Scope Priority** (if time runs out):
1. Keep: Core vault + GlueX integration + basic UI
2. Cut first: Advanced animations, mobile responsive
3. Cut second: Multiple AI providers, Redis persistence
4. Cut last: AI agent (manual allocation fallback)

---

## 9. Success Criteria

### Acceptance Criteria (Must Have)

- [x] **Custody**: BoringVault with role-based access ✓
- [x] **GlueX Yields API**: Fetch APY for all 5 vaults ✓
- [x] **GlueX Router API**: Execute reallocations ✓
- [x] **Whitelisting**: All 5 GlueX vaults included ✓

### Bonus Points (Nice to Have)

- [ ] AI agent with reasoning display
- [ ] Real-time activity feed
- [ ] Multi-source yield aggregation
- [ ] Mobile-responsive UI
- [ ] Comprehensive documentation
- [ ] Professional demo video

### Judging Criteria Alignment

**Impact & Ecosystem Fit** (25%)
- Solves real problem: APY volatility and yield optimization
- Integrates deeply with GlueX ecosystem
- Extends to other DeFi protocols (Aave, Compound)

**Execution & User Experience** (25%)
- Privy embedded wallets (no MetaMask friction)
- Real-time AI reasoning (transparent)
- Glass morphism design (professional)
- Activity feed (user confidence)

**Technical Creativity & Design** (25%)
- AI agent for yield optimization (novel)
- BoringVault security model (advanced)
- SSE streaming for real-time updates (modern)
- Merkle tree permissions (creative security)

**Completeness & Demo Quality** (25%)
- Full stack implementation
- End-to-end working demo
- Comprehensive documentation
- Professional video

---

## 10. Post-Hackathon Roadmap

### Immediate Improvements (Week 1-2)

- [ ] Mainnet deployment
- [ ] Security audit (Spearbit, Macro)
- [ ] Gas optimization
- [ ] Additional yield sources (Morpho, Compound)

### Medium-Term (Month 1-3)

- [ ] Decentralized agent (Chainlink Functions)
- [ ] Multi-asset support (USDC, USDT, BTC)
- [ ] Advanced strategies (leverage, hedging)
- [ ] Portfolio analytics dashboard

### Long-Term (Month 3-6)

- [ ] Cross-chain yield optimization
- [ ] Governance token launch
- [ ] Revenue sharing with depositors
- [ ] Integration with DeFi aggregators

---

## 11. Resources & References

### GlueX Documentation
- Portal: https://portal.gluex.xyz
- Router API: https://docs.gluex.xyz/api-reference/router-api/post-quote
- Yields API: https://docs.gluex.xyz/api-reference/yield-api/post-historical-apy

### BoringVault Resources
- GitHub: https://github.com/Se7en-Seas/boring-vault
- Audits: https://github.com/Se7en-Seas/boring-vault/tree/main/audit
- Veda Docs: https://docs.veda.tech

### AJEY Project (Inspiration)
- Location: /Users/user/SuperFranky/AJEY
- Analysis: /Users/user/SuperFranky/suuuperyield/superyieldplan.md

### ERC Standards
- ERC-4626: https://eips.ethereum.org/EIPS/eip-4626
- ERC-7540: https://eips.ethereum.org/EIPS/eip-7540
- Forge-std interfaces: packages/foundry/lib/forge-std/src/interfaces/

---

## 12. Team Roles (If Applicable)

**Solo Developer**:
- Smart Contracts: 40%
- Backend/APIs: 30%
- Frontend: 20%
- Documentation: 10%

**If Team of 2**:
- Developer A: Smart contracts + Backend
- Developer B: Frontend + Documentation

**If Team of 3**:
- Developer A: Smart contracts
- Developer B: Backend + AI agents
- Developer C: Frontend + Demo video

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building a production-grade yield optimizer that:

1. **Meets all hackathon requirements** (ERC-7540/BoringVault, GlueX APIs, whitelisting)
2. **Differentiates through AI** (intelligent optimization, transparent reasoning)
3. **Prioritizes security** (BoringVault architecture, merkle trees, rate limiting)
4. **Delivers superior UX** (glass morphism, real-time updates, embedded wallets)
5. **Is achievable in 10-20 hours** (reuses proven components, clear timeline)

The combination of AJEY's AI agent architecture with BoringVault's security model and GlueX's yield infrastructure creates a compelling submission with strong chances of winning the $3,000 bounty.

**Next Steps**:
1. Review and approve this plan
2. Set up GlueX API credentials
3. Begin Phase 1 (Smart Contracts)
4. Follow the 3-day timeline
5. Submit before deadline

Good luck! 🚀
