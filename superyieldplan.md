# SuperYield Plan - AJEY Project Analysis

## Executive Summary

**AJEY** (Simple Agentic Yields in DeFi for Everyone) is a production-grade DeFi yield optimization platform that combines AI-powered decision-making with ERC-4626 vault infrastructure to automatically allocate user funds to optimal Aave v3 lending positions on Base Sepolia.

**Key Innovation**: AI agents (GPT-5 / Gemini 2.5) analyze real-time Aave market data and autonomously execute yield-maximizing allocations on behalf of users.

---

## 1. Project Architecture

### Technology Stack

**Frontend**
- Next.js 13.4.8 (App Router architecture)
- React 18.2.0 with TypeScript 5.9.3
- Tailwind CSS 3.3.2 with dark mode support
- Framer Motion for animations
- MagicUI components with glass morphism design

**Blockchain Layer**
- **Network**: Base Sepolia (testnet)
- **Library**: Viem 2.38.0 (modern Ethereum interactions)
- **Authentication**: Privy 3.2.0 (embedded wallets)
- **Protocol**: Aave v3 integration

**AI/ML**
- **OpenAI SDK 6.8.0**: GPT-5 models with function calling
- **Google GenAI 1.24.0**: Gemini 2.5 with structured outputs
- Dual-provider architecture for redundancy

**Data Persistence**
- Redis 5.9.0 for activity caching and cross-session history

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  (Next.js App Router + Privy Auth + Real-time Activity)     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  /api/agents/allocate  |  /api/vault  |  /api/activity      │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐      ┌──────────────────┐
│  AI Agents   │      │  Blockchain      │
│  (OpenAI/    │      │  Services        │
│   Gemini)    │      │  (Viem + Aave)   │
└──────┬───────┘      └────────┬─────────┘
       │                       │
       └───────────┬───────────┘
                   ▼
         ┌──────────────────┐
         │  Smart Contracts │
         │  - AjeyVault     │
         │  - AgentReallocator│
         │  - Aave v3 Pool  │
         └──────────────────┘
```

---

## 2. Core Smart Contracts

### AjeyVault (ERC-4626 Compliant)

**Purpose**: Tokenized vault that accepts WETH deposits and allocates to Aave v3 markets.

**Key Features**:
- ERC-4626 standard compliance (deposit, withdraw, convertToAssets, etc.)
- Native ETH support via `depositEth()` and `withdrawEth()`
- Agent-controlled Aave allocations via `supplyToAaave()`
- Rebasing mechanism with fee collection
- Emergency pause functionality
- Role-based access control (AGENT_ROLE, PAUSER_ROLE, DEFAULT_ADMIN_ROLE)

**Critical Functions**:
```solidity
// User actions
deposit(uint256 assets, address receiver) → uint256 shares
depositEth(address receiver) payable → uint256 shares
withdraw(uint256 assets, address receiver, address owner) → uint256 shares
withdrawEth(uint256 assets, address receiver, address owner) → uint256 shares

// Agent actions (AGENT_ROLE only)
supplyToAave(uint256 amount) → void
rebaseAndTakeFees() → void

// View functions
totalAssets() → uint256  // TVL including Aave positions
idleUnderlying() → uint256  // Unallocated WETH
maxWithdraw(address owner) → uint256
convertToAssets(uint256 shares) → uint256
```

**State Variables**:
- `underlying`: WETH token address
- `feeBps`: Fee in basis points
- `ethMode`: Enable native ETH deposits/withdrawals
- `aaveReserves`: Mapping of allocated Aave markets

### AgentReallocator

**Purpose**: Enable cross-vault share migration with optional DEX swaps.

**Key Function**:
```solidity
migrateShares(
  address owner,
  address receiver,
  address sourceVault,
  address targetVault,
  uint256 shares,
  address aggregator,  // DEX router (e.g., 0x, 1inch)
  bytes calldata swapCalldata,
  uint256 minAmountOut,
  uint256 deadline
) → uint256 newShares
```

**Use Case**: Agent can rebalance user positions across different vaults when better opportunities arise.

### RebasingWrapper

**Purpose**: Wrap vault shares as rebasing tokens (balance auto-increases with yield).

**Key Function**:
```solidity
rebase() → void  // Syncs wrapper index with vault exchange rate
```

**Benefit**: Users see token balance grow without claiming/compounding.

---

## 3. AI Agent System

### Dual-Provider Architecture

**Workflow Agent** (Fast Execution)
- Model: GPT-5-mini-2025-08-07 or Gemini-2.5-flash
- Use: Quick allocation decisions
- Response time: ~1-3 seconds

**Reasoning Agent** (Deep Analysis)
- Model: GPT-5-2025-08-07 or Gemini-2.5-pro
- Use: Complex market analysis with extended thinking
- Thinking budget: Up to 32K tokens (Gemini)
- Response time: ~5-15 seconds

### Agent Workflow

```
1. TRIGGER
   └─ User deposit OR manual allocation request

