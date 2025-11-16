/**
 * Vault Data Service
 * Fetches real-time data from deployed contracts
 */
import type { VaultState } from "../ai/openai-agent";
import { createPublicClient, formatEther, http, parseAbi } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { hyperEvmMainnet } from "~~/utils/chains";

// Create public client for reading contract data
const publicClient = createPublicClient({
  chain: hyperEvmMainnet,
  transport: http(process.env.HYPEREVM_RPC_URL || "https://rpc.hyperliquid.xyz/evm"),
});

/**
 * Get vault addresses from deployed contracts
 */
function getVaultAddresses() {
  const contracts = deployedContracts[999]; // Chain ID 999 = HyperEVM Mainnet

  if (!contracts) {
    throw new Error("No contracts deployed on HyperEVM Mainnet (Chain 999)");
  }

  return {
    vault: contracts.SuperYieldVault?.address as `0x${string}`,
    accountant: contracts.YieldAccountant?.address as `0x${string}`,
    manager: contracts.StrategyManager?.address as `0x${string}`,
    teller: contracts.DepositTeller?.address as `0x${string}`,
  };
}

/**
 * Fetch current vault state from contracts
 */
export async function fetchVaultState(): Promise<VaultState> {
  const { vault } = getVaultAddresses();

  try {
    // Read vault total supply (ERC20 function)
    const totalSupply = await publicClient.readContract({
      address: vault,
      abi: deployedContracts[999].SuperYieldVault.abi,
      functionName: "totalSupply",
    });

    // For now, use totalSupply as a proxy for totalAssets
    // In production, you would read from the accountant or manager contract
    const totalAssetsFormatted = formatEther(totalSupply as bigint);
    const idleAssetsFormatted = formatEther(totalSupply as bigint);

    // TODO: Fetch current allocations from StrategyManager
    // For now, return empty allocations
    const currentAllocations: VaultState["currentAllocations"] = [];

    return {
      totalAssets: totalAssetsFormatted,
      idleAssets: idleAssetsFormatted,
      currentAllocations,
    };
  } catch (error) {
    console.error("Error fetching vault state:", error);
    throw new Error(`Failed to fetch vault state: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get vault balance for a specific asset
 */
export async function getVaultBalance(assetAddress: `0x${string}`): Promise<string> {
  const { vault } = getVaultAddresses();

  try {
    // ERC20 balanceOf ABI
    const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

    const balance = await publicClient.readContract({
      address: assetAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [vault],
    });

    return formatEther(balance as bigint);
  } catch (error) {
    console.error("Error fetching vault balance:", error);
    throw new Error(`Failed to fetch vault balance: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get vault info (name, symbol, decimals)
 */
export async function getVaultInfo() {
  const { vault } = getVaultAddresses();

  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: vault,
        abi: deployedContracts[999].SuperYieldVault.abi,
        functionName: "name",
      }),

      publicClient.readContract({
        address: vault,
        abi: deployedContracts[999].SuperYieldVault.abi,
        functionName: "symbol",
      }),

      publicClient.readContract({
        address: vault,
        abi: deployedContracts[999].SuperYieldVault.abi,
        functionName: "decimals",
      }),

      publicClient.readContract({
        address: vault,
        abi: deployedContracts[999].SuperYieldVault.abi,
        functionName: "totalSupply",
      }),
    ]);

    return {
      name: name as string,
      symbol: symbol as string,
      decimals: decimals as number,
      totalAssets: formatEther(totalSupply as bigint), // Using totalSupply as proxy
      totalSupply: formatEther(totalSupply as bigint),
      sharePrice: "1.0", // 1:1 ratio for now
    };
  } catch (error) {
    console.error("Error fetching vault info:", error);
    throw new Error(`Failed to fetch vault info: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Check if vault is paused
 * Note: BoringVault doesn't have isPaused, so we return false
 */
export async function isVaultPaused(): Promise<boolean> {
  // BoringVault doesn't have isPaused function
  // In production, check the accountant or manager contract
  return false;
}

/**
 * Get deployed contract addresses for reference
 */
export function getContractAddresses() {
  return getVaultAddresses();
}
