/**
 * AI-Powered Yield Optimization Endpoint
 * Uses OpenAI GPT-4o to analyze yields and recommend allocations
 */
import { NextRequest, NextResponse } from "next/server";
import { runYieldOptimizationAgent } from "../../../../lib/ai/openai-agent";
import type {
  AllocationDecision,
  OptimizationConstraints,
  VaultState,
  YieldOpportunity,
} from "../../../../lib/ai/openai-agent";

export interface OptimizeRequest {
  vaultState: VaultState;
  opportunities: YieldOpportunity[];
  constraints?: Partial<OptimizationConstraints>;
}

export interface OptimizeResponse {
  success: boolean;
  decision: AllocationDecision | null;
  error?: string;
  timestamp: number;
  model: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body: OptimizeRequest = await request.json();
    const { vaultState, opportunities, constraints } = body;

    // Validate inputs
    if (!vaultState || !opportunities || opportunities.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: vaultState and opportunities are required",
          decision: null,
          timestamp: Date.now(),
          model: "none",
        } as OptimizeResponse,
        { status: 400 },
      );
    }

    // Check if OpenAI key is configured
    if (!process.env.OPENAI_KEY) {
      console.warn("OpenAI API key not configured, falling back to mock");
      return NextResponse.json(
        {
          success: false,
          error: "AI service not configured. Please set OPENAI_KEY environment variable.",
          decision: null,
          timestamp: Date.now(),
          model: "mock",
        } as OptimizeResponse,
        { status: 503 },
      );
    }

    // Set default constraints
    const fullConstraints: OptimizationConstraints = {
      minTVL: constraints?.minTVL || 100000, // $100k minimum
      maxDilution: constraints?.maxDilution || 10, // 10% max dilution
      minSharpe: constraints?.minSharpe || 1.5,
      riskTolerance: constraints?.riskTolerance || "medium",
    };

    console.log("[AI Optimize] Running optimization with", {
      vaultAssets: vaultState.totalAssets,
      opportunitiesCount: opportunities.length,
      glueXCount: opportunities.filter(o => o.isGlueXVault).length,
      constraints: fullConstraints,
    });

    // Run AI agent
    const decision = await runYieldOptimizationAgent(vaultState, opportunities, fullConstraints);

    if (!decision) {
      return NextResponse.json(
        {
          success: false,
          error: "AI failed to generate valid decision. Constraints may be too strict.",
          decision: null,
          timestamp: Date.now(),
          model: process.env.GPT_MODEL || "gpt-4o",
        } as OptimizeResponse,
        { status: 422 },
      );
    }

    console.log("[AI Optimize] Decision generated:", {
      targetVault: decision.targetVault,
      targetProtocol: decision.targetProtocol,
      expectedAPY: decision.expectedAPY,
      improvement: decision.improvement,
      confidence: decision.confidence,
    });

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        decision,
        timestamp: Date.now(),
        model: process.env.GPT_MODEL || "gpt-4o",
      } as OptimizeResponse,
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  } catch (error) {
    console.error("[AI Optimize] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: `Optimization failed: ${(error as Error).message}`,
        decision: null,
        timestamp: Date.now(),
        model: process.env.GPT_MODEL || "gpt-4o",
      } as OptimizeResponse,
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