2. DATA COLLECTION
   └─ Fetch live Aave market snapshot
      ├─ All reserve assets (WETH, USDC, USDT, etc.)
      ├─ Supply APRs (from liquidity rates)
      ├─ Total value locked per market
      ├─ Available liquidity
      ├─ Supply caps and utilization
      └─ Oracle prices in USD

3. AI REASONING PHASE
   └─ Input: JSON with vault state + market data
   └─ Process:
      ├─ Filter markets (active, not frozen, >0 liquidity)
      ├─ Rank by supplyAprPercent DESC
      ├─ Apply constraints (capacity headroom, idle WETH)
      └─ Generate allocation plan
   └─ Output: { assetSymbol, amountWei, reasoning }

4. EXECUTION PHASE
   └─ Agent wallet calls vault.supplyToAave(amountWei)
   └─ Transaction broadcasted to Base Sepolia
   └─ Activity log updated with txHash

5. REAL-TIME UPDATES
   └─ SSE stream pushes reasoning trace to UI
   └─ Progressive line-by-line reveal with animations
```

### Agent Capabilities

**Function Calling** (OpenAI):
```typescript
tools: [{
  type: "function",
  function: {
    name: "allocateToVault",
    description: "Allocate idle vault WETH to an Aave v3 market",
    parameters: {
      assetSymbol: string,  // e.g., "WETH"
      amountWei: string,    // e.g., "1000000000000000000" (1 ETH)
      reasoning: string     // Explanation for decision
    }
  }
}]
```

**Structured Outputs** (Gemini):
```typescript
schema: {
  type: "object",
  properties: {
    assetSymbol: { type: "string" },
    amountWei: { type: "string" },
    reasoning: { type: "string" }
  },
  required: ["assetSymbol", "amountWei", "reasoning"]
}
```

### Reasoning Policy

Agents follow strict policy constraints:

```typescript
{
  filter: {
    requireActive: true,           // Only active markets
    requireNotFrozen: true,        // Exclude frozen/paused
    minAvailableUSD: "0"          // Must have available liquidity
  },

  rank: [
    "supplyAprPercent desc",       // Highest APR first
    "availableUSD desc",           // Prefer deep liquidity
    "tvlUSD desc"                  // Established markets
  ],

  constraints: [
    "Supply-only (no borrowing)",
    "amountWei <= vault.idleUnderlying()",
    "Check capacity headroom (supplyCap - aTokenSupply)",
    "Round to nearest 0.0001 ETH (1e14 wei)"
  ]
}
```

---

## 4. Aave v3 Integration

### Market Data Fetching

**File**: `/lib/services/aave-markets.ts`

**Process**:
1. Query Aave Pool contract on Base Sepolia
2. Read all reserve assets from `getReservesList()`
3. For each asset:
   - Decode configuration bitmap (decimals, active, frozen, supply cap)
   - Fetch current liquidity rate (supply APR in ray units: 1e27)
   - Read aToken and variable debt token supplies
   - Calculate utilization: `(vDebt / aSupply) * 100`
   - Fetch oracle price and convert metrics to USD
   - Calculate capacity headroom from supply caps

**Output Schema**:
```typescript
interface AaveMarket {
  symbol: string           // "WETH", "USDC", etc.
  assetAddress: string     // Reserve token address
  decimals: number         // Token decimals

  // APR metrics
  supplyAprPercent: number // Annual supply rate (%)

  // Liquidity metrics
  aTokenAddress: string
  aTokenSupply: string     // Total supplied (wei)
  vDebtTokenSupply: string // Total borrowed (wei)
  availableWei: string     // aSupply - vDebt
  utilizationPercent: number

  // USD values
  priceUSD: string
  tvlUSD: string           // Total value locked
  availableUSD: string

