/**
 * OpenAI Agent for Yield Optimization
 * Uses GPT-4o to analyze yield opportunities and make allocation decisions
 */
import OpenAI from "openai";

export interface VaultState {
  totalAssets: string;
  idleAssets: string;
  currentAllocations: Array<{
    protocol: string;
    vault: string;
    amount: string;
    apy: number;
  }>;
}

export interface YieldOpportunity {
  vaultAddress: string;
  protocol: string;
  apy: number;
  tvl: number;
  dilutedApy: number;
  risk: "low" | "medium" | "high";
  isGlueXVault: boolean;
}

export interface OptimizationConstraints {
  minTVL: number; // Minimum TVL to consider (risk management)
  maxDilution: number; // Max acceptable APY dilution %
  minSharpe: number; // Min risk-adjusted return
  riskTolerance: "low" | "medium" | "high";
}

export interface AllocationDecision {
  targetVault: string;
  targetProtocol: string;
  amount: string;
  reasoning: string;
  expectedAPY: number;
  currentAPY: number;
  improvement: number;
  swapRequired: boolean;
  riskAssessment: string;
  confidence: number; // 0-1 scale
}

/**
 * Run AI-powered yield optimization agent
 */
export async function runYieldOptimizationAgent(
  vaultState: VaultState,
  opportunities: YieldOpportunity[],
  constraints: OptimizationConstraints,
): Promise<AllocationDecision | null> {
  // Initialize OpenAI
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
  });

  // Build system prompt
  const systemPrompt = buildSystemPrompt(constraints);

  // Build context message
  const contextMessage = buildContextMessage(vaultState, opportunities);

  try {
    // Call GPT-4o with structured output
    const response = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "allocation_decision",
          strict: true,
          schema: {
            type: "object",
            properties: {
              targetVault: {
                type: "string",
                description: "Address of the vault to allocate to",
              },
              targetProtocol: {
                type: "string",
                description: "Name of the protocol",
              },
              amount: {
                type: "string",
                description: "Amount to allocate in wei",
              },
              reasoning: {
                type: "string",
                description: "Detailed reasoning for this allocation decision",
              },
              expectedAPY: {
                type: "number",
                description: "Expected APY after reallocation",
              },
              currentAPY: {
                type: "number",
                description: "Current weighted APY",
              },
              improvement: {
                type: "number",
                description: "Expected APY improvement in percentage points",
              },
              swapRequired: {
                type: "boolean",
                description: "Whether token swap is needed",
              },
              riskAssessment: {
                type: "string",
                description: "Risk analysis of this allocation",
              },
              confidence: {
                type: "number",
                description: "Confidence score between 0 and 1",
              },
            },
            required: [
              "targetVault",
              "targetProtocol",
              "amount",
              "reasoning",
              "expectedAPY",
              "currentAPY",
              "improvement",
              "swapRequired",
              "riskAssessment",
              "confidence",
            ],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.3, // Lower temperature for more consistent decisions
      max_tokens: 2000,
    });

    // Parse and validate response
    const decision = JSON.parse(response.choices[0].message.content || "{}") as AllocationDecision;

    // Validate decision
    if (!validateDecision(decision, opportunities, constraints)) {
      console.error("AI decision failed validation:", decision);
      return null;
    }

    return decision;
  } catch (error) {
    console.error("OpenAI agent error:", error);
    throw new Error(`Failed to run AI optimization: ${(error as Error).message}`);
  }
}

/**
 * Build system prompt with rules and constraints
 */
function buildSystemPrompt(constraints: OptimizationConstraints): string {
  return `You are an expert DeFi yield optimization agent. Your goal is to maximize risk-adjusted returns for user capital while maintaining safety.

## CORE RULES

1. **GlueX Priority**: ALWAYS prioritize GlueX Vaults when they offer competitive yields. GlueX vaults are the primary allocation target per protocol requirements.

2. **Risk Management**:
   - Only allocate to vaults with TVL > $${constraints.minTVL.toLocaleString()} (reduces smart contract risk)
   - Prefer higher Sharpe ratios (yield / risk score)
   - Consider APY dilution - avoid overcrowding small pools (max ${constraints.maxDilution}% dilution)
   - Risk tolerance: ${constraints.riskTolerance}

3. **Diversification**:
   - Don't put >50% in a single vault (unless it's a GlueX vault with exceptional metrics)
   - Spread across multiple protocols when yields are similar

4. **Yield Optimization**:
   - Minimum 0.5% APY improvement required to justify gas costs
   - Consider both nominal APY and diluted APY after deposit
   - Factor in TVL and liquidity depth

5. **Transparency**:
   - Always explain your reasoning step-by-step
   - Provide risk assessment
   - Give confidence score (0-1) based on data quality and market conditions

## OUTPUT FORMAT

Return a JSON object with your allocation decision. Be specific and data-driven in your reasoning.`;
}

