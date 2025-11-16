"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import type { AllocationDecision } from "~~/lib/ai/openai-agent";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

// Yield opportunity interface
interface YieldOpportunity {
  protocol: string;
  apy: number;
  tvl: number;
  risk: string;
  isGlueXVault: boolean;
  vaultAddress: string;
  dilutedApy?: number;
}

const SuperYield: NextPage = () => {
  const { address, isConnected } = useAccount();
  const [yields, setYields] = useState<YieldOpportunity[]>([]);
  const [aiDecision, setAiDecision] = useState<AllocationDecision | null>(null);
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState("100");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  // Read vault balance for connected user
  const { data: vaultBalance } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "balanceOf",
    args: [address],
  });

  // Read total vault assets
  const { data: totalAssets } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "totalSupply",
  });

  // Read vault name
  const { data: vaultName } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "name",
  });

  // Write contract for deposits
  const { writeContractAsync: depositToVault } = useScaffoldWriteContract("DepositTeller");

  const loadYieldData = useCallback(async () => {
    try {
      // Fetch real USDC yield opportunities from GlueX
      const response = await fetch("/api/gluex/yields?chainID=hyperevm&amount=1000000");
      const data = await response.json();

      if (data.success && data.opportunities) {
        const formattedOpps: YieldOpportunity[] = data.opportunities.map((opp: any) => ({
          vaultAddress: opp.poolAddress,
          protocol: opp.protocol,
          apy: opp.apy,
          tvl: opp.tvl,
          dilutedApy: opp.dilutedApy,
          risk: opp.risk,
          isGlueXVault: opp.isGlueXVault,
        }));
        setYields(formattedOpps);
      } else {
        console.warn("Failed to fetch GlueX yields, using fallback data");
        // Fallback to mock data if API fails
        setYields([
          {
            vaultAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
            protocol: "GlueX USDC Vault",
            apy: 12.5,
            tvl: 2500000,
            dilutedApy: 12.2,
            risk: "low",
            isGlueXVault: true,
          },
        ]);
      }
    } catch (error) {
      console.error("Error loading yield data:", error);
      // Fallback to mock data on error
      setYields([
        {
          vaultAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
          protocol: "GlueX USDC Vault",
          apy: 12.5,
          tvl: 2500000,
          dilutedApy: 12.2,
          risk: "low",
          isGlueXVault: true,
        },
      ]);
    }
  }, []);

  useEffect(() => {
    loadYieldData();
  }, [loadYieldData]);

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert("Please enter a valid deposit amount");
      return;
    }

    setDepositLoading(true);
    setDepositSuccess(false);

    try {
      // USDC has 6 decimals (not 18 like ETH)
      const amountInUSDC = BigInt(Math.floor(parseFloat(depositAmount) * 1_000_000));

      // HyperEVM USDC address and DepositTeller address
      const usdcAddress = "0xb88339cb7199b77e23db6e890353e22632ba630f" as `0x${string}`;
      const depositTellerAddress = "0x2f245E60EE78Acb2847D8FE1336725307C7B38Df" as `0x${string}`;

      // Define ERC20 ABI for balance and allowance checks
      const erc20Abi = [
        {
          name: "symbol",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [{ name: "", type: "string" }],
        },
        {
          name: "decimals",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [{ name: "", type: "uint8" }],
        },
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
        {
          name: "allowance",
          type: "function",
          stateMutability: "view",
          inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
          ],
          outputs: [{ name: "", type: "uint256" }],
        },
        {
          name: "approve",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ];

      // Verify USDC contract
      console.log("Verifying USDC contract...");
      try {
        const symbol = (await readContract(wagmiConfig, {
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "symbol",
        })) as string;

        const decimals = (await readContract(wagmiConfig, {
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "decimals",
        })) as number;

        console.log(`Token verified: ${symbol} with ${decimals} decimals`);
      } catch (error) {
        console.error("Failed to verify USDC contract:", error);
        throw new Error(`Invalid USDC contract address: ${usdcAddress}`);
      }

      // Check USDC balance
      console.log("Checking USDC balance...");
      const usdcBalance = (await readContract(wagmiConfig, {
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      console.log(`USDC balance: ${usdcBalance} (need: ${amountInUSDC})`);

      if (usdcBalance < amountInUSDC) {
        throw new Error(
          `Insufficient USDC balance. You have ${Number(usdcBalance) / 1_000_000} USDC, but need ${depositAmount} USDC`,
        );
      }

      // Step 1: Approve USDC spending by DepositTeller
      console.log(`Approving ${amountInUSDC} USDC spending by ${depositTellerAddress}...`);
      const approveTxHash = await writeContract(wagmiConfig, {
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [depositTellerAddress, amountInUSDC],
      });

      console.log("Approval transaction sent:", approveTxHash);
      console.log("Waiting for approval confirmation...");

      // Wait for approval transaction to be confirmed
      const approvalReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: approveTxHash,
      });

      console.log("Approval confirmed:", approvalReceipt.status);

      if (approvalReceipt.status !== "success") {
        throw new Error("Approval transaction failed");
      }

      // Verify the allowance was set correctly
      console.log("Verifying allowance...");
      const allowance = (await readContract(wagmiConfig, {
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, depositTellerAddress],
      })) as bigint;

      console.log(`Current allowance: ${allowance} (need: ${amountInUSDC})`);

      if (allowance < amountInUSDC) {
        throw new Error(`Allowance verification failed. Current allowance: ${allowance}, needed: ${amountInUSDC}`);
      }

      console.log("USDC approved successfully, now checking DepositTeller requirements...");

      // Check if USDC is supported by DepositTeller
      const depositTellerAbi = [
        {
          name: "isAssetSupported",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "asset", type: "address" }],
          outputs: [{ name: "", type: "bool" }],
        },
        {
          name: "minimumDeposit",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "asset", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ];

      const isSupported = (await readContract(wagmiConfig, {
        address: depositTellerAddress,
        abi: depositTellerAbi,
        functionName: "isAssetSupported",
        args: [usdcAddress],
      })) as boolean;

      console.log(`USDC supported by DepositTeller: ${isSupported}`);

      if (!isSupported) {
        throw new Error(
          `USDC is not supported by the DepositTeller contract. The asset needs to be added by the contract owner.`,
        );
      }

      const minimumDeposit = (await readContract(wagmiConfig, {
        address: depositTellerAddress,
        abi: depositTellerAbi,
        functionName: "minimumDeposit",
        args: [usdcAddress],
      })) as bigint;

      console.log(`Minimum deposit required: ${minimumDeposit} (depositing: ${amountInUSDC})`);

      if (amountInUSDC < minimumDeposit) {
        throw new Error(`Deposit amount ${amountInUSDC} is below minimum required: ${minimumDeposit}`);
      }

      console.log("All DepositTeller requirements met, now depositing...");
      console.log(
        `Deposit parameters: asset=${usdcAddress}, amount=${amountInUSDC}, depositTeller=${depositTellerAddress}`,
      );

      // Step 2: Deposit to vault
      await depositToVault({
        functionName: "deposit",
        args: [usdcAddress, amountInUSDC],
        // No value needed for USDC deposits (ERC20)
      });

      setDepositSuccess(true);
      alert(`Successfully deposited ${depositAmount} USDC to ${vaultName || "SuperYield Vault"}!`);
    } catch (error) {
      console.error("Deposit failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Deposit failed: ${errorMessage}`);
    } finally {
      setDepositLoading(false);
    }
  };

  const runOptimization = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setAiDecision(null);

    try {
      const response = await fetch("/api/agents/optimize-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunities: yields,
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
      console.error("Optimization failed:", error);
      alert("Optimization failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value: bigint | undefined) => {
    if (!value) return "0.00";
    const formatted = Number(value) / 1e18;
    return formatted.toFixed(4);
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

        {!isConnected ? (
          <div
            className="inline-flex items-center px-6 py-3 rounded-full font-medium shadow-lg"
            style={{ backgroundColor: "#ce58a1", color: "white" }}
          >
            <span className="mr-2">⚠️</span>
            Connect your wallet to start optimizing yields
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-lg border-2" style={{ borderColor: "#36a2d8" }}>
                <div className="text-sm text-gray-600 font-medium mb-1">Your Vault Balance</div>
                <div className="text-2xl font-bold" style={{ color: "#36a2d8" }}>
                  {formatAmount(vaultBalance as bigint)} shares
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-lg border-2" style={{ borderColor: "#ce58a1" }}>
                <div className="text-sm text-gray-600 font-medium mb-1">Total Vault Assets</div>
                <div className="text-2xl font-bold" style={{ color: "#ce58a1" }}>
                  {formatAmount(totalAssets as bigint)} USDC
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-lg border-2" style={{ borderColor: "#36a2d8" }}>
                <div className="text-sm text-gray-600 font-medium mb-1">Vault Name</div>
                <div className="text-lg font-bold text-gray-800">{vaultName || "Loading..."}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-8 pb-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Deposit & Optimization Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deposit Card */}
            <div className="bg-white rounded-2xl shadow-xl border-2" style={{ borderColor: "#36a2d8" }}>
              <div
                className="px-6 py-4 rounded-t-2xl text-white font-bold text-xl"
                style={{ background: "linear-gradient(135deg, #36a2d8 0%, #2e8bc0 100%)" }}
              >
                💰 Deposit to Vault
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Deposit Amount (USDC)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none"
                    style={{
                      borderColor: "#36a2d8",
                      background: "#ffecd0",
                    }}
                    placeholder="Enter USDC amount (e.g., 100)"
                  />
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={!isConnected || depositLoading}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${depositLoading ? "animate-pulse" : ""}`}
                  style={{
                    background: depositLoading
                      ? "linear-gradient(135deg, #36a2d8 0%, #2e8bc0 100%)"
                      : "linear-gradient(135deg, #36a2d8 0%, #4cb5e8 100%)",
                    boxShadow: "0 4px 20px rgba(54, 162, 216, 0.4)",
                  }}
                >
                  {depositLoading ? "🔄 Depositing..." : "💎 Deposit USDC"}
                </button>
                {depositSuccess && (
                  <div className="mt-4 p-3 bg-green-100 border-2 border-green-500 rounded-xl text-green-800 font-medium text-center">
                    ✅ Deposit successful!
                  </div>
                )}
              </div>
            </div>

            {/* AI Optimization Card */}
            <div className="bg-white rounded-2xl shadow-xl border-2" style={{ borderColor: "#ce58a1" }}>
              <div
                className="px-6 py-4 rounded-t-2xl text-white font-bold text-xl"
                style={{ background: "linear-gradient(135deg, #ce58a1 0%, #b64d8f 100%)" }}
              >
                🚀 AI Optimization
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-gray-700 font-medium mb-4">
                    Run AI-powered yield optimization to find the best allocation strategy for your vault assets.
                  </p>
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-xl border-2 border-pink-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🤖</span>
                      <span className="font-bold text-gray-800">GPT-4o Agent</span>
                    </div>
                    <p className="text-sm text-gray-600">Analyzes {yields.length} yield opportunities in real-time</p>
                  </div>
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
                  {loading ? "🔄 Optimizing..." : "✨ Run AI Optimization"}
                </button>
              </div>
            </div>
          </div>

          {/* AI Optimization Results */}
          {aiDecision && (
            <div className="bg-white rounded-2xl shadow-xl border-2" style={{ borderColor: "#36a2d8" }}>
              <div
                className="px-6 py-4 rounded-t-2xl text-white font-bold text-xl flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, #36a2d8 0%, #2e8bc0 100%)" }}
              >
                <span>🤖 AI Recommendation</span>
                <span className="text-sm bg-white text-gray-800 px-3 py-1 rounded-full">
                  {(aiDecision.confidence * 100).toFixed(0)}% Confidence
                </span>
              </div>
              <div className="p-6">
                {/* Target Protocol */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div
                    className="p-4 rounded-xl border-l-4"
                    style={{ backgroundColor: "#ffecd0", borderLeftColor: "#ce58a1" }}
                  >
                    <div className="text-sm text-gray-600 font-medium mb-1">Target Protocol</div>
                    <div className="text-2xl font-bold text-gray-800">{aiDecision.targetProtocol}</div>
                    <div className="text-xs text-gray-500 truncate mt-1">{aiDecision.targetVault}</div>
                  </div>
                  <div
                    className="p-4 rounded-xl border-l-4"
                    style={{ backgroundColor: "#ffecd0", borderLeftColor: "#36a2d8" }}
                  >
                    <div className="text-sm text-gray-600 font-medium mb-1">Allocation Amount</div>
                    <div className="text-2xl font-bold" style={{ color: "#36a2d8" }}>
                      {parseFloat(aiDecision.amount).toFixed(2)} USDC
                    </div>
                  </div>
                </div>

                {/* APY Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#ffecd0" }}>
                    <div className="text-sm text-gray-600 font-medium mb-1">Current APY</div>
                    <div className="text-3xl font-bold" style={{ color: "#36a2d8" }}>
                      {aiDecision.currentAPY.toFixed(2)}%
                    </div>
                  </div>

                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#ffecd0" }}>
                    <div className="text-sm text-gray-600 font-medium mb-1">Expected APY</div>
                    <div className="text-3xl font-bold" style={{ color: "#10b981" }}>
                      {aiDecision.expectedAPY.toFixed(2)}%
                    </div>
                  </div>

                  <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#ffecd0" }}>
                    <div className="text-sm text-gray-600 font-medium mb-1">Improvement</div>
                    <div className="text-3xl font-bold" style={{ color: "#ce58a1" }}>
                      +{aiDecision.improvement.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div
                  className="p-4 rounded-xl mb-6 border-l-4"
                  style={{ backgroundColor: "#e0f2fe", borderLeftColor: "#0284c7" }}
                >
                  <div className="font-bold text-gray-800 mb-2">🛡️ Risk Assessment</div>
                  <p className="text-gray-700">{aiDecision.riskAssessment}</p>
                </div>

                {/* AI Reasoning */}
                <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: "#ffecd0" }}>
                  <div className="font-bold text-gray-800 mb-2">💡 AI Reasoning</div>
                  <p className="text-gray-700 whitespace-pre-line">{aiDecision.reasoning}</p>
                </div>

                {/* Swap Warning */}
                {aiDecision.swapRequired && (
                  <div
                    className="p-4 rounded-xl mb-6 border-l-4"
                    style={{ backgroundColor: "#fef3c7", borderLeftColor: "#f59e0b" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <span className="font-bold text-gray-800">Token swap required before execution</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setAiDecision(null)}
                    className="flex-1 py-3 px-6 rounded-xl font-bold border-2 transition-all hover:scale-105"
                    style={{ borderColor: "#36a2d8", color: "#36a2d8" }}
                  >
                    Dismiss
                  </button>
                  <button
                    className="flex-1 py-3 px-6 rounded-xl font-bold text-white transition-all hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #ce58a1 0%, #d665ab 100%)",
                      boxShadow: "0 4px 20px rgba(206, 88, 161, 0.4)",
                    }}
                  >
                    Execute Strategy
                  </button>
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
                          key={index}
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