  // Risk metrics
  isActive: boolean
  isFrozen: boolean
  supplyCap: string        // Max supply limit
  supplyCapUSD: string
  headroomWei: string      // Remaining capacity
}
```

### Supply Mechanism

**Flow**:
```
1. Agent calls vault.supplyToAave(amountWei)
2. Vault approves Aave pool for WETH spending
3. Vault calls aavePool.supply(weth, amountWei, vault, 0)
4. Aave mints aWETH to vault (1:1 + accrued interest)
5. Vault exchange rate updates: totalAssets / totalShares
6. User shares now worth more underlying WETH
```

**Key Addresses** (Base Sepolia):
- Aave Pool Proxy: `0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27`
- Aave Addresses Provider: Configured in env
- Aave Oracle: Configured in env

---

## 5. User Experience Flow

### Authentication

**Landing Page** (`/app/page.tsx`):
- Powered by Privy embedded wallets
- Login options:
  - Email (custodial embedded wallet)
  - External wallet (MetaMask, WalletConnect)
  - Base Account (Coinbase smart account)
- Auto-redirect to `/home` after auth

### Dashboard (`/app/home/page.tsx`)

**Account Status Bar**:
- Network indicator (Base Sepolia)
- ETH balance (real-time)
- USDC balance
- Resolved address (Basename or truncated)

**Vault Product Card** (840 lines - main UI):

*Vault Overview Section*:
- Total vault TVL (in ETH and USD)
- User's ajWETH share balance
- User's underlying WETH value
- Current APR range (min-max from Aave markets)
- Fee structure display

*Deposit Section*:
```
┌─────────────────────────────────────┐
│ Deposit ETH                         │
│ ┌─────────────────────────────────┐ │
│ │ Amount: [___________] ETH       │ │
│ │         Balance: 1.5 ETH   [MAX]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ You will receive: 0.98 ajWETH       │
│                                     │
│ [Deposit] [Deposit & Allocate AI]   │
└─────────────────────────────────────┘
```

Options:
- **Deposit**: Add funds to vault (stays idle)
- **Deposit & Allocate AI**: Add funds + trigger agent allocation

*Withdrawal Section*:
```
┌─────────────────────────────────────┐
│ Withdraw ETH                        │
│ ┌─────────────────────────────────┐ │
│ │ Amount: [___________] ETH       │ │
│ │         Max: 0.95 ETH      [MAX]│ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Withdraw]                          │
└─────────────────────────────────────┘
```

Constraints:
- Max withdraw = `vault.maxWithdraw(user)` (limited by vault liquidity)
- Vault must not be paused
- ETH mode must be enabled

*Agent Reasoning Trace*:
```
┌─────────────────────────────────────┐
│ AI Agent Reasoning                  │
│ ┌─────────────────────────────────┐ │
│ │ Fetching Aave markets...        │ │
│ │ Analyzing 8 active reserves     │ │
│ │ Top APR: WETH 3.24%            │ │
│ │ Allocating 0.5 ETH to WETH...  │ │
│ │ Transaction submitted: 0xa3... │ │
│ │ ✓ Allocation successful         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Features:
- Real-time SSE updates
- Progressive line reveal (fade-in animations)
- Last 8 lines visible
- Auto-hide after 10s on success
- Error state highlighting

**Activity Feed**:
- Streaming updates (SSE)
- Activity types: deposit, allocate, system
- Shows: timestamp, type, status, details, tx hash
- Auto-refresh on new events

### Deposit Implementation (Multi-Path)

**Strategy 1: Native ETH Deposit** (Preferred)
```typescript
// Most gas-efficient
await vaultContract.write.depositEth([userAddress], { value: amountWei })
```

**Strategy 2: WETH Wrap + Deposit** (Fallback)
```typescript
1. wethContract.write.deposit([], { value: amountWei })  // Wrap ETH
2. wethContract.write.approve([vaultAddress, amountWei])
3. vaultContract.write.deposit([amountWei, userAddress])
```

**Strategy 3: Generic ERC20** (Universal)
```typescript
1. tokenContract.write.approve([vaultAddress, amountWei])
2. vaultContract.write.deposit([amountWei, userAddress])
```

**Error Handling**:
- Pre-flight simulation to catch revert reasons
- Detailed debug logging at each step
- User-friendly error messages
- Automatic strategy fallback

---

## 6. Real-Time Activity System

### Architecture

**Activity Store** (`/lib/activity.ts`):
```typescript
class ActivityStore {
  private activities: Map<string, Activity>  // In-memory cache
  private emitter: EventEmitter              // Event pub/sub

  add(activity: Activity): void {
    this.activities.set(activity.id, activity)
    await redis.lpush("activities", JSON.stringify(activity))
    this.emitter.emit("activity:new", activity)
  }

  updateTrace(id: string, line: string): void {
    activity.trace.push(line)
    this.emitter.emit("activity:trace", { id, line })
  }
}
```

