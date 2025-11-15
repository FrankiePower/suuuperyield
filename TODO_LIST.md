# SuperYield - Hackathon TODO List
**Deadline**: Tomorrow 3:30 PM
**Status**: URGENT - ~24 hours remaining

---

## CRITICAL PATH (Must Complete for Submission)

### Phase 1: Foundation & Setup (2-3 hours) - START NOW

#### Environment Setup
- [ ] **Register at GlueX Portal** (15 min)
  - Go to https://portal.gluex.xyz
  - Create account
  - Generate API Key
  - Get Unique PID
  - Save to `.env.local`

- [ ] **Set up Privy Auth** (15 min)
  - Go to https://privy.io
  - Create app
  - Get App ID
  - Save to `.env.local`

- [ ] **Get AI API Key** (10 min)
  - Option A: OpenAI (https://platform.openai.com)
  - Option B: Google Gemini (https://aistudio.google.com)
  - Save to `.env.local`

- [ ] **Create Agent Wallet** (5 min)
  ```bash
  # Generate new wallet for agent
  cast wallet new
  # Fund with testnet ETH
  # Save private key to .env.local
  ```

- [ ] **Set up Redis** (10 min)
  - Option A: Local (`brew install redis && redis-server`)
  - Option B: Upstash (https://upstash.com - free tier)
  - Save URL to `.env.local`

#### Project Dependencies
- [ ] **Install BoringVault** (10 min)
  ```bash
  cd packages/foundry
  forge install Se7en-Seas/boring-vault
  forge install OpenZeppelin/openzeppelin-contracts
  ```

- [ ] **Install Frontend Dependencies** (10 min)
  ```bash
  cd packages/nextjs
  pnpm install axios
  pnpm install @privy-io/react-auth
  pnpm install openai  # or @google/genai
  pnpm install redis
  ```

- [ ] **Create Environment File**
  ```bash
  cp .env.example .env.local
  # Fill in all credentials from above
  ```

---

### Phase 2: Smart Contracts (3-4 hours)

#### Core Contracts (CRITICAL - 2 hours)
- [ ] **Create SuperYieldVault.sol** (30 min)
  - Copy BoringVault base
  - Add constructor with name/symbol
  - Deploy to testnet
  - Verify on explorer

- [ ] **Create StrategyManager.sol** (45 min)
  - Copy ManagerWithMerkleVerification
  - Add GlueX vault whitelist (5 addresses)
  - Generate merkle tree for allowed operations
  - Deploy and link to vault

- [ ] **Create DepositTeller.sol** (30 min)
  - Copy TellerWithMultiAssetSupport
  - Configure supported assets (WETH, USDC)
  - Deploy and link to vault

- [ ] **Create YieldAccountant.sol** (15 min)
  - Copy AccountantWithRateProviders
  - Set initial exchange rate (1:1)
  - Deploy and link to vault

#### Decoder Contracts (IMPORTANT - 1 hour)
- [ ] **Create GlueXVaultDecoder.sol** (30 min)
  - Sanitize deposit/withdraw calls
  - Validate vault addresses against whitelist
  - Deploy

- [ ] **Create RouterDecoder.sol** (30 min)
  - Sanitize swap calls
  - Validate token addresses
  - Deploy

#### Deployment & Testing (1 hour)
- [ ] **Write Deploy.s.sol script**
  - Deploy all contracts in order
  - Set up roles (MANAGER, MINTER, BURNER)
  - Link contracts together
  - Output addresses to .env

- [ ] **Deploy to Testnet**
  ```bash
  forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
  ```

- [ ] **Test Basic Flow**
  ```bash
  forge test --fork-url $RPC_URL -vvv
  ```

---

### Phase 3: Backend Integration (3-4 hours)

#### GlueX API Integration (CRITICAL - 1.5 hours)
- [ ] **Create lib/services/gluex-yields.ts** (45 min)
  - `fetchGlueXYields()` - Call Yields API for all 5 vaults
  - Calculate Sharpe ratios
  - Sort by risk-adjusted return
  - Add error handling

- [ ] **Create lib/services/gluex-router.ts** (45 min)
  - `getRouterQuote()` - Get swap quote
  - `executeReallocation()` - Withdraw → Swap → Deposit
  - Handle vault operations via BoringVault.manage()
  - Add retry logic

#### AI Agent (IMPORTANT - 1.5 hours)
- [ ] **Create lib/agents/yield-optimizer.ts** (60 min)
  - System prompt with optimization rules
  - Structured output schema
  - Validation logic (min TVL, max dilution)
  - Add tracing/logging

- [ ] **Create lib/agents/workflow.ts** (30 min)
  - Execute AI decision on-chain
  - Call vault.manage() with merkle proof
  - Update activity feed
  - Error handling

#### API Routes (CRITICAL - 1 hour)
- [ ] **GET /api/gluex/yields/route.ts** (15 min)
  - Fetch yield opportunities
  - Return sorted list

- [ ] **POST /api/agents/optimize/route.ts** (30 min)
  - Trigger AI agent
  - Execute allocation
  - Stream reasoning trace

- [ ] **GET /api/vault/status/route.ts** (15 min)
  - Fetch vault state (TVL, user shares, APY)

---

### Phase 4: Frontend (2-3 hours)

#### Core Pages (CRITICAL - 1.5 hours)
- [ ] **Update app/layout.tsx** (15 min)
  - Add Privy provider
  - Add theme provider
  - Configure wallet settings

- [ ] **Create app/page.tsx (Landing)** (30 min)
  - Privy login buttons
  - Project description
  - Redirect to /home after auth

- [ ] **Create app/home/page.tsx (Dashboard)** (45 min)
  - Vault overview section
  - Yield opportunities grid
  - Deposit/withdraw forms
  - AI reasoning panel
  - Activity feed

#### Components (IMPORTANT - 1.5 hours)
- [ ] **components/VaultOverview.tsx** (20 min)
  - Display TVL, user shares, current APY
  - Real-time updates

- [ ] **components/YieldOpportunities.tsx** (20 min)
  - Grid of GlueX vaults
  - Show APY, diluted APY, TVL, Sharpe
  - "Optimize" button

- [ ] **components/DepositWithdraw.tsx** (30 min)
  - Deposit form with amount input
  - Withdraw form with max button
  - Transaction handling

- [ ] **components/AIReasoningPanel.tsx** (20 min)
  - SSE connection to activity stream
  - Display last 8 reasoning lines
  - Fade animations

---

### Phase 5: Documentation & Demo (1-2 hours)

#### README (CRITICAL - 30 min)
- [ ] **Write comprehensive README.md**
  - Project description
  - Architecture diagram
  - Setup instructions
  - Environment variables
  - Deployment guide
  - How to run locally
  - Live demo link (if deployed)

#### Demo Video (CRITICAL - 60 min)
- [ ] **Record demo video (≤3 minutes)**
  - Script outline:
    1. Introduction (20s) - "SuperYield is an AI-powered yield optimizer..."
    2. Deposit flow (30s) - Show user depositing funds
    3. Yield opportunities (30s) - Display GlueX vaults with APYs
    4. AI optimization (60s) - Click "Optimize", show reasoning, execution
    5. Results (20s) - Show funds reallocated, new APY
  - Use Loom or QuickTime
  - Upload to YouTube/Loom
  - Add link to README

#### Final Polish (30 min)
- [ ] **Test end-to-end on testnet**
  - Fresh wallet deposit
  - Trigger optimization
  - Verify reallocation
  - Withdraw funds

- [ ] **Code cleanup**
  - Remove console.logs
  - Add comments
  - Fix linting errors

- [ ] **GitHub prep**
  - Commit all changes
  - Write clear commit messages
  - Push to GitHub
  - Make repo public (or grant access to judges)

---

## OPTIONAL (If Time Permits)

### Nice-to-Have Features (Pick 1-2 max)
- [ ] **Activity Feed with SSE streaming**
  - `/api/activity/stream/route.ts`
  - Real-time transaction updates
  - Progressive animations

- [ ] **Multiple yield sources** (beyond GlueX)
  - Integrate Aave v3
  - Show combined opportunities

- [ ] **Mobile responsive design**
  - Test on mobile
  - Adjust breakpoints

- [ ] **Dark mode toggle**
  - Already have theme provider
  - Add toggle button

---

## SUBMISSION CHECKLIST (3:30 PM Tomorrow)

### Required Deliverables
- [ ] **GitHub repository**
  - Public OR private with access granted to:
    - Felix (GlueX)
    - Fernando (Chorus One)
  - Repo URL: _______________

- [ ] **README.md with setup instructions**
  - Clear installation steps
  - Environment variables documented
  - How to run locally
  - Deployed demo link (optional)

- [ ] **Demo video (≤3 minutes)**
  - Uploaded to YouTube/Loom
  - Link in README
  - Shows all 4 requirements working

### Acceptance Criteria Verification
- [ ] ✅ **ERC-7540/BoringVault**: Vault contracts deployed
- [ ] ✅ **GlueX Yields API**: Shows APY for all 5 vaults
- [ ] ✅ **GlueX Router API**: Executes reallocations
- [ ] ✅ **GlueX Vaults Whitelisted**: All 5 addresses in contract

### Quality Checks
- [ ] All contracts verified on block explorer
- [ ] Frontend deployed (Vercel/Netlify) OR localhost instructions
- [ ] No hardcoded secrets in repo
- [ ] Demo video clearly shows functionality
- [ ] README has contact info

---

## TIMELINE (24 Hours)

### Hour 0-3 (NOW - 3 hours)
**Phase 1**: Environment setup + Dependencies
- Get all API keys
- Install dependencies
- Set up .env.local

### Hour 3-7 (4 hours)
**Phase 2**: Smart Contracts
- Write contracts
- Deploy to testnet
- Verify on explorer

### Hour 7-11 (4 hours)
**Phase 3**: Backend
- GlueX API integration
- AI agent implementation
- API routes

### Hour 11-14 (3 hours)
**Phase 4**: Frontend
- Core pages
- Components
- Styling

### Hour 14-16 (2 hours)
**Phase 5**: Documentation & Demo
- README
- Demo video
- Testing

### Hour 16-18 (2 hours)
**Buffer**: Final polish, bug fixes, submission prep

### Hour 18-24 (6 hours)
**Sleep/Break** (Be fresh for final submission)

### Final 3 hours before 3:30 PM
- Final testing
- Deploy frontend
- Upload demo video
- Submit!

---

## RISK MITIGATION

### If Running Behind Schedule

**Cut in this order:**
1. ❌ Cut first: Activity feed SSE streaming (use simple list)
2. ❌ Cut second: Multiple AI providers (use OpenAI only)
3. ❌ Cut third: Fancy animations (basic UI is fine)
4. ❌ Cut fourth: Redis (use in-memory)
5. ⚠️ NEVER CUT: The 4 core requirements!

### Minimum Viable Submission
If you have only 8 hours left:
1. **Smart contracts** (2 hours)
   - Deploy BoringVault with GlueX whitelist
   - Skip merkle trees, use simple role-based access

2. **Backend** (2 hours)
   - Manual GlueX API integration (no AI)
   - Simple API route to fetch yields
   - Manual "reallocate" button calls Router API

3. **Frontend** (2 hours)
   - Basic deposit/withdraw UI
   - Show GlueX yields in table
   - Manual reallocation button

4. **Documentation** (2 hours)
   - README with clear setup
   - Simple screen recording demo

This still meets all 4 requirements!

---

## CONTACTS & RESOURCES

### Get Help
- **GlueX Telegram**: https://t.me/+6NrwSlEPAsA3MzE0
- **GlueX Discord**: Ask technical questions
- **Mentor**: Fernando (Chorus One) - reach out if stuck

### Quick References
- **GlueX Docs**: https://docs.gluex.xyz
- **BoringVault Repo**: https://github.com/Se7en-Seas/boring-vault
- **AJEY Reference**: /Users/user/SuperFranky/AJEY
- **Hackathon Plan**: /Users/user/SuperFranky/suuuperyield/HACKATHON_PLAN.md

### Testnet Resources
- **HyperEVM Faucet**: [Get testnet tokens]
- **Block Explorer**: [Verify contracts]

---

## MOTIVATION

**Prize**: $3,000 (Winner takes all)
**Judge**: Felix from GlueX

**What they're looking for**:
1. ✅ All 4 requirements working
2. ✅ Good user experience
3. ✅ Creative implementation
4. ✅ Complete demo

**Your advantages**:
- You have AJEY as reference (AI agent architecture)
- You have BoringVault proven pattern
- You have comprehensive plan
- You understand the requirements

**You got this! 🚀**

Start with Phase 1 NOW. Get those API keys and set up your environment. The rest will flow from there.

---

## DAILY CHECKPOINT

### End of Today
- [ ] All API keys obtained
- [ ] Smart contracts deployed to testnet
- [ ] Basic backend API working
- [ ] Can fetch GlueX yields

### Tomorrow Morning
- [ ] Frontend UI functional
- [ ] Can deposit/withdraw
- [ ] Can trigger reallocation

### Tomorrow Afternoon (Before 3:30 PM)
- [ ] Demo video recorded
- [ ] README complete
- [ ] Repo submitted
- [ ] ✅ DONE!

---

**Last Updated**: Now
**Next Action**: START PHASE 1 - Get API Keys
**Time Remaining**: ~24 hours

GO GO GO! 🏃‍♂️💨
