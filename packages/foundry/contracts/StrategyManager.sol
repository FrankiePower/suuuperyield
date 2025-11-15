// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {Auth, Authority} from "solmate/auth/Auth.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StrategyManager
 * @notice Manages allocation strategies and interactions with GlueX vaults
 * @dev Handles deposit/withdraw operations to whitelisted GlueX vaults
 *
 * Key Features:
 * - Only callable by authorized roles (AI agent wallet)
 * - Enforces GlueX vault whitelist
 * - Tracks allocations across vaults
 * - Emits events for off-chain monitoring
 */
contract StrategyManager is Auth {
    using SafeERC20 for IERC20;

    /// @notice The SuperYieldVault that this manager controls
    address public immutable VAULT;

    /// @notice GlueX vault addresses (from hackathon requirements)
    address[5] public glueXVaults = [
        0xE25514992597786E07872e6C5517FE1906C0CAdD,
        0xCdc3975df9D1cf054F44ED238Edfb708880292EA,
        0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a,
        0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7,
        0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be
    ];

    /// @notice Mapping to quickly check if an address is a whitelisted GlueX vault
    mapping(address => bool) public isWhitelistedVault;

    /// @notice Track current allocation per vault
    mapping(address => uint256) public allocatedToVault;

    /// @notice Total allocated across all vaults
    uint256 public totalAllocated;

    /// @notice Events
    event AllocationExecuted(address indexed vault, address indexed asset, uint256 amount);
    event WithdrawalExecuted(address indexed vault, address indexed asset, uint256 amount);
    event VaultWhitelisted(address indexed vault);
    event VaultRemovedFromWhitelist(address indexed vault);

    /// @notice Errors
    error VaultNotWhitelisted(address vault);
    error InsufficientBalance(uint256 requested, uint256 available);
    error AllocationFailed(address vault, string reason);

    /**
     * @notice Constructor
     * @param _owner Address with admin rights (can add authorities)
     * @param _authority Authority contract for role-based access control
     * @param _vault Address of the SuperYieldVault
     */
    constructor(
        address _owner,
        Authority _authority,
        address _vault
    ) Auth(_owner, _authority) {
        VAULT = _vault;

        // Whitelist all GlueX vaults
        for (uint256 i = 0; i < glueXVaults.length; i++) {
            isWhitelistedVault[glueXVaults[i]] = true;
            emit VaultWhitelisted(glueXVaults[i]);
        }
    }

    /**
     * @notice Allocate funds to a GlueX vault
     * @param targetVault The GlueX vault to allocate to
     * @param asset The asset to allocate
     * @param amount The amount to allocate
     * @dev Only callable by authorized addresses (AI agent)
     */
    function allocate(
        address targetVault,
        address asset,
        uint256 amount
    ) external requiresAuth {
        if (!isWhitelistedVault[targetVault]) {
            revert VaultNotWhitelisted(targetVault);
        }

        // Transfer asset from vault to this contract
        IERC20(asset).safeTransferFrom(VAULT, address(this), amount);

        // Approve the GlueX vault to spend the asset
        IERC20(asset).approve(targetVault, amount);

        // Deposit into GlueX vault
        // Note: GlueX vaults use standard ERC4626 deposit interface
        (bool success, ) = targetVault.call(
            abi.encodeWithSignature("deposit(uint256,address)", amount, VAULT)
        );

        if (!success) {
            revert AllocationFailed(targetVault, "Deposit failed");
        }

        // Update tracking
        allocatedToVault[targetVault] += amount;
        totalAllocated += amount;

        emit AllocationExecuted(targetVault, asset, amount);
    }

    /**
     * @notice Withdraw funds from a GlueX vault
     * @param targetVault The GlueX vault to withdraw from
     * @param asset The asset to withdraw
     * @param amount The amount to withdraw
     * @dev Only callable by authorized addresses (AI agent)
     */
    function withdraw(
        address targetVault,
        address asset,
        uint256 amount
    ) external requiresAuth {
        if (!isWhitelistedVault[targetVault]) {
            revert VaultNotWhitelisted(targetVault);
        }

        if (allocatedToVault[targetVault] < amount) {
            revert InsufficientBalance(amount, allocatedToVault[targetVault]);
        }

        // Withdraw from GlueX vault
        // Note: GlueX vaults use standard ERC4626 withdraw interface
        (bool success, ) = targetVault.call(
            abi.encodeWithSignature("withdraw(uint256,address,address)", amount, VAULT, VAULT)
        );

        if (!success) {
            revert AllocationFailed(targetVault, "Withdrawal failed");
        }

        // Update tracking
        allocatedToVault[targetVault] -= amount;
        totalAllocated -= amount;

        emit WithdrawalExecuted(targetVault, asset, amount);
    }

    /**
     * @notice Get all whitelisted GlueX vaults
     * @return Array of vault addresses
     */
    function getWhitelistedVaults() external view returns (address[5] memory) {
        return glueXVaults;
    }

    /**
     * @notice Add a vault to whitelist
     * @param vaultAddress Vault to whitelist
     * @dev Only callable by owner
     */
    function addToWhitelist(address vaultAddress) external requiresAuth {
        isWhitelistedVault[vaultAddress] = true;
        emit VaultWhitelisted(vaultAddress);
    }

    /**
     * @notice Remove a vault from whitelist
     * @param vaultAddress Vault to remove
     * @dev Only callable by owner
     */
    function removeFromWhitelist(address vaultAddress) external requiresAuth {
        isWhitelistedVault[vaultAddress] = false;
        emit VaultRemovedFromWhitelist(vaultAddress);
    }

    /**
     * @notice Get allocation for a specific vault
     * @param targetVault The vault to query
     * @return The amount allocated to that vault
     */
    function getAllocation(address targetVault) external view returns (uint256) {
        return allocatedToVault[targetVault];
    }

    /**
     * @notice Get total allocated amount
     * @return The total amount allocated across all vaults
     */
    function getTotalAllocated() external view returns (uint256) {
        return totalAllocated;
    }
}
