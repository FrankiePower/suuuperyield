// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {Auth, Authority} from "solmate/auth/Auth.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISuperYieldVault {
    function enter(
        address from,
        address asset,
        uint256 assetAmount,
        address to,
        uint256 shareAmount
    ) external;

    function exit(
        address to,
        address asset,
        uint256 assetAmount,
        address from,
        uint256 shareAmount
    ) external;
}

/**
 * @title DepositTeller
 * @notice Handles user deposits and withdrawals for the SuperYieldVault
 * @dev Acts as the entry point for users interacting with the vault
 *
 * Key Features:
 * - Accepts user deposits and mints vault shares
 * - Handles withdrawals and burns vault shares
 * - Supports multiple assets (initially ETH/WETH)
 * - Role-based access control
 */
contract DepositTeller is Auth {
    using SafeERC20 for IERC20;

    /// @notice The SuperYieldVault that this teller services
    address public immutable vault;

    /// @notice The accountant contract that tracks share pricing
    address public accountant;

    /// @notice Supported deposit assets
    mapping(address => bool) public isAssetSupported;

    /// @notice Minimum deposit amounts per asset
    mapping(address => uint256) public minimumDeposit;

    /// @notice Events
    event Deposit(address indexed user, address indexed asset, uint256 assetAmount, uint256 sharesMinted);
    event Withdrawal(address indexed user, address indexed asset, uint256 assetAmount, uint256 sharesBurned);
    event AssetAdded(address indexed asset, uint256 minimumAmount);
    event AssetRemoved(address indexed asset);
    event AccountantUpdated(address indexed newAccountant);

    /// @notice Errors
    error AssetNotSupported(address asset);
    error DepositTooSmall(uint256 amount, uint256 minimum);
    error InsufficientShares(uint256 requested, uint256 available);
    error TransferFailed();

    /**
     * @notice Constructor
     * @param _owner Address with admin rights
     * @param _authority Authority contract for role-based access control
     * @param _vault Address of the SuperYieldVault
     * @param _accountant Address of the YieldAccountant
     */
    constructor(
        address _owner,
        Authority _authority,
        address _vault,
        address _accountant
    ) Auth(_owner, _authority) {
        vault = _vault;
        accountant = _accountant;
    }

    /**
     * @notice Deposit assets and receive vault shares
     * @param asset The asset to deposit
     * @param amount The amount to deposit
     * @return shares The number of shares minted
     */
    function deposit(address asset, uint256 amount) external returns (uint256 shares) {
        if (!isAssetSupported[asset]) {
            revert AssetNotSupported(asset);
        }

        if (amount < minimumDeposit[asset]) {
            revert DepositTooSmall(amount, minimumDeposit[asset]);
        }

        // Transfer asset from user to vault
        IERC20(asset).safeTransferFrom(msg.sender, vault, amount);

        // Calculate shares to mint (1:1 for now, will use accountant later)
        shares = amount;

        // Mint shares to user via vault's enter function
        ISuperYieldVault(vault).enter(
            msg.sender,
            asset,
            amount,
            msg.sender,
            shares
        );

        emit Deposit(msg.sender, asset, amount, shares);
    }

    /**
     * @notice Withdraw assets by burning vault shares
     * @param asset The asset to withdraw
     * @param shareAmount The number of shares to burn
     * @return assetAmount The amount of assets withdrawn
     */
    function withdraw(address asset, uint256 shareAmount) external returns (uint256 assetAmount) {
        if (!isAssetSupported[asset]) {
            revert AssetNotSupported(asset);
        }

        // Calculate asset amount (1:1 for now, will use accountant later)
        assetAmount = shareAmount;

        // Burn shares and withdraw assets via vault's exit function
        ISuperYieldVault(vault).exit(
            msg.sender,
            asset,
            assetAmount,
            msg.sender,
            shareAmount
        );

        emit Withdrawal(msg.sender, asset, assetAmount, shareAmount);
    }

    /**
     * @notice Add a supported asset
     * @param asset The asset to add
     * @param minimum The minimum deposit amount
     * @dev Only callable by owner
     */
    function addAsset(address asset, uint256 minimum) external requiresAuth {
        isAssetSupported[asset] = true;
        minimumDeposit[asset] = minimum;
        emit AssetAdded(asset, minimum);
    }

    /**
     * @notice Remove a supported asset
     * @param asset The asset to remove
     * @dev Only callable by owner
     */
    function removeAsset(address asset) external requiresAuth {
        isAssetSupported[asset] = false;
        emit AssetRemoved(asset);
    }

    /**
     * @notice Update the accountant contract
     * @param newAccountant The new accountant address
     * @dev Only callable by owner
     */
    function updateAccountant(address newAccountant) external requiresAuth {
        accountant = newAccountant;
        emit AccountantUpdated(newAccountant);
    }

    /**
     * @notice Check if an asset is supported
     * @param asset The asset to check
     * @return bool True if supported
     */
    function isSupportedAsset(address asset) external view returns (bool) {
        return isAssetSupported[asset];
    }

    /**
     * @notice Get minimum deposit for an asset
     * @param asset The asset to check
     * @return uint256 The minimum deposit amount
     */
    function getMinimumDeposit(address asset) external view returns (uint256) {
        return minimumDeposit[asset];
    }
}