**Persistence Layer**:
- Redis list: `activities` (chronological)
- Hydration on first API call
- Cross-session/multi-instance support

### Server-Sent Events (SSE)

**Endpoint**: `/api/activity/stream/route.ts`

**Event Types**:
```typescript
// Initial snapshot
event: snapshot
data: { activities: [...] }

// Trace line added
event: activity:trace
data: { id: "act_123", line: "Analyzing markets..." }

// Activity updated
event: activity:update
data: { id: "act_123", status: "success", txHash: "0x..." }
```

**Client Implementation**:
```typescript
const eventSource = new EventSource("/api/activity/stream")

eventSource.addEventListener("activity:trace", (e) => {
  const { id, line } = JSON.parse(e.data)
  setActivities(prev =>
    prev.map(a => a.id === id
      ? { ...a, trace: [...a.trace, line] }
      : a
    )
  )
})
```

### Trace Visualization

**Progressive Reveal Animation**:
```css
@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.trace-line {
  animation: slideUpFade 0.3s ease-out;
}
```

**Opacity Gradient** (newest = brightest):
```typescript
opacity = Math.max(0.4, 1 - (totalLines - lineIndex) * 0.1)
```

**Auto-Hide Logic**:
- Success: Fade out after 10 seconds
- Error: Persist until user closes
- Running: Always visible

---

## 7. Advanced Features

### AgentReallocator Approval Flow

**Trigger**: First Aave supply transaction

**Detection**:
```typescript
// Watch SuppliedToAave event via WebSocket
vaultContract.watchContractEvent({
  eventName: "SuppliedToAave",
  onLogs: (logs) => {
    if (!hasApprovedReallocator) {
      promptApprovalModal()
    }
  }
})
```

**Approval Modal**:
```
┌─────────────────────────────────────────────┐
│ Enable Cross-Vault Reallocation            │
│                                             │
│ Allow AI agent to migrate your shares      │
│ between vaults for better yield?           │
│                                             │
│ This is a one-time approval.               │
│                                             │
│ [Approve] [Later]                          │
└─────────────────────────────────────────────┘
```

**Transaction**:
```typescript
vaultContract.write.approve([
  reallocatorAddress,
  maxUint256  // Unlimited approval
])
```

### Basename Resolution

**Server-Side API** (`/api/basename/route.ts`):
```typescript
POST /api/basename
Body: { address: "0x123..." }
Response: { basename: "alice.base.eth" | null }
```

**Why Server-Side**: Avoid CORS issues with Base name resolver contracts

**UI Display**:
- Show basename if resolved
- Fallback to truncated address: `0x1234...5678`
- Click to copy full address

### Dynamic APR Range

**Throttled Fetching**:
```typescript
const [lastFetch, setLastFetch] = useState(0)

useEffect(() => {
  const now = Date.now()
  if (now - lastFetch < 60000) return  // 60s cooldown

  fetchAaveMarkets().then(markets => {
    const aprs = markets.map(m => m.supplyAprPercent)
    setAprRange({ min: Math.min(...aprs), max: Math.max(...aprs) })
    setLastFetch(now)
  })
}, [trigger])
```

**Purpose**: Reduce RPC calls while keeping APR display fresh

### Investment Pods (Disabled)

**Status**: Code exists but excluded from build

**Features** (if enabled):
- Collaborative investment groups
- Shared proposal/voting system
- Auto-pull yield distribution
- Pod membership NFTs

**Configuration** (`tsconfig.json`):
```json
{
  "exclude": [
    "components/pod/**",
    "app/api/pods/**"
  ]
}
```

---

## 8. Development Insights

### Innovative Patterns

**1. Dual-Path Blockchain Queries**
```typescript
// Try WebSocket first, fallback to HTTP polling
if (browserWsPublicClient) {
  unwatch = browserWsPublicClient.watchContractEvent({...})
} else {
  const interval = setInterval(() => pollContract(), 20000)
  unwatch = () => clearInterval(interval)
}
```

**2. Aave Bitmap Decoding**
```typescript
// Manual bitfield extraction (no SDK dependency)
function extractBits(n: bigint, start: number, length: number) {
  const mask = (1n << BigInt(length)) - 1n
  return (n >> BigInt(start)) & mask
}

const decimals = extractBits(configMap, 48, 8)
const isActive = extractBits(configMap, 56, 1) === 1n
const isFrozen = extractBits(configMap, 57, 1) === 1n
```

