"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { type OptimizationResult, type YieldOpportunity, YieldOptimizerService } from "~~/services/yieldOptimizer";

const SuperYield: NextPage = () => {
  const { address, isConnected } = useAccount();
  const [optimizer] = useState(() => new YieldOptimizerService());
  const [yields, setYields] = useState<YieldOpportunity[]>([]);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState("1.0");

  const loadYieldData = useCallback(async () => {
    try {
      const opportunities = await optimizer.fetchYieldOpportunities("ETH");
      setYields(opportunities);
    } catch (error) {
      console.error("Failed to load yield data:", error);
    }
  }, [optimizer]);

  useEffect(() => {
    loadYieldData();
  }, [loadYieldData]);

  const runOptimization = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    try {
      const result = await optimizer.optimizeYield(
        "mock_current_vault",
        5.0,
        (parseFloat(depositAmount) * 1e18).toString(),
        address,
        "medium",
      );
      setOptimization(result);
    } catch (error) {
      console.error("Optimization failed:", error);
      alert("Optimization failed. Check console for details.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #ffecd0 0%, #f8e4c4 100%)" }}>
      {/* Hero Section */}
      <div className="px-5 py-16 text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-4">
            <span
              className="bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent"
              style={{
                background: "linear-gradient(135deg, #36a2d8 0%, #ce58a1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              SuperYield
            </span>
          </h1>
          <p className="text-xl text-gray-700 font-medium">AI-Powered Yield Optimizer</p>
          <p className="text-lg text-gray-600 mt-2">Using GlueX APIs & BoringVault for secure asset custody</p>
        </div>

        {!isConnected && (
          <div
            className="inline-flex items-center px-6 py-3 rounded-full font-medium shadow-lg"
            style={{ backgroundColor: "#ce58a1", color: "white" }}
          >
            <span className="mr-2">⚠️</span>
            Connect your wallet to start optimizing yields
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-8 pb-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Yield Optimization Card */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border-2" style={{ borderColor: "#36a2d8" }}>
              <div
                className="px-6 py-4 rounded-t-2xl text-white font-bold text-xl"
                style={{ background: "linear-gradient(135deg, #36a2d8 0%, #2e8bc0 100%)" }}
              >
                🚀 Yield Optimization
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Deposit Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none"
                    style={{
                      borderColor: "#36a2d8",
                      background: "#ffecd0",
                    }}
                  />
                </div>
                <button
                  onClick={runOptimization}
                  disabled={!isConnected || loading}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${loading ? "animate-pulse" : ""}`}
                  style={{
                    background: loading
                      ? "linear-gradient(135deg, #ce58a1 0%, #b64d8f 100%)"
                      : "linear-gradient(135deg, #ce58a1 0%, #d665ab 100%)",
                    boxShadow: "0 4px 20px rgba(206, 88, 161, 0.4)",
                  }}
                >
                  {loading ? "🔄 Optimizing..." : "✨ Optimize Yield"}
                </button>
              </div>
            </div>
          </div>

          {/* Optimization Results */}
          {optimization && (
            <div className="bg-white rounded-2xl shadow-xl border-2" style={{ borderColor: "#36a2d8" }}>
              <div
                className="px-6 py-4 rounded-t-2xl text-white font-bold text-xl"
                style={{ background: "linear-gradient(135deg, #36a2d8 0%, #2e8bc0 100%)" }}
              >
                📊 Optimization Results
              </div>
              <div className="p-6">
                <div
                  className="p-4 rounded-xl mb-6 border-l-4"
                  style={{
                    backgroundColor: "#ffecd0",
                    borderLeftColor: "#ce58a1",
                  }}
                >
                  <p className="text-gray-700 font-medium">{optimization.reasoning}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#ffecd0" }}>
                    <div className="text-sm text-gray-600 font-medium mb-1">Current Yield</div>
                    <div className="text-3xl font-bold" style={{ color: "#36a2d8" }}>
                      {optimization.currentYield.toFixed(2)}%
                    </div>
                  </div>

                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#ffecd0" }}>
                    <div className="text-sm text-gray-600 font-medium mb-1">Best GlueX Opportunity</div>
                    <div className="text-3xl font-bold" style={{ color: "#ce58a1" }}>
                      {optimization.projectedYield.toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-500">{optimization.bestOpportunity.protocol}</div>
                  </div>

                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#ffecd0" }}>
                    <div className="text-sm text-gray-600 font-medium mb-1">Improvement</div>
                    <div
                      className="text-3xl font-bold"
                      style={{ color: optimization.reallocationNeeded ? "#ce58a1" : "#36a2d8" }}
                    >
                      +{(optimization.projectedYield - optimization.currentYield).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Yield Opportunities Table */}
          <div className="bg-white rounded-2xl shadow-xl border-2" style={{ borderColor: "#ce58a1" }}>
            <div
              className="px-6 py-4 rounded-t-2xl text-white font-bold text-xl"
              style={{ background: "linear-gradient(135deg, #ce58a1 0%, #b64d8f 100%)" }}
            >
              💎 Available GlueX Yield Opportunities
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2" style={{ borderColor: "#ffecd0" }}>
                      {["Protocol", "APY", "TVL", "Risk", "Type"].map(header => (
                        <th key={header} className="px-4 py-3 text-left font-bold text-gray-700">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yields
                      .filter(y => y.isGlueXVault)
                      .map((yieldOpp, index) => (
                        <tr
                          key={yieldOpp.id || index}
                          className="hover:scale-[1.02] transition-transform"
                          style={{ backgroundColor: index % 2 === 0 ? "#ffecd0" : "#f8e4c4" }}
                        >
                          <td className="px-4 py-4 font-bold text-gray-800">{yieldOpp.protocol}</td>
                          <td className="px-4 py-4 font-bold text-2xl" style={{ color: "#ce58a1" }}>
                            {yieldOpp.apy.toFixed(2)}%
                          </td>
                          <td className="px-4 py-4 font-medium text-gray-700">${yieldOpp.tvl.toLocaleString()}</td>
                          <td className="px-4 py-4">
                            <span
                              className="px-3 py-1 rounded-full text-white font-medium"
                              style={{
                                backgroundColor:
                                  yieldOpp.risk === "low"
                                    ? "#10b981"
                                    : yieldOpp.risk === "medium"
                                      ? "#f59e0b"
                                      : "#ef4444",
                              }}
                            >
                              {yieldOpp.risk}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className="px-3 py-1 rounded-full text-white font-medium"
                              style={{ backgroundColor: "#36a2d8" }}
                            >
                              GlueX Vault
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperYield;
