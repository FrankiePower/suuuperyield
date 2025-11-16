"use client";

import { useState } from "react";
import type { AllocationDecision } from "~~/lib/ai/openai-agent";

interface AIReasoningPanelProps {
  decision: AllocationDecision;
  isLoading?: boolean;
}

export const AIReasoningPanel = ({ decision, isLoading = false }: AIReasoningPanelProps) => {
  const [showFullReasoning, setShowFullReasoning] = useState(false);

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <span className="loading loading-spinner loading-lg"></span>
            <div>
              <h3 className="font-bold text-lg">AI Analysis in Progress</h3>
              <p className="text-sm opacity-70">Analyzing yield opportunities...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const improvementColor =
    decision.improvement > 2 ? "text-success" : decision.improvement > 0 ? "text-info" : "text-warning";

  const confidenceColor =
    decision.confidence >= 0.8 ? "badge-success" : decision.confidence >= 0.6 ? "badge-info" : "badge-warning";

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="card-title flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              AI Recommendation
            </h2>
            <p className="text-sm opacity-70">Powered by GPT-4o</p>
          </div>
          <div className={`badge ${confidenceColor} badge-lg`}>
            {(decision.confidence * 100).toFixed(0)}% Confidence
          </div>
        </div>

        <div className="divider"></div>

        {/* Target Protocol */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Target Protocol</div>
            <div className="stat-value text-2xl">{decision.targetProtocol}</div>
            <div className="stat-desc text-xs truncate">{decision.targetVault}</div>
          </div>

          <div className="stat bg-base-200 rounded-lg">
            <div className="stat-title">Allocation Amount</div>
            <div className="stat-value text-2xl">{parseFloat(decision.amount).toFixed(2)}</div>
            <div className="stat-desc">ETH equivalent</div>
          </div>
        </div>

        {/* APY Metrics */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-xs opacity-70">Current APY</p>
            <p className="text-xl font-bold">{decision.currentAPY.toFixed(2)}%</p>
          </div>

          <div className="text-center">
            <p className="text-xs opacity-70">Expected APY</p>
            <p className="text-xl font-bold text-success">{decision.expectedAPY.toFixed(2)}%</p>
          </div>

          <div className="text-center">
            <p className="text-xs opacity-70">Improvement</p>
            <p className={`text-xl font-bold ${improvementColor}`}>+{decision.improvement.toFixed(2)}%</p>
          </div>
        </div>

        <div className="divider"></div>

        {/* Risk Assessment */}
        <div className="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div className="w-full">
            <h3 className="font-bold">Risk Assessment</h3>
            <p className="text-sm">{decision.riskAssessment}</p>
          </div>
        </div>

        {/* Reasoning */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">AI Reasoning</h3>
            <button className="btn btn-ghost btn-xs" onClick={() => setShowFullReasoning(!showFullReasoning)}>
              {showFullReasoning ? "Show Less" : "Show More"}
            </button>
          </div>

          <div className={`prose prose-sm max-w-none ${showFullReasoning ? "" : "line-clamp-3"}`}>
            <p className="text-sm whitespace-pre-line">{decision.reasoning}</p>
          </div>
        </div>

        {/* Swap Required Badge */}
        {decision.swapRequired && (
          <div className="alert alert-warning mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>This allocation requires a token swap before execution</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="card-actions justify-end mt-6">
          <button className="btn btn-ghost">Dismiss</button>
          <button className="btn btn-primary">Execute Strategy</button>
        </div>
      </div>
    </div>
  );
};

/**
 * Streaming version that shows AI reasoning as it comes in
 */
interface StreamingReasoningPanelProps {
  onComplete?: (decision: AllocationDecision) => void;
}

export const StreamingReasoningPanel = ({ onComplete }: StreamingReasoningPanelProps) => {
  const [status, setStatus] = useState<"idle" | "thinking" | "analyzing" | "deciding" | "complete">("idle");
  const [reasoning, setReasoning] = useState<string>("");
  const [decision, setDecision] = useState<AllocationDecision | null>(null);

  const startStreaming = async () => {
    setStatus("thinking");
    setReasoning("");

    try {
      const response = await fetch("/api/agents/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Mock data for demo
          vaultState: {
            totalAssets: "1000",
            idleAssets: "500",
            currentAllocations: [],
          },
          opportunities: [
            {
              vaultAddress: "0x123...",
              protocol: "GlueX",
              apy: 12.5,
              tvl: 1000000,
              dilutedApy: 12.2,
              risk: "low",
              isGlueXVault: true,
            },
          ],
        }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.type === "status") {
              setStatus(data.status);
            } else if (data.type === "reasoning") {
              setReasoning(prev => prev + data.content);
            } else if (data.type === "decision") {
              setDecision(data.decision);
              setStatus("complete");
              onComplete?.(data.decision);
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setStatus("idle");
    }
  };

  if (status === "idle") {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <h2 className="card-title">AI Yield Optimization</h2>
          <p>Let AI analyze the best yield opportunities for your vault</p>
          <button className="btn btn-primary mt-4" onClick={startStreaming}>
            Start Analysis
          </button>
        </div>
      </div>
    );
  }

  if (status === "complete" && decision) {
    return <AIReasoningPanel decision={decision} />;
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="flex-1">
            <h3 className="font-bold text-lg capitalize">{status}...</h3>
            {reasoning && (
              <div className="mt-4 p-4 bg-base-200 rounded-lg">
                <p className="text-sm whitespace-pre-line">{reasoning}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