**3. Custodial Agent Wallet Singleton**
```typescript
let agentWallet: WalletClient | null = null

export function getAgentWallet(role: "default" | "deposit" | "pod") {
  if (!agentWallet) {
    const pk = process.env.AGENT_DEFAULT_PRIVATE_KEY?.replace(/"/g, "")
    agentWallet = createWalletClient({
      account: privateKeyToAccount(pk),
      chain: baseSepolia,
      transport: http(process.env.BASE_RPC_URL)
    })
  }
  return agentWallet
}
```

**4. Glass Morphism UI**
```typescript
<div className="
  rounded-2xl
  border border-white/20
  bg-black/10 dark:bg-black/50
  backdrop-blur-xl
  shadow-[0_0_1px_rgba(255,255,255,0.25)]
">
  {/* Radial gradient overlay */}
  <div className="absolute inset-0
    bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_50%)]
    opacity-30"
  />

  {/* Animated sheen */}
  <div className="absolute
    bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)]
    animate-[sheenSweep_9s_linear_infinite]"
  />
</div>
```

**5. Redis Activity Hydration**
```typescript
let hydrated = false

export async function getActivities() {
  if (!hydrated) {
    const stored = await redis.lrange("activities", 0, -1)
    stored.reverse().forEach(json => {
      activityStore.set(JSON.parse(json).id, JSON.parse(json))
    })
    hydrated = true
  }
  return Array.from(activityStore.values())
}
```

### Security Considerations

**1. Agent Private Key Storage**
- Stored in environment variables (not in code)
- Quote stripping to handle deployment quirks
- Separate keys for different roles

**2. User Fund Safety**
- All allocations require AGENT_ROLE on vault
- Emergency pause mechanism (PAUSER_ROLE)
- ERC-4626 standard compliance for interoperability

**3. Slippage Protection**
- AgentReallocator enforces `minAmountOut`
- Deadline parameter prevents stale transactions

**4. RPC Rate Limiting**
- Throttled Aave market fetches (60s cooldown)
- Cached vault data with smart invalidation
- WebSocket preferred over polling

### Known Limitations

**1. Testnet Only**
- Currently deployed on Base Sepolia
- Mainnet deployment requires audits

**2. Single Vault**
- UI shows one vault (Octant card exists but separate)
- Multi-vault dashboard planned

**3. WETH Only**
- Vault only accepts WETH deposits
- Other assets require wrapper/swap

**4. Supply-Only Strategy**
- Agents only do lending (no borrowing)
- No leverage or complex strategies

**5. Centralized Agent**
- Agent private key stored server-side
- Future: Decentralized oracle network

---

## 9. Key Takeaways for SuperYield

### What to Replicate

1. **ERC-4626 Standard**
   - Proven vault interface
   - Easy integration with DeFi protocols
   - Composability with other vaults

2. **AI Agent Architecture**
   - Dual-provider redundancy (OpenAI + Gemini)
   - Structured outputs for reliability
   - Real-time reasoning trace display

3. **Multi-Path Deposits**
   - Native ETH support (gas efficiency)
   - Automatic fallback strategies
   - Extensive error handling

4. **Real-Time Activity Feed**
   - SSE streaming for live updates
   - Progressive animations
   - Redis persistence

5. **Glass Morphism UI**
   - Modern, professional aesthetic
   - Animated components (framer-motion)
   - Dark mode support

### What to Improve

1. **Multi-Vault Support**
   - Dashboard should show multiple vaults
   - Cross-vault comparison
   - Unified withdrawal interface

2. **Strategy Diversification**
   - Beyond supply-only
   - Support borrowing/leverage
   - Multi-protocol allocations (Compound, Morpho, etc.)

3. **Decentralized Agents**
   - Replace custodial agent wallet
   - Use Chainlink Functions or similar
   - On-chain AI inference (Giza, Modulus)

4. **Gas Optimization**
   - Batch allocations
   - Merkle-based permissions
   - L2 deployment (already on Base)

5. **Risk Management**
   - Max allocation per market
   - Diversification requirements
   - Circuit breakers for market volatility

### Technical Debt Observed

1. **Disabled Pod Features**
   - Code exists but excluded from build
   - Should be removed or completed

2. **Hardcoded Addresses**
   - Some contract addresses in code vs env
   - Should centralize in config

3. **Limited Error Recovery**
   - Some API routes lack retry logic
   - Should add exponential backoff

4. **No Automated Tests**
   - No evidence of unit/integration tests
   - Critical for DeFi security

---

## 10. Recommended Implementation Plan for SuperYield

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Scaffold-ETH 2 base (already done)
- [ ] Deploy ERC-4626 vault contract on testnet
- [ ] Implement basic deposit/withdraw UI
- [ ] Add Privy authentication
- [ ] Configure Aave v3 integration

