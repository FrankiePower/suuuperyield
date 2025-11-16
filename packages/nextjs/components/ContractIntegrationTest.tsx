"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * Test component to verify Scaffold-ETH hooks work with deployed contracts
 * This can be removed after verification
 */
export const ContractIntegrationTest = () => {
  // Test reading vault name
  const { data: vaultName } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "name",
  });

  // Test reading vault symbol
  const { data: vaultSymbol } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "symbol",
  });

  // Test reading vault decimals
  const { data: vaultDecimals } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "decimals",
  });

  // Test reading vault total supply
  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "totalSupply",
  });

  // Test reading owner address (BoringVault doesn't expose accountant)
  const { data: ownerAddress } = useScaffoldReadContract({
    contractName: "SuperYieldVault",
    functionName: "owner",
  });

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Contract Integration Test</h2>
        <div className="space-y-2">
          <div>
            <span className="font-semibold">Vault Name:</span> {vaultName || "Loading..."}
          </div>
          <div>
            <span className="font-semibold">Vault Symbol:</span> {vaultSymbol || "Loading..."}
          </div>
          <div>
            <span className="font-semibold">Decimals:</span> {vaultDecimals?.toString() || "Loading..."}
          </div>
          <div>
            <span className="font-semibold">Total Supply:</span> {totalSupply?.toString() || "Loading..."}
          </div>
          <div>
            <span className="font-semibold">Owner:</span> {ownerAddress || "Loading..."}
          </div>
        </div>
        <div className="alert alert-info mt-4">
          <span>
            ✅ If you see data above (not &quot;Loading...&quot;), Scaffold-ETH hooks are working correctly with
            mainnet contracts!
          </span>
        </div>
      </div>
    </div>
  );
};
