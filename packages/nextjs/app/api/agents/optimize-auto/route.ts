/**
 * Auto-Optimization Endpoint
 * Fetches vault state from contracts and runs AI optimization
 */
import { NextRequest, NextResponse } from "next/server";
import { runYieldOptimizationAgent } from "../../../../lib/ai/openai-agent";
import type { AllocationDecision, OptimizationConstraints, YieldOpportunity } from "../../../../lib/ai/openai-agent";
import { fetchVaultState } from "../../../../lib/contracts/vaultDataService";

export interface AutoOptimizeRequest {
  opportunities: YieldOpportunity[];
  constraints?: Partial<OptimizationConstraints>;
}

export interface AutoOptimizeResponse {
  success: boolean;
  decision: AllocationDecision | null;
  vaultState?: {
    totalAssets: string;
    idleAssets: string;
    allocationsCount: number;
  };
  error?: string;
  timestamp: number;
  model: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body: AutoOptimizeRequest = await request.json();
    const { opportunities, constraints } = body;

    // Validate inputs
    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: opportunities array is required",
          decision: null,
          timestamp: Date.now(),
          model: "none",
        } as AutoOptimizeResponse,
        { status: 400 },
      );
    }

    // Check if OpenAI key is configured
    if (!process.env.OPENAI_KEY) {
      console.warn("OpenAI API key not configured");
      return NextResponse.json(
        {
          success: false,
          error: "AI service not configured. Please set OPENAI_KEY environment variable.",
          decision: null,
          timestamp: Date.now(),
          model: "mock",
        } as AutoOptimizeResponse,
        { status: 503 },
      );
    }

    console.log("[Auto Optimize] Fetching vault state from contracts...");

    // Fetch real vault state from contracts
    let vaultState;
    try {
      vaultState = await fetchVaultState();
    } catch (error) {
      console.error("[Auto Optimize] Failed to fetch vault state:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch vault state: ${error instanceof Error ? error.message : "Unknown error"}`,
          decision: null,
          timestamp: Date.now(),
          model: "none",
        } as AutoOptimizeResponse,
        { status: 500 },
      );
    }

    // Set default constraints
    const fullConstraints: OptimizationConstraints = {
      minTVL: constraints?.minTVL || 100000, // $100k minimum
      maxDilution: constraints?.maxDilution || 10, // 10% max dilution
      minSharpe: constraints?.minSharpe || 1.5,
      riskTolerance: constraints?.riskTolerance || "medium",
    };

    console.log("[Auto Optimize] Running optimization with", {
      vaultAssets: vaultState.totalAssets,
      idleAssets: vaultState.idleAssets,
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
          vaultState: {
            totalAssets: vaultState.totalAssets,
            idleAssets: vaultState.idleAssets,
            allocationsCount: vaultState.currentAllocations.length,
          },
          timestamp: Date.now(),
          model: process.env.GPT_MODEL || "gpt-4o",
        } as AutoOptimizeResponse,
        { status: 422 },
      );
    }

    console.log("[Auto Optimize] Decision generated:", {
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
        vaultState: {
          totalAssets: vaultState.totalAssets,
          idleAssets: vaultState.idleAssets,
          allocationsCount: vaultState.currentAllocations.length,
        },
        timestamp: Date.now(),
        model: process.env.GPT_MODEL || "gpt-4o",
      } as AutoOptimizeResponse,
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  } catch (error) {
    console.error("[Auto Optimize] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: `Optimization failed: ${(error as Error).message}`,
        decision: null,
        timestamp: Date.now(),
        model: process.env.GPT_MODEL || "gpt-4o",
      } as AutoOptimizeResponse,
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