### Phase 2: AI Integration (Weeks 3-4)
- [ ] Set up OpenAI/Gemini API access
- [ ] Implement Aave market snapshot service
- [ ] Build agent reasoning workflow
- [ ] Add function calling for allocations
- [ ] Create activity tracking system

### Phase 3: Real-Time UX (Week 5)
- [ ] Implement SSE streaming
- [ ] Build activity feed component
- [ ] Add reasoning trace visualization
- [ ] Create glass morphism UI components
- [ ] Add dark mode support

### Phase 4: Advanced Features (Week 6)
- [ ] Deploy AgentReallocator contract
- [ ] Add cross-vault migration UI
- [ ] Implement Basename resolution
- [ ] Add WebSocket fallback logic
- [ ] Create APR range display

### Phase 5: Multi-Protocol (Week 7-8)
- [ ] Add Compound v3 integration
- [ ] Add Morpho integration
- [ ] Implement cross-protocol comparison
- [ ] Build unified allocation strategy
- [ ] Add protocol risk metrics

### Phase 6: Security & Testing (Week 9-10)
- [ ] Write comprehensive unit tests
- [ ] Add integration tests
- [ ] Perform security audit
- [ ] Add emergency pause mechanisms
- [ ] Implement rate limiting

### Phase 7: Mainnet Preparation (Week 11-12)
- [ ] Deploy to mainnet testnet (Base Goerli)
- [ ] Run stress tests
- [ ] Create monitoring dashboards
- [ ] Write user documentation
- [ ] Plan mainnet launch

---

## 11. Environment Setup Required

```bash
# Blockchain
BASE_RPC_URL=https://sepolia.base.org
BASE_WS_URL=wss://sepolia.base.org  # Optional WebSocket
NEXT_PUBLIC_VAULT=0x...  # Deploy AjeyVault contract
NEXT_PUBLIC_WRAPPER=0x...  # Deploy RebasingWrapper contract
NEXT_PUBLIC_AGENT_REALLOCATOR=0x...  # Deploy AgentReallocator contract

# Aave v3 (Base Sepolia)
AAVE_POOL_PROXY=0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27
AAVE_ADDRESSES_PROVIDER=0x...  # Get from Aave docs
AAVE_ORACLE=0x...  # Get from Aave docs

# AI Providers
OPENAI_KEY=sk-...  # Get from platform.openai.com
GPT_MODEL=gpt-4  # or gpt-4-turbo
GPT_REASONING_MODEL=gpt-4  # Use latest available
GEMINI_API_KEY=...  # Get from aistudio.google.com
GEMINI_MODEL=gemini-1.5-flash  # or latest
GEMINI_REASONING_MODEL=gemini-1.5-pro

# Agent Wallet (KEEP SECURE - USE TESTNET ONLY)
AGENT_DEFAULT_PRIVATE_KEY=0x...  # Generate new wallet
AGENT_ALLOW_ONCHAIN=true  # Set false for dry-run mode

# Authentication
NEXT_PUBLIC_PRIVY_APP_ID=...  # Get from privy.io

# Persistence
REDIS_URL=redis://localhost:6379  # Or cloud Redis (Upstash, etc.)
```

---

## 12. File Structure Reference

