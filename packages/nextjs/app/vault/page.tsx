"use client";

import { useState } from "react";
import { AIReasoningPanel } from "~~/components/AIReasoningPanel";
import { ContractIntegrationTest } from "~~/components/ContractIntegrationTest";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import type { AllocationDecision, YieldOpportunity } from "~~/lib/ai/openai-agent";

export default function VaultPage() {
  const [aiDecision, setAiDecision] = useState<AllocationDecision | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showTest, setShowTest] = useState(false);

  // Read vault data using Scaffold-ETH hooks
  const { data: vaultName } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "name",
  });

  // Note: Using totalSupply since BoringVault doesn't expose totalAssets
  const { data: totalAssets } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "totalSupply",
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "totalSupply",
  });

  // Mock yield opportunities (in production, fetch from GlueX API)
  const mockOpportunities: YieldOpportunity[] = [
    {
      vaultAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      protocol: "GlueX USDC Vault",
      apy: 12.5,
      tvl: 2500000,
      dilutedApy: 12.2,
      risk: "low",
      isGlueXVault: true,
    },
    {
      vaultAddress: "0x3Ca1d3F0F0B0B0A0b0B0b0B0b0B0b0B0b0B0b0B0",
      protocol: "Aave V3 USDC",
      apy: 8.5,
      tvl: 50000000,
      dilutedApy: 8.4,
      risk: "low",
      isGlueXVault: false,
    },
    {
      vaultAddress: "0x4Db2e2F0F0C0C0A0a0a0a0a0a0a0a0a0a0a0a0a0",
      protocol: "Compound V3",
      apy: 7.2,
      tvl: 80000000,
      dilutedApy: 7.1,
      risk: "low",
      isGlueXVault: false,
    },
  ];

  const runOptimization = async () => {
    setIsOptimizing(true);
    setAiDecision(null);

    try {
      const response = await fetch("/api/agents/optimize-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunities: mockOpportunities,
          constraints: {
            minTVL: 100000,
            maxDilution: 10,
            riskTolerance: "medium",
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.decision) {
        setAiDecision(result.decision);
      } else {
        console.error("Optimization failed:", result.error);
        alert(`Optimization failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Error running optimization:", error);
      alert("Failed to run optimization. Check console for details.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatAmount = (value: bigint | undefined) => {
    if (!value) return "0.00";
    const formatted = Number(value) / 1e18;
    return formatted.toFixed(2);
  };

  const sharePrice =
    totalSupply && totalAssets && totalSupply > 0n ? (Number(totalAssets) / Number(totalSupply)).toFixed(4) : "1.0000";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">SuperYield Vault</h1>
          <p className="text-lg opacity-70">{vaultName || "Loading..."}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowTest(!showTest)}>
          {showTest ? "Hide" : "Show"} Integration Test
        </button>
      </div>

      {/* Integration Test (collapsible) */}
      {showTest && (
        <div className="mb-8">
          <ContractIntegrationTest />
        </div>
      )}

      {/* Vault Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat bg-base-100 shadow-xl rounded-lg">
          <div className="stat-figure text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-8 h-8 stroke-current"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div className="stat-title">Total Assets</div>
          <div className="stat-value text-primary">{formatAmount(totalAssets as bigint)}</div>
          <div className="stat-desc">ETH deposited</div>
        </div>

        <div className="stat bg-base-100 shadow-xl rounded-lg">
          <div className="stat-figure text-secondary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-8 h-8 stroke-current"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              ></path>
            </svg>
          </div>
          <div className="stat-title">Total Supply</div>
          <div className="stat-value text-secondary">{formatAmount(totalSupply as bigint)}</div>
          <div className="stat-desc">Vault shares</div>
        </div>

        <div className="stat bg-base-100 shadow-xl rounded-lg">
          <div className="stat-figure text-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-8 h-8 stroke-current"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              ></path>
            </svg>
          </div>
          <div className="stat-title">Share Price</div>
          <div className="stat-value text-accent">{sharePrice}</div>
          <div className="stat-desc">Assets per share</div>
        </div>
      </div>

      {/* AI Optimization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yield Opportunities */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Yield Opportunities</h2>
              <p className="text-sm opacity-70 mb-4">Available protocols for optimization</p>

              <div className="space-y-3">
                {mockOpportunities.map((opp, idx) => (
                  <div key={idx} className="p-3 bg-base-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{opp.protocol}</span>
                      {opp.isGlueXVault && <span className="badge badge-primary badge-sm">GlueX</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-70">APY</span>
                      <span className="font-bold text-success">{opp.apy.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-70">TVL</span>
                      <span className="text-xs">${(opp.tvl / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-primary btn-block mt-4" onClick={runOptimization} disabled={isOptimizing}>
                {isOptimizing ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Optimizing...
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    Run AI Optimization
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI Decision Panel */}
        <div className="lg:col-span-2">
          {aiDecision ? (
            <AIReasoningPanel decision={aiDecision} />
          ) : (
            <div className="card bg-base-100 shadow-xl h-full">
              <div className="card-body items-center justify-center text-center">
                <span className="text-6xl mb-4">🤖</span>
                <h2 className="card-title">AI Yield Optimization</h2>
                <p className="opacity-70 max-w-md">
                  Click &quot;Run AI Optimization&quot; to let our GPT-4o powered agent analyze yield opportunities and
                  recommend the best allocation strategy for your vault.
                </p>
                <div className="stats stats-vertical lg:stats-horizontal shadow mt-6">
                  <div className="stat">
                    <div className="stat-title">Model</div>
                    <div className="stat-value text-lg">GPT-4o</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Opportunities</div>
                    <div className="stat-value text-lg">{mockOpportunities.length}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">GlueX Vaults</div>
                    <div className="stat-value text-lg">{mockOpportunities.filter(o => o.isGlueXVault).length}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