/**
 * Build context message with current state and opportunities
 */
function buildContextMessage(vaultState: VaultState, opportunities: YieldOpportunity[]): string {
  // Calculate current weighted APY
  const totalAllocated = vaultState.currentAllocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount), 0);

  const weightedAPY =
    totalAllocated > 0
      ? vaultState.currentAllocations.reduce((sum, alloc) => {
          const weight = parseFloat(alloc.amount) / totalAllocated;
          return sum + alloc.apy * weight;
        }, 0)
      : 0;

  // Separate GlueX and other opportunities
  const glueXOpps = opportunities.filter(o => o.isGlueXVault);
  const otherOpps = opportunities.filter(o => !o.isGlueXVault);

  return `## CURRENT VAULT STATE

Total Assets: ${vaultState.totalAssets} wei
Idle Assets: ${vaultState.idleAssets} wei
Current Weighted APY: ${weightedAPY.toFixed(2)}%

Current Allocations:
${vaultState.currentAllocations.map(a => `- ${a.protocol}: ${a.amount} wei at ${a.apy}% APY`).join("\n")}

## AVAILABLE YIELD OPPORTUNITIES

### GlueX Vaults (PRIORITY):
${glueXOpps
  .map(
    o => `
- Protocol: ${o.protocol}
  Address: ${o.vaultAddress}
  APY: ${o.apy.toFixed(2)}%
  Diluted APY: ${o.dilutedApy.toFixed(2)}%
  TVL: $${o.tvl.toLocaleString()}
  Risk: ${o.risk}
  `,
  )
  .join("\n")}

### Other Opportunities:
${otherOpps
  .map(
    o => `
- Protocol: ${o.protocol}
  Address: ${o.vaultAddress}
  APY: ${o.apy.toFixed(2)}%
  Diluted APY: ${o.dilutedApy.toFixed(2)}%
  TVL: $${o.tvl.toLocaleString()}
  Risk: ${o.risk}
  `,
  )
  .join("\n")}

## TASK

Analyze the above data and decide the optimal allocation for the idle assets (${vaultState.idleAssets} wei).

Consider:
1. Current APY vs available opportunities
2. GlueX vaults should be prioritized per protocol requirements
3. Risk-adjusted returns (Sharpe ratio)
4. APY dilution after deposit
5. Gas costs of reallocation

Provide your allocation decision with detailed reasoning.`;
}

/**
 * Validate AI decision against constraints
 */
function validateDecision(
  decision: AllocationDecision,
  opportunities: YieldOpportunity[],
  constraints: OptimizationConstraints,
): boolean {
  // Find target opportunity
  const target = opportunities.find(o => o.vaultAddress.toLowerCase() === decision.targetVault.toLowerCase());

  if (!target) {
    console.error("Target vault not found in opportunities");
    return false;
  }

  // Check TVL constraint
  if (target.tvl < constraints.minTVL) {
    console.error(`Target vault TVL ($${target.tvl}) below minimum ($${constraints.minTVL})`);
    return false;
  }

  // Check dilution constraint
  const dilutionPercent = ((target.apy - target.dilutedApy) / target.apy) * 100;
  if (dilutionPercent > constraints.maxDilution) {
    console.error(`APY dilution (${dilutionPercent.toFixed(1)}%) exceeds maximum (${constraints.maxDilution}%)`);
    return false;
  }

  // Check minimum improvement (unless it's a GlueX vault - prioritize those)
  if (!target.isGlueXVault && decision.improvement < 0.5) {
    console.error(`Improvement (${decision.improvement}%) below minimum (0.5%)`);
    return false;
  }

  // Check confidence threshold
  if (decision.confidence < 0.5) {
    console.error(`Confidence (${decision.confidence}) below minimum (0.5)`);
    return false;
  }

  return true;
}

/**
 * Streaming version for real-time reasoning display
 */
export async function streamYieldOptimization(
  vaultState: VaultState,
  opportunities: YieldOpportunity[],
  constraints: OptimizationConstraints,
  onChunk: (text: string) => void,
): Promise<AllocationDecision | null> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
  });

  const systemPrompt = buildSystemPrompt(constraints);
  const contextMessage = buildContextMessage(vaultState, opportunities);

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextMessage },
      ],
      stream: true,
      temperature: 0.3,
    });

    let fullContent = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullContent += content;
        onChunk(content); // Send chunk to SSE stream
      }
    }

    // Try to extract JSON from the response
    const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]) as AllocationDecision;
      if (validateDecision(decision, opportunities, constraints)) {
        return decision;
      }
    }

    return null;
  } catch (error) {
    console.error("Streaming optimization error:", error);
    throw error;
  }
}
