/**
 * Streaming SSE endpoint for real-time AI reasoning display
 * Shows the AI's thinking process as it optimizes yield allocations
 */
import { NextRequest } from "next/server";
import { streamYieldOptimization } from "../../../../lib/ai/openai-agent";
import type { OptimizationConstraints, VaultState, YieldOpportunity } from "../../../../lib/ai/openai-agent";

export interface StreamRequest {
  vaultState: VaultState;
  opportunities: YieldOpportunity[];
  constraints?: Partial<OptimizationConstraints>;
}

export async function POST(request: NextRequest) {
  try {
    const body: StreamRequest = await request.json();
    const { vaultState, opportunities, constraints } = body;

    // Validate inputs
    if (!vaultState || !opportunities) {
      const encoder = new TextEncoder();
      return new Response(encoder.encode('data: {"error":"Missing required parameters"}\n\n'), {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Check OpenAI configuration
    if (!process.env.OPENAI_KEY) {
      const encoder = new TextEncoder();
      return new Response(encoder.encode('data: {"error":"AI service not configured"}\n\n'), {
        status: 503,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Set default constraints
    const fullConstraints: OptimizationConstraints = {
      minTVL: constraints?.minTVL || 100000,
      maxDilution: constraints?.maxDilution || 10,
      minSharpe: constraints?.minSharpe || 1.5,
      riskTolerance: constraints?.riskTolerance || "medium",
    };

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send initial status
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Initializing AI agent..." })}\n\n`),
        );

        await sleep(300);

        // Send analysis start
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "status", message: "Analyzing yield opportunities..." })}\n\n`,
          ),
        );

        await sleep(400);

        // Send GlueX priority message
        const glueXCount = opportunities.filter(o => o.isGlueXVault).length;
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "info", message: `Found ${glueXCount} GlueX vaults (priority allocation targets)` })}\n\n`,
          ),
        );

        await sleep(300);

        // Send market analysis
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "status", message: "Evaluating risk-adjusted returns..." })}\n\n`,
          ),
        );

        await sleep(400);

        try {
          // Stream AI reasoning
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "reasoning", message: "AI Agent is analyzing..." })}\n\n`),
          );

          const decision = await streamYieldOptimization(
            vaultState,
            opportunities,
            fullConstraints,
            (chunk: string) => {
              // Stream each chunk of AI reasoning
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "reasoning", message: chunk })}\n\n`));
            },
          );

          if (decision) {
            // Send final decision
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "decision", decision })}\n\n`));

            // Send completion
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "complete", message: "Optimization complete!" })}\n\n`),
            );
          } else {
            // Send error
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", message: "Failed to generate valid decision" })}\n\n`,
              ),
            );
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: (error as Error).message })}\n\n`),
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const encoder = new TextEncoder();
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ type: "error", message: (error as Error).message })}\n\n`),
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      },
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