```
AJEY/
├── abi/                                    # Smart contract ABIs
│   ├── AjeyVault.json                     # Vault contract ABI
│   ├── AjeyVault.ts                       # Generated TypeScript types
│   ├── AgentReallocator.json              # Reallocator ABI
│   ├── AgentReallocator.ts
│   ├── RebasingWrapper.json               # Wrapper ABI
│   └── RebasingWrapper.ts
│
├── app/                                    # Next.js app router
│   ├── page.tsx                           # Landing/login page
│   ├── layout.tsx                         # Root layout (Privy, theme)
│   ├── home/
│   │   └── page.tsx                       # Main dashboard (vault UI)
│   └── api/                               # API routes
│       ├── agents/
│       │   ├── allocate/route.ts          # POST: Trigger AI allocation
│       │   └── rank/route.ts              # POST: Rank markets by APR
│       ├── vault/route.ts                 # GET: Vault summary
│       ├── basename/route.ts              # POST: Resolve Base names
│       └── activity/
│           ├── route.ts                   # GET: Activity history
│           └── stream/route.ts            # GET: SSE stream
│
├── components/                             # React components
│   ├── personal/
│   │   ├── ProductCard.tsx                # Main vault interaction (840 lines)
│   │   ├── AccountStatusBar.tsx           # Network/balance display
│   │   └── ActivityFeed.tsx               # Activity stream UI
│   ├── pod/ (excluded from build)         # Investment pod features
│   └── magicui/                           # Animated UI components
│       ├── globe.tsx                      # 3D globe visualization
│       ├── marquee.tsx                    # Scrolling text
│       └── shiny-button.tsx               # Animated buttons
│
├── config/
│   ├── site.ts                            # Site metadata
│   └── aave-base-sepolia.ts               # Aave contract addresses
│
├── lib/                                    # Core business logic
│   ├── agents/
│   │   ├── openai.ts                      # OpenAI GPT integration
│   │   ├── gemini.ts                      # Google Gemini integration
│   │   ├── workflow.ts                    # On-chain allocation executor
│   │   ├── wallet.ts                      # Custodial agent wallet
│   │   └── rebase.ts                      # Vault rebase cycle
│   ├── services/
│   │   ├── vault.ts                       # Vault contract interface
│   │   ├── aave-markets.ts                # Live Aave market data fetcher
│   │   ├── reallocator.ts                 # AgentReallocator interface
│   │   └── aave.ts                        # Aave pool configuration
│   ├── activity.ts                        # Activity store (in-memory + Redis)
│   └── utils/
│       ├── viem.ts                        # Viem client factory
│       └── format.ts                      # Number formatting
│
├── styles/
│   └── globals.css                        # Tailwind base + custom animations
│
├── .env.local                              # Environment variables (gitignored)
├── tailwind.config.js                      # Tailwind theme config
├── tsconfig.json                           # TypeScript config (excludes pod/)
├── next.config.mjs                         # Next.js config (webpack aliases)
└── package.json                            # Dependencies

```

---

## 13. Critical Code Snippets

### Vault Deposit (Multi-Path)

```typescript
// File: /components/personal/ProductCard.tsx

async function handleDeposit(amountEth: string, allocate: boolean) {
  const amountWei = parseEther(amountEth)

  // Path 1: Try native ETH deposit
  try {
    await vaultContract.write.depositEth([userAddress], {
      value: amountWei
    })
    return
  } catch (e) {
    console.log("depositEth failed, trying WETH path")
  }

  // Path 2: Wrap ETH + approve + deposit
  try {
    await wethContract.write.deposit([], { value: amountWei })
    await wethContract.write.approve([vaultAddress, amountWei])
    await vaultContract.write.deposit([amountWei, userAddress])
    return
  } catch (e) {
    console.error("All deposit paths failed:", e)
    throw e
  }

  // If allocate flag: trigger AI agent
  if (allocate) {
    await fetch("/api/agents/allocate", {
      method: "POST",
      body: JSON.stringify({ vaultAddress })
    })
  }
}
```

### AI Agent Allocation

```typescript
// File: /app/api/agents/allocate/route.ts

export async function POST(req: Request) {
  const { vaultAddress } = await req.json()

  // 1. Fetch live Aave market data
  const markets = await fetchAaveMarkets()

  // 2. Get vault state
  const vaultClient = getVaultContract(vaultAddress)
  const idleWei = await vaultClient.read.idleUnderlying()

  // 3. Call AI agent with context
  const allocation = await runAllocationAgent({
    vaultState: { address: vaultAddress, idleWei },
    markets,
    policy: {
      filter: { requireActive: true, requireNotFrozen: true },
      rank: ["supplyAprPercent desc"],
      constraints: ["amountWei <= idleWei"]
    }
  })

  // 4. Execute on-chain if approved
  if (allocation && process.env.AGENT_ALLOW_ONCHAIN === "true") {
    const agentWallet = getAgentWallet("default")
    const tx = await vaultClient.write.supplyToAave(
      [allocation.amountWei],
      { account: agentWallet }
    )

    // 5. Log activity
    await addActivity({
      type: "allocate",
      status: "success",
      details: { asset: allocation.assetSymbol, amount: allocation.amountWei },
      txHash: tx,
      reasoning: allocation.reasoning
    })
  }

  return Response.json({ success: true, allocation })
}
```

### Aave Market Snapshot

```typescript
// File: /lib/services/aave-markets.ts

export async function fetchAaveMarkets(): Promise<AaveMarket[]> {
  const poolContract = getContract({
    address: AAVE_POOL_PROXY,
    abi: aavePoolAbi,
    client: publicClient
  })

  // Get all reserve addresses
  const reserveAddresses = await poolContract.read.getReservesList()

  // Fetch data for each reserve in parallel
  const markets = await Promise.all(
    reserveAddresses.map(async (assetAddress) => {
      // Get reserve data
      const reserveData = await poolContract.read.getReserveData([assetAddress])
      const {
        configuration,      // Bitmap with settings
        liquidityRate,      // Supply APR (ray units: 1e27)
        aTokenAddress,
        variableDebtTokenAddress
      } = reserveData

      // Decode configuration bitmap
      const decimals = Number(extractBits(configuration, 48, 8))
      const isActive = extractBits(configuration, 56, 1) === 1n
      const isFrozen = extractBits(configuration, 57, 1) === 1n
      const supplyCap = extractBits(configuration, 116, 36)

      // Calculate supply APR (convert from ray to percent)
      const supplyAprPercent = Number(liquidityRate) / 1e25  // ray to %

      // Get token supplies
      const aTokenContract = getContract({ address: aTokenAddress, abi: erc20Abi })
      const vDebtContract = getContract({ address: variableDebtTokenAddress, abi: erc20Abi })

      const aTokenSupply = await aTokenContract.read.totalSupply()
      const vDebtTokenSupply = await vDebtContract.read.totalSupply()

      // Calculate metrics
      const availableWei = aTokenSupply - vDebtTokenSupply
      const utilizationPercent = Number(vDebtTokenSupply) / Number(aTokenSupply) * 100

      // Get USD price from oracle
      const oracleContract = getContract({ address: AAVE_ORACLE, abi: oracleAbi })
      const priceWei = await oracleContract.read.getAssetPrice([assetAddress])
      const priceUSD = Number(priceWei) / 1e8  // Oracle uses 8 decimals

      // Convert to USD
      const tvlUSD = Number(formatUnits(aTokenSupply, decimals)) * priceUSD
      const availableUSD = Number(formatUnits(availableWei, decimals)) * priceUSD

      // Calculate headroom
      const supplyCapWei = supplyCap * (10n ** BigInt(decimals))
      const headroomWei = supplyCapWei - aTokenSupply

      return {
        symbol: await getTokenSymbol(assetAddress),
        assetAddress,
        decimals,
        supplyAprPercent,
        aTokenAddress,
        aTokenSupply: aTokenSupply.toString(),
        vDebtTokenSupply: vDebtTokenSupply.toString(),
        availableWei: availableWei.toString(),
        utilizationPercent,
        priceUSD: priceUSD.toString(),
        tvlUSD: tvlUSD.toString(),
        availableUSD: availableUSD.toString(),
        isActive,
        isFrozen,
        supplyCap: supplyCapWei.toString(),
        supplyCapUSD: (Number(formatUnits(supplyCapWei, decimals)) * priceUSD).toString(),
        headroomWei: headroomWei.toString()
      }
    })
  )

  // Filter to active markets only
  return markets.filter(m => m.isActive && !m.isFrozen)
}
```

### SSE Streaming

```typescript
// File: /app/api/activity/stream/route.ts

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial snapshot
      const activities = getActivities()
      controller.enqueue(
        encoder.encode(`event: snapshot\ndata: ${JSON.stringify({ activities })}\n\n`)
      )

      // Listen for new trace lines
      activityEmitter.on("activity:trace", ({ id, line }) => {
        controller.enqueue(
          encoder.encode(`event: activity:trace\ndata: ${JSON.stringify({ id, line })}\n\n`)
        )
      })

      // Listen for activity updates
      activityEmitter.on("activity:update", (activity) => {
        controller.enqueue(
          encoder.encode(`event: activity:update\ndata: ${JSON.stringify(activity)}\n\n`)
        )
      })
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}
```

---

## 14. Conclusion

The AJEY project represents a sophisticated implementation of AI-powered DeFi yield optimization. It successfully combines:

- **Modern Web3 UX**: Privy embedded wallets, real-time updates, glass morphism UI
- **Robust Smart Contracts**: ERC-4626 compliance, multi-role access control, emergency mechanisms
- **Advanced AI Integration**: Dual-provider architecture, function calling, structured outputs
- **Production-Ready Engineering**: Multi-path error handling, Redis persistence, comprehensive logging

For the SuperYield project, AJEY provides an excellent blueprint for building a user-friendly, AI-driven vault system. The key is to start with the foundation (vault + basic UI), then layer on AI agents, real-time features, and advanced UX progressively.

The recommended 12-week implementation plan provides a structured path from Scaffold-ETH base to production-ready mainnet deployment.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Author**: Claude Code (Sonnet 4.5)
**Source Analysis**: /Users/user/SuperFranky/AJEY
**Target Project**: /Users/user/SuperFranky/suuuperyield
